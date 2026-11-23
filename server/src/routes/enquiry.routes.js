const express = require('express');
const router = express.Router();
const enquiryController = require('../controllers/enquiry.controller');
const { requireAuth, requireActiveAccount } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createEnquirySchema,
  addReplySchema,
  patchEnquiryStatusSchema,
} = require('../validations/enquiry.validation');

router.use(requireAuth);

router.post('/', requireActiveAccount, validate(createEnquirySchema), enquiryController.createEnquiry);
router.get('/', enquiryController.getEnquiries);
router.get('/:id', enquiryController.getEnquiryById);
router.post('/:id/replies', requireActiveAccount, validate(addReplySchema), enquiryController.addReply);
router.patch('/:id/status', requireActiveAccount, validate(patchEnquiryStatusSchema), enquiryController.updateStatus);

module.exports = router;
