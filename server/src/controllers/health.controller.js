const healthService = require('../services/health.service');

function checkHealth(_req, res, next) {
  try {
    const health = healthService.getHealthStatus();
    return res.status(200).json({
      success: true,
      data: health,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  checkHealth,
};
