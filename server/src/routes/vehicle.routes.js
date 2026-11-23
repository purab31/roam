const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller');
const Vehicle = require('../models/vehicle.model');
const { requireAuth, optionalAuth, requireCapability, requireActiveAccount } = require('../middleware/auth');
const { requireOwnership } = require('../middleware/ownership');
const validate = require('../middleware/validate');
const { upload } = require('../services/storage/upload.middleware');
const {
  createVehicleSchema,
  updateVehicleSchema,
  reorderImagesSchema,
} = require('../validations/vehicle.validation');

// CRUD endpoints
router.post(
  '/',
  requireAuth,
  requireCapability('seller', 'dealer'),
  requireActiveAccount,
  validate(createVehicleSchema),
  vehicleController.createVehicle
);

router.get('/', requireAuth, vehicleController.getMyVehicles);

router.get('/:id', optionalAuth, vehicleController.getVehicleById);

router.put(
  '/:id',
  requireAuth,
  requireActiveAccount,
  requireOwnership(Vehicle, 'id'),
  validate(updateVehicleSchema),
  vehicleController.updateVehicle
);

router.delete(
  '/:id',
  requireAuth,
  requireActiveAccount,
  requireOwnership(Vehicle, 'id'),
  vehicleController.deleteVehicle
);

// Vehicle image management endpoints
router.post(
  '/:id/images',
  requireAuth,
  requireActiveAccount,
  requireOwnership(Vehicle, 'id'),
  upload.single('image'),
  vehicleController.uploadImage
);

router.delete(
  '/:id/images/:imageId',
  requireAuth,
  requireActiveAccount,
  requireOwnership(Vehicle, 'id'),
  vehicleController.removeImage
);

router.patch(
  '/:id/images/reorder',
  requireAuth,
  requireActiveAccount,
  requireOwnership(Vehicle, 'id'),
  validate(reorderImagesSchema),
  vehicleController.reorderImages
);

router.patch(
  '/:id/images/:imageId/cover',
  requireAuth,
  requireActiveAccount,
  requireOwnership(Vehicle, 'id'),
  vehicleController.setCoverImage
);

// Vehicle private document management endpoints
router.post(
  '/:id/documents',
  requireAuth,
  requireActiveAccount,
  requireOwnership(Vehicle, 'id'),
  upload.single('document'),
  vehicleController.uploadDocument
);

router.get(
  '/:id/documents/:docId/download',
  requireAuth,
  vehicleController.downloadDocument
);

router.delete(
  '/:id/documents/:docId',
  requireAuth,
  requireActiveAccount,
  requireOwnership(Vehicle, 'id'),
  vehicleController.removeDocument
);

module.exports = router;
