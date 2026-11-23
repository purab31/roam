const { ConflictError } = require('../errors');

const ACQUISITION_TRANSITIONS = {
  none: ['acquisition_pending'],
  acquisition_pending: ['acquired', 'cancelled'],
  acquired: [],
  cancelled: [],
};

function validateAcquisitionTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) {
    return true;
  }

  const allowed = ACQUISITION_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new ConflictError(
      `Invalid acquisition status transition from '${currentStatus}' to '${nextStatus}'. Allowed next statuses: [${allowed.join(', ') || 'none'}]`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  return true;
}

module.exports = {
  ACQUISITION_TRANSITIONS,
  validateAcquisitionTransition,
};
