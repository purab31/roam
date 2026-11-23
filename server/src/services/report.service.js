const mongoose = require('mongoose');
const Report = require('../models/report.model');
const User = require('../models/user.model');
const Listing = require('../models/listing.model');
const Dealer = require('../models/dealer.model');
const notificationService = require('./notification.service');
const auditLogService = require('./auditLog.service');
const { NotFoundError, ValidationError, ConflictError } = require('../errors');

class ReportService {
  /**
   * Submits a report for a listing, user, or dealer.
   * Enforces:
   * 1. Subject exists
   * 2. No self-reports
   * 3. No duplicate open reports by the same user on the same subject
   */
  async createReport({ subjectType, subjectRef, category, description }, reporterUser, ipAddress = null) {
    if (!mongoose.Types.ObjectId.isValid(subjectRef)) {
      throw new ValidationError('Invalid subjectRef ID format');
    }

    // 1. Verify subject exists and block self-reports
    if (subjectType === 'user') {
      if (subjectRef.toString() === reporterUser._id.toString()) {
        throw new ValidationError('You cannot report your own account');
      }
      const targetUser = await User.findById(subjectRef);
      if (!targetUser) {
        throw new NotFoundError('User to report not found');
      }
    } else if (subjectType === 'listing') {
      const listing = await Listing.findById(subjectRef);
      if (!listing) {
        throw new NotFoundError('Listing to report not found');
      }
      if (listing.ownerRef && listing.ownerRef.id.toString() === reporterUser._id.toString()) {
        throw new ValidationError('You cannot report your own listing');
      }
    } else if (subjectType === 'dealer') {
      const dealer = await Dealer.findById(subjectRef);
      if (!dealer) {
        throw new NotFoundError('Dealership to report not found');
      }
      if (dealer.user && dealer.user.toString() === reporterUser._id.toString()) {
        throw new ValidationError('You cannot report your own dealership');
      }
    }

    // 2. Prevent duplicate open reports on the same subject by the same reporter
    const existing = await Report.findOne({
      reporter: reporterUser._id,
      subjectType,
      subjectRef,
      status: { $in: ['open', 'in_review'] },
    });

    if (existing) {
      throw new ConflictError(
        'You already have an active report under review for this item',
        'DUPLICATE_REPORT'
      );
    }

    // 3. Create the report
    const report = await Report.create({
      reporter: reporterUser._id,
      subjectType,
      subjectRef,
      category,
      description,
      status: 'open',
    });

    return report;
  }

  /**
   * Admin: List reports with filters and pagination.
   */
  async getReports(query = {}) {
    const { status, subjectType, page = 1, limit = 20 } = query;
    const filter = {};

    if (status) {
      filter.status = status;
    }
    if (subjectType) {
      filter.subjectType = subjectType;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Report.find(filter)
        .populate('reporter', 'fullName email mobile')
        .populate('resolvedBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Report.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page: Number(page),
      pageSize: Number(limit),
    };
  }

  /**
   * Admin: Resolve or dismiss a report.
   */
  async resolveReport(reportId, { status, resolutionNote = '' }, adminUser, ipAddress = null) {
    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      throw new NotFoundError('Report not found');
    }

    const report = await Report.findById(reportId);
    if (!report) {
      throw new NotFoundError('Report not found');
    }

    report.status = status;
    report.resolutionNote = resolutionNote;
    report.resolvedBy = adminUser._id;
    report.resolvedAt = new Date();

    await report.save();

    // Audit log
    await auditLogService.logAction({
      actor: adminUser._id,
      action: 'report_resolved',
      targetType: 'report',
      targetId: report._id,
      details: { status, resolutionNote, subjectType: report.subjectType, subjectRef: report.subjectRef },
      ipAddress,
    });

    // Notify reporter
    await notificationService.createNotification({
      recipient: report.reporter,
      type: 'system',
      title: 'Report Update',
      message: `Your report regarding a ${report.subjectType} has been marked as ${status}.${resolutionNote ? ` Note: ${resolutionNote}` : ''}`,
      relatedRef: { model: 'Report', id: report._id },
    });

    return report;
  }
}

module.exports = new ReportService();
