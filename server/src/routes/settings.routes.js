const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');

// Public endpoints
router.get('/announcement', settingsController.getAnnouncement);
router.get('/categories', settingsController.getCategories);

module.exports = router;
