const { ConflictError } = require('../errors');

/**
 * State machine for Roam rental bookings.
 * Validates and enforces status transitions.
 * Invalid transitions throw ConflictError(409, 'INVALID_STATUS_TRANSITION').
 */

const BOOKING_TRANSITIONS = {
  requested: ['pending', 'confirmed', 'rejected', 'cancelled'],
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['active', 'cancelled', 'modification_requested'],
  rejected: [], // terminal
  cancelled: [], // terminal
  active: ['completed'],
  completed: [], // terminal
  modification_requested: ['confirmed', 'cancelled'],
};

function transitionBookingStatus(booking, toStatus, context = {}) {
  const fromStatus = booking.status;

  if (fromStatus === toStatus) {
    return booking;
  }

  const allowed = BOOKING_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    throw new ConflictError(
      `Invalid booking status transition from '${fromStatus}' to '${toStatus}'. Allowed next statuses: [${allowed.join(', ') || 'none'}]`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  booking.status = toStatus;
  booking.statusHistory = booking.statusHistory || [];
  booking.statusHistory.push({
    fromStatus,
    toStatus,
    changedBy: context.user ? context.user._id : null,
    changedAt: new Date(),
    reason: context.reason || `Booking status changed from ${fromStatus} to ${toStatus}`,
  });

  return booking;
}

module.exports = {
  BOOKING_TRANSITIONS,
  transitionBookingStatus,
};
