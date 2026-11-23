const Favourite = require('../models/favourite.model');
const Listing = require('../models/listing.model');
const { isListingAvailable } = require('./listingAvailability.service');
const { NotFoundError, BadRequestError } = require('../errors');

/**
 * Add a listing to user's favourites.
 * Idempotent (double-clicks safe).
 */
async function addFavourite(userId, listingId) {
  if (!listingId) {
    throw new BadRequestError('Listing ID is required');
  }

  const listing = await Listing.findById(listingId);
  if (!listing) {
    throw new NotFoundError('Listing not found');
  }

  try {
    const fav = await Favourite.findOneAndUpdate(
      { user: userId, listing: listingId },
      { $setOnInsert: { user: userId, listing: listingId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return fav;
  } catch (err) {
    // 11000 duplicate key error is safe
    if (err.code === 11000) {
      return await Favourite.findOne({ user: userId, listing: listingId });
    }
    throw err;
  }
}

/**
 * Remove a listing from user's favourites by listing ID only.
 * Idempotent.
 */
async function removeFavourite(userId, listingId) {
  if (!listingId) {
    throw new BadRequestError('Listing ID is required');
  }
  await Favourite.deleteOne({ user: userId, listing: listingId });
  return { success: true };
}

/**
 * Get all favourites for a user with availability flag.
 * If a listing is unavailable (owner blocked, dealer suspended, admin deactivated, in review, removed),
 * show only a generic "no longer available" and do not leak private details.
 */
async function getUserFavourites(userId) {
  const favourites = await Favourite.find({ user: userId })
    .populate({
      path: 'listing',
      populate: { path: 'vehicleRef' },
    })
    .sort({ createdAt: -1 });

  const result = [];

  for (const fav of favourites) {
    const listing = fav.listing;

    // Listing was deleted from DB or unpopulated
    if (!listing) {
      result.push({
        id: fav._id,
        listingId: null,
        availability: 'unavailable',
        unavailableMessage: 'Vehicle no longer available',
        createdAt: fav.createdAt,
      });
      continue;
    }

    const available = await isListingAvailable(listing);
    if (!available) {
      result.push({
        id: fav._id,
        listingId: listing._id,
        availability: 'unavailable',
        unavailableMessage: 'Vehicle no longer available',
        createdAt: fav.createdAt,
      });
      continue;
    }

    // Determine availability state for UI handling
    let availability = 'active';
    if (listing.sale && listing.sale.status === 'sold') {
      availability = 'sold';
    } else if (listing.sale && listing.sale.status === 'reserved') {
      availability = 'reserved';
    } else if (
      listing.sale &&
      listing.sale.status === 'inactive' &&
      (!listing.rental || listing.rental.status === 'inactive')
    ) {
      availability = 'inactive';
    }

    const vehicle = listing.vehicleRef;
    const coverImage =
      vehicle?.images?.find(img => img.isCover)?.url ||
      vehicle?.images?.[0]?.url ||
      '/placeholders/placeholder-suv.svg';

    result.push({
      id: fav._id,
      listingId: listing._id,
      availability,
      createdAt: fav.createdAt,
      listing: {
        id: listing._id,
        purpose: listing.purpose,
        sale: listing.sale
          ? {
              status: listing.sale.status,
              askingPrice: listing.sale.askingPrice,
              negotiable: listing.sale.negotiable,
            }
          : null,
        rental: listing.rental
          ? {
              status: listing.rental.status,
              dailyPrice: listing.rental.dailyPrice,
            }
          : null,
        vehicle: vehicle
          ? {
              id: vehicle._id,
              brand: vehicle.brand,
              model: vehicle.model,
              variant: vehicle.variant,
              manufacturingYear: vehicle.manufacturingYear,
              fuelType: vehicle.fuelType,
              transmission: vehicle.transmission,
              kmDriven: vehicle.kmDriven,
              bodyType: vehicle.bodyType,
              location: vehicle.location,
              coverImage,
            }
          : null,
      },
    });
  }

  return result;
}

module.exports = {
  addFavourite,
  removeFavourite,
  getUserFavourites,
};
