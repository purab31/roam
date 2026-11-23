const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listing.controller');
const Listing = require('../models/listing.model');
const { requireAuth, optionalAuth, requireCapability, requireActiveAccount } = require('../middleware/auth');
const { requireOwnership } = require('../middleware/ownership');
const validate = require('../middleware/validate');
const {
  createListingSchema,
  updateListingSchema,
  patchStatusSchema,
  getPublicListingsQuerySchema,
} = require('../validations/listing.validation');
const { createUnavailableDateSchema } = require('../validations/booking.validation');

// Public listing browse
router.get('/', validate(getPublicListingsQuerySchema, 'query'), listingController.getPublicListings);

// CRITICAL (Rule 10): Declare GET /api/listings/my BEFORE /:id
router.get('/my', requireAuth, listingController.getMyListings);

// Get listing availability (public calendar query)
router.get('/:id/availability', optionalAuth, listingController.getAvailability);

// Get unavailable dates (owner/dealer management with notes)
router.get(
  '/:id/unavailable-dates',
  requireAuth,
  requireActiveAccount,
  listingController.getListingUnavailableDates
);

// Add unavailable dates (blocked dates)
router.post(
  '/:id/unavailable-dates',
  requireAuth,
  requireActiveAccount,
  validate(createUnavailableDateSchema),
  listingController.addUnavailableDate
);

// Delete unavailable date
router.delete(
  '/:id/unavailable-dates/:dateId',
  requireAuth,
  requireActiveAccount,
  listingController.deleteUnavailableDate
);

// Create new listing
router.post(
  '/',
  requireAuth,
  requireCapability('seller', 'dealer'),
  requireActiveAccount,
  validate(createListingSchema),
  listingController.createListing
);

// Get single listing by ID
router.get('/:id', optionalAuth, listingController.getListingById);

// Update listing details
router.put(
  '/:id',
  requireAuth,
  requireActiveAccount,
  requireOwnership(Listing, 'id'),
  validate(updateListingSchema),
  listingController.updateListing
);

// Update listing status (state machine)
router.patch(
  '/:id/status',
  requireAuth,
  requireActiveAccount,
  requireOwnership(Listing, 'id'),
  validate(patchStatusSchema),
  listingController.updateListingStatus
);

// Soft delete listing (marks moderationStatus = removed, history kept)
router.delete(
  '/:id',
  requireAuth,
  requireActiveAccount,
  requireOwnership(Listing, 'id'),
  listingController.deleteListing
);

module.exports = router;
