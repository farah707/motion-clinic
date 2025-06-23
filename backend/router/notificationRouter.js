import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
} from "../controller/notificationController.js";
import { isDoctorAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// All routes require doctor authentication
router.use(isDoctorAuthenticated);

// Get notifications
router.get("/", getNotifications);

// Get unread count
router.get("/unread-count", getUnreadCount);

// Mark notification as read
router.put("/:notificationId/read", markAsRead);

// Mark all notifications as read
router.put("/mark-all-read", markAllAsRead);

// Delete notification
router.delete("/:notificationId", deleteNotification);

export default router; 