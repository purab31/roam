const express = require('express');
const userController = require('../controllers/user.controller');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  requireAuth,
  requireCapability,
  requireActiveAccount,
} = require('../middleware/auth');
const {
  updateProfileSchema,
  changePasswordSchema,
  addCapabilitySchema,
} = require('../validations/auth.validation');

const router = express.Router();

router.get('/profile', requireAuth, userController.getProfile);
router.put(
  '/profile',
  requireAuth,
  validate(updateProfileSchema),
  userController.updateProfile
);
router.put(
  '/password',
  requireAuth,
  authLimiter,
  validate(changePasswordSchema),
  userController.changePassword
);
router.patch('/account-status', requireAuth, userController.requestDeactivation);
router.post(
  '/capabilities',
  requireAuth,
  validate(addCapabilitySchema),
  userController.addCapability
);

// Capability test route: verifies that users without 'seller' capability are rejected with 403
router.get(
  '/seller-test',
  requireAuth,
  requireCapability('seller'),
  (_req, res) => {
    return res.status(200).json({
      success: true,
      data: { message: 'Authorized: user holds seller capability' },
    });
  }
);

// Active account test route: verifies that deactivated or blocked users are blocked from create actions
router.post(
  '/create-action-test',
  requireAuth,
  requireActiveAccount,
  (_req, res) => {
    return res.status(200).json({
      success: true,
      data: { message: 'Authorized: user account is active' },
    });
  }
);

module.exports = router;
