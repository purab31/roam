const mongoose = require('mongoose');
const Booking = require('../models/booking.model');
const Listing = require('../models/listing.model');
const UnavailableDate = require('../models/unavailableDate.model');
const Notification = require('../models/notification.model');
const Transaction = require('../models/transaction.model');
const { calculateRentalEstimate } = require('./rentalPricing');
const { checkAvailability, getListingAvailabilityWindow } = require('./availability.service');
const { transitionBookingStatus } = require('./bookingStateMachine');
const {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} = require('../errors');

class BookingService {
  /**
   * Submits a new rental booking request.
   */
  async createBooking(bookingData, user) {
    const { listingId, startDate, endDate, notes } = bookingData;

    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new NotFoundError('Rental listing not found');
    }

    if (listing.purpose !== 'rent' && listing.purpose !== 'both') {
      throw new ValidationError('This listing is not available for rent');
    }

    if (listing.rental?.status !== 'active') {
      throw new ConflictError(
        'Rental is currently inactive on this vehicle',
        'RENTAL_INACTIVE'
      );
    }

    // Spec: Cannot book own listing
    const isOwner =
      listing.ownerRef.id.toString() === user._id.toString() ||
      (user.dealerId && listing.ownerRef.id.toString() === user.dealerId.toString());

    if (isOwner) {
      throw new ForbiddenError(
        'You cannot submit a booking request for your own listing',
        'CANNOT_BOOK_OWN_LISTING'
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationError('Invalid start or end date format');
    }

    if (end <= start) {
      throw new ValidationError('Return date must be strictly after pickup date');
    }

    // Pricing snapshot
    const pricing = calculateRentalEstimate(listing, start, end);

    // Min and max duration validation
    const minDays = listing.rental?.minDays || 1;
    const maxDays = listing.rental?.maxDays || 365;

    if (pricing.days < minDays) {
      throw new ValidationError(
        `Rental duration of ${pricing.days} days is below the minimum required duration of ${minDays} days`
      );
    }

    if (pricing.days > maxDays) {
      throw new ValidationError(
        `Rental duration of ${pricing.days} days exceeds the maximum allowed duration of ${maxDays} days`
      );
    }

    // Availability conflict check at request time (warn)
    const availabilityCheck = await checkAvailability(listingId, start, end);

    const booking = new Booking({
      renter: user._id,
      listing: listingId,
      ownerRef: listing.ownerRef,
      startDate: start,
      endDate: end,
      pricing: {
        baseRate: pricing.baseRate,
        days: pricing.days,
        additionalCharges: pricing.additionalCharges,
        deposit: pricing.deposit,
        estimatedTotal: pricing.estimatedTotal,
      },
      notes: notes || '',
      status: 'requested',
      statusHistory: [
        {
          fromStatus: 'none',
          toStatus: 'requested',
          changedBy: user._id,
          changedAt: new Date(),
          reason: availabilityCheck.isAvailable
            ? 'Booking request submitted'
            : `Booking request submitted with conflict warning: ${availabilityCheck.conflictReason}`,
        },
      ],
    });

    await booking.save();

    // Create in-app notification for owner/dealer
    await Notification.create({
      recipient: listing.ownerRef.id,
      type: 'rental',
      title: 'New Rental Booking Request',
      message: `${user.fullName || 'A renter'} requested a rental from ${start.toDateString()} to ${end.toDateString()} (${pricing.days} days).`,
      relatedRef: {
        model: 'Booking',
        id: booking._id,
      },
    });

    const populated = await Booking.findById(booking._id)
      .populate('renter', 'fullName email mobile')
      .populate({
        path: 'listing',
        populate: { path: 'vehicleRef' },
      });

    const responseData = populated.toJSON();
    responseData.availabilityWarning = availabilityCheck.isAvailable
      ? null
      : availabilityCheck.conflictReason;
    responseData.hasPendingOverlaps = availabilityCheck.hasPendingOverlaps;

    return responseData;
  }

  /**
   * Retrieves bookings based on role, view, and filters.
   */
  async getBookings(user, query = {}) {
    const { role = 'renter', view, status, listingId, page = 1, limit = 20 } = query;
    const filter = {};

    if (status) {
      filter.status = status;
    } else if (view) {
      const now = new Date();
      if (view === 'upcoming') {
        filter.status = { $in: ['confirmed', 'modification_requested', 'requested', 'pending'] };
        filter.endDate = { $gte: now };
      } else if (view === 'active') {
        filter.status = 'active';
      } else if (view === 'completed') {
        filter.status = 'completed';
      } else if (view === 'cancelled') {
        filter.status = { $in: ['cancelled', 'rejected'] };
      }
    }

    if (listingId) {
      filter.listing = listingId;
    }

    if (user.capabilities?.includes('admin') && role === 'admin') {
      // Admin can see everything
    } else if (role === 'owner' || role === 'dealer') {
      const ownerId = user.dealerId || user._id;
      filter['ownerRef.id'] = ownerId;
    } else {
      // Default: bookings submitted as renter
      filter.renter = user._id;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Booking.find(filter)
        .populate('renter', 'fullName email mobile')
        .populate({
          path: 'listing',
          populate: { path: 'vehicleRef' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Booking.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page: Number(page),
      pageSize: Number(limit),
    };
  }

  /**
   * Retrieves single booking by ID with permission checks.
   */
  async getBookingById(id, user) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Booking not found');
    }

    const booking = await Booking.findById(id)
      .populate('renter', 'fullName email mobile')
      .populate({
        path: 'listing',
        populate: { path: 'vehicleRef' },
      });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    const isRenter = booking.renter._id.toString() === user._id.toString();
    const isOwner =
      booking.ownerRef.id.toString() === user._id.toString() ||
      (user.dealerId && booking.ownerRef.id.toString() === user.dealerId.toString());
    const isAdmin = user.capabilities?.includes('admin');

    if (!isRenter && !isOwner && !isAdmin) {
      throw new ForbiddenError('You do not have access to view this booking');
    }

    return booking;
  }

  /**
   * Updates booking status (accept, reject, cancel, handover/activate, return/complete).
   * Inside a transaction: enforce atomic preconditions, conflict checks, and transaction record creation.
   */
  async updateBookingStatus(id, updateParams, user) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Booking not found');
    }

    const { action, status, reason } = updateParams;

    // Map action to target status if provided
    let targetStatus = status;
    if (action === 'accept') targetStatus = 'confirmed';
    if (action === 'reject') targetStatus = 'rejected';
    if (action === 'cancel') targetStatus = 'cancelled';
    if (action === 'activate' || action === 'handover') targetStatus = 'active';
    if (action === 'complete' || action === 'return') targetStatus = 'completed';

    if (!targetStatus) {
      throw new ValidationError('A valid action or target status must be provided');
    }

    let updatedBooking = null;
    const postCommitNotifications = [];

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const existing = await Booking.findById(id).session(session);
        if (!existing) {
          throw new NotFoundError('Booking not found');
        }

        const isRenter = existing.renter.toString() === user._id.toString();
        const isOwner =
          existing.ownerRef.id.toString() === user._id.toString() ||
          (user.dealerId && existing.ownerRef.id.toString() === user.dealerId.toString());
        const isAdmin = user.capabilities?.includes('admin');

        // 1. Handover (activate): atomic update with precondition status === 'confirmed' (Adjustment 8)
        if (targetStatus === 'active') {
          if (!isOwner && !isAdmin) {
            throw new ForbiddenError(
              'Only the vehicle owner or dealership can mark the vehicle as handed over'
            );
          }

          const atomicBooking = await Booking.findOneAndUpdate(
            { _id: id, status: 'confirmed' },
            {
              $set: { status: 'active' },
              $push: {
                statusHistory: {
                  fromStatus: 'confirmed',
                  toStatus: 'active',
                  changedBy: user._id,
                  changedAt: new Date(),
                  reason: reason || 'Vehicle handed over to renter',
                },
              },
            },
            { session, new: true }
          );

          if (!atomicBooking) {
            throw new ConflictError(
              'Cannot hand over vehicle: booking must be in confirmed status',
              'INVALID_STATUS_TRANSITION'
            );
          }

          updatedBooking = atomicBooking;
          postCommitNotifications.push({
            recipient: atomicBooking.renter,
            type: 'rental',
            title: 'Vehicle Handed Over (Rental Active)',
            message: `Your rental has started! The vehicle has been marked as handed over.`,
            relatedRef: { model: 'Booking', id: atomicBooking._id },
          });
          return;
        }

        // 2. Return (complete): atomic update with precondition status === 'active' (Adjustment 8)
        if (targetStatus === 'completed') {
          if (!isOwner && !isAdmin) {
            throw new ForbiddenError(
              'Only the vehicle owner or dealership can mark a rental as returned and completed'
            );
          }

          const atomicBooking = await Booking.findOneAndUpdate(
            { _id: id, status: 'active' },
            {
              $set: { status: 'completed' },
              $push: {
                statusHistory: {
                  fromStatus: 'active',
                  toStatus: 'completed',
                  changedBy: user._id,
                  changedAt: new Date(),
                  reason: reason || 'Vehicle returned and rental completed',
                },
              },
            },
            { session, new: true }
          );

          if (!atomicBooking) {
            throw new ConflictError(
              'Cannot complete booking: booking must be currently active (in progress)',
              'INVALID_STATUS_TRANSITION'
            );
          }

          updatedBooking = atomicBooking;

          // Adjustment 6: Transaction finalAmount must equal calculated rental total shown to renter (excluding deposit)
          const rentalTotal =
            atomicBooking.pricing.baseRate + (atomicBooking.pricing.additionalCharges || 0);
          const listing = await Listing.findById(atomicBooking.listing).session(session);

          await Transaction.create(
            [
              {
                finalAmount: rentalTotal,
                buyer: atomicBooking.renter,
                seller: atomicBooking.ownerRef.id,
                vehicle: listing ? listing.vehicleRef : atomicBooking.listing,
                listing: atomicBooking.listing,
                bookingRef: atomicBooking._id,
                deposit: atomicBooking.pricing.deposit || 0,
                rentalPeriod: {
                  startDate: atomicBooking.startDate,
                  endDate: atomicBooking.endDate,
                },
                transactionType: 'rental',
                date: new Date(),
                notes: reason || `Rental completed for booking ${atomicBooking._id}`,
              },
            ],
            { session }
          );

          postCommitNotifications.push({
            recipient: atomicBooking.renter,
            type: 'rental',
            title: 'Rental Completed',
            message: `Your rental has been marked as returned and completed. Thank you!`,
            relatedRef: { model: 'Booking', id: atomicBooking._id },
          });
          return;
        }

        // 3. Accept and Reject: owner/dealer/admin only
        if (targetStatus === 'confirmed' || targetStatus === 'rejected') {
          if (!isOwner && !isAdmin) {
            throw new ForbiddenError(
              'Only the vehicle owner or dealership can accept or reject rental booking requests'
            );
          }
        }

        // 4. Cancel: renter, owner/dealer, or admin
        if (targetStatus === 'cancelled') {
          if (!isRenter && !isOwner && !isAdmin) {
            throw new ForbiddenError('You do not have permission to cancel this booking');
          }

          // Adjustment 5: Cancellation cutoff hours check for renters on confirmed bookings
          if (existing.status === 'confirmed' && isRenter && !isOwner && !isAdmin) {
            const listing = await Listing.findById(existing.listing).session(session);
            const cutoffHours =
              listing?.rental?.cancellationCutoffHours !== undefined
                ? listing.rental.cancellationCutoffHours
                : 24;
            const cutoffMs = cutoffHours * 60 * 60 * 1000;
            const cutoffTime = new Date(existing.startDate.getTime() - cutoffMs);

            if (Date.now() > cutoffTime.getTime()) {
              throw new ConflictError(
                `Cancellation window expired. Confirmed bookings can only be cancelled up to ${cutoffHours} hours before pickup.`,
                'CANCELLATION_WINDOW_EXPIRED'
              );
            }
          }
        }

        // 5. Enforce availability conflict check inside transaction when confirming
        if (targetStatus === 'confirmed') {
          // Touch parent listing with increment to serialize concurrent accepts on this vehicle
          await Listing.findOneAndUpdate(
            { _id: existing.listing },
            { $inc: { __v: 1 } },
            { session }
          );

          const availability = await checkAvailability(
            existing.listing,
            existing.startDate,
            existing.endDate,
            { excludeBookingId: existing._id, session }
          );

          if (!availability.isAvailable) {
            throw new ConflictError(
              `Cannot confirm booking: ${availability.conflictReason || 'date conflict detected with another confirmed reservation or blocked date'}`,
              'RENTAL_DATE_CONFLICT'
            );
          }
        }

        // Apply state transition via state machine
        transitionBookingStatus(existing, targetStatus, {
          user,
          reason: reason || `Status changed via ${action || targetStatus}`,
        });

        await existing.save({ session });
        updatedBooking = existing;

        // Prepare post-commit notifications (Adjustment 13)
        if (targetStatus === 'confirmed') {
          postCommitNotifications.push({
            recipient: existing.renter,
            type: 'rental',
            title: 'Booking Confirmed!',
            message: `Your rental booking request for ${existing.startDate.toDateString()} to ${existing.endDate.toDateString()} has been accepted.`,
            relatedRef: { model: 'Booking', id: existing._id },
          });
        } else if (targetStatus === 'rejected') {
          postCommitNotifications.push({
            recipient: existing.renter,
            type: 'rental',
            title: 'Booking Request Declined',
            message: `Your rental booking request was declined${reason ? `: ${reason}` : '.'}`,
            relatedRef: { model: 'Booking', id: existing._id },
          });
        } else if (targetStatus === 'cancelled') {
          const notifyRecipient = isRenter ? existing.ownerRef.id : existing.renter;
          postCommitNotifications.push({
            recipient: notifyRecipient,
            type: 'rental',
            title: 'Booking Cancelled',
            message: `Rental booking for ${existing.startDate.toDateString()} to ${existing.endDate.toDateString()} has been cancelled${reason ? `: ${reason}` : '.'}`,
            relatedRef: { model: 'Booking', id: existing._id },
          });
        }
      });
    } finally {
      await session.endSession();
    }

    // Emit notifications AFTER transaction commits (Adjustment 13)
    for (const notif of postCommitNotifications) {
      await Notification.create(notif).catch(() => {});
    }

    return Booking.findById(updatedBooking._id)
      .populate('renter', 'fullName email mobile')
      .populate({
        path: 'listing',
        populate: { path: 'vehicleRef' },
      });
  }

  /**
   * Handles date modification requests (renter submit, owner approve/reject).
   * Atomically verifies availability (excluding self) and recalculates pricing.
   */
  async handleBookingModification(id, modificationParams, user) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Booking not found');
    }

    const { startDate: newStartStr, endDate: newEndStr, action, reason } = modificationParams;

    const existing = await Booking.findById(id);
    if (!existing) {
      throw new NotFoundError('Booking not found');
    }

    const isRenter = existing.renter.toString() === user._id.toString();
    const isOwner =
      existing.ownerRef.id.toString() === user._id.toString() ||
      (user.dealerId && existing.ownerRef.id.toString() === user.dealerId.toString());
    const isAdmin = user.capabilities?.includes('admin');

    // Case 1: Renter submits date modification request
    if (newStartStr && newEndStr) {
      if (!isRenter && !isAdmin) {
        throw new ForbiddenError('Only the renter can request booking date modifications');
      }

      if (existing.status !== 'confirmed') {
        throw new ConflictError(
          `Modifications can only be requested for confirmed bookings. Current status: '${existing.status}'`,
          'INVALID_STATUS_TRANSITION'
        );
      }

      // Modification requests are allowed only before pickup (Adjustment 7)
      if (new Date(existing.startDate).getTime() <= Date.now()) {
        throw new ConflictError(
          'Date modification requests can only be submitted before pickup',
          'MODIFICATION_NOT_ALLOWED'
        );
      }

      const newStart = new Date(newStartStr);
      const newEnd = new Date(newEndStr);

      if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
        throw new ValidationError('Valid start and end dates are required');
      }
      if (newEnd <= newStart) {
        throw new ValidationError('Return date must be strictly after pickup date');
      }

      const listing = await Listing.findById(existing.listing);
      if (!listing) {
        throw new NotFoundError('Listing not found');
      }

      // Check min/max days
      const days = Math.max(1, Math.ceil((newEnd.getTime() - newStart.getTime()) / (1000 * 60 * 60 * 24)));
      const minDays = listing.rental?.minDays || 1;
      const maxDays = listing.rental?.maxDays || 30;

      if (days < minDays) {
        throw new ValidationError(`Rental duration must be at least ${minDays} day(s)`);
      }
      if (days > maxDays) {
        throw new ValidationError(`Rental duration cannot exceed ${maxDays} days`);
      }

      // Recalculate proposed pricing estimate
      const proposedPricing = calculateRentalEstimate(listing, newStart, newEnd);

      existing.pendingModification = {
        startDate: newStart,
        endDate: newEnd,
        pricing: {
          baseRate: proposedPricing.baseRate,
          days: proposedPricing.days,
          additionalCharges: proposedPricing.additionalCharges,
          deposit: proposedPricing.deposit,
          estimatedTotal: proposedPricing.estimatedTotal,
        },
        reason: reason || '',
        requestedAt: new Date(),
      };

      transitionBookingStatus(existing, 'modification_requested', {
        user,
        reason: reason || 'Renter requested date modification',
      });

      await existing.save();

      // Post-save notification to owner (Adjustment 13)
      await Notification.create({
        recipient: existing.ownerRef.id,
        type: 'rental',
        title: 'Rental Date Modification Requested',
        message: `${user.fullName || 'The renter'} requested to change dates to ${newStart.toDateString()} – ${newEnd.toDateString()} (${days} days).`,
        relatedRef: { model: 'Booking', id: existing._id },
      }).catch(() => {});

      return Booking.findById(existing._id)
        .populate('renter', 'fullName email mobile')
        .populate({ path: 'listing', populate: { path: 'vehicleRef' } });
    }

    // Case 2: Owner/Dealer/Admin responds to modification request (approve or reject)
    if (action === 'approve' || action === 'reject') {
      if (!isOwner && !isAdmin) {
        throw new ForbiddenError('Only the vehicle owner or dealership can approve or reject modifications');
      }

      if (existing.status !== 'modification_requested' || !existing.pendingModification) {
        throw new ConflictError(
          'No pending date modification to review for this booking',
          'INVALID_STATUS_TRANSITION'
        );
      }

      let updatedBooking = null;
      const postCommitNotifications = [];

      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const booking = await Booking.findById(id).session(session);
          if (!booking || booking.status !== 'modification_requested' || !booking.pendingModification) {
            throw new ConflictError(
              'No pending date modification to review for this booking',
              'INVALID_STATUS_TRANSITION'
            );
          }

          const listing = await Listing.findById(booking.listing).session(session);

          if (action === 'approve') {
            // Touch Listing.__v to serialize modification approval with accepts
            await Listing.findOneAndUpdate(
              { _id: booking.listing },
              { $inc: { __v: 1 } },
              { session }
            );

            // Re-run availability check excluding the booking itself (Adjustment 2 & 7)
            const availability = await checkAvailability(
              booking.listing,
              booking.pendingModification.startDate,
              booking.pendingModification.endDate,
              { excludeBookingId: booking._id, session }
            );

            if (!availability.isAvailable) {
              throw new ConflictError(
                `Cannot approve modification: ${availability.conflictReason || 'date conflict detected with another confirmed reservation or blocked date'}`,
                'RENTAL_DATE_CONFLICT'
              );
            }

            // Recalculate estimate with calculateRentalEstimate again on approval (Adjustment 7)
            const freshPricing = calculateRentalEstimate(
              listing,
              booking.pendingModification.startDate,
              booking.pendingModification.endDate
            );

            // Append to modificationHistory
            booking.modificationHistory.push({
              previousStartDate: booking.startDate,
              previousEndDate: booking.endDate,
              previousPricing: booking.pricing,
              proposedStartDate: booking.pendingModification.startDate,
              proposedEndDate: booking.pendingModification.endDate,
              proposedPricing: freshPricing,
              action: 'approved',
              actionAt: new Date(),
              actionBy: user._id,
              reason: reason || 'Modification approved by owner',
            });

            // Update booking dates and pricing to approved values
            booking.startDate = booking.pendingModification.startDate;
            booking.endDate = booking.pendingModification.endDate;
            booking.pricing = {
              baseRate: freshPricing.baseRate,
              days: freshPricing.days,
              additionalCharges: freshPricing.additionalCharges,
              deposit: freshPricing.deposit,
              estimatedTotal: freshPricing.estimatedTotal,
            };
            booking.pendingModification = null;

            // Transition status back to confirmed
            transitionBookingStatus(booking, 'confirmed', {
              user,
              reason: reason || 'Date modification approved',
            });

            await booking.save({ session });
            updatedBooking = booking;

            postCommitNotifications.push({
              recipient: booking.renter,
              type: 'rental',
              title: 'Booking Modification Approved!',
              message: `Your booking date change has been approved. New dates: ${booking.startDate.toDateString()} to ${booking.endDate.toDateString()}.`,
              relatedRef: { model: 'Booking', id: booking._id },
            });
          } else {
            // Rejection: restore confirmed status with existing dates
            booking.modificationHistory.push({
              previousStartDate: booking.startDate,
              previousEndDate: booking.endDate,
              previousPricing: booking.pricing,
              proposedStartDate: booking.pendingModification.startDate,
              proposedEndDate: booking.pendingModification.endDate,
              proposedPricing: booking.pendingModification.pricing,
              action: 'rejected',
              actionAt: new Date(),
              actionBy: user._id,
              reason: reason || 'Modification rejected by owner',
            });

            booking.pendingModification = null;

            transitionBookingStatus(booking, 'confirmed', {
              user,
              reason: reason || 'Date modification declined by owner',
            });

            await booking.save({ session });
            updatedBooking = booking;

            postCommitNotifications.push({
              recipient: booking.renter,
              type: 'rental',
              title: 'Booking Modification Declined',
              message: `Your request to change booking dates was declined${reason ? `: ${reason}` : '.'} Existing dates remain confirmed.`,
              relatedRef: { model: 'Booking', id: booking._id },
            });
          }
        });
      } finally {
        await session.endSession();
      }

      // Emit notifications AFTER transaction commits (Adjustment 13)
      for (const notif of postCommitNotifications) {
        await Notification.create(notif).catch(() => {});
      }

      return Booking.findById(updatedBooking._id)
        .populate('renter', 'fullName email mobile')
        .populate({ path: 'listing', populate: { path: 'vehicleRef' } });
    }

    throw new ValidationError('Invalid modification payload: provide new dates or an action (approve/reject)');
  }

  /**
   * Retrieves rental earnings and statistics for owner or dealer.
   * Reports recorded amounts from completed rentals only (Adjustment 10 & 11).
   */
  async getRentalSummary(user) {
    const ownerId = user.dealerId || user._id;

    const [completedBookings, activeCount, upcomingCount, pendingRequestsCount] =
      await Promise.all([
        Booking.find({ 'ownerRef.id': ownerId, status: 'completed' }),
        Booking.countDocuments({ 'ownerRef.id': ownerId, status: 'active' }),
        Booking.countDocuments({
          'ownerRef.id': ownerId,
          status: { $in: ['confirmed', 'modification_requested'] },
          endDate: { $gte: new Date() },
        }),
        Booking.countDocuments({
          'ownerRef.id': ownerId,
          status: { $in: ['requested', 'pending'] },
        }),
      ]);

    // Total earnings from recorded amounts only, excluding deposits (Adjustment 10)
    const totalEarnings = completedBookings.reduce(
      (sum, b) => sum + (b.pricing.baseRate + (b.pricing.additionalCharges || 0)),
      0
    );

    // Compute real 6-period monthly series for sparkline (Adjustment 11)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const recentEarnings = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const y = d.getFullYear();
      const label = `${monthNames[mIdx]} '${String(y).slice(-2)}`;

      const mStart = new Date(y, mIdx, 1);
      const mEnd = new Date(y, mIdx + 1, 0, 23, 59, 59, 999);

      const mEarnings = completedBookings
        .filter(b => {
          const compDate = new Date(b.updatedAt || b.endDate);
          return compDate >= mStart && compDate <= mEnd;
        })
        .reduce((sum, b) => sum + (b.pricing.baseRate + (b.pricing.additionalCharges || 0)), 0);

      recentEarnings.push({ label, amount: mEarnings });
    }

    return {
      totalEarnings, // integer minor units (paise)
      completedCount: completedBookings.length,
      activeCount,
      upcomingCount,
      pendingRequestsCount,
      recentEarnings,
    };
  }

  /**
   * Adds an unavailable date block for a listing.
   * Rejects ranges that overlap confirmed/active/modification_requested bookings with 409 (Adjustment 9).
   */
  async addUnavailableDate(listingId, dateData, user) {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    const isOwner =
      listing.ownerRef.id.toString() === user._id.toString() ||
      (user.dealerId && listing.ownerRef.id.toString() === user.dealerId.toString()) ||
      user.capabilities?.includes('admin');

    if (!isOwner) {
      throw new ForbiddenError('You can only manage unavailable dates for your own listings');
    }

    const start = new Date(dateData.startDate);
    const end = new Date(dateData.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationError('Valid start and end dates are required');
    }
    if (end <= start) {
      throw new ValidationError('End date must be strictly after start date');
    }

    // Adjustment 9: Reject ranges that overlap confirmed/active bookings with 409
    const conflict = await Booking.findOne({
      listing: listingId,
      status: { $in: ['confirmed', 'active', 'modification_requested'] },
      startDate: { $lt: end },
      endDate: { $gt: start },
    });

    if (conflict) {
      throw new ConflictError(
        'Cannot block dates: overlaps an existing confirmed or active rental booking',
        'BLOCKED_DATE_CONFLICT'
      );
    }

    const record = await UnavailableDate.create({
      listing: listingId,
      startDate: start,
      endDate: end,
      reason: dateData.reason || 'Blocked by owner',
      createdBy: user._id,
    });

    return record;
  }

  /**
   * Retrieves unavailable dates for owner/dealer management (includes notes).
   */
  async getListingUnavailableDates(listingId, user) {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    const isOwner =
      listing.ownerRef.id.toString() === user._id.toString() ||
      (user.dealerId && listing.ownerRef.id.toString() === user.dealerId.toString()) ||
      user.capabilities?.includes('admin');

    if (!isOwner) {
      throw new ForbiddenError('You can only view blocked dates for your own listings');
    }

    return UnavailableDate.find({ listing: listingId }).sort({ startDate: 1 });
  }

  /**
   * Deletes an unavailable date block.
   */
  async deleteUnavailableDate(listingId, dateId, user) {
    const record = await UnavailableDate.findOne({ _id: dateId, listing: listingId });
    if (!record) {
      throw new NotFoundError('Unavailable date record not found');
    }

    const listing = await Listing.findById(listingId);
    const isOwner =
      listing &&
      (listing.ownerRef.id.toString() === user._id.toString() ||
        (user.dealerId && listing.ownerRef.id.toString() === user.dealerId.toString()) ||
        user.capabilities?.includes('admin'));

    if (!isOwner) {
      throw new ForbiddenError('You can only remove unavailable dates for your own listings');
    }

    await UnavailableDate.findByIdAndDelete(dateId);
    return { success: true, message: 'Unavailable date range removed' };
  }

  /**
   * Returns availability window for calendar UI (dates only, no owner notes per Adjustment 9).
   */
  async getAvailability(listingId, from, to) {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    return getListingAvailabilityWindow(listingId, from, to);
  }
}

module.exports = new BookingService();
