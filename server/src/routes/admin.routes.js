const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { requireAuth, requireCapability } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { updateVerificationSchema } = require('../validations/dealer.validation');
const {
  moderateListingSchema,
  blockUserSchema,
  unblockUserSchema,
} = require('../validations/admin.validation');
const { resolveReportSchema } = require('../validations/report.validation');
const { updateSettingsSchema } = require('../validations/settings.validation');

// All admin routes strictly require authentication and 'admin' capability
router.use(requireAuth);
router.use(requireCapability('admin'));

// 1. Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// 2. Dealers
router.get('/dealers', adminController.getAllDealers);
router.get('/dealers/:id', adminController.getDealerById);
router.patch(
  '/dealers/:id/verification',
  validate(updateVerificationSchema),
  adminController.updateDealerVerification
);

// 3. Listings Moderation Queue
router.get('/listings', adminController.getAdminListings);
router.patch(
  '/listings/:id/status',
  validate(moderateListingSchema),
  adminController.adminModerateListing
);

// 4. User Management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.patch(
  '/users/:id/block',
  validate(blockUserSchema),
  adminController.blockUser
);
router.patch(
  '/users/:id/unblock',
  validate(unblockUserSchema),
  adminController.unblockUser
);

// 5. Reports Queue
router.get('/reports', adminController.getReports);
router.patch(
  '/reports/:id',
  validate(resolveReportSchema),
  adminController.resolveReport
);

// 6. Oversight (Read-only)
router.get('/offers', adminController.getOffers);
router.get('/bookings', adminController.getBookings);

// 7. Settings
router.get('/settings', adminController.getSettings);
router.put(
  '/settings',
  validate(updateSettingsSchema),
  adminController.updateSettings
);

// 8. Audit Log
router.get('/audit-log', adminController.getAuditLogs);

module.exports = router;
