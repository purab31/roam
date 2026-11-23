const recentlyViewedService = require('../services/recentlyViewed.service');

async function recordView(req, res, next) {
  try {
    const { listingId } = req.body;
    const result = await recentlyViewedService.recordRecentlyViewed(req.user._id, listingId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getRecentlyViewed(req, res, next) {
  try {
    const items = await recentlyViewedService.getRecentlyViewed(req.user._id);
    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  recordView,
  getRecentlyViewed,
};
