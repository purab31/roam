const mongoose = require('mongoose');
const Listing = require('../models/listing.model');
const Vehicle = require('../models/vehicle.model');
const User = require('../models/user.model');
const Dealer = require('../models/dealer.model');
const Booking = require('../models/booking.model');
const UnavailableDate = require('../models/unavailableDate.model');
const ListingView = require('../models/listingView.model');
const notificationService = require('./notification.service');
const auditLogService = require('./auditLog.service');
const settingsService = require('./settings.service');
const config = require('../config/env');
const {
  transitionModerationStatus,
  transitionSaleStatus,
  transitionRentalStatus,
  initializeListingStatus,
} = require('./listingStateMachine');
const { NotFoundError, ForbiddenError, ValidationError } = require('../errors');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeListingDoc(listing) {
  const obj = listing.toObject ? listing.toObject() : { ...listing };
  obj.id = obj._id ? obj._id.toString() : obj.id;
  delete obj._id;
  delete obj.__v;

  if (obj.sale) {
    delete obj.sale.minAcceptableOffer;
  }

  if (obj.vehicleRef && typeof obj.vehicleRef === 'object') {
    if (obj.vehicleRef._id) {
      obj.vehicleRef.id = obj.vehicleRef._id.toString();
      delete obj.vehicleRef._id;
      delete obj.vehicleRef.__v;
    }
    delete obj.vehicleRef.registrationNumber;
    delete obj.vehicleRef.documents;
  }

  return obj;
}

class ListingService {
  /**
   * Creates a listing for an owned vehicle.
   */
  async createListing(listingData, user) {
    const { vehicleId, purpose, saveAsDraft, sale, rental } = listingData;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    // Verify ownership of the vehicle being listed
    const isOwner =
      vehicle.ownerRef.id.toString() === user._id.toString() ||
      (user.capabilities?.includes('dealer') && user.dealerId && vehicle.ownerRef.id.toString() === user.dealerId.toString());

    if (!isOwner && !user.capabilities?.includes('admin')) {
      throw new ForbiddenError('You can only create listings for vehicles you own');
    }

    // Determine ownerRef.type securely on the server; never accept from request body
    const ownerType =
      vehicle.ownerRef.type === 'dealer' ||
      (user.capabilities?.includes('dealer') && listingData.publishAs !== 'individual')
        ? 'dealer'
        : 'user';

    const ownerRef = {
      type: ownerType,
      id: user._id,
    };

    // If publishing as a dealer, verify dealer status unless saving as draft
    const isVerificationRequired = await settingsService.isDealerVerificationRequired();
    if (ownerRef.type === 'dealer' && !saveAsDraft && isVerificationRequired) {
      const dealer = await Dealer.findOne({ user: user._id });
      if (!dealer || dealer.verificationStatus !== 'approved') {
        throw new ForbiddenError(
          `Publishing requires verified dealer status. Current status: ${dealer?.verificationStatus || 'not registered'}`,
          'DEALER_VERIFICATION_REQUIRED'
        );
      }
    }

    const listing = new Listing({
      vehicleRef: vehicleId,
      ownerRef,
      purpose,
      sale: sale || {},
      rental: rental || {},
      statusHistory: [],
    });

    // Initialize through state machine (handles AUTO_APPROVE_LISTINGS and purpose checks)
    initializeListingStatus(listing, !!saveAsDraft, {
      user,
      reason: saveAsDraft ? 'Created as draft' : 'Created and submitted',
    });

    await listing.save();
    return listing.toOwnerObject();
  }

  /**
   * Retrieves public listings with disjunctive facets, search filters, and sorting.
   * Only approved listings with active or reserved status are returned.
   */
  async getPublicListings(query = {}) {
    const {
      q,
      purpose,
      minPrice,
      maxPrice,
      brand,
      model,
      yearFrom,
      yearTo,
      fuel,
      transmission,
      bodyType,
      kmMin,
      kmMax,
      owners,
      sellerType,
      city,
      area,
      pincode,
      condition,
      sort = 'recentlyListed',
      availableFrom,
      availableTo,
      availableNow,
    } = query;

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    // Price field selection: rental.dailyPrice when purpose=rent, otherwise sale.askingPrice
    const priceField = purpose === 'rent' ? 'rental.dailyPrice' : 'sale.askingPrice';

    // Stage 1: Listing-level match BEFORE $lookup of the vehicle
    const listingMatch = {
      moderationStatus: 'approved',
      $or: [
        { 'sale.status': { $in: ['active', 'reserved'] } },
        { 'rental.status': 'active' },
      ],
    };

    // Exclude listings of blocked users and suspended or revoked dealers
    const [blockedUsers, inactiveDealers] = await Promise.all([
      User.find({ accountStatus: 'blocked' }).distinct('_id'),
      Dealer.find({ verificationStatus: { $in: ['suspended', 'revoked'] } }).distinct('user'),
    ]);
    const excludedOwners = [...new Set([...blockedUsers, ...inactiveDealers])];
    if (excludedOwners.length > 0) {
      listingMatch['ownerRef.id'] = { $nin: excludedOwners };
    }

    if (purpose === 'sale') {
      listingMatch.purpose = { $in: ['sale', 'both'] };
      listingMatch['sale.status'] = { $in: ['active', 'reserved'] };
    } else if (purpose === 'rent') {
      listingMatch.purpose = { $in: ['rent', 'both'] };
      listingMatch['rental.status'] = 'active';
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      listingMatch[priceField] = {};
      if (minPrice !== undefined) listingMatch[priceField].$gte = Number(minPrice);
      if (maxPrice !== undefined) listingMatch[priceField].$lte = Number(maxPrice);
    }

    // Rental availability filter by date range or available now
    if (availableFrom || availableTo || availableNow) {
      const reqStart = availableFrom ? new Date(availableFrom) : new Date();
      const reqEnd = availableTo
        ? new Date(availableTo)
        : new Date(reqStart.getTime() + 24 * 60 * 60 * 1000);

      const [conflictBookings, conflictDates] = await Promise.all([
        Booking.find({
          status: { $in: ['confirmed', 'active'] },
          startDate: { $lt: reqEnd },
          endDate: { $gt: reqStart },
        }).distinct('listing'),
        UnavailableDate.find({
          startDate: { $lt: reqEnd },
          endDate: { $gt: reqStart },
        }).distinct('listing'),
      ]);

      const blockedIds = [...conflictBookings, ...conflictDates];
      if (blockedIds.length > 0) {
        listingMatch._id = { $nin: blockedIds };
      }
    }

    // Vehicle and post-lookup filter conditions (keyed for disjunctive faceting)
    const filterMap = {};

    if (q) {
      const escaped = escapeRegex(q);
      const regex = new RegExp(escaped, 'i');
      filterMap.q = {
        $or: [
          { 'vehicleRef.brand': regex },
          { 'vehicleRef.model': regex },
          { 'vehicleRef.variant': regex },
          { 'sale.description': regex },
        ],
      };
    }

    if (brand) {
      filterMap.brand = { 'vehicleRef.brand': new RegExp(`^${escapeRegex(brand)}$`, 'i') };
    }

    if (model) {
      filterMap.model = { 'vehicleRef.model': new RegExp(`^${escapeRegex(model)}$`, 'i') };
    }

    if (yearFrom !== undefined || yearTo !== undefined) {
      const yearCond = {};
      if (yearFrom !== undefined) yearCond.$gte = Number(yearFrom);
      if (yearTo !== undefined) yearCond.$lte = Number(yearTo);
      filterMap.year = { 'vehicleRef.manufacturingYear': yearCond };
    }

    if (kmMin !== undefined || kmMax !== undefined) {
      const kmCond = {};
      if (kmMin !== undefined) kmCond.$gte = Number(kmMin);
      if (kmMax !== undefined) kmCond.$lte = Number(kmMax);
      filterMap.km = { 'vehicleRef.kmDriven': kmCond };
    }

    if (owners !== undefined) {
      filterMap.owners = { 'vehicleRef.previousOwners': Number(owners) };
    }

    if (fuel) {
      filterMap.fuel = { 'vehicleRef.fuelType': new RegExp(`^${escapeRegex(fuel)}$`, 'i') };
    }

    if (transmission) {
      filterMap.transmission = { 'vehicleRef.transmission': new RegExp(`^${escapeRegex(transmission)}$`, 'i') };
    }

    if (bodyType) {
      filterMap.bodyType = { 'vehicleRef.bodyType': new RegExp(`^${escapeRegex(bodyType)}$`, 'i') };
    }

    if (condition) {
      filterMap.condition = { 'vehicleRef.condition': new RegExp(`^${escapeRegex(condition)}$`, 'i') };
    }

    if (sellerType) {
      filterMap.sellerType = { 'ownerRef.type': sellerType === 'dealer' ? 'dealer' : 'user' };
    }

    if (city) {
      filterMap.city = { 'vehicleRef.location.city': new RegExp(`^${escapeRegex(city)}$`, 'i') };
    }

    if (area) {
      filterMap.area = { 'vehicleRef.location.area': new RegExp(escapeRegex(area), 'i') };
    }

    if (pincode) {
      filterMap.pincode = { 'vehicleRef.location.pincode': pincode.trim() };
    }

    // Helper: builds combined $match omitting a single facet group's filter for disjunctive faceting
    const buildCombinedMatch = (excludeKey = null) => {
      const conditions = [];
      for (const [key, cond] of Object.entries(filterMap)) {
        if (key !== excludeKey) {
          conditions.push(cond);
        }
      }
      return conditions.length > 0 ? { $and: conditions } : {};
    };

    // Sort order
    let sortStage = { createdAt: -1 };
    switch (sort) {
      case 'priceAsc':
        sortStage = { [priceField]: 1, createdAt: -1 };
        break;
      case 'priceDesc':
        sortStage = { [priceField]: -1, createdAt: -1 };
        break;
      case 'recentlyListed':
        sortStage = { createdAt: -1 };
        break;
      case 'recentlyUpdated':
        sortStage = { updatedAt: -1 };
        break;
      case 'year':
        sortStage = { 'vehicleRef.manufacturingYear': -1, createdAt: -1 };
        break;
      case 'lowestKm':
        sortStage = { 'vehicleRef.kmDriven': 1, createdAt: -1 };
        break;
      default:
        sortStage = { createdAt: -1 };
    }

    const allFiltersMatch = buildCombinedMatch(null);

    const pipeline = [
      { $match: listingMatch },
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicleRef',
          foreignField: '_id',
          as: 'vehicleRef',
        },
      },
      { $unwind: '$vehicleRef' },
      {
        $facet: {
          items: [
            { $match: allFiltersMatch },
            { $sort: sortStage },
            { $skip: skip },
            { $limit: limit },
          ],
          totalCount: [
            { $match: allFiltersMatch },
            { $count: 'count' },
          ],
          fuelFacet: [
            { $match: buildCombinedMatch('fuel') },
            { $group: { _id: '$vehicleRef.fuelType', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          transmissionFacet: [
            { $match: buildCombinedMatch('transmission') },
            { $group: { _id: '$vehicleRef.transmission', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          bodyTypeFacet: [
            { $match: buildCombinedMatch('bodyType') },
            { $group: { _id: '$vehicleRef.bodyType', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          conditionFacet: [
            { $match: buildCombinedMatch('condition') },
            { $group: { _id: '$vehicleRef.condition', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          sellerTypeFacet: [
            { $match: buildCombinedMatch('sellerType') },
            { $group: { _id: '$ownerRef.type', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          citiesFacet: [
            { $match: buildCombinedMatch('city') },
            { $group: { _id: '$vehicleRef.location.city', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ],
        },
      },
    ];

    const [aggregateResult] = await Listing.aggregate(pipeline);

    const rawItems = aggregateResult?.items || [];
    const total = aggregateResult?.totalCount?.[0]?.count || 0;

    // Strict privacy sanitization on all output listings
    const items = rawItems.map(sanitizeListingDoc);

    // Transform facet arrays into keyed objects
    const facetCounts = {
      fuel: {},
      transmission: {},
      bodyType: {},
      condition: {},
      sellerType: {},
      cities: {},
    };

    aggregateResult?.fuelFacet?.forEach(f => {
      if (f._id) facetCounts.fuel[f._id] = f.count;
    });
    aggregateResult?.transmissionFacet?.forEach(t => {
      if (t._id) facetCounts.transmission[t._id] = t.count;
    });
    aggregateResult?.bodyTypeFacet?.forEach(b => {
      if (b._id) facetCounts.bodyType[b._id] = b.count;
    });
    aggregateResult?.conditionFacet?.forEach(c => {
      if (c._id) facetCounts.condition[c._id] = c.count;
    });
    aggregateResult?.sellerTypeFacet?.forEach(s => {
      if (s._id) {
        const key = s._id === 'dealer' ? 'dealer' : 'individual';
        facetCounts.sellerType[key] = (facetCounts.sellerType[key] || 0) + s.count;
      }
    });
    aggregateResult?.citiesFacet?.forEach(c => {
      if (c._id) facetCounts.cities[c._id] = c.count;
    });

    return {
      items,
      total,
      page,
      pageSize: limit,
      facetCounts,
    };
  }

  /**
   * Retrieves all listings owned by the authenticated user across all statuses.
   */
  async getMyListings(user, query = {}) {
    const filter = {
      'ownerRef.id': user._id,
    };

    if (query.status) {
      filter['sale.status'] = query.status;
    }
    if (query.moderationStatus) {
      filter.moderationStatus = query.moderationStatus;
    }

    const listings = await Listing.find(filter)
      .populate('vehicleRef')
      .sort({ createdAt: -1 });

    return listings.map(l => l.toOwnerObject());
  }

  /**
   * Records a debounced view on a listing.
   * Debounced per (listing + viewer) for 1 hour. Owner views are excluded.
   * Never throws or blocks main request.
   */
  async recordListingView(listingId, ownerId, userId, clientIp) {
    try {
      if (userId && ownerId && userId.toString() === ownerId.toString()) {
        return;
      }
      const viewerKey = userId ? `u_${userId}` : `ip_${clientIp || '127.0.0.1'}`;
      await ListingView.create({
        listing: listingId,
        viewerKey,
      });
      await Listing.findByIdAndUpdate(listingId, { $inc: { viewCount: 1 } });
    } catch {
      // Silent catch
    }
  }

  /**
   * Retrieves a single listing by ID with public/owner sanitization, seller summary, and similar listings.
   */
  async getListingById(id, user, clientIp = null) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Listing not found');
    }

    const listing = await Listing.findById(id).populate('vehicleRef');
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    const isOwner =
      user &&
      listing.ownerRef?.id &&
      user._id &&
      (listing.ownerRef.id.toString() === user._id.toString() ||
        (user.capabilities?.includes('dealer') &&
          user.dealerId &&
          listing.ownerRef.id.toString() === user.dealerId.toString()));
    const isAdmin = user && user.capabilities?.includes('admin');
    const isOwnerOrAdmin = isOwner || isAdmin;

    // Public visibility check: only approved listings with active/reserved status appear publicly
    if (!isOwnerOrAdmin) {
      const isApproved = listing.moderationStatus === 'approved';
      const isSaleVisible =
        listing.sale?.status === 'active' || listing.sale?.status === 'reserved';
      const isRentalVisible = listing.rental?.status === 'active';

      if (!isApproved || (!isSaleVisible && !isRentalVisible)) {
        throw new NotFoundError('Listing not found or not published');
      }

      // Check if owner is blocked or dealership is suspended/revoked
      const ownerUser = await User.findById(listing.ownerRef.id);
      if (ownerUser && ownerUser.accountStatus === 'blocked') {
        throw new NotFoundError('Listing not found or unavailable');
      }
      if (listing.ownerRef.type === 'dealer') {
        const dealer = await Dealer.findOne({ user: listing.ownerRef.id });
        if (dealer && ['suspended', 'revoked'].includes(dealer.verificationStatus)) {
          throw new NotFoundError('Listing not found or unavailable');
        }
      }
    }

    // Record view in background
    this.recordListingView(listing._id, listing.ownerRef?.id, user?._id, clientIp);

    // Fetch Seller Summary (name, sellerType, joinedAt, and email/mobile if contactVisibility permits)
    let seller = null;
    const ownerUser = await User.findById(listing.ownerRef.id);
    if (ownerUser) {
      seller = {
        id: ownerUser._id.toString(),
        name: ownerUser.fullName,
        sellerType: listing.ownerRef.type === 'dealer' ? 'dealer' : 'individual',
        joinedAt: ownerUser.createdAt,
      };
      if (ownerUser.contactVisibility?.email) {
        seller.email = ownerUser.email;
      }
      if (ownerUser.contactVisibility?.mobile) {
        seller.mobile = ownerUser.mobile;
      }
    }

    // Fetch Similar Listings: up to 6 listings (same body type or brand, within +/-25% price band, excluding itself)
    const vehicle = listing.vehicleRef;
    let similarListings = [];
    if (vehicle) {
      const isRent = listing.purpose === 'rent';
      const basePrice = isRent
        ? listing.rental?.dailyPrice || 0
        : listing.sale?.askingPrice || 0;
      const priceField = isRent ? 'rental.dailyPrice' : 'sale.askingPrice';

      const similarMatch = {
        _id: { $ne: listing._id },
        moderationStatus: 'approved',
      };

      if (isRent) {
        similarMatch['rental.status'] = 'active';
      } else {
        similarMatch['sale.status'] = { $in: ['active', 'reserved'] };
      }

      if (basePrice > 0) {
        similarMatch[priceField] = {
          $gte: Math.round(basePrice * 0.75),
          $lte: Math.round(basePrice * 1.25),
        };
      }

      const candidates = await Listing.find(similarMatch)
        .populate('vehicleRef')
        .limit(20);

      similarListings = candidates
        .filter(l => {
          const v = l.vehicleRef;
          if (!v) return false;
          return v.bodyType === vehicle.bodyType || v.brand === vehicle.brand;
        })
        .slice(0, 6)
        .map(l => l.toPublicObject());
    }

    const payload = isOwnerOrAdmin ? listing.toOwnerObject() : listing.toPublicObject();
    payload.seller = seller;
    payload.similarListings = similarListings;

    return payload;
  }

  /**
   * Updates an existing listing.
   */
  async updateListing(id, updateData, user) {
    const listing = await Listing.findById(id);
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    const wasApproved = listing.moderationStatus === 'approved';
    const isPurposeChanged = updateData.purpose && updateData.purpose !== listing.purpose;
    const isSaleDescChanged =
      updateData.sale &&
      updateData.sale.description !== undefined &&
      updateData.sale.description !== listing.sale?.description;
    const isSaleCondChanged =
      updateData.sale &&
      updateData.sale.conditions !== undefined &&
      updateData.sale.conditions !== listing.sale?.conditions;
    const isRentalCondChanged =
      updateData.rental &&
      updateData.rental.conditions !== undefined &&
      updateData.rental.conditions !== listing.rental?.conditions;

    const triggerReReview =
      wasApproved &&
      (isPurposeChanged || isSaleDescChanged || isSaleCondChanged || isRentalCondChanged);

    if (updateData.purpose) {
      listing.purpose = updateData.purpose;
    }
    if (updateData.sale) {
      listing.sale = { ...listing.sale.toObject(), ...updateData.sale };
    }
    if (updateData.rental) {
      listing.rental = { ...listing.rental.toObject(), ...updateData.rental };
    }

    if (triggerReReview) {
      transitionModerationStatus(listing, 'pending_review', {
        user,
        reason: 'Listing description, conditions, or purpose updated',
      });
      await notificationService.createNotification({
        recipient: listing.ownerRef.id,
        type: 'system',
        title: 'Listing Sent for Review',
        message:
          'Your listing has been returned to pending review following updates to description, conditions, or purpose.',
        relatedRef: { model: 'Listing', id: listing._id },
      });
    }

    await listing.save();
    return listing.toOwnerObject();
  }

  /**
   * Applies a lifecycle status transition using the state machine.
   * Actions: activate, deactivate, reserve, unreserve, sold, moderation.
   */
  async updateListingStatus(id, statusParams, user) {
    const listing = await Listing.findById(id);
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    const { action, status, target = 'sale', reason } = statusParams;
    const context = { user, reason };

    // Check if listing was admin deactivated and owner is attempting to activate
    if (
      listing.adminDeactivated &&
      (!user || !user.capabilities?.includes('admin')) &&
      (action === 'activate' || status === 'active')
    ) {
      throw new ForbiddenError(
        'This listing has been deactivated by an administrator and cannot be reactivated by the owner.',
        'ADMIN_DEACTIVATED'
      );
    }

    // Enforce dealer verification gate on publishing/activation
    const isVerifReq = await settingsService.isDealerVerificationRequired();
    if (
      listing.ownerRef.type === 'dealer' &&
      (action === 'activate' || status === 'active') &&
      isVerifReq
    ) {
      const dealer = await Dealer.findOne({ user: listing.ownerRef.id });
      if (!dealer || dealer.verificationStatus !== 'approved') {
        throw new ForbiddenError(
          `Publishing requires verified dealer status. Current status: ${dealer?.verificationStatus || 'not registered'}`,
          'DEALER_VERIFICATION_REQUIRED'
        );
      }
    }

    if (action) {
      switch (action) {
        case 'activate':
          if (listing.purpose === 'sale' || listing.purpose === 'both') {
            transitionSaleStatus(listing, 'active', context);
          }
          if (listing.purpose === 'rent' || listing.purpose === 'both') {
            transitionRentalStatus(listing, 'active', context);
          }
          break;
        case 'deactivate':
          if (listing.sale && listing.sale.status === 'active') {
            transitionSaleStatus(listing, 'inactive', context);
          }
          if (listing.rental && listing.rental.status === 'active') {
            transitionRentalStatus(listing, 'inactive', context);
          }
          break;
        case 'reserve':
          transitionSaleStatus(listing, 'reserved', context);
          break;
        case 'unreserve':
          transitionSaleStatus(listing, 'active', context);
          break;
        case 'sold':
          transitionSaleStatus(listing, 'sold', context);
          break;
        case 'moderation':
          if (!status) {
            throw new ValidationError('Status is required for moderation transition');
          }
          transitionModerationStatus(listing, status, context);
          break;
        default:
          throw new ValidationError(`Unknown status action '${action}'`);
      }
    } else if (status) {
      if (target === 'moderation') {
        transitionModerationStatus(listing, status, context);
      } else if (target === 'rental') {
        transitionRentalStatus(listing, status, context);
      } else {
        transitionSaleStatus(listing, status, context);
      }
    }

    await listing.save();
    return listing.toOwnerObject();
  }

  /**
   * Soft-deletes a listing per Instruction 6:
   * Sets moderationStatus = 'removed', sale.status = 'inactive', rental.status = 'inactive',
   * and preserves audit statusHistory.
   */
  async deleteListing(id, user) {
    const listing = await Listing.findById(id);
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    transitionModerationStatus(listing, 'removed', {
      user,
      reason: 'Listing removed by owner',
    });

    await listing.save();
    return { success: true, message: 'Listing removed successfully', listing: listing.toOwnerObject() };
  }

  /**
   * Admin: List all listings with moderation and search filters.
   */
  async getAdminListings(query = {}) {
    const { status, purpose, page = 1, limit = 20 } = query;
    const filter = {};

    if (status) {
      filter.moderationStatus = status;
    }
    if (purpose) {
      filter.purpose = purpose;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Listing.find(filter)
        .populate('vehicleRef')
        .populate('ownerRef.id', 'fullName email mobile capabilities')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Listing.countDocuments(filter),
    ]);

    return {
      items: items.map(l => l.toOwnerObject()),
      total,
      page: Number(page),
      pageSize: Number(limit),
    };
  }

  /**
   * Admin: Moderate listing status (approve, reject, request_corrections, deactivate, remove).
   */
  async adminModerateListing(id, { action, reason = '' }, adminUser, ipAddress = null) {
    const listing = await Listing.findById(id);
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    const context = { user: adminUser, reason };

    switch (action) {
      case 'approve':
        listing.adminDeactivated = false;
        transitionModerationStatus(listing, 'approved', context);

        // Activate sale/rental per purpose if inactive, preserving existing active/reserved/sold statuses
        if (listing.purpose === 'sale' || listing.purpose === 'both') {
          if (listing.sale && listing.sale.enabled !== false && listing.sale.status === 'inactive') {
            transitionSaleStatus(listing, 'active', { ...context, reason: 'Approved by administrator' });
          }
        }
        if (listing.purpose === 'rent' || listing.purpose === 'both') {
          if (listing.rental && listing.rental.status === 'inactive') {
            transitionRentalStatus(listing, 'active', { ...context, reason: 'Approved by administrator' });
          }
        }

        await notificationService.createNotification({
          recipient: listing.ownerRef.id,
          type: 'system',
          title: 'Listing Approved',
          message: `Your listing has been approved and is now active.${reason ? ` Note: ${reason}` : ''}`,
          relatedRef: { model: 'Listing', id: listing._id },
        });

        await auditLogService.logAction({
          actor: adminUser._id,
          action: 'listing_approved',
          targetType: 'listing',
          targetId: listing._id,
          details: { reason },
          ipAddress,
        });
        break;

      case 'reject':
        transitionModerationStatus(listing, 'rejected', context);

        await notificationService.createNotification({
          recipient: listing.ownerRef.id,
          type: 'system',
          title: 'Listing Rejected',
          message: `Your listing was rejected by moderation. Reason: ${reason || 'Does not meet listing guidelines'}`,
          relatedRef: { model: 'Listing', id: listing._id },
        });

        await auditLogService.logAction({
          actor: adminUser._id,
          action: 'listing_rejected',
          targetType: 'listing',
          targetId: listing._id,
          details: { reason },
          ipAddress,
        });
        break;

      case 'request_corrections':
        transitionModerationStatus(listing, 'rejected', {
          ...context,
          reason: `Corrections requested: ${reason}`,
        });

        await notificationService.createNotification({
          recipient: listing.ownerRef.id,
          type: 'system',
          title: 'Corrections Requested for Listing',
          message: `Please make the following corrections and resubmit: ${reason}`,
          relatedRef: { model: 'Listing', id: listing._id },
        });

        await auditLogService.logAction({
          actor: adminUser._id,
          action: 'listing_corrections_requested',
          targetType: 'listing',
          targetId: listing._id,
          details: { reason },
          ipAddress,
        });
        break;

      case 'deactivate':
        listing.adminDeactivated = true;
        if (listing.sale && listing.sale.status === 'active') {
          transitionSaleStatus(listing, 'inactive', { ...context, reason: 'Deactivated by administrator' });
        }
        if (listing.rental && listing.rental.status === 'active') {
          transitionRentalStatus(listing, 'inactive', { ...context, reason: 'Deactivated by administrator' });
        }

        await notificationService.createNotification({
          recipient: listing.ownerRef.id,
          type: 'system',
          title: 'Listing Deactivated by Administrator',
          message: `Your listing has been deactivated by an administrator. Reason: ${reason || 'Policy review'}`,
          relatedRef: { model: 'Listing', id: listing._id },
        });

        await auditLogService.logAction({
          actor: adminUser._id,
          action: 'listing_deactivated',
          targetType: 'listing',
          targetId: listing._id,
          details: { reason },
          ipAddress,
        });
        break;

      case 'remove':
        transitionModerationStatus(listing, 'removed', context);

        await notificationService.createNotification({
          recipient: listing.ownerRef.id,
          type: 'system',
          title: 'Listing Removed by Administrator',
          message: `Your listing has been removed from the platform by an administrator. Reason: ${reason || 'Severe policy violation'}`,
          relatedRef: { model: 'Listing', id: listing._id },
        });

        await auditLogService.logAction({
          actor: adminUser._id,
          action: 'listing_removed',
          targetType: 'listing',
          targetId: listing._id,
          details: { reason },
          ipAddress,
        });
        break;

      default:
        throw new ValidationError(`Unknown moderation action: ${action}`);
    }

    await listing.save();
    return listing.toOwnerObject();
  }
}

module.exports = new ListingService();
