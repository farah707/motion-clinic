import mongoose from "mongoose";
import validator from "validator";

const appointmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    dob: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      required: true,
    },
    appointment_date: {
      type: Date,
      required: true,
    },
    appointment_time: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    doctor: {
      type: Object,
      required: true,
    },
    hasVisited: {
      type: Boolean,
      default: false,
    },
    address: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "cancelled", "completed"],
      default: "pending",
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Add compound unique index for userId, appointment_date, and appointment_time
appointmentSchema.index(
  { userId: 1, appointment_date: 1, appointment_time: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: "cancelled" } } }
);

// Add compound unique index for doctorId, appointment_date, and appointment_time
appointmentSchema.index(
  { doctorId: 1, appointment_date: 1, appointment_time: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: "cancelled" } } }
);

export const Appointment = mongoose.model("Appointment", appointmentSchema);
