const AuditLog = require('../models/auditLog.model');

class AuditLogService {
  /**
   * Appends an audit log entry after an admin action succeeds.
   * @param {Object} params
   * @param {string|ObjectId} params.actor User ID of admin performing action
   * @param {string} params.action E.g. 'listing_moderated', 'user_blocked'
   * @param {string} params.targetType E.g. 'listing', 'user', 'dealer', 'report', 'settings'
   * @param {*} [params.targetId] ID of target entity
   * @param {Object} [params.details] Key-value metadata
   * @param {string} [params.ipAddress] Request IP
   */
  async logAction({ actor, action, targetType, targetId = null, details = {}, ipAddress = null }) {
    try {
      const entry = await AuditLog.create({
        actor,
        action,
        targetType,
        targetId,
        details,
        ipAddress,
        createdAt: new Date(),
      });
      return entry;
    } catch (err) {
      console.error('[AuditLog] Failed to record audit log:', err.message);
      return null;
    }
  }

  /**
   * Retrieves paginated audit log entries with optional filters.
   */
  async getAuditLogs(query = {}) {
    const { action, targetType, page = 1, limit = 50 } = query;
    const filter = {};

    if (action) {
      filter.action = action;
    }
    if (targetType) {
      filter.targetType = targetType;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actor', 'fullName email capabilities')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AuditLog.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page: Number(page),
      pageSize: Number(limit),
    };
  }
}

module.exports = new AuditLogService();
