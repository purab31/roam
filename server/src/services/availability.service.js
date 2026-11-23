const Booking = require('../models/booking.model');
const UnavailableDate = require('../models/unavailableDate.model');

/**
 * Checks vehicle rental availability for a given date range.
 *
 * Rule:
 * Conflict exists when an existing confirmed/active booking or blocked range satisfies:
 *   existing.startDate < newEndDate AND existing.endDate > newStartDate
 *
 * Notice:
 * If an existing booking ends at T and a new booking starts at T (e.g. 2026-11-28 10:00:00),
 * existing.endDate > newStartDate is FALSE.
 * Therefore, adjacent bookings do NOT conflict, cleanly allowing same-day turnarounds.
 */
async function checkAvailability(listingId, start, end, options = {}) {
  const { excludeBookingId, session } = options;
  const startDate = new Date(start);
  const endDate = new Date(end);

  // 1. Confirmed or active bookings (hard conflicts, including modification_requested which keeps blocking current dates)
  const bookingQuery = {
    listing: listingId,
    status: { $in: ['confirmed', 'active', 'modification_requested'] },
    startDate: { $lt: endDate },
    endDate: { $gt: startDate },
  };
  if (excludeBookingId) {
    bookingQuery._id = { $ne: excludeBookingId };
  }

  let confirmedQuery = Booking.find(bookingQuery);
  if (session) confirmedQuery = confirmedQuery.session(session);
  const confirmedConflicts = await confirmedQuery.exec();

  // 2. Blocked dates set by owner/dealer (hard conflicts)
  let unavailableQuery = UnavailableDate.find({
    listing: listingId,
    startDate: { $lt: endDate },
    endDate: { $gt: startDate },
  });
  if (session) unavailableQuery = unavailableQuery.session(session);
  const unavailableConflicts = await unavailableQuery.exec();

  // 3. Other pending / requested bookings (soft overlaps, does NOT block confirmation)
  const pendingQuery = {
    listing: listingId,
    status: { $in: ['requested', 'pending'] },
    startDate: { $lt: endDate },
    endDate: { $gt: startDate },
  };
  if (excludeBookingId) {
    pendingQuery._id = { $ne: excludeBookingId };
  }
  let pendingQueryExec = Booking.find(pendingQuery);
  if (session) pendingQueryExec = pendingQueryExec.session(session);
  const pendingOverlaps = await pendingQueryExec.exec();

  const isAvailable = confirmedConflicts.length === 0 && unavailableConflicts.length === 0;

  return {
    isAvailable,
    confirmedConflicts,
    unavailableConflicts,
    pendingOverlaps,
    hasPendingOverlaps: pendingOverlaps.length > 0,
    conflictReason: !isAvailable
      ? confirmedConflicts.length > 0
        ? 'Vehicle already has a confirmed booking for these dates'
        : 'Vehicle has blocked dates set by the owner for this period'
      : null,
  };
}

/**
 * Retrieves all blocked ranges (confirmed bookings + unavailable dates)
 * for a listing within a requested window [from, to].
 */
async function getListingAvailabilityWindow(listingId, fromDate, toDate) {
  const from = fromDate ? new Date(fromDate) : new Date();
  // Default to 90 days ahead if toDate not provided
  const to = toDate ? new Date(toDate) : new Date(from.getTime() + 90 * 24 * 60 * 60 * 1000);

  const [confirmedBookings, unavailableDates, pendingBookings] = await Promise.all([
    Booking.find({
      listing: listingId,
      status: { $in: ['confirmed', 'active', 'modification_requested'] },
      startDate: { $lt: to },
      endDate: { $gt: from },
    }).select('startDate endDate status'),
    UnavailableDate.find({
      listing: listingId,
      startDate: { $lt: to },
      endDate: { $gt: from },
    }).select('startDate endDate'),
    Booking.find({
      listing: listingId,
      status: { $in: ['requested', 'pending'] },
      startDate: { $lt: to },
      endDate: { $gt: from },
    }).select('startDate endDate status'),
  ]);

  return {
    window: { from, to },
    confirmedBookings: confirmedBookings.map(b => ({
      id: b._id,
      startDate: b.startDate,
      endDate: b.endDate,
      status: b.status,
      type: 'confirmed_booking',
    })),
    unavailableDates: unavailableDates.map(u => ({
      id: u._id,
      startDate: u.startDate,
      endDate: u.endDate,
      type: 'owner_blocked',
    })),
    pendingBookings: pendingBookings.map(p => ({
      id: p._id,
      startDate: p.startDate,
      endDate: p.endDate,
      status: p.status,
      type: 'pending_booking',
    })),
  };
}

module.exports = {
  checkAvailability,
  getListingAvailabilityWindow,
};
