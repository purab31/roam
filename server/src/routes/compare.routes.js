const express = require('express');
const router = express.Router();
const compareController = require('../controllers/compare.controller');

// Public comparison endpoint
router.get('/', compareController.compare);

module.exports = router;
