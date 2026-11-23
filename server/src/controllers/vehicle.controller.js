const vehicleService = require('../services/vehicle.service');

async function createVehicle(req, res, next) {
  try {
    const vehicle = await vehicleService.createVehicle(req.body, req.user);
    res.status(201).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
}

async function getMyVehicles(req, res, next) {
  try {
    const vehicles = await vehicleService.getMyVehicles(req.user);
    res.status(200).json({
      success: true,
      data: vehicles,
    });
  } catch (error) {
    next(error);
  }
}

async function getVehicleById(req, res, next) {
  try {
    const vehicle = await vehicleService.getVehicleById(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
}

async function updateVehicle(req, res, next) {
  try {
    const vehicle = await vehicleService.updateVehicle(req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteVehicle(req, res, next) {
  try {
    const result = await vehicleService.deleteVehicle(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function uploadImage(req, res, next) {
  try {
    const vehicle = await vehicleService.addImage(req.params.id, req.file, req.body.caption);
    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
}

async function removeImage(req, res, next) {
  try {
    const vehicle = await vehicleService.removeImage(req.params.id, req.params.imageId);
    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
}

async function reorderImages(req, res, next) {
  try {
    const vehicle = await vehicleService.reorderImages(req.params.id, req.body.imageIds);
    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
}

async function setCoverImage(req, res, next) {
  try {
    const vehicle = await vehicleService.setCoverImage(req.params.id, req.params.imageId);
    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
}

async function uploadDocument(req, res, next) {
  try {
    const vehicle = await vehicleService.addDocument(req.params.id, req.file, req.body.name);
    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
}

async function downloadDocument(req, res, next) {
  try {
    const { filePath, name, fileType } = await vehicleService.getDocumentPath(
      req.params.id,
      req.params.docId,
      req.user
    );
    res.setHeader('Content-Type', fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
}

async function removeDocument(req, res, next) {
  try {
    const vehicle = await vehicleService.removeDocument(req.params.id, req.params.docId);
    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createVehicle,
  getMyVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  uploadImage,
  removeImage,
  reorderImages,
  setCoverImage,
  uploadDocument,
  downloadDocument,
  removeDocument,
};
