const compareService = require('../services/compare.service');

async function compare(req, res, next) {
  try {
    const { ids } = req.query;
    const result = await compareService.compareListings(ids);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  compare,
};
