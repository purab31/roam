const favouritesService = require('../services/favourites.service');

async function addFavourite(req, res, next) {
  try {
    const { listingId } = req.body;
    const fav = await favouritesService.addFavourite(req.user._id, listingId);
    res.status(201).json({
      success: true,
      data: fav,
    });
  } catch (err) {
    next(err);
  }
}

async function removeFavourite(req, res, next) {
  try {
    const { id } = req.params; // takes listing ID only
    await favouritesService.removeFavourite(req.user._id, id);
    res.status(200).json({
      success: true,
      data: { message: 'Removed from favourites' },
    });
  } catch (err) {
    next(err);
  }
}

async function getFavourites(req, res, next) {
  try {
    const items = await favouritesService.getUserFavourites(req.user._id);
    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  addFavourite,
  removeFavourite,
  getFavourites,
};
