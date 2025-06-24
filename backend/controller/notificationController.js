import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Notification } from "../models/notificationSchema.js";
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  getUnreadNotificationCount 
} from "../utils/notificationService.js";

// Get all notifications for the authenticated user
export const getNotifications = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;
  const { limit = 50, unreadOnly = false } = req.query;

  try {
    let notifications = await getUserNotifications(userId, parseInt(limit));
    
    if (unreadOnly === 'true') {
      notifications = notifications.filter(notification => !notification.isRead);
    }

    res.status(200).json({
      success: true,
      notifications,
      count: notifications.length,
    });
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    return next(new ErrorHandler("Error fetching notifications", 500));
  }
});

// Mark a specific notification as read
export const markAsRead = catchAsyncErrors(async (req, res, next) => {
  const { notificationId } = req.params;
  const userId = req.user._id;

  try {
    const notification = await markNotificationAsRead(notificationId, userId);
    
    if (!notification) {
      return next(new ErrorHandler("Notification not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
    return next(new ErrorHandler("Error marking notification as read", 500));
  }
});

// Mark all notifications as read for the authenticated user
export const markAllAsRead = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;

  try {
    const success = await markAllNotificationsAsRead(userId);
    
    if (!success) {
      return next(new ErrorHandler("Error marking notifications as read", 500));
    }

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("❌ Error marking all notifications as read:", error);
    return next(new ErrorHandler("Error marking notifications as read", 500));
  }
});

// Get unread notification count
export const getUnreadCount = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;

  try {
    const count = await getUnreadNotificationCount(userId);

    res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    console.error("❌ Error getting unread count:", error);
    return next(new ErrorHandler("Error getting unread count", 500));
  }
});

// Delete a notification
export const deleteNotification = catchAsyncErrors(async (req, res, next) => {
  const { notificationId } = req.params;
  const userId = req.user._id;

  try {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipientId: userId,
    });

    if (!notification) {
      return next(new ErrorHandler("Notification not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting notification:", error);
    return next(new ErrorHandler("Error deleting notification", 500));
  }
}); 