const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { requireAuth, requireActiveAccount, requireCapability } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createBookingSchema,
  patchBookingStatusSchema,
  bookingModificationSchema,
  getBookingsQuerySchema,
} = require('../validations/booking.validation');

// Submit rental booking request
router.post(
  '/',
  requireAuth,
  requireActiveAccount,
  requireCapability('renter'),
  validate(createBookingSchema),
  bookingController.createBooking
);

// Get rental earnings summary (owner/dealer) - must precede /:id
router.get('/summary', requireAuth, requireActiveAccount, bookingController.getRentalSummary);

// Get bookings (role-aware: renter, owner, dealer, admin, view-filtered)
router.get(
  '/',
  requireAuth,
  validate(getBookingsQuerySchema, 'query'),
  bookingController.getBookings
);

// Get single booking by ID
router.get('/:id', requireAuth, bookingController.getBookingById);

// Update booking status (accept, reject, cancel, handover, complete)
router.patch(
  '/:id/status',
  requireAuth,
  requireActiveAccount,
  validate(patchBookingStatusSchema),
  bookingController.updateBookingStatus
);

// Request or review booking date modification
router.patch(
  '/:id/modification',
  requireAuth,
  requireActiveAccount,
  validate(bookingModificationSchema),
  bookingController.handleBookingModification
);

module.exports = router;
