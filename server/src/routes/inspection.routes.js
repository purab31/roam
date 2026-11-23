const express = require('express');
const router = express.Router();
const inspectionController = require('../controllers/inspection.controller');
const { requireAuth, requireActiveAccount } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createInspectionSchema,
  respondInspectionSchema,
  updateInspectionStatusSchema,
} = require('../validations/inspection.validation');

router.use(requireAuth);
router.use(requireActiveAccount);

router.post('/', validate(createInspectionSchema), inspectionController.createInspection);
router.get('/', inspectionController.getInspections);
router.get('/:id', inspectionController.getInspectionById);
router.patch('/:id/respond', validate(respondInspectionSchema), inspectionController.respondToInspection);
router.patch('/:id/status', validate(updateInspectionStatusSchema), inspectionController.updateInspectionStatus);

module.exports = router;
