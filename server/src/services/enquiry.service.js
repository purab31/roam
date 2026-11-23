const Enquiry = require('../models/enquiry.model');
const Listing = require('../models/listing.model');
const notificationService = require('./notification.service');
const { NotFoundError, ForbiddenError, ConflictError } = require('../errors');

class EnquiryService {
  /**
   * Submits a new enquiry on a vehicle listing.
   */
  async createEnquiry(enquirerUser, { listingId, subject, message }) {
    if (enquirerUser.accountStatus !== 'active') {
      throw new ForbiddenError('Deactivated accounts cannot submit enquiries', 'ACCOUNT_DEACTIVATED');
    }

    const listing = await Listing.findById(listingId).populate('vehicleRef', 'brand model variant manufacturingYear images');
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    const ownerId = listing.ownerRef?.id?.toString();
    if (ownerId && ownerId === enquirerUser._id.toString()) {
      throw new ForbiddenError('You cannot submit an enquiry on your own listing', 'FORBIDDEN_SELF_ENQUIRY');
    }

    const enquiry = await Enquiry.create({
      enquirer: enquirerUser._id,
      listing: listing._id,
      recipient: listing.ownerRef.id,
      subject,
      message,
      status: 'open',
      replies: [],
    });

    // Notify listing owner
    const vehicleName = listing.vehicleRef
      ? `${listing.vehicleRef.brand} ${listing.vehicleRef.model}`
      : 'vehicle';

    await notificationService.createNotification({
      recipient: listing.ownerRef.id,
      type: 'enquiry',
      title: 'New Vehicle Enquiry',
      message: `${enquirerUser.fullName} sent an enquiry regarding your ${vehicleName}.`,
      relatedRef: {
        model: 'Enquiry',
        id: enquiry._id,
      },
    });

    return enquiry;
  }

  /**
   * Retrieves user's enquiries (sent or received).
   */
  async getUserEnquiries(user, query = {}) {
    const { type = 'all', status, page = 1, limit = 20 } = query;
    const filter = {};

    if (type === 'sent') {
      filter.enquirer = user._id;
    } else if (type === 'received') {
      filter.recipient = user._id;
    } else {
      filter.$or = [{ enquirer: user._id }, { recipient: user._id }];
    }

    if (status) {
      filter.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Enquiry.find(filter)
        .populate({
          path: 'listing',
          select: 'vehicleRef purpose sale rental moderationStatus',
          populate: {
            path: 'vehicleRef',
            select: 'brand model variant manufacturingYear images bodyType fuelType transmission',
          },
        })
        .populate('enquirer', 'fullName email mobile contactVisibility')
        .populate('recipient', 'fullName email mobile contactVisibility')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Enquiry.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page: Number(page),
      pageSize: Number(limit),
    };
  }

  /**
   * Retrieves a single enquiry thread by ID.
   */
  async getEnquiryById(enquiryId, user) {
    const enquiry = await Enquiry.findById(enquiryId)
      .populate({
        path: 'listing',
        select: 'vehicleRef purpose sale rental moderationStatus ownerRef',
        populate: {
          path: 'vehicleRef',
          select: 'brand model variant manufacturingYear images bodyType fuelType transmission location',
        },
      })
      .populate('enquirer', 'fullName email mobile contactVisibility')
      .populate('recipient', 'fullName email mobile contactVisibility')
      .populate('replies.sender', 'fullName');

    if (!enquiry) {
      throw new NotFoundError('Enquiry not found');
    }

    const isEnquirer = enquiry.enquirer._id.toString() === user._id.toString();
    const isRecipient = enquiry.recipient._id.toString() === user._id.toString();

    if (!isEnquirer && !isRecipient && user.role !== 'admin') {
      throw new ForbiddenError('You do not have access to this enquiry thread', 'FORBIDDEN_NOT_PARTICIPANT');
    }

    return enquiry;
  }

  /**
   * Adds a reply to an enquiry thread.
   */
  async addReply(enquiryId, user, { message }) {
    if (user.accountStatus !== 'active') {
      throw new ForbiddenError('Deactivated accounts cannot reply', 'ACCOUNT_DEACTIVATED');
    }

    const enquiry = await Enquiry.findById(enquiryId);
    if (!enquiry) {
      throw new NotFoundError('Enquiry not found');
    }

    const isEnquirer = enquiry.enquirer.toString() === user._id.toString();
    const isRecipient = enquiry.recipient.toString() === user._id.toString();

    if (!isEnquirer && !isRecipient && user.role !== 'admin') {
      throw new ForbiddenError('You do not have permission to reply to this enquiry', 'FORBIDDEN_NOT_PARTICIPANT');
    }

    if (enquiry.status === 'closed') {
      throw new ConflictError('Cannot reply to a closed enquiry', 'INVALID_STATUS_TRANSITION');
    }

    enquiry.replies.push({
      sender: user._id,
      message,
      createdAt: new Date(),
    });

    if (isRecipient && enquiry.status === 'open') {
      enquiry.status = 'answered';
    }

    await enquiry.save();

    // Notify the other party
    const counterpartyId = isEnquirer ? enquiry.recipient : enquiry.enquirer;
    await notificationService.createNotification({
      recipient: counterpartyId,
      type: 'enquiry',
      title: 'New Reply on Enquiry',
      message: `${user.fullName} replied to the enquiry '${enquiry.subject}'.`,
      relatedRef: {
        model: 'Enquiry',
        id: enquiry._id,
      },
    });

    return this.getEnquiryById(enquiry._id, user);
  }

  /**
   * Updates enquiry status ('open', 'answered', 'resolved', 'closed').
   */
  async updateStatus(enquiryId, user, { status }) {
    const enquiry = await Enquiry.findById(enquiryId);
    if (!enquiry) {
      throw new NotFoundError('Enquiry not found');
    }

    const isEnquirer = enquiry.enquirer.toString() === user._id.toString();
    const isRecipient = enquiry.recipient.toString() === user._id.toString();

    if (!isEnquirer && !isRecipient && user.role !== 'admin') {
      throw new ForbiddenError('You do not have permission to update this enquiry status', 'FORBIDDEN_NOT_PARTICIPANT');
    }

    enquiry.status = status;
    await enquiry.save();

    return enquiry;
  }
}

module.exports = new EnquiryService();
