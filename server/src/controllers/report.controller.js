const reportService = require('../services/report.service');

async function createReport(req, res, next) {
  try {
    const report = await reportService.createReport(req.body, req.user, req.ip);
    res.status(201).json({
      success: true,
      data: {
        id: report._id.toString(),
        subjectType: report.subjectType,
        subjectRef: report.subjectRef,
        category: report.category,
        description: report.description,
        status: report.status,
        createdAt: report.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createReport,
};
