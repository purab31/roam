const Notification = require('../models/notification.model');
const { NotFoundError } = require('../errors');

class NotificationService {
  /**
   * Creates an in-app notification.
   */
  async createNotification({ recipient, type, title, message, relatedRef }) {
    if (!recipient) return null;
    return Notification.create({
      recipient,
      type,
      title,
      message,
      relatedRef,
      read: false,
      createdAt: new Date(),
    });
  }

  /**
   * Retrieves notifications for a given user.
   */
  async getUserNotifications(userId, query = {}) {
    const { type, unreadOnly, page = 1, limit = 20 } = query;
    const filter = { recipient: userId };

    if (type && ['offer', 'enquiry', 'rental', 'system'].includes(type)) {
      filter.type = type;
    }

    if (unreadOnly === 'true' || unreadOnly === true) {
      filter.read = false;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: userId, read: false }),
    ]);

    return {
      items,
      total,
      unreadCount,
      page: Number(page),
      pageSize: Number(limit),
    };
  }

  /**
   * Marks a specific notification as read.
   */
  async markNotificationRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { $set: { read: true } },
      { new: true }
    );

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    return notification;
  }

  /**
   * Marks all notifications as read for a user.
   */
  async markAllNotificationsRead(userId) {
    await Notification.updateMany(
      { recipient: userId, read: false },
      { $set: { read: true } }
    );
    return { success: true };
  }
}

module.exports = new NotificationService();
