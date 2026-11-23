const mongoose = require('mongoose');
const Offer = require('../models/offer.model');
const Listing = require('../models/listing.model');
const Dealer = require('../models/dealer.model');
const notificationService = require('./notification.service');
const {
  validateOfferCreation,
  validateAndComputeTransition,
} = require('./offerStateMachine');
const { NotFoundError, ForbiddenError, ConflictError } = require('../errors');
const { formatRupees } = require('../utils/money');

function sanitizeOffer(offer, user) {
  const obj = offer.toObject ? offer.toObject() : { ...offer };
  obj.id = obj._id ? obj._id.toString() : obj.id;
  const userIdStr = user?._id ? user._id.toString() : null;
  const isSeller = obj.seller?._id ? obj.seller._id.toString() === userIdStr : obj.seller?.toString() === userIdStr;
  const isAdmin = user?.role === 'admin' || user?.capabilities?.includes('admin');

  // Never expose isBelowMinimum or minAcceptableOffer to buyers (Spec 18.2 & Adjustment 2)
  if (!isSeller && !isAdmin) {
    delete obj.isBelowMinimum;
  }
  return obj;
}

class OfferService {
  /**
   * Submits a new purchase offer on a listing.
   */
  async createOffer(buyerUser, { listingId, amount, message = '' }) {
    const listing = await Listing.findById(listingId).populate('vehicleRef', 'brand model variant manufacturingYear images');
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    // Run state-machine guards
    validateOfferCreation(listing, buyerUser);

    // If buyer is a dealer, ensure their dealership is not suspended
    if (buyerUser.capabilities?.includes('dealer')) {
      const dealer = await Dealer.findOne({ user: buyerUser._id });
      if (dealer && dealer.verificationStatus === 'suspended') {
        throw new ForbiddenError('Your dealership has been suspended by an administrator', 'DEALER_SUSPENDED');
      }
    }

    const sellerId = listing.ownerRef.id;

    // Adjustment 2: Do not reject below minimum; record isBelowMinimum flag for seller view only
    const minOffer = listing.sale?.minAcceptableOffer;
    const isBelowMinimum = minOffer !== null && minOffer !== undefined && amount < minOffer;

    const offer = await Offer.create({
      listing: listing._id,
      offeredBy: buyerUser._id,
      seller: sellerId,
      amount,
      message,
      status: 'submitted',
      awaitingResponseFrom: 'seller',
      isBelowMinimum,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      history: [
        {
          actor: buyerUser._id,
          action: 'submitted',
          amount,
          message,
          timestamp: new Date(),
        },
      ],
    });

    // Notify seller
    const vehicleName = listing.vehicleRef
      ? `${listing.vehicleRef.brand} ${listing.vehicleRef.model}`
      : 'vehicle';

    await notificationService.createNotification({
      recipient: sellerId,
      type: 'offer',
      title: 'New Purchase Offer Received',
      message: `${buyerUser.fullName} made an offer of ${formatRupees(amount)} on your ${vehicleName}.`,
      relatedRef: {
        model: 'Offer',
        id: offer._id,
      },
    });

    return sanitizeOffer(offer, buyerUser);
  }

  /**
   * Retrieves offers submitted by the current user.
   */
  async getMyOffers(user, query = {}) {
    const { status, page = 1, limit = 20 } = query;
    const filter = { offeredBy: user._id };

    if (status) {
      filter.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Offer.find(filter)
        .populate({
          path: 'listing',
          select: 'vehicleRef purpose sale rental moderationStatus',
          populate: {
            path: 'vehicleRef',
            select: 'brand model variant manufacturingYear images location',
          },
        })
        .populate('seller', 'fullName email mobile contactVisibility')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Offer.countDocuments(filter),
    ]);

    return {
      items: items.map(o => sanitizeOffer(o, user)),
      total,
      page: Number(page),
      pageSize: Number(limit),
    };
  }

  /**
   * Retrieves incoming offers received by the seller.
   */
  async getReceivedOffers(user, query = {}) {
    const { status, listingId, page = 1, limit = 20 } = query;
    const filter = { seller: user._id };

    if (status) {
      filter.status = status;
    }
    if (listingId) {
      filter.listing = listingId;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Offer.find(filter)
        .populate({
          path: 'listing',
          select: 'vehicleRef purpose sale rental moderationStatus',
          populate: {
            path: 'vehicleRef',
            select: 'brand model variant manufacturingYear images location',
          },
        })
        .populate('offeredBy', 'fullName email mobile contactVisibility')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Offer.countDocuments(filter),
    ]);

    // Attach dealer public summary for offers made by registered dealers
    const buyerIds = items.map(o => o.offeredBy?._id).filter(Boolean);
    const dealers = await Dealer.find({ user: { $in: buyerIds } });
    const dealerMap = new Map();
    dealers.forEach(d => {
      dealerMap.set(d.user.toString(), {
        id: d._id.toString(),
        dealershipName: d.dealershipName,
        ownerName: d.ownerName,
        logo: d.logo,
        city: d.city,
        verificationStatus: d.verificationStatus,
      });
    });

    const resultItems = items.map(o => {
      const obj = sanitizeOffer(o, user);
      const buyerId = o.offeredBy?._id ? o.offeredBy._id.toString() : o.offeredBy?.toString();
      if (buyerId && dealerMap.has(buyerId)) {
        obj.dealer = dealerMap.get(buyerId);
      }
      return obj;
    });

    return {
      items: resultItems,
      total,
      page: Number(page),
      pageSize: Number(limit),
    };
  }

  /**
   * Retrieves full negotiation thread by ID.
   */
  async getOfferById(offerId, user) {
    const offer = await Offer.findById(offerId)
      .populate({
        path: 'listing',
        select: 'vehicleRef purpose sale rental moderationStatus ownerRef',
        populate: {
          path: 'vehicleRef',
          select: 'brand model variant manufacturingYear images bodyType fuelType transmission location',
        },
      })
      .populate('offeredBy', 'fullName email mobile contactVisibility')
      .populate('seller', 'fullName email mobile contactVisibility')
      .populate('history.actor', 'fullName');

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    const isBuyer = offer.offeredBy._id.toString() === user._id.toString();
    const isSeller = offer.seller._id.toString() === user._id.toString();

    if (!isBuyer && !isSeller && user.role !== 'admin') {
      throw new ForbiddenError('You do not have access to this negotiation thread', 'FORBIDDEN_NOT_PARTICIPANT');
    }

    const sanitized = sanitizeOffer(offer, user);
    const dealer = await Dealer.findOne({ user: offer.offeredBy._id });
    if (dealer) {
      sanitized.dealer = {
        id: dealer._id.toString(),
        dealershipName: dealer.dealershipName,
        ownerName: dealer.ownerName,
        logo: dealer.logo,
        city: dealer.city,
        verificationStatus: dealer.verificationStatus,
      };
    }

    return sanitized;
  }

  /**
   * Submits a counteroffer in an active negotiation thread.
   */
  async counterOffer(offerId, actorUser, { amount, message = '' }) {
    if (actorUser.accountStatus !== 'active') {
      throw new ForbiddenError('Deactivated accounts cannot counter offers', 'ACCOUNT_DEACTIVATED');
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Verify listing is still available
    const listing = await Listing.findById(offer.listing).populate('vehicleRef', 'brand model');
    if (!listing || listing.sale?.status !== 'active') {
      throw new ConflictError('Cannot counteroffer: listing is no longer active', 'INVALID_STATUS_TRANSITION');
    }

    // State machine check & turn flipping
    const { nextStatus, nextAwaiting } = validateAndComputeTransition(offer, 'counteroffer_made', actorUser);

    offer.amount = amount;
    offer.message = message;
    offer.status = nextStatus;
    offer.awaitingResponseFrom = nextAwaiting;

    // Check if buyer is countering below minimum
    if (nextAwaiting === 'seller') {
      const minOffer = listing.sale?.minAcceptableOffer;
      offer.isBelowMinimum = minOffer !== null && minOffer !== undefined && amount < minOffer;
    }

    offer.history.push({
      actor: actorUser._id,
      action: 'counteroffer_made',
      amount,
      message,
      timestamp: new Date(),
    });

    await offer.save();

    // Notify counterparty
    const isSeller = offer.seller.toString() === actorUser._id.toString();
    const recipientId = isSeller ? offer.offeredBy : offer.seller;

    await notificationService.createNotification({
      recipient: recipientId,
      type: 'offer',
      title: 'Counteroffer Received',
      message: `${actorUser.fullName} made a counteroffer of ${formatRupees(amount)}.`,
      relatedRef: {
        model: 'Offer',
        id: offer._id,
      },
    });

    return this.getOfferById(offer._id, actorUser);
  }

  /**
   * Updates offer status (accept, reject, or withdraw).
   * Acceptance runs atomically inside a MongoDB transaction, closing competing active offers.
   */
  async updateOfferStatus(offerId, actorUser, { status, message = '' }) {
    if (actorUser.accountStatus !== 'active') {
      throw new ForbiddenError('Deactivated accounts cannot update offers', 'ACCOUNT_DEACTIVATED');
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // 1. Withdrawal Flow (Buyer only)
    if (status === 'withdrawn') {
      const { nextStatus, nextAwaiting } = validateAndComputeTransition(offer, 'withdrawn', actorUser);
      offer.status = nextStatus;
      offer.awaitingResponseFrom = nextAwaiting;
      offer.history.push({
        actor: actorUser._id,
        action: 'withdrawn',
        amount: offer.amount,
        message: message || 'Offer withdrawn by buyer',
        timestamp: new Date(),
      });
      await offer.save();

      // Notify seller
      await notificationService.createNotification({
        recipient: offer.seller,
        type: 'offer',
        title: 'Offer Withdrawn',
        message: `${actorUser.fullName} withdrew their offer.`,
        relatedRef: { model: 'Offer', id: offer._id },
      });

      return sanitizeOffer(offer, actorUser);
    }

    // 2. Rejection Flow
    if (status === 'rejected') {
      const { nextStatus, nextAwaiting } = validateAndComputeTransition(offer, 'rejected', actorUser);
      offer.status = nextStatus;
      offer.awaitingResponseFrom = nextAwaiting;
      offer.history.push({
        actor: actorUser._id,
        action: 'rejected',
        amount: offer.amount,
        message: message || 'Offer rejected',
        timestamp: new Date(),
      });
      await offer.save();

      const isSeller = offer.seller.toString() === actorUser._id.toString();
      const recipientId = isSeller ? offer.offeredBy : offer.seller;

      await notificationService.createNotification({
        recipient: recipientId,
        type: 'offer',
        title: 'Offer Rejected',
        message: `Your offer was rejected.`,
        relatedRef: { model: 'Offer', id: offer._id },
      });

      return sanitizeOffer(offer, actorUser);
    }

    // 3. Acceptance Flow: Atomic transaction per Adjustments 3, 6, 9 & Spec 18.2
    if (status === 'accepted') {
      const session = await mongoose.startSession();
      let competingBuyerIds = [];
      let updatedOffer;

      try {
        await session.withTransaction(async () => {
          // Acquire common serialization lock on parent listing first
          const listing = await Listing.findOneAndUpdate(
            { _id: offer.listing },
            { $inc: { __v: 1 } },
            { session, new: true }
          );

          if (!listing || listing.sale?.status !== 'active') {
            throw new ConflictError('Listing is no longer active and cannot accept offers', 'INVALID_STATUS_TRANSITION');
          }

          // Re-read offer inside transaction on each attempt
          const currentOffer = await Offer.findById(offerId).session(session);
          if (!currentOffer) {
            throw new NotFoundError('Offer not found');
          }

          if (!['submitted', 'pending', 'counteroffer_made'].includes(currentOffer.status)) {
            throw new ConflictError(
              'Offer is no longer available to be accepted',
              'OFFER_NO_LONGER_AVAILABLE'
            );
          }

          // Validate actor turn & state transition
          validateAndComputeTransition(currentOffer, 'accepted', actorUser);

          // Atomic conditional update on the target offer inside the transaction
          updatedOffer = await Offer.findOneAndUpdate(
            {
              _id: currentOffer._id,
              status: { $in: ['submitted', 'pending', 'counteroffer_made'] },
            },
            {
              $set: {
                status: 'accepted',
                awaitingResponseFrom: 'none',
              },
              $push: {
                history: {
                  actor: actorUser._id,
                  action: 'accepted',
                  amount: currentOffer.amount,
                  message: message || 'Offer accepted',
                  timestamp: new Date(),
                },
              },
            },
            { session, new: true }
          );

          if (!updatedOffer) {
            throw new ConflictError('Offer is no longer eligible to be accepted', 'OFFER_NO_LONGER_AVAILABLE');
          }

          // Identify all competing active offers on this listing
          const competingOffers = await Offer.find({
            listing: currentOffer.listing,
            _id: { $ne: currentOffer._id },
            status: { $in: ['submitted', 'pending', 'counteroffer_made'] },
          }).session(session);

          competingBuyerIds = competingOffers.map(o => o.offeredBy.toString());

          // Atomically close all competing offers
          if (competingOffers.length > 0) {
            await Offer.updateMany(
              {
                listing: currentOffer.listing,
                _id: { $ne: currentOffer._id },
                status: { $in: ['submitted', 'pending', 'counteroffer_made'] },
              },
              {
                $set: {
                  status: 'rejected',
                  awaitingResponseFrom: 'none',
                },
                $push: {
                  history: {
                    actor: actorUser._id,
                    action: 'closed_competing_offer',
                    amount: 0,
                    message: 'Another offer was accepted by the seller',
                    timestamp: new Date(),
                  },
                },
              },
              { session }
            );
          }
        });
      } catch (err) {
        if (err.code === 112 || (err.name === 'MongoServerError' && err.message?.includes('WriteConflict'))) {
          throw new ConflictError('A concurrent update conflict occurred while accepting this offer', 'CONCURRENT_UPDATE_CONFLICT');
        }
        throw err;
      } finally {
        await session.endSession();
      }

      // AFTER transaction successfully commits, emit notifications (Adjustment 9)
      const recipientOfAccepted = updatedOffer.offeredBy.toString() === actorUser._id.toString()
        ? updatedOffer.seller
        : updatedOffer.offeredBy;

      await notificationService.createNotification({
        recipient: recipientOfAccepted,
        type: 'offer',
        title: 'Offer Accepted!',
        message: `Your offer of ${formatRupees(updatedOffer.amount)} has been accepted!`,
        relatedRef: { model: 'Offer', id: updatedOffer._id },
      });

      for (const buyerId of competingBuyerIds) {
        await notificationService.createNotification({
          recipient: buyerId,
          type: 'offer',
          title: 'Offer Closed',
          message: 'Another offer was accepted for this vehicle listing.',
          relatedRef: { model: 'Listing', id: offer.listing },
        });
      }

      return sanitizeOffer(updatedOffer, actorUser);
    }

    throw new ConflictError(`Invalid status update '${status}'`, 'INVALID_STATUS_TRANSITION');
  }
}

module.exports = new OfferService();
