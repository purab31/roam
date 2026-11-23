const mongoose = require('mongoose');
const User = require('../models/user.model');
const Listing = require('../models/listing.model');
const Vehicle = require('../models/vehicle.model');
const Dealer = require('../models/dealer.model');
const Offer = require('../models/offer.model');
const Booking = require('../models/booking.model');
const Report = require('../models/report.model');
const notificationService = require('./notification.service');
const auditLogService = require('./auditLog.service');
const { NotFoundError, ValidationError } = require('../errors');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class AdminService {
  /**
   * Search, filter, and paginate platform users.
   */
  async getUsers(query = {}) {
    const { q, status, capability, page = 1, limit = 20 } = query;
    const filter = {};

    if (status) {
      filter.accountStatus = status;
    }

    if (capability) {
      filter.capabilities = capability;
    }

    if (q) {
      const regex = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ fullName: regex }, { email: regex }, { mobile: regex }];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter),
    ]);

    return {
      items: items.map(u => u.toSafeObject()),
      total,
      page: Number(page),
      pageSize: Number(limit),
    };
  }

  /**
   * Retrieves single user details with activity counts.
   */
  async getUserById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('User not found');
    }

    const user = await User.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const [vehicleCount, listingCount, offersSent, bookingsCount, dealership] =
      await Promise.all([
        Vehicle.countDocuments({ 'ownerRef.id': user._id }),
        Listing.countDocuments({ 'ownerRef.id': user._id }),
        Offer.countDocuments({ offeredBy: user._id }),
        Booking.countDocuments({ renter: user._id }),
        Dealer.findOne({ user: user._id }),
      ]);

    const result = user.toSafeObject();
    result.stats = {
      vehicles: vehicleCount,
      listings: listingCount,
      offersSent,
      bookings: bookingsCount,
      dealership: dealership ? dealership.toOwnerObject() : null,
    };

    return result;
  }

  /**
   * Blocks a user account.
   * Admin cannot block their own account.
   */
  async blockUser(userId, { reason }, adminUser, ipAddress = null) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new NotFoundError('User not found');
    }

    if (userId.toString() === adminUser._id.toString()) {
      throw new ValidationError('Administrators cannot block their own account');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    user.accountStatus = 'blocked';
    await user.save();

    // Audit log
    await auditLogService.logAction({
      actor: adminUser._id,
      action: 'user_blocked',
      targetType: 'user',
      targetId: user._id,
      details: { reason, email: user.email },
      ipAddress,
    });

    // Notify user
    await notificationService.createNotification({
      recipient: user._id,
      type: 'system',
      title: 'Account Blocked',
      message: `Your account has been blocked by an administrator. Reason: ${reason}`,
    });

    return user.toSafeObject();
  }

  /**
   * Unblocks a user account.
   */
  async unblockUser(userId, { reason = '' }, adminUser, ipAddress = null) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new NotFoundError('User not found');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    user.accountStatus = 'active';
    await user.save();

    // Audit log
    await auditLogService.logAction({
      actor: adminUser._id,
      action: 'user_unblocked',
      targetType: 'user',
      targetId: user._id,
      details: { reason, email: user.email },
      ipAddress,
    });

    // Notify user
    await notificationService.createNotification({
      recipient: user._id,
      type: 'system',
      title: 'Account Unblocked',
      message: `Your account has been unblocked by an administrator. You can now log in and access your account.${reason ? ` Note: ${reason}` : ''}`,
    });

    return user.toSafeObject();
  }

  /**
   * Read-only offers oversight for admin.
   */
  async getOffers(query = {}) {
    const { status, page = 1, limit = 20 } = query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Offer.find(filter)
        .populate('offeredBy', 'fullName email')
        .populate('seller', 'fullName email')
        .populate({
          path: 'listing',
          populate: { path: 'vehicleRef', select: 'brand model variant manufacturingYear' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Offer.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page: Number(page),
      pageSize: Number(limit),
    };
  }

  /**
   * Read-only bookings oversight for admin.
   */
  async getBookings(query = {}) {
    const { status, page = 1, limit = 20 } = query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Booking.find(filter)
        .populate('renter', 'fullName email mobile')
        .populate({
          path: 'listing',
          populate: { path: 'vehicleRef', select: 'brand model variant manufacturingYear' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Booking.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page: Number(page),
      pageSize: Number(limit),
    };
  }

  /**
   * Platform analytics totals, popular brands/models, most viewed listings, and real sparklines.
   */
  async getDashboardStats() {
    const [
      usersCount,
      ownersCount,
      dealersCount,
      verifiedDealersCount,
      vehiclesCount,
      activeSaleListingsCount,
      activeRentalListingsCount,
      soldVehiclesCount,
      offersCount,
      bookingsCount,
      pendingVerificationsCount,
      pendingReviewsCount,
      reportedItemsCount,
      popularBrandsAgg,
      popularModelsAgg,
      mostViewedListingsRaw,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ capabilities: 'seller' }),
      Dealer.countDocuments(),
      Dealer.countDocuments({ verificationStatus: 'approved' }),
      Vehicle.countDocuments(),
      Listing.countDocuments({ 'sale.status': 'active', moderationStatus: 'approved' }),
      Listing.countDocuments({ 'rental.status': 'active', moderationStatus: 'approved' }),
      Listing.countDocuments({ 'sale.status': 'sold' }),
      Offer.countDocuments(),
      Booking.countDocuments(),
      Dealer.countDocuments({ verificationStatus: 'pending' }),
      Listing.countDocuments({ moderationStatus: 'pending_review' }),
      Report.countDocuments({ status: { $in: ['open', 'in_review'] } }),
      Vehicle.aggregate([
        { $group: { _id: '$brand', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Vehicle.aggregate([
        { $group: { _id: { brand: '$brand', model: '$model' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Listing.find({ moderationStatus: 'approved' })
        .sort({ viewCount: -1, createdAt: -1 })
        .limit(5)
        .populate('vehicleRef', 'brand model variant manufacturingYear images'),
    ]);

    // Real monthly series for past 6 months (Sparklines)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [monthlyUsersAgg, monthlyListingsAgg] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      Listing.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Map into ordered 6-month array
    const sparklineUsers = [];
    const sparklineListings = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const label = d.toLocaleString('default', { month: 'short' });

      const uMatch = monthlyUsersAgg.find(m => m._id.year === year && m._id.month === month);
      const lMatch = monthlyListingsAgg.find(m => m._id.year === year && m._id.month === month);

      sparklineUsers.push({ label, value: uMatch ? uMatch.count : 0 });
      sparklineListings.push({ label, value: lMatch ? lMatch.count : 0 });
    }

    return {
      totals: {
        users: usersCount,
        owners: ownersCount,
        dealers: dealersCount,
        verifiedDealers: verifiedDealersCount,
        vehicles: vehiclesCount,
        activeSaleListings: activeSaleListingsCount,
        activeRentalListings: activeRentalListingsCount,
        soldVehicles: soldVehiclesCount,
        offers: offersCount,
        bookings: bookingsCount,
        pendingVerifications: pendingVerificationsCount,
        pendingReviews: pendingReviewsCount,
        reportedItems: reportedItemsCount,
      },
      popularBrands: popularBrandsAgg.map(b => ({ brand: b._id, count: b.count })),
      popularModels: popularModelsAgg.map(m => ({
        brand: m._id.brand,
        model: m._id.model,
        count: m.count,
      })),
      mostViewedListings: mostViewedListingsRaw.map(l => ({
        id: l._id.toString(),
        viewCount: l.viewCount || 0,
        purpose: l.purpose,
        price: l.sale?.askingPrice || l.rental?.dailyPrice || 0,
        vehicle: l.vehicleRef
          ? {
              brand: l.vehicleRef.brand,
              model: l.vehicleRef.model,
              variant: l.vehicleRef.variant,
              year: l.vehicleRef.manufacturingYear,
              image: l.vehicleRef.images?.[0]?.url || null,
            }
          : null,
      })),
      sparklines: {
        users: sparklineUsers,
        listings: sparklineListings,
      },
    };
  }
}

module.exports = new AdminService();
