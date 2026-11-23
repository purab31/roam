const mongoose = require('mongoose');
const Transaction = require('../models/transaction.model');
const Offer = require('../models/offer.model');
const Listing = require('../models/listing.model');
const Vehicle = require('../models/vehicle.model');
const User = require('../models/user.model');
const Dealer = require('../models/dealer.model');
const notificationService = require('./notification.service');
const { validateAcquisitionTransition } = require('./acquisitionStateMachine');
const { NotFoundError, ForbiddenError, ConflictError } = require('../errors');
const { formatRupees } = require('../utils/money');

class TransactionService {
  /**
   * Completes a purchase transaction from an accepted offer (Individual buyer to seller).
   * This is the only action authorized to transition sale.status to 'sold' and offer status to 'completed'.
   * Rejects dealer offers per Sprint 5 rules (dealers must use the acquisition workflow).
   */
  async createSaleTransaction(sellerUser, { offerId, finalAmount, notes = '' }) {
    if (sellerUser.accountStatus !== 'active') {
      throw new ForbiddenError('Deactivated accounts cannot complete sales', 'ACCOUNT_DEACTIVATED');
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Adjustment 5: Seller only
    if (offer.seller.toString() !== sellerUser._id.toString() && sellerUser.role !== 'admin') {
      throw new ForbiddenError('Only the vehicle seller can record sale completion', 'FORBIDDEN_NOT_SELLER');
    }

    // Must be in accepted status
    if (offer.status !== 'accepted') {
      throw new ConflictError(
        `Cannot complete sale: offer status is '${offer.status}', must be 'accepted'`,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // Sprint 5 Rule: Reject dealer offers so acquisition is the only completion path for them
    const dealerProfile = await Dealer.findOne({ user: offer.offeredBy });
    if (dealerProfile) {
      throw new ConflictError(
        'Dealer purchase offers must be completed via the acquisition workflow (/api/transactions/acquire)',
        'DEALER_ACQUISITION_REQUIRED'
      );
    }

    const listing = await Listing.findById(offer.listing);
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    if (listing.sale?.status === 'sold') {
      throw new ConflictError('Listing is already marked as sold', 'INVALID_STATUS_TRANSITION');
    }

    const session = await mongoose.startSession();
    let transaction;

    try {
      await session.withTransaction(async () => {
        // Serialization point: touch parent listing document first
        const listingDoc = await Listing.findOneAndUpdate(
          { _id: offer.listing },
          { $inc: { __v: 1 } },
          { session, new: true }
        );

        if (!listingDoc) {
          throw new NotFoundError('Listing not found');
        }

        if (listingDoc.sale?.status === 'sold') {
          throw new ConflictError('Listing is already marked as sold', 'INVALID_STATUS_TRANSITION');
        }

        const currentOffer = await Offer.findById(offerId).session(session);
        if (!currentOffer || currentOffer.status !== 'accepted') {
          throw new ConflictError(
            `Cannot complete sale: offer status is '${currentOffer?.status}', must be 'accepted'`,
            'INVALID_STATUS_TRANSITION'
          );
        }

        // Check for duplicate transaction attempt
        const existingTx = await Transaction.findOne({ offerRef: currentOffer._id }).session(session);
        if (existingTx) {
          throw new ConflictError('A completed transaction already exists for this offer', 'TRANSACTION_ALREADY_EXISTS');
        }

        // Create transaction record
        const [createdTx] = await Transaction.create(
          [
            {
              finalAmount,
              buyer: currentOffer.offeredBy,
              seller: currentOffer.seller,
              vehicle: listingDoc.vehicleRef,
              listing: listingDoc._id,
              offerRef: currentOffer._id,
              transactionType: 'sale',
              acquisitionStatus: 'none',
              date: new Date(),
              notes,
            },
          ],
          { session }
        );
        transaction = createdTx;

        // Update listing sale status to 'sold'
        const prevSaleStatus = listingDoc.sale.status;
        listingDoc.sale.status = 'sold';
        listingDoc.statusHistory.push({
          fromStatus: prevSaleStatus,
          toStatus: 'sold',
          statusType: 'sale',
          changedBy: sellerUser._id,
          changedAt: new Date(),
          reason: `Sale completed via transaction ${transaction._id}`,
        });
        await listingDoc.save({ session });

        // Update offer status to 'completed'
        currentOffer.status = 'completed';
        currentOffer.awaitingResponseFrom = 'none';
        currentOffer.history.push({
          actor: sellerUser._id,
          action: 'completed',
          amount: finalAmount,
          message: notes || 'Sale transaction recorded and vehicle marked as sold',
          timestamp: new Date(),
        });
        await currentOffer.save({ session });
      });
    } catch (err) {
      if (err.code === 11000) {
        throw new ConflictError('A transaction has already been recorded for this offer', 'TRANSACTION_ALREADY_EXISTS');
      }
      throw err;
    } finally {
      await session.endSession();
    }

    // Post-commit notifications
    await notificationService.createNotification({
      recipient: offer.offeredBy,
      type: 'offer',
      title: 'Vehicle Purchase Completed',
      message: `The sale completion was confirmed by the seller for ${formatRupees(finalAmount)}. Congratulations on your purchase!`,
      relatedRef: {
        model: 'Transaction',
        id: transaction._id,
      },
    });

    await notificationService.createNotification({
      recipient: sellerUser._id,
      type: 'system',
      title: 'Sale Completed',
      message: `Your vehicle has been marked as sold for ${formatRupees(finalAmount)}.`,
      relatedRef: {
        model: 'Transaction',
        id: transaction._id,
      },
    });

    return transaction;
  }

  /**
   * Dealer initiates vehicle acquisition from an accepted offer.
   * Creates a transaction in 'acquisition_pending' state.
   */
  async createAcquisition(dealerUser, { offerId, notes = '' }) {
    if (dealerUser.accountStatus !== 'active') {
      throw new ForbiddenError('Deactivated accounts cannot acquire vehicles', 'ACCOUNT_DEACTIVATED');
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    if (offer.offeredBy.toString() !== dealerUser._id.toString() && dealerUser.role !== 'admin') {
      throw new ForbiddenError('Only the offering dealer can initiate vehicle acquisition', 'FORBIDDEN_NOT_BUYER');
    }

    if (offer.status !== 'accepted') {
      throw new ConflictError(
        `Cannot initiate acquisition: offer status is '${offer.status}', must be 'accepted'`,
        'INVALID_STATUS_TRANSITION'
      );
    }

    const listing = await Listing.findById(offer.listing);
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    if (listing.sale?.status === 'sold') {
      throw new ConflictError('Listing is already marked as sold', 'INVALID_STATUS_TRANSITION');
    }

    const session = await mongoose.startSession();
    let transaction;

    try {
      await session.withTransaction(async () => {
        // Serialization point: touch parent listing document first
        const listingDoc = await Listing.findOneAndUpdate(
          { _id: offer.listing },
          { $inc: { __v: 1 } },
          { session, new: true }
        );

        if (!listingDoc) {
          throw new NotFoundError('Listing not found');
        }

        if (listingDoc.sale?.status === 'sold') {
          throw new ConflictError('Listing is already marked as sold', 'INVALID_STATUS_TRANSITION');
        }

        const currentOffer = await Offer.findById(offerId).session(session);
        if (!currentOffer || currentOffer.status !== 'accepted') {
          throw new ConflictError(
            `Cannot initiate acquisition: offer status is '${currentOffer?.status}', must be 'accepted'`,
            'INVALID_STATUS_TRANSITION'
          );
        }

        const existingTx = await Transaction.findOne({ offerRef: currentOffer._id }).session(session);
        if (existingTx) {
          throw new ConflictError('An acquisition or transaction record already exists for this offer', 'TRANSACTION_ALREADY_EXISTS');
        }

        const [createdTx] = await Transaction.create(
          [
            {
              finalAmount: currentOffer.amount,
              buyer: dealerUser._id,
              seller: currentOffer.seller,
              vehicle: listingDoc.vehicleRef,
              listing: listingDoc._id,
              offerRef: currentOffer._id,
              transactionType: 'sale',
              acquisitionStatus: 'acquisition_pending',
              date: new Date(),
              notes: notes || 'Acquisition initiated by dealer',
            },
          ],
          { session }
        );
        transaction = createdTx;
      });
    } catch (err) {
      if (err.code === 11000) {
        throw new ConflictError('A transaction has already been recorded for this offer', 'TRANSACTION_ALREADY_EXISTS');
      }
      throw err;
    } finally {
      await session.endSession();
    }

    // Post-commit notification to owner
    await notificationService.createNotification({
      recipient: offer.seller,
      type: 'offer',
      title: 'Vehicle Acquisition Initiated',
      message: `A registered dealer has initiated the acquisition process for your vehicle. Please review and confirm the acquisition handover.`,
      relatedRef: {
        model: 'Transaction',
        id: transaction._id,
      },
    });

    return transaction;
  }

  /**
   * Updates an acquisition status: confirm ('acquired') or cancel ('cancelled').
   * On 'acquired':
   * - Old listing sale.status becomes 'sold'
   * - Old listing rental.status becomes 'inactive'
   * - Old listing moderationStatus stays unchanged
   * - Vehicle ownerRef moves to the dealer { type: 'dealer', id: dealerUser._id }
   * - Offer status transitions to 'completed'
   * On 'cancelled':
   * - If listing was reserved, unreserves to 'active'
   * - Offer status transitions to 'rejected'
   */
  async updateAcquisitionStatus(actorUser, transactionId, { action, notes = '' }) {
    if (actorUser.accountStatus !== 'active') {
      throw new ForbiddenError('Deactivated accounts cannot update transactions', 'ACCOUNT_DEACTIVATED');
    }

    let transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    const isSeller = transaction.seller.toString() === actorUser._id.toString();
    const isBuyer = transaction.buyer.toString() === actorUser._id.toString();
    const isAdmin = actorUser.capabilities?.includes('admin');

    if (!isSeller && !isBuyer && !isAdmin) {
      throw new ForbiddenError('You are not authorized to update this acquisition', 'FORBIDDEN_NOT_PARTICIPANT');
    }

    const targetStatus = action === 'confirm' ? 'acquired' : action === 'cancel' ? 'cancelled' : action;
    validateAcquisitionTransition(transaction.acquisitionStatus, targetStatus);

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // Serialization point: touch parent listing document first
        const listing = await Listing.findOneAndUpdate(
          { _id: transaction.listing },
          { $inc: { __v: 1 } },
          { session, new: true }
        );

        const currentTx = await Transaction.findById(transactionId).session(session);
        if (!currentTx) {
          throw new NotFoundError('Transaction not found');
        }
        validateAcquisitionTransition(currentTx.acquisitionStatus, targetStatus);

        const vehicle = await Vehicle.findById(currentTx.vehicle).session(session);
        const offer = await Offer.findById(currentTx.offerRef).session(session);

        if (targetStatus === 'acquired') {
          currentTx.acquisitionStatus = 'acquired';
          currentTx.notes = notes || currentTx.notes;
          await currentTx.save({ session });
          transaction = currentTx;

          if (listing) {
            const prevStatus = listing.sale.status;
            listing.sale.status = 'sold';
            if (listing.rental) {
              listing.rental.status = 'inactive';
            }
            listing.statusHistory.push({
              fromStatus: prevStatus,
              toStatus: 'sold',
              statusType: 'sale',
              changedBy: actorUser._id,
              changedAt: new Date(),
              reason: `Vehicle acquired by dealer (Transaction ${currentTx._id})`,
            });
            await listing.save({ session });
          }

          if (vehicle) {
            vehicle.ownerRef = {
              type: 'dealer',
              id: currentTx.buyer,
            };
            await vehicle.save({ session });
          }

          if (offer) {
            offer.status = 'completed';
            offer.awaitingResponseFrom = 'none';
            offer.history.push({
              actor: actorUser._id,
              action: 'completed',
              amount: currentTx.finalAmount,
              message: notes || 'Vehicle acquired by dealer; acquisition confirmed',
              timestamp: new Date(),
            });
            await offer.save({ session });
          }
        } else if (targetStatus === 'cancelled') {
          currentTx.acquisitionStatus = 'cancelled';
          currentTx.notes = notes || currentTx.notes;
          await currentTx.save({ session });
          transaction = currentTx;

          if (listing && listing.sale.status === 'reserved') {
            listing.sale.status = 'active';
            listing.statusHistory.push({
              fromStatus: 'reserved',
              toStatus: 'active',
              statusType: 'sale',
              changedBy: actorUser._id,
              changedAt: new Date(),
              reason: 'Acquisition cancelled; listing restored to active',
            });
            await listing.save({ session });
          }

          if (offer && offer.status === 'accepted') {
            offer.status = 'rejected';
            offer.awaitingResponseFrom = 'none';
            offer.history.push({
              actor: actorUser._id,
              action: 'rejected',
              amount: currentTx.finalAmount,
              message: notes || 'Acquisition cancelled',
              timestamp: new Date(),
            });
            await offer.save({ session });
          }
        }
      });
    } finally {
      await session.endSession();
    }

    // Post-commit notifications
    const otherParty = isSeller ? transaction.buyer : transaction.seller;
    const actionLabel = targetStatus === 'acquired' ? 'Confirmed' : 'Cancelled';

    await notificationService.createNotification({
      recipient: otherParty,
      type: 'offer',
      title: `Vehicle Acquisition ${actionLabel}`,
      message: `The acquisition for this vehicle has been ${targetStatus}.`,
      relatedRef: {
        model: 'Transaction',
        id: transaction._id,
      },
    });

    return transaction;
  }

  /**
   * Retrieves user's transaction history.
   */
  async getMyTransactions(user, query = {}) {
    const { page = 1, limit = 20 } = query;
    const filter = {
      $or: [{ buyer: user._id }, { seller: user._id }],
    };

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Transaction.find(filter)
        .populate('vehicle', 'brand model variant manufacturingYear images bodyType')
        .populate('buyer', 'fullName email')
        .populate('seller', 'fullName email')
        .populate('listing', 'purpose sale moderationStatus')
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page: Number(page),
      pageSize: Number(limit),
    };
  }
}

module.exports = new TransactionService();
