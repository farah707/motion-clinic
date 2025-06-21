import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Appointment } from "../models/appointmentSchema.js";
import { User } from "../models/userSchema.js";
import mongoose from "mongoose";
import { notifyDoctor } from "../utils/notificationService.js";

// Helper function to generate time slots
const generateTimeSlots = () => {
  const slots = [];
  // Clinic working hours: 1 PM (13:00) to 10 PM (22:00)
  for (let hour = 13; hour <= 21; hour++) { // Up to 9 PM for 30 min slots
    slots.push(`${hour < 10 ? '0' : ''}${hour}:00`);
    slots.push(`${hour < 10 ? '0' : ''}${hour}:30`);
  }
  // Add 10:00 PM slot if needed, assuming appointments can end at 10 PM
  slots.push("22:00"); 
  return slots;
};

export const getAvailableTimeSlots = catchAsyncErrors(async (req, res, next) => {
  const { date, doctorId } = req.query;

  console.log(`[getAvailableTimeSlots] Received request for Date: ${date}, DoctorID: ${doctorId}`);

  if (!date || !doctorId) {
    return next(new ErrorHandler("Date and Doctor ID are required!", 400));
  }

  const selectedDate = new Date(date);
  if (isNaN(selectedDate.getTime())) {
    console.error(`[getAvailableTimeSlots] Invalid date format received: ${date}`);
    return next(new ErrorHandler("Invalid date format!", 400));
  }

  // Set selectedDate to start of day for accurate comparison
  selectedDate.setHours(0, 0, 0, 0);

  console.log(`[getAvailableTimeSlots] Searching for appointments on: ${selectedDate.toISOString()} for DoctorID: ${doctorId}`);

  // Get all appointments for the given doctor on the selected date
  const existingAppointments = await Appointment.find({
    doctorId: doctorId,
    appointment_date: selectedDate,
    status: { $in: ["Pending", "Accepted"] }, // Consider only pending/accepted as booked
  });

  console.log(`[getAvailableTimeSlots] Found ${existingAppointments.length} existing appointments:`, existingAppointments.map(app => ({ time: app.appointment_time, status: app.status })));

  const bookedTimes = new Set(existingAppointments.map(app => app.appointment_time));
  const allPossibleSlots = generateTimeSlots();

  const availableSlots = allPossibleSlots.filter(slot => !bookedTimes.has(slot));

  console.log(`[getAvailableTimeSlots] Generated ${availableSlots.length} available slots:`, availableSlots);

  res.status(200).json({
    success: true,
    availableSlots,
  });
});

export const postAppointment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      appointment_date, 
      appointment_time, 
      doctorId,
      phone,
      gender,
      dob,
      address
    } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!phone || !gender || !dob || !address) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields"
      });
    }

    // Validate that the request data matches the authenticated user
    if (req.body.email !== req.user.email || req.body.fullName !== req.user.fullName) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "User data mismatch. Please refresh the page and try again."
      });
    }

    console.log("Starting appointment booking transaction:", { 
      appointment_date, 
      appointment_time, 
      doctorId, 
      userId,
      userEmail: req.user.email
    });

    // Format date to ensure consistency
    const formattedDate = new Date(appointment_date).toISOString().split('T')[0];

    // Check if the appointment date is in the past
    const appointmentDate = new Date(formattedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Cannot book appointments for past dates"
      });
    }

    // Check for any existing appointment for this user at this time
    const userExistingAppointment = await Appointment.findOne({
      userId: userId,
      appointment_date: formattedDate,
      appointment_time: appointment_time,
      status: { $ne: "cancelled" }
    }).session(session);

    if (userExistingAppointment) {
      await session.abortTransaction();
      session.endSession();
      console.log("Found existing user appointment:", userExistingAppointment);
      return res.status(400).json({
        success: false,
        message: "You already have an appointment booked at this time. Please choose a different time slot."
      });
    }

    // Check for any existing appointment for this doctor at this time
    const doctorExistingAppointment = await Appointment.findOne({
      doctorId: doctorId,
      appointment_date: formattedDate,
      appointment_time: appointment_time,
      status: { $ne: "cancelled" }
    }).session(session);

    if (doctorExistingAppointment) {
      await session.abortTransaction();
      session.endSession();
      console.log("Found existing doctor appointment:", doctorExistingAppointment);
      return res.status(400).json({
        success: false,
        message: "This time slot is already booked for the doctor. Please choose a different time slot."
      });
    }

    // Double check for any existing appointment (race condition protection)
    const finalCheck = await Appointment.findOne({
      $or: [
        {
          userId: userId,
          appointment_date: formattedDate,
          appointment_time: appointment_time,
          status: { $ne: "cancelled" }
        },
        {
          doctorId: doctorId,
          appointment_date: formattedDate,
          appointment_time: appointment_time,
          status: { $ne: "cancelled" }
        }
      ]
    }).session(session);

    if (finalCheck) {
      await session.abortTransaction();
      session.endSession();
      console.log("Found existing appointment in final check:", finalCheck);
      return res.status(400).json({
        success: false,
        message: "This time slot is no longer available. Please choose a different time slot."
      });
    }

    // Create the appointment with the authenticated user's data
    const appointment = await Appointment.create([{
      ...req.body,
      userId: userId,
      email: req.user.email,
      fullName: req.user.fullName,
      phone: phone,
      gender: gender,
      dob: dob,
      address: address,
      appointment_date: formattedDate,
      appointment_time: appointment_time,
      status: "pending"
    }], { session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    console.log("Successfully created appointment:", appointment[0]);

    // Send notification to doctor (after successful appointment creation)
    try {
      await notifyDoctor(doctorId, appointment[0], req.user);
    } catch (notificationError) {
      console.error("❌ Error sending notification:", notificationError);
      // Don't fail the appointment creation if notification fails
    }

    res.status(200).json({
      success: true,
      message: "Appointment Sent Successfully!",
      appointment: appointment[0]
    });
  } catch (error) {
    // If an error occurred, abort the transaction
    await session.abortTransaction();
    session.endSession();
    
    console.error("Error in postAppointment:", error);
    
    // Check for duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "This time slot is already booked. Please choose a different time slot."
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Error in booking appointment"
    });
  }
};

export const getAllAppointments = catchAsyncErrors(async (req, res, next) => {
  const appointments = await Appointment.find();
  res.status(200).json({
    success: true,
    appointments,
  });
});

// Update appointment status (Admin only)
export const updateAppointmentStatus = catchAsyncErrors(
  async (req, res, next) => {
    const { id } = req.params;
    let appointment = await Appointment.findById(id);

    if (!appointment) {
      return next(new ErrorHandler("Appointment not found!", 404));
    }

    appointment = await Appointment.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    });

    res.status(200).json({
      success: true,
      message: "Appointment Status Updated!",
    });
  }
);

// Update appointment status (Doctor only - can only update their own appointments)
export const updateDoctorAppointmentStatus = catchAsyncErrors(
  async (req, res, next) => {
    const { id } = req.params;
    const doctorId = req.user._id;
    
    console.log("=== Doctor Update Appointment Status ===");
    console.log("Appointment ID:", id);
    console.log("Doctor ID:", doctorId);
    console.log("New Status:", req.body.status);

    let appointment = await Appointment.findById(id);

    if (!appointment) {
      return next(new ErrorHandler("Appointment not found!", 404));
    }

    // Check if the doctor owns this appointment
    if (appointment.doctorId.toString() !== doctorId.toString()) {
      return next(new ErrorHandler("You are not authorized to update this appointment!", 403));
    }

    // Validate status
    const allowedStatuses = ["pending", "approved", "completed", "cancelled"];
    if (!allowedStatuses.includes(req.body.status)) {
      return next(new ErrorHandler("Invalid status value!", 400));
    }

    appointment = await Appointment.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    });

    console.log("✅ Appointment status updated successfully:", appointment.status);

    res.status(200).json({
      success: true,
      message: "Appointment Status Updated!",
      appointment
    });
  }
);

// Delete appointment controller
export const deleteAppointment = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const appointment = await Appointment.findById(id);

  if (!appointment) {
    return next(new ErrorHandler("Appointment Not Found!", 404));
  }

  await appointment.deleteOne();

  res.status(200).json({
    success: true,
    message: "Appointment Deleted!",
  });
});

export const getUserAppointments = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;
  const appointments = await Appointment.find({ userId })
    .populate({
      path: 'doctorId',
      select: 'fullName email phone'
    });

  res.status(200).json({
    success: true,
    appointments: appointments || [],
  });
});

export const updateAppointmentTime = catchAsyncErrors(async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const { newDate, newTime } = req.body;
    const userId = req.user._id;

    console.log("=== Update Appointment Time Request ===");
    console.log("Appointment ID:", appointmentId);
    console.log("User ID:", userId);
    console.log("New Date:", newDate);
    console.log("New Time:", newTime);

    // Validate appointment ID format
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      console.log("Invalid appointment ID format:", appointmentId);
      return next(new ErrorHandler("Invalid appointment ID format!", 400));
    }

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId);
    console.log("Found appointment:", appointment);

    if (!appointment) {
      console.log("Appointment not found with ID:", appointmentId);
      return next(new ErrorHandler("Appointment not found!", 404));
    }

    // Check if the user owns this appointment
    if (appointment.userId.toString() !== userId.toString()) {
      console.log("User not authorized. User ID:", userId, "Appointment User ID:", appointment.userId);
      return next(new ErrorHandler("You are not authorized to update this appointment!", 403));
    }

    // Check if the appointment is already cancelled
    if (appointment.status === "cancelled") {
      console.log("Appointment is cancelled");
      return next(new ErrorHandler("Cannot update a cancelled appointment!", 400));
    }

    // Calculate time difference for the current appointment
    const appointmentDateTime = new Date(appointment.appointment_date);
    const [hours, minutes] = appointment.appointment_time.split(':');
    appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const now = new Date();
    const timeDiffInHours = (appointmentDateTime - now) / (1000 * 60 * 60);

    console.log("Time difference in hours:", timeDiffInHours);

    // Check if the appointment is within 2 hours
    if (timeDiffInHours < 2) {
      console.log("Appointment is within 2 hours");
      return next(new ErrorHandler("Cannot update appointment within 2 hours of the scheduled time!", 400));
    }

    // Check if the new time slot is available
    const newDateTime = new Date(newDate);
    const [newHours, newMinutes] = newTime.split(':');
    newDateTime.setHours(parseInt(newHours), parseInt(newMinutes), 0, 0);

    // Check if the new date/time is in the past
    if (newDateTime < now) {
      console.log("New date/time is in the past");
      return next(new ErrorHandler("Cannot schedule appointment in the past!", 400));
    }

    // Calculate time difference for the new appointment
    const newTimeDiffInHours = (newDateTime - now) / (1000 * 60 * 60);
    if (newTimeDiffInHours < 2) {
      console.log("New appointment time is within 2 hours");
      return next(new ErrorHandler("New appointment time must be at least 2 hours from now!", 400));
    }

    // Check for conflicts with other appointments
    const existingAppointment = await Appointment.findOne({
      $or: [
        {
          doctorId: appointment.doctorId,
          appointment_date: newDate,
          appointment_time: newTime,
          status: { $ne: "cancelled" },
          _id: { $ne: appointmentId }
        },
        {
          userId: userId,
          appointment_date: newDate,
          appointment_time: newTime,
          status: { $ne: "cancelled" },
          _id: { $ne: appointmentId }
        }
      ]
    });

    if (existingAppointment) {
      console.log("Time slot conflict found:", existingAppointment);
      return next(new ErrorHandler("This time slot is already booked!", 400));
    }

    // Update the appointment
    appointment.appointment_date = newDate;
    appointment.appointment_time = newTime;
    appointment.status = "updated"; // Set status to updated for admin notification
    await appointment.save();

    console.log("Appointment updated successfully:", appointment);

    // Find admin users to notify
    const admins = await User.find({ role: "Admin" });
    console.log("Notifying admins:", admins.map(admin => admin.email));

    res.status(200).json({
      success: true,
      message: "Appointment time updated successfully! Waiting for admin approval.",
      appointment
    });
  } catch (error) {
    console.error("Error in updateAppointmentTime:", error);
    return next(new ErrorHandler(error.message || "Error updating appointment time", 500));
  }
});

// Get doctor's today's appointments
export const getDoctorTodayAppointments = catchAsyncErrors(async (req, res, next) => {
  const doctorId = req.user._id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  console.log("Doctor ID:", doctorId);
  console.log("Today's date range:", today, "to", tomorrow);

  const appointments = await Appointment.find({
    doctorId: doctorId,
    appointment_date: {
      $gte: today,
      $lt: tomorrow
    },
    status: { $in: ["pending", "approved", "completed"] }
  }).populate({
    path: 'userId',
    select: 'fullName email phone gender dob address'
  });

  console.log("Found appointments:", appointments.length);

  res.status(200).json({
    success: true,
    appointments: appointments || [],
  });
});

// Get doctor's completed appointments
export const getDoctorCompletedAppointments = catchAsyncErrors(async (req, res, next) => {
  const doctorId = req.user._id;

  const appointments = await Appointment.find({
    doctorId: doctorId,
    status: "completed"
  }).populate({
    path: 'userId',
    select: 'fullName email phone gender dob address'
  }).sort({ appointment_date: -1, appointment_time: -1 });

  res.status(200).json({
    success: true,
    appointments: appointments || [],
  });
});

// Get all doctor's appointments
export const getDoctorAllAppointments = catchAsyncErrors(async (req, res, next) => {
  const doctorId = req.user._id;

  const appointments = await Appointment.find({
    doctorId: doctorId
  }).populate({
    path: 'userId',
    select: 'fullName email phone gender dob address'
  }).sort({ appointment_date: -1, appointment_time: -1 });

  res.status(200).json({
    success: true,
    appointments: appointments || [],
  });
});

// Get doctor's patients
export const getDoctorPatients = catchAsyncErrors(async (req, res, next) => {
  const doctorId = req.user._id;

  // Get unique patients who have appointments with this doctor
  const appointments = await Appointment.find({
    doctorId: doctorId
  }).populate({
    path: 'userId',
    select: 'fullName email phone gender dob address'
  });

  // Create a map to get unique patients
  const patientsMap = new Map();
  appointments.forEach(appointment => {
    if (appointment.userId) {
      const patientId = appointment.userId._id.toString();
      if (!patientsMap.has(patientId)) {
        patientsMap.set(patientId, {
          ...appointment.userId.toObject(),
          lastAppointment: appointment.appointment_date,
          totalAppointments: 1
        });
      } else {
        const existingPatient = patientsMap.get(patientId);
        existingPatient.totalAppointments += 1;
        if (appointment.appointment_date > existingPatient.lastAppointment) {
          existingPatient.lastAppointment = appointment.appointment_date;
        }
      }
    }
  });

  const patients = Array.from(patientsMap.values());

  res.status(200).json({
    success: true,
    patients: patients || [],
  });
});
