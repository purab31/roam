const RecentlyViewed = require('../models/recentlyViewed.model');
const Listing = require('../models/listing.model');
const Dealer = require('../models/dealer.model');
const { isListingAvailable } = require('./listingAvailability.service');
const { NotFoundError, BadRequestError } = require('../errors');

/**
 * Record a listing view in user's recently viewed list.
 * Atomic update: pull existing duplicate, push to front, slice to 20.
 * Skips recording views of user's own listings.
 */
async function recordRecentlyViewed(userId, listingId) {
  if (!listingId) {
    throw new BadRequestError('Listing ID is required');
  }

  const listing = await Listing.findById(listingId);
  if (!listing) {
    throw new NotFoundError('Listing not found');
  }

  // Do not record views of own listings
  const isIndividualOwner =
    listing.ownerRef.type === 'user' && listing.ownerRef.id.toString() === userId.toString();

  let isDealerOwner = false;
  if (listing.ownerRef.type === 'dealer') {
    const dealer = await Dealer.findOne({ user: userId });
    if (dealer && dealer._id.toString() === listing.ownerRef.id.toString()) {
      isDealerOwner = true;
    }
  }

  if (isIndividualOwner || isDealerOwner) {
    return { skipped: true, reason: 'OWN_LISTING' };
  }

  // Atomically pull any existing item for this listing
  await RecentlyViewed.updateOne(
    { user: userId },
    { $pull: { items: { listing: listing._id } } },
    { upsert: true }
  );

  // Atomically push to the beginning and keep only last 20
  await RecentlyViewed.updateOne(
    { user: userId },
    {
      $push: {
        items: {
          $each: [{ listing: listing._id, viewedAt: new Date() }],
          $position: 0,
          $slice: 20,
        },
      },
    },
    { upsert: true }
  );

  return { success: true };
}

/**
 * Retrieve user's recently viewed listings.
 * Filters out unavailable entries on read.
 */
async function getRecentlyViewed(userId) {
  const doc = await RecentlyViewed.findOne({ user: userId }).populate({
    path: 'items.listing',
    populate: { path: 'vehicleRef' },
  });

  if (!doc || !doc.items || doc.items.length === 0) {
    return [];
  }

  const items = [];

  for (const item of doc.items) {
    const listing = item.listing;
    if (!listing) continue;

    // Filter out unavailable listings
    const available = await isListingAvailable(listing);
    if (!available) continue;

    const vehicle = listing.vehicleRef;
    if (!vehicle) continue;

    const coverImage =
      vehicle?.images?.find(img => img.isCover)?.url ||
      vehicle?.images?.[0]?.url ||
      '/placeholders/placeholder-suv.svg';

    items.push({
      viewedAt: item.viewedAt,
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
        vehicle: {
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
        },
      },
    });
  }

  return items;
}

module.exports = {
  recordRecentlyViewed,
  getRecentlyViewed,
};
