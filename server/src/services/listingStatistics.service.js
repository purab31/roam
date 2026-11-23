const Listing = require('../models/listing.model');
const Favourite = require('../models/favourite.model');
const Enquiry = require('../models/enquiry.model');
const Offer = require('../models/offer.model');
const Booking = require('../models/booking.model');
const Dealer = require('../models/dealer.model');
const { ForbiddenError, NotFoundError } = require('../errors');

/**
 * Returns performance counters for a single listing: views, favourites, enquiries, offers, bookings.
 * Enforces ownership: only owner or dealership owner can read.
 */
async function getListingStatistics(listingId, user) {
  const listing = await Listing.findById(listingId);
  if (!listing) {
    throw new NotFoundError('Listing not found');
  }

  // Check ownership
  const isIndividualOwner =
    listing.ownerRef.type === 'user' && listing.ownerRef.id.toString() === user._id.toString();

  let isDealerOwner = false;
  if (listing.ownerRef.type === 'dealer') {
    const dealer = await Dealer.findOne({ user: user._id });
    if (dealer && dealer._id.toString() === listing.ownerRef.id.toString()) {
      isDealerOwner = true;
    }
  }

  const isAdmin = user.capabilities && user.capabilities.includes('admin');

  if (!isIndividualOwner && !isDealerOwner && !isAdmin) {
    throw new ForbiddenError(
      'You do not have permission to view statistics for this listing',
      'FORBIDDEN_ERROR'
    );
  }

  const id = listing._id;
  const [favourites, enquiries, offers, bookings] = await Promise.all([
    Favourite.countDocuments({ listing: id }),
    Enquiry.countDocuments({ listing: id }),
    Offer.countDocuments({ listing: id }),
    Booking.countDocuments({ listing: id }),
  ]);

  return {
    listingId: id.toString(),
    views: listing.viewCount || 0,
    favourites,
    enquiries,
    offers,
    bookings,
  };
}

/**
 * Batched statistics query for all listings owned by the authenticated user/dealer.
 */
async function getMyListingsStatistics(user) {
  // Find dealer if applicable
  const dealer = await Dealer.findOne({ user: user._id });
  const ownerIds = [user._id];
  if (dealer) {
    ownerIds.push(dealer._id);
  }

  const listings = await Listing.find({
    'ownerRef.id': { $in: ownerIds },
  }).select('_id viewCount');

  if (listings.length === 0) {
    return {};
  }

  const listingIds = listings.map(l => l._id);

  const [favAgg, enqAgg, offAgg, bookAgg] = await Promise.all([
    Favourite.aggregate([
      { $match: { listing: { $in: listingIds } } },
      { $group: { _id: '$listing', count: { $sum: 1 } } },
    ]),
    Enquiry.aggregate([
      { $match: { listing: { $in: listingIds } } },
      { $group: { _id: '$listing', count: { $sum: 1 } } },
    ]),
    Offer.aggregate([
      { $match: { listing: { $in: listingIds } } },
      { $group: { _id: '$listing', count: { $sum: 1 } } },
    ]),
    Booking.aggregate([
      { $match: { listing: { $in: listingIds } } },
      { $group: { _id: '$listing', count: { $sum: 1 } } },
    ]),
  ]);

  const favMap = Object.fromEntries(favAgg.map(item => [item._id.toString(), item.count]));
  const enqMap = Object.fromEntries(enqAgg.map(item => [item._id.toString(), item.count]));
  const offMap = Object.fromEntries(offAgg.map(item => [item._id.toString(), item.count]));
  const bookMap = Object.fromEntries(bookAgg.map(item => [item._id.toString(), item.count]));

  const result = {};
  for (const l of listings) {
    const idStr = l._id.toString();
    result[idStr] = {
      views: l.viewCount || 0,
      favourites: favMap[idStr] || 0,
      enquiries: enqMap[idStr] || 0,
      offers: offMap[idStr] || 0,
      bookings: bookMap[idStr] || 0,
    };
  }

  return result;
}

module.exports = {
  getListingStatistics,
  getMyListingsStatistics,
};
