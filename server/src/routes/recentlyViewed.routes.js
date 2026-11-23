const express = require('express');
const router = express.Router();
const recentlyViewedController = require('../controllers/recentlyViewed.controller');
const { requireAuth, requireActiveAccount } = require('../middleware/auth');

router.use(requireAuth);
router.use(requireActiveAccount);

router.post('/', recentlyViewedController.recordView);
router.get('/', recentlyViewedController.getRecentlyViewed);

module.exports = router;
