const express = require('express');
const router = express.Router();
const dealerController = require('../controllers/dealer.controller');
const {
  requireAuth,
  optionalAuth,
  requireActiveAccount,
  requireDealer,
} = require('../middleware/auth');
const validate = require('../middleware/validate');
const { upload } = require('../services/storage/upload.middleware');
const {
  dealerRegistrationSchema,
  updateDealerProfileSchema,
  bulkStatusUpdateSchema,
} = require('../validations/dealer.validation');

// Public dealer directory
router.get('/', dealerController.getPublicDealers);

// Register a new dealership
router.post(
  '/register',
  requireAuth,
  requireActiveAccount,
  validate(dealerRegistrationSchema),
  dealerController.registerDealer
);

// Specific subpaths BEFORE /:id
router.get('/me', requireAuth, dealerController.getMyDealerProfile);
router.get('/discover-listings', requireAuth, requireDealer, dealerController.getDiscoverOwnerListings);
router.get('/inventory', requireAuth, requireDealer, dealerController.getDealerInventory);
router.patch(
  '/inventory/bulk-status',
  requireAuth,
  requireDealer,
  validate(bulkStatusUpdateSchema),
  dealerController.bulkUpdateListingStatus
);
router.get('/dashboard-stats', requireAuth, requireDealer, dealerController.getDealerDashboardStats);
router.post(
  '/inventory/bulk-upload',
  requireAuth,
  requireDealer,
  upload.single('file'),
  dealerController.bulkUploadInventory
);

// Parameterized /:id routes
router.get('/:id', optionalAuth, dealerController.getDealerById);
router.get('/:id/listings', dealerController.getPublicDealerListings);
router.put(
  '/:id',
  requireAuth,
  requireActiveAccount,
  validate(updateDealerProfileSchema),
  dealerController.updateDealerProfile
);
router.post(
  '/:id/logo',
  requireAuth,
  requireActiveAccount,
  upload.single('logo'),
  dealerController.uploadDealerLogo
);
router.post(
  '/:id/documents',
  requireAuth,
  requireActiveAccount,
  upload.single('document'),
  dealerController.uploadDealerDocument
);
router.get(
  '/:id/documents/:docId/download',
  requireAuth,
  dealerController.downloadDealerDocument
);

module.exports = router;
