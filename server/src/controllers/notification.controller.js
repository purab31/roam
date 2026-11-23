const notificationService = require('../services/notification.service');

async function getMyNotifications(req, res, next) {
  try {
    const result = await notificationService.getUserNotifications(req.user._id, req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const notification = await notificationService.markNotificationRead(req.params.id, req.user._id);
    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
}

async function markAllRead(req, res, next) {
  try {
    const result = await notificationService.markAllNotificationsRead(req.user._id);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyNotifications,
  markNotificationRead,
  markAllRead,
};
