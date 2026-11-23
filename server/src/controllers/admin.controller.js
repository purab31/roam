const dealerService = require('../services/dealer.service');
const listingService = require('../services/listing.service');
const adminService = require('../services/admin.service');
const reportService = require('../services/report.service');
const settingsService = require('../services/settings.service');
const auditLogService = require('../services/auditLog.service');

// --- DEALERS ---
async function getAllDealers(req, res, next) {
  try {
    const result = await dealerService.getAllDealers(req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getDealerById(req, res, next) {
  try {
    const dealer = await dealerService.getDealerById(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: dealer,
    });
  } catch (error) {
    next(error);
  }
}

async function updateDealerVerification(req, res, next) {
  try {
    const dealer = await dealerService.updateDealerVerification(
      req.params.id,
      req.body,
      req.user,
      req.ip
    );
    res.status(200).json({
      success: true,
      data: dealer,
    });
  } catch (error) {
    next(error);
  }
}

// --- LISTINGS ---
async function getAdminListings(req, res, next) {
  try {
    const result = await listingService.getAdminListings(req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function adminModerateListing(req, res, next) {
  try {
    const listing = await listingService.adminModerateListing(
      req.params.id,
      req.body,
      req.user,
      req.ip
    );
    res.status(200).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    next(error);
  }
}

// --- USERS ---
async function getUsers(req, res, next) {
  try {
    const result = await adminService.getUsers(req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getUserById(req, res, next) {
  try {
    const user = await adminService.getUserById(req.params.id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

async function blockUser(req, res, next) {
  try {
    const user = await adminService.blockUser(
      req.params.id,
      req.body,
      req.user,
      req.ip
    );
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

async function unblockUser(req, res, next) {
  try {
    const user = await adminService.unblockUser(
      req.params.id,
      req.body,
      req.user,
      req.ip
    );
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

// --- REPORTS ---
async function getReports(req, res, next) {
  try {
    const result = await reportService.getReports(req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function resolveReport(req, res, next) {
  try {
    const report = await reportService.resolveReport(
      req.params.id,
      req.body,
      req.user,
      req.ip
    );
    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

// --- OFFERS & BOOKINGS OVERSIGHT ---
async function getOffers(req, res, next) {
  try {
    const result = await adminService.getOffers(req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getBookings(req, res, next) {
  try {
    const result = await adminService.getBookings(req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// --- DASHBOARD ANALYTICS ---
async function getDashboardStats(req, res, next) {
  try {
    const stats = await adminService.getDashboardStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

// --- SETTINGS ---
async function getSettings(req, res, next) {
  try {
    const settings = await settingsService.getSettings();
    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    const updated = await settingsService.updateSettings(req.body);
    await auditLogService.logAction({
      actor: req.user._id,
      action: 'settings_updated',
      targetType: 'settings',
      targetId: 'global',
      details: req.body,
      ipAddress: req.ip,
    });
    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

// --- AUDIT LOGS ---
async function getAuditLogs(req, res, next) {
  try {
    const result = await auditLogService.getAuditLogs(req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllDealers,
  getDealerById,
  updateDealerVerification,
  getAdminListings,
  adminModerateListing,
  getUsers,
  getUserById,
  blockUser,
  unblockUser,
  getReports,
  resolveReport,
  getOffers,
  getBookings,
  getDashboardStats,
  getSettings,
  updateSettings,
  getAuditLogs,
};
