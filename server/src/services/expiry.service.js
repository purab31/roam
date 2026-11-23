const cron = require('node-cron');
const Listing = require('../models/listing.model');
const Offer = require('../models/offer.model');
const Booking = require('../models/booking.model');
const User = require('../models/user.model');
const Dealer = require('../models/dealer.model');
const settingsService = require('./settings.service');
const notificationService = require('./notification.service');
const { ForbiddenError, NotFoundError, BadRequestError, ConflictError } = require('../errors');

const DEFAULT_LISTING_EXPIRY_NOTICE_DAYS = 7;
const DEFAULT_NOTICE_PERIOD_DAYS = DEFAULT_LISTING_EXPIRY_NOTICE_DAYS;

/**
 * Checks for listings approaching expiry or already expired.
 * Idempotent and clock-injectable for unit & integration testing.
 *
 * @param {Object} options
 * @param {Function} options.clock - Optional function returning current Date
 * @param {number} options.noticeDays - Days before expiry to send approaching notification
 * @returns {Promise<{ warningsSent: number, expiredCount: number }>}
 */
async function checkListingExpiry({
  clock = () => new Date(),
  noticeDays = DEFAULT_NOTICE_PERIOD_DAYS,
} = {}) {
  const now = clock();
  let warningsSent = 0;
  let expiredCount = 0;

  // Retrieve approved listings that are not removed or admin-deactivated
  const candidateListings = await Listing.find({
    moderationStatus: 'approved',
    adminDeactivated: false,
    $or: [
      { 'sale.status': { $in: ['active', 'reserved'] } },
      { 'rental.status': 'active' },
      { 'sale.status': 'inactive', expiresAt: { $ne: null } },
    ],
  });

  for (const listing of candidateListings) {
    // 1. Mandatory Exclusions per business rules
    // a. Skip reserved listings
    if (listing.sale && listing.sale.status === 'reserved') {
      continue;
    }

    // b. Skip listings with an accepted offer
    const hasAcceptedOffer = await Offer.exists({
      listing: listing._id,
      status: 'accepted',
    });
    if (hasAcceptedOffer) {
      continue;
    }

    // c. Skip listings with confirmed or active rental bookings
    const hasActiveBooking = await Booking.exists({
      listing: listing._id,
      status: { $in: ['confirmed', 'active', 'modification_requested'] },
    });
    if (hasActiveBooking) {
      continue;
    }

    // d. Skip listings in review, admin-deactivated, or removed
    if (
      listing.moderationStatus === 'pending_review' ||
      listing.moderationStatus === 'removed' ||
      listing.adminDeactivated === true
    ) {
      continue;
    }

    // Handle listings without expiresAt: assign from now and NEVER expire in the same run
    let newlyAssignedExpiresAt = false;
    if (!listing.expiresAt) {
      const expiryDays = await settingsService.getListingExpiryDays();
      listing.expiresAt = new Date(now.getTime() + (expiryDays || 90) * 86400000);
      await listing.save();
      newlyAssignedExpiresAt = true;
    }

    if (newlyAssignedExpiresAt) {
      // Existing listing was just assigned an expiry date.
      // Must NEVER be expired or warned in the same run to prevent mass-deactivation.
      continue;
    }

    const expiresAt = new Date(listing.expiresAt);

    // 2. Already Expired: Deactivate through state machine
    if (expiresAt <= now) {
      const isCurrentlyActive =
        (listing.sale && listing.sale.status === 'active') ||
        (listing.rental && listing.rental.status === 'active');

      if (isCurrentlyActive) {
        if (listing.sale && listing.sale.status === 'active') {
          listing.sale.status = 'inactive';
        }
        if (listing.rental && listing.rental.status === 'active') {
          listing.rental.status = 'inactive';
        }

        listing.statusHistory.push({
          fromStatus: 'active',
          toStatus: 'inactive',
          statusType: listing.purpose === 'rent' ? 'rental' : 'sale',
          changedBy: listing.ownerRef.id,
          reason: 'Listing expired automatically by platform',
          changedAt: now,
        });

        await listing.save();
        expiredCount++;

        // Determine notification recipient (user ID)
        let recipientId = listing.ownerRef.id;
        if (listing.ownerRef.type === 'dealer') {
          const dealer = await Dealer.findById(listing.ownerRef.id).select('user');
          if (dealer && dealer.user) {
            recipientId = dealer.user;
          }
        }

        await notificationService.createNotification({
          recipient: recipientId,
          type: 'system',
          title: 'Listing Expired',
          message:
            'Your listing has reached its expiry date and is now inactive. You can renew it from My Listings at any time.',
          relatedRef: { model: 'Listing', id: listing._id },
        });
      }
      continue;
    }

    // 3. Approaching Expiry: Send notice if within noticeDays and not yet sent
    const noticeThreshold = new Date(now.getTime() + noticeDays * 86400000);
    if (expiresAt <= noticeThreshold && !listing.expiryWarningSent) {
      listing.expiryWarningSent = true;
      await listing.save();
      warningsSent++;

      let recipientId = listing.ownerRef.id;
      if (listing.ownerRef.type === 'dealer') {
        const dealer = await Dealer.findById(listing.ownerRef.id).select('user');
        if (dealer && dealer.user) {
          recipientId = dealer.user;
        }
      }

      const formattedExpiry = expiresAt.toISOString().split('T')[0];
      await notificationService.createNotification({
        recipient: recipientId,
        type: 'system',
        title: 'Listing Approaching Expiry',
        message: `Your listing will expire on ${formattedExpiry}. Renew it from My Listings to maintain uninterrupted visibility.`,
        relatedRef: { model: 'Listing', id: listing._id },
      });
    }
  }

  return { warningsSent, expiredCount };
}

/**
 * Renews an eligible listing for an additional period.
 *
 * Rules:
 * - Only listing owner or dealer owner can renew.
 * - Cannot renew admin-deactivated or removed listings.
 * - Resets expiryWarningSent to false.
 * - Restores only what expiry deactivated (never reserved/sold or admin-deactivated).
 * - Date calculation:
 *   - If renewed before expiry (expiresAt > now): old expiresAt + expiryDays.
 *   - If renewed after expiry (expiresAt <= now): now + expiryDays.
 *
 * @param {string} listingId
 * @param {Object} user - Authenticated user
 * @returns {Promise<Object>} Updated listing owner object
 */
async function renewListing(listingId, user, now = new Date()) {
  const listing = await Listing.findById(listingId);
  if (!listing) {
    throw new NotFoundError('Listing not found');
  }

  // Ownership verification
  const isIndividualOwner =
    listing.ownerRef.type === 'user' && listing.ownerRef.id.toString() === user._id.toString();

  let isDealerOwner = false;
  if (listing.ownerRef.type === 'dealer') {
    const dealer = await Dealer.findOne({ user: user._id });
    if (dealer && dealer._id.toString() === listing.ownerRef.id.toString()) {
      isDealerOwner = true;
    }
  }

  const isAdmin = user.capabilities && user.capabilities.includes('admin');

  if (!isIndividualOwner && !isDealerOwner && !isAdmin) {
    throw new ForbiddenError('You do not have permission to renew this listing');
  }

  // Deactivated and removed checks
  if (listing.adminDeactivated) {
    throw new ForbiddenError(
      'This listing was deactivated by an administrator and cannot be renewed directly',
      'ADMIN_DEACTIVATED'
    );
  }
  if (listing.moderationStatus === 'removed') {
    throw new BadRequestError('Removed listings cannot be renewed');
  }

  const expiryDays = await settingsService.getListingExpiryDays();
  const noticeDays = DEFAULT_LISTING_EXPIRY_NOTICE_DAYS;

  // Renewal eligibility check:
  // Allowed only within the expiry notice window or after expiry/inactivation.
  // Renewing earlier returns ConflictError (409).
  if (listing.expiresAt) {
    const expiresAt = new Date(listing.expiresAt);
    const noticeWindowStart = new Date(expiresAt.getTime() - noticeDays * 86400000);
    const isPurposeInactive =
      (listing.purpose === 'sale' && listing.sale && listing.sale.status === 'inactive') ||
      (listing.purpose === 'rent' && listing.rental && listing.rental.status === 'inactive') ||
      (listing.purpose === 'both' &&
        ((listing.sale && listing.sale.status === 'inactive') ||
          (listing.rental && listing.rental.status === 'inactive')));

    const isInactiveOrExpired = expiresAt <= now || isPurposeInactive;
    const isWithinNoticeWindow = now >= noticeWindowStart;

    if (!isInactiveOrExpired && !isWithinNoticeWindow) {
      throw new ConflictError(
        `Listing is not eligible for renewal yet. Renewal is only permitted within ${noticeDays} days of expiry or after expiry.`,
        'NOT_ELIGIBLE_FOR_RENEWAL'
      );
    }
  }

  // Renewal resets validity period from now (no stacking / unlimited extension)
  listing.expiresAt = new Date(now.getTime() + expiryDays * 86400000);

  // Reset expiry warning marker
  listing.expiryWarningSent = false;

  // Reactivate what expiry deactivated per listing purpose
  if (listing.purpose === 'sale' || listing.purpose === 'both') {
    if (listing.sale && listing.sale.status === 'inactive') {
      listing.sale.status = 'active';
    }
  }
  if (listing.purpose === 'rent' || listing.purpose === 'both') {
    if (listing.rental && listing.rental.status === 'inactive') {
      listing.rental.status = 'active';
    }
  }

  listing.statusHistory.push({
    fromStatus: 'inactive',
    toStatus: 'active',
    statusType: listing.purpose === 'rent' ? 'rental' : 'sale',
    changedBy: user._id,
    reason: `Listing renewed by owner for ${expiryDays} days`,
    changedAt: now,
  });

  await listing.save();
  return listing.toOwnerObject();
}

/**
 * Starts the daily node-cron background job for listing expiry.
 */
let cronTask = null;
function startExpiryCron() {
  if (cronTask) return cronTask;
  // Never run or schedule cron background timers in test environment
  if (process.env.NODE_ENV === 'test') return null;

  // Run every day at midnight (00:00)
  cronTask = cron.schedule('0 0 * * *', async () => {
    try {
      await checkListingExpiry();
    } catch (err) {
      console.error('[Roam Expiry Cron] Error running expiry check:', err);
    }
  });

  return cronTask;
}

module.exports = {
  checkListingExpiry,
  renewListing,
  startExpiryCron,
  DEFAULT_NOTICE_PERIOD_DAYS,
  DEFAULT_LISTING_EXPIRY_NOTICE_DAYS,
};
