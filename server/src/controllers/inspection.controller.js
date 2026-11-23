const inspectionService = require('../services/inspection.service');

async function createInspection(req, res, next) {
  try {
    const result = await inspectionService.createInspectionRequest(req.user._id, req.body);
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getInspections(req, res, next) {
  try {
    const result = await inspectionService.getInspections(req.user, req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getInspectionById(req, res, next) {
  try {
    const result = await inspectionService.getInspectionById(
      req.params.id,
      req.user._id,
      req.user.capabilities
    );
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function respondToInspection(req, res, next) {
  try {
    const result = await inspectionService.respondToInspection(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function updateInspectionStatus(req, res, next) {
  try {
    const result = await inspectionService.updateInspectionStatus(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createInspection,
  getInspections,
  getInspectionById,
  respondToInspection,
  updateInspectionStatus,
};
