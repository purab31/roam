const settingsService = require('../services/settings.service');

async function getAnnouncement(req, res, next) {
  try {
    const announcement = await settingsService.getPublicAnnouncement();
    res.status(200).json({
      success: true,
      data: announcement,
    });
  } catch (error) {
    next(error);
  }
}

async function getCategories(req, res, next) {
  try {
    const settings = await settingsService.getSettings();
    res.status(200).json({
      success: true,
      data: settings.categories || [],
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAnnouncement,
  getCategories,
};
