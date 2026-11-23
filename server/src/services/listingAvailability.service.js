const Listing = require('../models/listing.model');
const User = require('../models/user.model');
const Dealer = require('../models/dealer.model');

/**
 * Checks whether a listing is available for public engagement
 * (Favourites, Compare, Recently Viewed, Inspection requests).
 *
 * A listing is UNAVAILABLE when:
 * 1. Owner user is blocked
 * 2. Dealer is suspended or revoked
 * 3. Listing is in review (pending_review), admin-deactivated, or removed
 *
 * @param {Object} listing - Populated or unpopulated Listing document/object
 * @returns {Promise<boolean>}
 */
async function isListingAvailable(listing) {
  if (!listing) return false;

  // 1. Listing moderation & admin status checks
  if (
    listing.moderationStatus === 'pending_review' ||
    listing.moderationStatus === 'removed' ||
    listing.moderationStatus === 'draft' ||
    listing.adminDeactivated === true
  ) {
    return false;
  }

  // 2. Owner checks
  const ownerRef = listing.ownerRef;
  if (!ownerRef) return false;

  if (ownerRef.type === 'dealer') {
    // If dealer object already populated
    if (ownerRef.id && typeof ownerRef.id === 'object' && ownerRef.id.verificationStatus) {
      if (
        ownerRef.id.verificationStatus === 'suspended' ||
        ownerRef.id.verificationStatus === 'revoked'
      ) {
        return false;
      }
    } else {
      const dealer = await Dealer.findById(ownerRef.id).select('verificationStatus user');
      if (!dealer) return false;
      if (dealer.verificationStatus === 'suspended' || dealer.verificationStatus === 'revoked') {
        return false;
      }
      // Check dealer's underlying user account status
      if (dealer.user) {
        const dealerUser = await User.findById(dealer.user).select('accountStatus');
        if (dealerUser && dealerUser.accountStatus === 'blocked') {
          return false;
        }
      }
    }
  } else {
    // Individual user owner
    if (ownerRef.id && typeof ownerRef.id === 'object' && ownerRef.id.accountStatus) {
      if (ownerRef.id.accountStatus === 'blocked') {
        return false;
      }
    } else {
      const user = await User.findById(ownerRef.id).select('accountStatus');
      if (!user || user.accountStatus === 'blocked') {
        return false;
      }
    }
  }

  return true;
}

module.exports = {
  isListingAvailable,
};
