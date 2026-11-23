const offerService = require('../services/offer.service');

async function createOffer(req, res, next) {
  try {
    const offer = await offerService.createOffer(req.user, req.body);
    res.status(201).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    next(error);
  }
}

async function getMyOffers(req, res, next) {
  try {
    const result = await offerService.getMyOffers(req.user, req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getReceivedOffers(req, res, next) {
  try {
    const result = await offerService.getReceivedOffers(req.user, req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getOfferById(req, res, next) {
  try {
    const offer = await offerService.getOfferById(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    next(error);
  }
}

async function counterOffer(req, res, next) {
  try {
    const offer = await offerService.counterOffer(req.params.id, req.user, req.body);
    res.status(200).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    next(error);
  }
}

async function updateOfferStatus(req, res, next) {
  try {
    const offer = await offerService.updateOfferStatus(req.params.id, req.user, req.body);
    res.status(200).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createOffer,
  getMyOffers,
  getReceivedOffers,
  getOfferById,
  counterOffer,
  updateOfferStatus,
};
