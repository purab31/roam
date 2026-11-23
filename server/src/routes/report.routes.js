const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { requireAuth } = require('../middleware/auth');
const { reportLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { createReportSchema } = require('../validations/report.validation');

// Authenticated users can submit reports; rate limited
router.post(
  '/',
  requireAuth,
  reportLimiter,
  validate(createReportSchema),
  reportController.createReport
);

module.exports = router;
