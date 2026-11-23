const enquiryService = require('../services/enquiry.service');

async function createEnquiry(req, res, next) {
  try {
    const enquiry = await enquiryService.createEnquiry(req.user, req.body);
    res.status(201).json({
      success: true,
      data: enquiry,
    });
  } catch (error) {
    next(error);
  }
}

async function getEnquiries(req, res, next) {
  try {
    const result = await enquiryService.getUserEnquiries(req.user, req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getEnquiryById(req, res, next) {
  try {
    const enquiry = await enquiryService.getEnquiryById(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: enquiry,
    });
  } catch (error) {
    next(error);
  }
}

async function addReply(req, res, next) {
  try {
    const enquiry = await enquiryService.addReply(req.params.id, req.user, req.body);
    res.status(201).json({
      success: true,
      data: enquiry,
    });
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const enquiry = await enquiryService.updateStatus(req.params.id, req.user, req.body);
    res.status(200).json({
      success: true,
      data: enquiry,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createEnquiry,
  getEnquiries,
  getEnquiryById,
  addReply,
  updateStatus,
};
