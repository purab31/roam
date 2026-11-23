const mongoose = require('mongoose');
const Dealer = require('../models/dealer.model');
const User = require('../models/user.model');
const Listing = require('../models/listing.model');
const Vehicle = require('../models/vehicle.model');
const Transaction = require('../models/transaction.model');
const Offer = require('../models/offer.model');
const Enquiry = require('../models/enquiry.model');
const notificationService = require('./notification.service');
const auditLogService = require('./auditLog.service');
const storageService = require('./storage');
const { validateImageFile, validateDocumentFile } = require('./storage/fileValidator');
const config = require('../config/env');
const {
  transitionSaleStatus,
  transitionRentalStatus,
} = require('./listingStateMachine');
const {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} = require('../errors');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class DealerService {
  /**
   * Register a new dealership for an authenticated user.
   */
  async registerDealer(user, data) {
    const existing = await Dealer.findOne({ user: user._id });
    if (existing) {
      throw new ConflictError('A dealership is already registered for this account', 'DEALER_ALREADY_REGISTERED');
    }

    const dealer = await Dealer.create({
      user: user._id,
      dealershipName: data.dealershipName,
      ownerName: data.ownerName,
      businessEmail: data.businessEmail,
      phone: data.phone,
      address: data.address,
      city: data.city,
      pincode: data.pincode,
      description: data.description || '',
      logo: data.logo || null,
      registrationInfo: data.registrationInfo || {},
      verificationStatus: 'pending',
    });

    // Grant dealer capability to the user
    await User.findByIdAndUpdate(user._id, {
      $addToSet: { capabilities: 'dealer' },
    });

    // Notify admins (or system notification to user)
    await notificationService.createNotification({
      recipient: user._id,
      type: 'system',
      title: 'Dealership Registration Submitted',
      message: `Your dealership registration for ${dealer.dealershipName} has been received and is pending administrative verification.`,
      relatedRef: { model: 'Dealer', id: dealer._id },
    });

    return dealer.toOwnerObject();
  }

  /**
   * Retrieve public directory of verified dealerships.
   */
  async getPublicDealers(query = {}) {
    const { city, q, page = 1, limit = 20 } = query;
    const filter = { verificationStatus: 'approved' };

    if (city) {
      filter.city = new RegExp(`^${escapeRegex(city)}$`, 'i');
    }
    if (q) {
      filter.dealershipName = new RegExp(escapeRegex(q), 'i');
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Dealer.find(filter)
        .sort({ dealershipName: 1 })
        .skip(skip)
        .limit(Number(limit)),
      Dealer.countDocuments(filter),
    ]);

    return {
      items: items.map(d => d.toPublicProfile()),
      total,
      page: Number(page),
      pageSize: Number(limit),
    };
  }

  /**
   * Get dealership by ID (returns public profile for visitors, full for owner/admin).
   */
  async getDealerById(id, requestingUser = null) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Dealer not found');
    }

    const dealer = await Dealer.findById(id);
    if (!dealer) {
      throw new NotFoundError('Dealer not found');
    }

    const isOwner =
      requestingUser &&
      dealer.user.toString() === requestingUser._id.toString();
    const isAdmin = requestingUser && requestingUser.capabilities?.includes('admin');

    if (isOwner || isAdmin) {
      return dealer.toOwnerObject();
    }

    if (dealer.verificationStatus !== 'approved') {
      throw new NotFoundError('Dealer not found or not verified');
    }

    return dealer.toPublicProfile();
  }

  /**
   * Get current authenticated user's dealership profile.
   */
  async getMyDealerProfile(user) {
    const dealer = await Dealer.findOne({ user: user._id });
    if (!dealer) {
      throw new NotFoundError('No dealership registered for this account');
    }
    return dealer.toOwnerObject();
  }

  /**
   * Update dealership profile (own profile only).
   */
  async updateDealerProfile(id, updateData, user) {
    const dealer = await Dealer.findById(id);
    if (!dealer) {
      throw new NotFoundError('Dealer not found');
    }

    const isOwner = dealer.user.toString() === user._id.toString();
    const isAdmin = user.capabilities?.includes('admin');

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('You can only update your own dealership profile');
    }

    const allowedFields = [
      'dealershipName',
      'ownerName',
      'businessEmail',
      'phone',
      'address',
      'city',
      'pincode',
      'description',
      'logo',
      'registrationInfo',
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        dealer[field] = updateData[field];
      }
    }

    await dealer.save();
    return dealer.toOwnerObject();
  }

  /**
   * Upload logo for dealership.
   */
  async uploadLogo(id, file, user) {
    if (!file) {
      throw new ValidationError('Logo image file is required');
    }
    validateImageFile(file);

    const dealer = await Dealer.findById(id);
    if (!dealer) {
      throw new NotFoundError('Dealer not found');
    }

    const isOwner = dealer.user.toString() === user._id.toString();
    const isAdmin = user.capabilities?.includes('admin');

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('You can only update your own dealership');
    }

    const saved = await storageService.saveFile(file.buffer, file.originalname, 'images');
    dealer.logo = saved.url;
    await dealer.save();
    return dealer.toOwnerObject();
  }

  /**
   * Add a verification document to dealership.
   */
  async addDealerDocument(id, file, user) {
    if (!file) {
      throw new ValidationError('Document file is required');
    }
    validateDocumentFile(file);

    const dealer = await Dealer.findById(id);
    if (!dealer) {
      throw new NotFoundError('Dealer not found');
    }

    const isOwner = dealer.user.toString() === user._id.toString();
    const isAdmin = user.capabilities?.includes('admin');

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('You can only upload documents to your own dealership');
    }

    const saved = await storageService.saveFile(file.buffer, file.originalname, 'documents');

    dealer.documents.push({
      name: file.originalname || 'Verification Document',
      url: saved.url,
      fileType: file.mimetype,
      size: saved.size,
      uploadedAt: new Date(),
    });

    await dealer.save();
    return dealer.toOwnerObject();
  }

  /**
   * Retrieves file path for a private dealer document after verifying owner/admin access.
   */
  async getDealerDocumentPath(dealerId, docId, user) {
    const dealer = await Dealer.findById(dealerId);
    if (!dealer) {
      throw new NotFoundError('Dealer not found');
    }

    const isOwner = dealer.user.toString() === user._id.toString();
    const isAdmin = user.capabilities?.includes('admin');

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Access denied: document is private to the dealership');
    }

    const doc = dealer.documents.find(d => d._id.toString() === docId);
    if (!doc) {
      throw new NotFoundError('Document not found for this dealership');
    }

    const relativePath = doc.url.replace('/uploads/', '');
    const fullPath = await storageService.getFilePath(relativePath);

    return {
      filePath: fullPath,
      name: doc.name,
      fileType: doc.fileType,
    };
  }

  /**
   * Dealer Discover feed: individual owner listings matching spec 8.1 filters.
   * Dealers only; owner contact information included strictly per contactVisibility.
   */
  async getDiscoverOwnerListings(dealerUser, query = {}) {
    const {
      brand,
      model,
      variant,
      minPrice,
      maxPrice,
      yearFrom,
      yearTo,
      kmMin,
      kmMax,
      owners,
      condition,
      city,
      sort = 'recentlyListed',
      page = 1,
      limit = 20,
    } = query;

    const skip = (Number(page) - 1) * Number(limit);

    // Listing match: individual owner listings, approved, active for sale
    const listingMatch = {
      'ownerRef.type': 'user',
      moderationStatus: 'approved',
      purpose: { $in: ['sale', 'both'] },
      'sale.status': 'active',
    };

    if (minPrice !== undefined || maxPrice !== undefined) {
      listingMatch['sale.askingPrice'] = {};
      if (minPrice !== undefined) listingMatch['sale.askingPrice'].$gte = Number(minPrice);
      if (maxPrice !== undefined) listingMatch['sale.askingPrice'].$lte = Number(maxPrice);
    }

    const vehicleMatch = {};
    if (brand) vehicleMatch['vehicleRef.brand'] = new RegExp(`^${escapeRegex(brand)}$`, 'i');
    if (model) vehicleMatch['vehicleRef.model'] = new RegExp(`^${escapeRegex(model)}$`, 'i');
    if (variant) vehicleMatch['vehicleRef.variant'] = new RegExp(escapeRegex(variant), 'i');
    if (yearFrom !== undefined || yearTo !== undefined) {
      vehicleMatch['vehicleRef.manufacturingYear'] = {};
      if (yearFrom !== undefined) vehicleMatch['vehicleRef.manufacturingYear'].$gte = Number(yearFrom);
      if (yearTo !== undefined) vehicleMatch['vehicleRef.manufacturingYear'].$lte = Number(yearTo);
    }
    if (kmMin !== undefined || kmMax !== undefined) {
      vehicleMatch['vehicleRef.kmDriven'] = {};
      if (kmMin !== undefined) vehicleMatch['vehicleRef.kmDriven'].$gte = Number(kmMin);
      if (kmMax !== undefined) vehicleMatch['vehicleRef.kmDriven'].$lte = Number(kmMax);
    }
    if (owners !== undefined) vehicleMatch['vehicleRef.previousOwners'] = Number(owners);
    if (condition) vehicleMatch['vehicleRef.condition'] = new RegExp(`^${escapeRegex(condition)}$`, 'i');
    if (city) vehicleMatch['vehicleRef.location.city'] = new RegExp(`^${escapeRegex(city)}$`, 'i');

    let sortStage = { createdAt: -1 };
    if (sort === 'priceAsc') sortStage = { 'sale.askingPrice': 1, createdAt: -1 };
    else if (sort === 'priceDesc') sortStage = { 'sale.askingPrice': -1, createdAt: -1 };
    else if (sort === 'year') sortStage = { 'vehicleRef.manufacturingYear': -1, createdAt: -1 };
    else if (sort === 'lowestKm') sortStage = { 'vehicleRef.kmDriven': 1, createdAt: -1 };

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
      { $match: vehicleMatch },
      {
        $lookup: {
          from: 'users',
          localField: 'ownerRef.id',
          foreignField: '_id',
          as: 'owner',
        },
      },
      { $unwind: '$owner' },
      {
        $facet: {
          items: [
            { $sort: sortStage },
            { $skip: skip },
            { $limit: Number(limit) },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    const [aggregateResult] = await Listing.aggregate(pipeline);
    const rawItems = aggregateResult?.items || [];
    const total = aggregateResult?.totalCount?.[0]?.count || 0;

    const items = rawItems.map(item => {
      // Sanitize listing and vehicle
      const id = item._id ? item._id.toString() : item.id;
      delete item._id;
      delete item.__v;
      if (item.sale) delete item.sale.minAcceptableOffer;

      if (item.vehicleRef) {
        item.vehicleRef.id = item.vehicleRef._id?.toString();
        delete item.vehicleRef._id;
        delete item.vehicleRef.__v;
        delete item.vehicleRef.registrationNumber;
        delete item.vehicleRef.documents;
      }

      // Owner contact details strictly per contactVisibility
      const ownerObj = {
        id: item.owner._id.toString(),
        name: item.owner.fullName,
        city: item.vehicleRef?.location?.city || '',
      };
      if (item.owner.contactVisibility?.email) {
        ownerObj.email = item.owner.email;
      }
      if (item.owner.contactVisibility?.mobile) {
        ownerObj.mobile = item.owner.mobile;
      }
      delete item.owner;
      item.seller = ownerObj;
      item.id = id;
      return item;
    });

    return {
      items,
      total,
      page: Number(page),
      pageSize: Number(limit),
    };
  }

  /**
   * Retrieve all inventory listings owned by this dealer.
   */
  async getDealerInventory(user, query = {}) {
    const filter = {
      'ownerRef.id': user._id,
      'ownerRef.type': 'dealer',
    };

    if (query.status) {
      filter['sale.status'] = query.status;
    }
    if (query.moderationStatus) {
      filter.moderationStatus = query.moderationStatus;
    }
    if (query.purpose) {
      filter.purpose = query.purpose;
    }

    const listings = await Listing.find(filter)
      .populate('vehicleRef')
      .sort({ createdAt: -1 });

    return listings.map(l => l.toOwnerObject());
  }

  /**
   * Bulk activate or deactivate inventory listings for this dealer.
   */
  async bulkUpdateListingStatus(user, { listingIds, action }) {
    if (action === 'activate' && config.requireDealerVerification) {
      const dealer = await Dealer.findOne({ user: user._id });
      if (!dealer || dealer.verificationStatus !== 'approved') {
        throw new ForbiddenError(
          `Publishing requires verified dealer status. Current status: ${dealer?.verificationStatus || 'not registered'}`,
          'DEALER_VERIFICATION_REQUIRED'
        );
      }
    }

    const listings = await Listing.find({
      _id: { $in: listingIds },
      'ownerRef.id': user._id,
      'ownerRef.type': 'dealer',
    });

    if (listings.length === 0) {
      throw new NotFoundError('No matching dealer listings found for the provided IDs');
    }

    const updated = [];
    for (const listing of listings) {
      if (action === 'activate') {
        if (listing.purpose === 'sale' || listing.purpose === 'both') {
          transitionSaleStatus(listing, 'active', { user, reason: 'Bulk activate by dealer' });
        }
        if (listing.purpose === 'rent' || listing.purpose === 'both') {
          transitionRentalStatus(listing, 'active', { user, reason: 'Bulk activate by dealer' });
        }
      } else if (action === 'deactivate') {
        if (listing.sale && listing.sale.status === 'active') {
          transitionSaleStatus(listing, 'inactive', { user, reason: 'Bulk deactivate by dealer' });
        }
        if (listing.rental && listing.rental.status === 'active') {
          transitionRentalStatus(listing, 'inactive', { user, reason: 'Bulk deactivate by dealer' });
        }
      }
      await listing.save();
      updated.push(listing.toOwnerObject());
    }

    return {
      success: true,
      count: updated.length,
      items: updated,
    };
  }

  /**
   * Retrieve statistics for dealer dashboard.
   */
  async getDealerDashboardStats(user) {
    const dealerRef = {
      'ownerRef.id': user._id,
      'ownerRef.type': 'dealer',
    };

    const [
      totalInventory,
      activeSaleCount,
      activeRentalCount,
      soldCount,
      acquiredCount,
      pendingAcquisitions,
      offersSentCount,
      customerEnquiriesCount,
    ] = await Promise.all([
      Listing.countDocuments(dealerRef),
      Listing.countDocuments({ ...dealerRef, 'sale.status': 'active' }),
      Listing.countDocuments({ ...dealerRef, 'rental.status': 'active' }),
      Listing.countDocuments({ ...dealerRef, 'sale.status': 'sold' }),
      Transaction.countDocuments({ buyer: user._id, acquisitionStatus: 'acquired' }),
      Transaction.countDocuments({ buyer: user._id, acquisitionStatus: 'acquisition_pending' }),
      Offer.countDocuments({ offeredBy: user._id }),
      Enquiry.countDocuments({ recipient: user._id }),
    ]);

    return {
      totalInventory,
      activeSaleCount,
      activeRentalCount,
      soldCount,
      acquiredCount,
      pendingAcquisitions,
      offersSentCount,
      customerEnquiriesCount,
    };
  }

  /**
   * Public listings for a specific dealership.
   */
  async getPublicDealerListings(dealerId, query = {}) {
    if (!mongoose.Types.ObjectId.isValid(dealerId)) {
      throw new NotFoundError('Dealer not found');
    }

    const dealer = await Dealer.findById(dealerId);
    if (!dealer) {
      throw new NotFoundError('Dealer not found');
    }

    // Exclude listings of suspended or revoked dealers
    if (dealer.verificationStatus !== 'approved') {
      return [];
    }

    const filter = {
      'ownerRef.id': dealer.user,
      'ownerRef.type': 'dealer',
      moderationStatus: 'approved',
      $or: [
        { 'sale.status': { $in: ['active', 'reserved'] } },
        { 'rental.status': 'active' },
      ],
    };

    const listings = await Listing.find(filter)
      .populate('vehicleRef')
      .sort({ createdAt: -1 });

    return listings.map(l => l.toPublicObject());
  }

  // --- ADMIN METHODS ---

  /**
   * Admin: List all dealers with verification filters.
   */
  async getAllDealers(query = {}) {
    const { status, city, page = 1, limit = 20 } = query;
    const filter = {};

    if (status) {
      filter.verificationStatus = status;
    }
    if (city) {
      filter.city = new RegExp(`^${escapeRegex(city)}$`, 'i');
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Dealer.find(filter)
        .populate('user', 'fullName email mobile accountStatus')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Dealer.countDocuments(filter),
    ]);

    return {
      items: items.map(d => d.toOwnerObject()),
      total,
      page: Number(page),
      pageSize: Number(limit),
    };
  }

  /**
   * Admin: Update verification status for a dealership.
   */
  async updateDealerVerification(dealerId, { status, notes = '' }, adminUser, ipAddress = null) {
    const dealer = await Dealer.findById(dealerId);
    if (!dealer) {
      throw new NotFoundError('Dealer not found');
    }

    dealer.verificationStatus = status;
    dealer.verificationNotes = notes;
    if (status === 'approved') {
      dealer.verifiedAt = new Date();
    }

    await dealer.save();

    // Audit log
    await auditLogService.logAction({
      actor: adminUser._id,
      action: 'dealer_verification_updated',
      targetType: 'dealer',
      targetId: dealer._id,
      details: { status, notes, dealershipName: dealer.dealershipName },
      ipAddress,
    });

    // Send notification to dealer user
    const statusTitles = {
      approved: 'Dealership Verified!',
      rejected: 'Dealership Verification Rejected',
      changes_requested: 'Changes Requested for Dealership Verification',
      suspended: 'Dealership Account Suspended',
      revoked: 'Dealership Verification Revoked',
    };

    const statusMessages = {
      approved: `Your dealership ${dealer.dealershipName} has been approved! You can now publish vehicle listings.`,
      rejected: `Your verification request was rejected. Notes: ${notes || 'None provided'}`,
      changes_requested: `Please update your dealership verification details. Notes: ${notes || 'None provided'}`,
      suspended: `Your dealership account has been suspended. Notes: ${notes || 'Contact administrator for details'}`,
      revoked: `Your dealership verification has been revoked. Notes: ${notes || 'You may resubmit documents for verification.'}`,
    };

    await notificationService.createNotification({
      recipient: dealer.user,
      type: 'system',
      title: statusTitles[status] || 'Dealership Status Updated',
      message: statusMessages[status] || `Your dealership status is now ${status}.`,
      relatedRef: { model: 'Dealer', id: dealer._id },
    });

    return dealer.toOwnerObject();
  }
}

module.exports = new DealerService();
