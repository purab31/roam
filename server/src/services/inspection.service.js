const InspectionRequest = require('../models/inspectionRequest.model');
const Listing = require('../models/listing.model');
const Dealer = require('../models/dealer.model');
const User = require('../models/user.model');
const notificationService = require('./notification.service');
const { isListingAvailable } = require('./listingAvailability.service');
const { validateInspectionTransition } = require('./inspectionStateMachine');
const {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  BadRequestError,
} = require('../errors');

/**
 * Determine the user's role relative to an inspection request: 'requester' | 'seller' | 'admin' | null
 */
async function resolveActorRole(inspection, userId, userCapabilities = []) {
  if (userCapabilities && userCapabilities.includes('admin')) {
    return 'admin';
  }

  const requesterId = inspection.requester?._id
    ? inspection.requester._id.toString()
    : inspection.requester?.toString();

  if (requesterId === userId.toString()) {
    return 'requester';
  }

  const sellerId = inspection.seller?._id
    ? inspection.seller._id.toString()
    : inspection.seller?.toString();

  if (sellerId === userId.toString()) {
    return 'seller';
  }

  if (inspection.dealer) {
    const inspectionDealerId = inspection.dealer?._id
      ? inspection.dealer._id.toString()
      : inspection.dealer?.toString();

    const dealer = await Dealer.findOne({ user: userId });
    if (dealer && dealer._id.toString() === inspectionDealerId) {
      return 'seller';
    }
  }

  return null;
}

/**
 * Create a new inspection request.
 *
 * Rules:
 * - Preferred date & time must be in the future.
 * - Listing must be available and public (not in review, admin deactivated, removed, owner blocked).
 * - Cannot request on own listing (403).
 * - No duplicate open requests per user per listing (409).
 */
async function createInspectionRequest(userId, { listingId, preferredDateTime, message = '' }) {
  const listing = await Listing.findById(listingId);
  if (!listing) {
    throw new NotFoundError('Listing not found');
  }

  // Check availability
  const isAvailable = await isListingAvailable(listing);
  if (!isAvailable) {
    throw new BadRequestError('This vehicle is currently not available for inspection');
  }

  // Prevent requesting inspection on own listing
  const isIndividualOwner =
    listing.ownerRef.type === 'user' && listing.ownerRef.id.toString() === userId.toString();

  let isDealerOwner = false;
  let dealerId = null;
  let sellerUserId = null;

  if (listing.ownerRef.type === 'dealer') {
    dealerId = listing.ownerRef.id;
    const dealer = await Dealer.findById(dealerId);
    if (dealer) {
      sellerUserId = dealer.user;
      if (dealer.user && dealer.user.toString() === userId.toString()) {
        isDealerOwner = true;
      }
    }
  } else {
    sellerUserId = listing.ownerRef.id;
  }

  if (isIndividualOwner || isDealerOwner) {
    throw new ForbiddenError(
      'You cannot request an inspection for your own listing',
      'CANNOT_INSPECT_OWN_LISTING'
    );
  }

  // Prevent duplicate open requests
  const existingOpenRequest = await InspectionRequest.findOne({
    requester: userId,
    listing: listingId,
    status: { $in: ['requested', 'reschedule_proposed', 'accepted'] },
  });

  if (existingOpenRequest) {
    throw new ConflictError(
      'You already have an active inspection request for this listing',
      'DUPLICATE_INSPECTION_REQUEST'
    );
  }

  const inspection = new InspectionRequest({
    requester: userId,
    listing: listing._id,
    seller: sellerUserId,
    dealer: dealerId,
    preferredDateTime: new Date(preferredDateTime),
    message,
    status: 'requested',
    statusHistory: [
      {
        status: 'requested',
        changedBy: userId,
        note: message || 'Inspection requested',
        changedAt: new Date(),
      },
    ],
  });

  await inspection.save();

  // Notify seller/dealer
  const requesterUser = await User.findById(userId).select('name');
  const formattedDate = new Date(preferredDateTime).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  await notificationService.createNotification({
    recipient: sellerUserId,
    type: 'inspection',
    title: 'New Inspection Request',
    message: `${requesterUser?.name || 'A buyer'} requested an in-person vehicle viewing for ${formattedDate}.`,
    relatedRef: { model: 'InspectionRequest', id: inspection._id },
  });

  return await getInspectionById(inspection._id, userId);
}

/**
 * List inspections for a user (as buyer or seller).
 */
async function getInspections(user, query = {}) {
  const { role = 'all', status } = query;
  const userId = user._id;

  const dealer = await Dealer.findOne({ user: userId });
  const dealerId = dealer ? dealer._id : null;

  const filter = {};

  if (role === 'buyer') {
    filter.requester = userId;
  } else if (role === 'seller') {
    if (dealerId) {
      filter.$or = [{ seller: userId }, { dealer: dealerId }];
    } else {
      filter.seller = userId;
    }
  } else {
    // all
    const conditions = [{ requester: userId }, { seller: userId }];
    if (dealerId) conditions.push({ dealer: dealerId });
    filter.$or = conditions;
  }

  if (status) {
    filter.status = status;
  }

  const items = await InspectionRequest.find(filter)
    .populate('requester', 'name email mobile')
    .populate('seller', 'name email mobile')
    .populate('dealer', 'dealershipName phone city')
    .populate({
      path: 'listing',
      populate: { path: 'vehicleRef' },
    })
    .sort({ createdAt: -1 });

  return items;
}

/**
 * Get single inspection by ID (requester, seller, or admin only).
 */
async function getInspectionById(id, userId, userCapabilities = []) {
  const inspection = await InspectionRequest.findById(id)
    .populate('requester', 'name email mobile')
    .populate('seller', 'name email mobile')
    .populate('dealer', 'dealershipName phone city')
    .populate({
      path: 'listing',
      populate: { path: 'vehicleRef' },
    });

  if (!inspection) {
    throw new NotFoundError('Inspection request not found');
  }

  const role = await resolveActorRole(inspection, userId, userCapabilities);
  if (!role) {
    throw new ForbiddenError(
      'You do not have permission to view this inspection request',
      'FORBIDDEN_ERROR'
    );
  }

  return inspection;
}

/**
 * Seller/Dealer responds to an inspection request: accept, reject, reschedule.
 */
async function respondToInspection(id, { action, proposedAlternative, alternativeMessage = '' }, user) {
  const inspection = await InspectionRequest.findById(id);
  if (!inspection) {
    throw new NotFoundError('Inspection request not found');
  }

  const actorRole = await resolveActorRole(inspection, user._id, user.capabilities);
  if (actorRole !== 'seller' && actorRole !== 'admin') {
    throw new ForbiddenError(
      'Only the seller or dealership can respond to this inspection request',
      'WRONG_ACTOR'
    );
  }

  let targetStatus;
  let note = '';

  if (action === 'accept') {
    targetStatus = 'accepted';
    note = 'Inspection request accepted by seller';
  } else if (action === 'reject') {
    targetStatus = 'rejected';
    note = alternativeMessage || 'Inspection request declined by seller';
  } else if (action === 'reschedule') {
    if (!proposedAlternative) {
      throw new ValidationError('A proposed alternative date and time is required to reschedule');
    }
    if (new Date(proposedAlternative).getTime() <= Date.now()) {
      throw new ValidationError('Proposed alternative date and time must be in the future');
    }
    targetStatus = 'reschedule_proposed';
    inspection.proposedAlternative = new Date(proposedAlternative);
    inspection.alternativeMessage = alternativeMessage;
    note = alternativeMessage || 'Alternative appointment time proposed by seller';
  } else {
    throw new ValidationError(`Unknown action: ${action}`);
  }

  // Validate state machine transition
  validateInspectionTransition(inspection, targetStatus, actorRole);

  inspection.status = targetStatus;
  inspection.statusHistory.push({
    status: targetStatus,
    changedBy: user._id,
    note,
    changedAt: new Date(),
  });

  await inspection.save();

  // Post-commit notification to buyer
  let notificationTitle = 'Inspection Update';
  let notificationMessage = note;

  if (targetStatus === 'accepted') {
    notificationTitle = 'Inspection Request Accepted';
    const formatted = new Date(inspection.preferredDateTime).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    notificationMessage = `The seller accepted your vehicle inspection appointment for ${formatted}.`;
  } else if (targetStatus === 'rejected') {
    notificationTitle = 'Inspection Request Declined';
    notificationMessage = `The seller declined your vehicle inspection request.${alternativeMessage ? ` Note: ${alternativeMessage}` : ''}`;
  } else if (targetStatus === 'reschedule_proposed') {
    notificationTitle = 'Inspection Reschedule Proposed';
    const formattedAlt = new Date(inspection.proposedAlternative).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    notificationMessage = `The seller proposed an alternative inspection time: ${formattedAlt}.${alternativeMessage ? ` Note: ${alternativeMessage}` : ''}`;
  }

  await notificationService.createNotification({
    recipient: inspection.requester,
    type: 'inspection',
    title: notificationTitle,
    message: notificationMessage,
    relatedRef: { model: 'InspectionRequest', id: inspection._id },
  });

  return await getInspectionById(inspection._id, user._id);
}

/**
 * Update inspection status: cancel, complete, accept_reschedule, reject_reschedule.
 */
async function updateInspectionStatus(id, { action, note = '' }, user) {
  const inspection = await InspectionRequest.findById(id);
  if (!inspection) {
    throw new NotFoundError('Inspection request not found');
  }

  const actorRole = await resolveActorRole(inspection, user._id, user.capabilities);
  if (!actorRole) {
    throw new ForbiddenError('You are not authorized to update this inspection request', 'FORBIDDEN_ERROR');
  }

  let targetStatus;
  let statusNote = note;

  if (action === 'cancel') {
    targetStatus = 'cancelled';
    statusNote = statusNote || `Appointment cancelled by ${actorRole === 'requester' ? 'buyer' : 'seller'}`;
  } else if (action === 'complete') {
    targetStatus = 'completed';
    statusNote = statusNote || 'In-person inspection completed';
  } else if (action === 'accept_reschedule') {
    targetStatus = 'accepted';
    // Shift preferredDateTime to the agreed proposedAlternative
    if (inspection.proposedAlternative) {
      inspection.preferredDateTime = inspection.proposedAlternative;
    }
    statusNote = statusNote || 'Buyer accepted the rescheduled inspection time';
  } else if (action === 'reject_reschedule') {
    targetStatus = 'rejected';
    statusNote = statusNote || 'Buyer declined the proposed reschedule';
  } else {
    throw new ValidationError(`Unknown action: ${action}`);
  }

  // Enforce actor-aware state machine
  validateInspectionTransition(inspection, targetStatus, actorRole);

  inspection.status = targetStatus;
  inspection.statusHistory.push({
    status: targetStatus,
    changedBy: user._id,
    note: statusNote,
    changedAt: new Date(),
  });

  await inspection.save();

  // Notify counterparty post-commit
  const isRequesterActing = actorRole === 'requester';
  const counterpartyRecipient = isRequesterActing ? inspection.seller : inspection.requester;

  let title = 'Inspection Status Updated';
  if (targetStatus === 'cancelled') {
    title = 'Inspection Cancelled';
  } else if (targetStatus === 'completed') {
    title = 'Inspection Completed';
  } else if (targetStatus === 'accepted') {
    title = 'Rescheduled Inspection Confirmed';
  }

  await notificationService.createNotification({
    recipient: counterpartyRecipient,
    type: 'inspection',
    title,
    message: statusNote,
    relatedRef: { model: 'InspectionRequest', id: inspection._id },
  });

  return await getInspectionById(inspection._id, user._id);
}

module.exports = {
  createInspectionRequest,
  getInspections,
  getInspectionById,
  respondToInspection,
  updateInspectionStatus,
};
