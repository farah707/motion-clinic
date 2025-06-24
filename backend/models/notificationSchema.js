import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  recipientType: {
    type: String,
    enum: ["Doctor", "Admin", "Patient"],
    required: true,
  },
  type: {
    type: String,
    enum: ["appointment_booking", "appointment_update", "appointment_cancelled", "status_change", "reminder"],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  data: {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    appointmentDate: Date,
    appointmentTime: String,
    status: String,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  isEmailSent: {
    type: Boolean,
    default: false,
  },
  emailSentAt: Date,
}, {
  timestamps: true,
});

// Index for efficient queries
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientType: 1, type: 1 });

export const Notification = mongoose.model("Notification", notificationSchema); 