const listingService = require('../services/listing.service');

async function createListing(req, res, next) {
  try {
    const listing = await listingService.createListing(req.body, req.user);
    res.status(201).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    next(error);
  }
}

async function getPublicListings(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const result = await listingService.getPublicListings(query);
    res.status(200).json({
      success: true,
      data: {
        items: result.items,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        facetCounts: result.facetCounts,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getMyListings(req, res, next) {
  try {
    const listings = await listingService.getMyListings(req.user, req.query);
    res.status(200).json({
      success: true,
      data: listings,
    });
  } catch (error) {
    next(error);
  }
}

async function getListingById(req, res, next) {
  try {
    const listing = await listingService.getListingById(req.params.id, req.user, req.ip);
    res.status(200).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    next(error);
  }
}

async function updateListing(req, res, next) {
  try {
    const listing = await listingService.updateListing(req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    next(error);
  }
}

async function updateListingStatus(req, res, next) {
  try {
    const listing = await listingService.updateListingStatus(req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteListing(req, res, next) {
  try {
    const result = await listingService.deleteListing(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getAvailability(req, res, next) {
  try {
    const bookingService = require('../services/booking.service');
    const result = await bookingService.getAvailability(
      req.params.id,
      req.query.from,
      req.query.to
    );
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getListingUnavailableDates(req, res, next) {
  try {
    const bookingService = require('../services/booking.service');
    const items = await bookingService.getListingUnavailableDates(
      req.params.id,
      req.user
    );
    res.status(200).json({
      success: true,
      data: { unavailableDates: items },
    });
  } catch (error) {
    next(error);
  }
}

async function addUnavailableDate(req, res, next) {
  try {
    const bookingService = require('../services/booking.service');
    const result = await bookingService.addUnavailableDate(
      req.params.id,
      req.body,
      req.user
    );
    res.status(201).json({
      success: true,
      data: { unavailableDate: result },
    });
  } catch (error) {
    next(error);
  }
}

async function deleteUnavailableDate(req, res, next) {
  try {
    const bookingService = require('../services/booking.service');
    const result = await bookingService.deleteUnavailableDate(
      req.params.id,
      req.params.dateId,
      req.user
    );
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function renewListing(req, res, next) {
  try {
    const expiryService = require('../services/expiry.service');
    const result = await expiryService.renewListing(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getListingStatistics(req, res, next) {
  try {
    const statsService = require('../services/listingStatistics.service');
    const result = await statsService.getListingStatistics(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getMyListingsStatistics(req, res, next) {
  try {
    const statsService = require('../services/listingStatistics.service');
    const result = await statsService.getMyListingsStatistics(req.user);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createListing,
  getPublicListings,
  getMyListings,
  getListingById,
  updateListing,
  updateListingStatus,
  deleteListing,
  getAvailability,
  getListingUnavailableDates,
  addUnavailableDate,
  deleteUnavailableDate,
  renewListing,
  getListingStatistics,
  getMyListingsStatistics,
};
