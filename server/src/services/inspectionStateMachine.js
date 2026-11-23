const { ConflictError, ForbiddenError } = require('../errors');

const ALLOWED_TRANSITIONS = {
  requested: ['accepted', 'rejected', 'reschedule_proposed', 'cancelled'],
  reschedule_proposed: ['accepted', 'rejected', 'cancelled'],
  accepted: ['completed', 'cancelled'],
  rejected: [],
  completed: [],
  cancelled: [],
};

/**
 * Validates whether the given actor is permitted to perform the state transition on an inspection request.
 * Throws ForbiddenError (403) for wrong actor, or ConflictError (409) for invalid status transition.
 *
 * @param {Object} inspection - InspectionRequest document
 * @param {string} targetStatus - Target status to transition to
 * @param {string} actorRole - 'requester' | 'seller' | 'admin'
 */
function validateInspectionTransition(inspection, targetStatus, actorRole) {
  const currentStatus = inspection.status;

  // 1. Role-specific allowed actions
  if (actorRole === 'requester') {
    // Buyer can only cancel or accept/reject a proposed reschedule
    const allowedForRequester = {
      requested: ['cancelled'],
      reschedule_proposed: ['accepted', 'rejected', 'cancelled'],
      accepted: ['cancelled'],
    };

    const allowed = allowedForRequester[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      if (ALLOWED_TRANSITIONS[currentStatus]?.includes(targetStatus)) {
        // Valid platform transition but wrong actor (e.g. buyer trying to accept own request or complete)
        throw new ForbiddenError(
          `Buyers are not permitted to set inspection status to '${targetStatus}'`,
          'WRONG_ACTOR'
        );
      }
      throw new ConflictError(
        `Cannot transition inspection from '${currentStatus}' to '${targetStatus}'`,
        'INVALID_STATUS_TRANSITION'
      );
    }
  } else if (actorRole === 'seller') {
    // Seller/dealer can accept, reject, propose reschedule, complete, or cancel
    const allowedForSeller = {
      requested: ['accepted', 'rejected', 'reschedule_proposed', 'cancelled'],
      reschedule_proposed: ['cancelled'], // seller can cancel while waiting for buyer
      accepted: ['completed', 'cancelled'],
    };

    const allowed = allowedForSeller[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      if (ALLOWED_TRANSITIONS[currentStatus]?.includes(targetStatus)) {
        throw new ForbiddenError(
          `Sellers are not permitted to perform action resulting in '${targetStatus}' from '${currentStatus}'`,
          'WRONG_ACTOR'
        );
      }
      throw new ConflictError(
        `Cannot transition inspection from '${currentStatus}' to '${targetStatus}'`,
        'INVALID_STATUS_TRANSITION'
      );
    }
  } else if (actorRole !== 'admin') {
    throw new ForbiddenError('You are not a participant in this inspection request', 'FORBIDDEN_ERROR');
  }

  // 2. State-machine transition verification
  const validTargets = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!validTargets.includes(targetStatus)) {
    throw new ConflictError(
      `Cannot transition inspection from '${currentStatus}' to '${targetStatus}'`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  return true;
}

module.exports = {
  validateInspectionTransition,
  ALLOWED_TRANSITIONS,
};
