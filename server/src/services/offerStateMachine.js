const { ConflictError, ForbiddenError } = require('../errors');

/**
 * State machine for Roam purchase offers per Spec 7, 18.2, 22.4 & Sprint 4 rules.
 * Guards actor turns (awaitingResponseFrom), valid lifecycle transitions, and listing states.
 */

const TERMINAL_STATUSES = ['rejected', 'withdrawn', 'expired', 'completed'];

/**
 * Validates that an offer can be submitted against a listing.
 * @param {Object} listing
 * @param {Object} buyerUser
 */
function validateOfferCreation(listing, buyerUser) {
  if (buyerUser.accountStatus !== 'active') {
    throw new ForbiddenError('Deactivated or suspended accounts cannot submit offers', 'ACCOUNT_DEACTIVATED');
  }

  const sellerId = listing.ownerRef?.id ? listing.ownerRef.id.toString() : null;
  if (sellerId && sellerId === buyerUser._id.toString()) {
    throw new ForbiddenError('You cannot submit an offer on your own vehicle listing', 'FORBIDDEN_SELF_OFFER');
  }

  if (listing.moderationStatus !== 'approved') {
    throw new ConflictError(
      `Cannot offer on listing with moderation status '${listing.moderationStatus}'`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  if (listing.purpose !== 'sale' && listing.purpose !== 'both') {
    throw new ConflictError(
      `Listing purpose is '${listing.purpose}', which does not accept purchase offers`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  const saleStatus = listing.sale?.status;
  if (saleStatus !== 'active') {
    throw new ConflictError(
      `Cannot offer on vehicle with sale status '${saleStatus}'. Vehicle is not available for offers.`,
      'INVALID_STATUS_TRANSITION'
    );
  }
}

/**
 * Validates and computes the next status and awaitingResponseFrom for an offer action.
 * @param {Object} offer
 * @param {string} toAction ('accepted' | 'rejected' | 'counteroffer_made' | 'withdrawn' | 'completed')
 * @param {Object} actorUser
 * @returns {{ nextStatus: string, nextAwaiting: string }}
 */
function validateAndComputeTransition(offer, toAction, actorUser) {
  const currentStatus = offer.status;
  const actorId = actorUser._id.toString();
  const isSeller = offer.seller.toString() === actorId;
  const isBuyer = offer.offeredBy.toString() === actorId;

  if (!isSeller && !isBuyer && actorUser.role !== 'admin') {
    throw new ForbiddenError('You are not a participant in this offer negotiation', 'FORBIDDEN_NOT_PARTICIPANT');
  }

  if (TERMINAL_STATUSES.includes(currentStatus)) {
    throw new ConflictError(
      `Cannot transition offer: current status '${currentStatus}' is terminal`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  // Completing an offer
  if (toAction === 'completed') {
    if (currentStatus !== 'accepted') {
      throw new ConflictError(
        `Cannot complete offer in status '${currentStatus}', must be 'accepted'`,
        'INVALID_STATUS_TRANSITION'
      );
    }
    return { nextStatus: 'completed', nextAwaiting: 'none' };
  }

  // If already accepted, no other action is permitted
  if (currentStatus === 'accepted') {
    throw new ConflictError(
      `Cannot ${toAction} an offer that has already been accepted`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  // Withdrawing an offer (offerer only)
  if (toAction === 'withdrawn') {
    if (!isBuyer && actorUser.role !== 'admin') {
      throw new ForbiddenError('Only the offering buyer can withdraw this offer', 'FORBIDDEN_NOT_ACTOR');
    }
    return { nextStatus: 'withdrawn', nextAwaiting: 'none' };
  }

  // For accept, reject, or counter: check awaitingResponseFrom
  const expectedTurn = offer.awaitingResponseFrom; // 'seller' or 'buyer'

  if (expectedTurn === 'seller' && !isSeller && actorUser.role !== 'admin') {
    throw new ForbiddenError(
      'It is not your turn to respond to this offer. Awaiting seller response.',
      'FORBIDDEN_WRONG_ACTOR'
    );
  }

  if (expectedTurn === 'buyer' && !isBuyer && actorUser.role !== 'admin') {
    throw new ForbiddenError(
      'It is not your turn to respond to this offer. Awaiting buyer response.',
      'FORBIDDEN_WRONG_ACTOR'
    );
  }

  switch (toAction) {
    case 'accepted':
      return { nextStatus: 'accepted', nextAwaiting: 'none' };

    case 'rejected':
      return { nextStatus: 'rejected', nextAwaiting: 'none' };

    case 'counteroffer_made': {
      // Flip the turn to the other party
      const nextAwaiting = isSeller ? 'buyer' : 'seller';
      return { nextStatus: 'counteroffer_made', nextAwaiting };
    }

    default:
      throw new ConflictError(`Unknown offer transition action '${toAction}'`, 'INVALID_STATUS_TRANSITION');
  }
}

module.exports = {
  validateOfferCreation,
  validateAndComputeTransition,
  TERMINAL_STATUSES,
};
