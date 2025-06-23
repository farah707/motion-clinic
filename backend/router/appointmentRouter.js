import express from "express";
import {
  deleteAppointment,
  getAllAppointments,
  getUserAppointments,
  postAppointment,
  updateAppointmentStatus,
  updateDoctorAppointmentStatus,
  getAvailableTimeSlots,
  updateAppointmentTime,
  getDoctorTodayAppointments,
  getDoctorCompletedAppointments,
  getDoctorAllAppointments,
  getDoctorPatients,
} from "../controller/appointmentController.js";
import {
  isAdminAuthenticated,
  isAuthenticated,
  isPatientAuthenticated,
  isDoctorAuthenticated,
} from "../middlewares/auth.js";

const router = express.Router();

router.post("/post", isPatientAuthenticated, postAppointment);
router.get("/getall", isAdminAuthenticated, getAllAppointments);
router.put("/update/:id", isAdminAuthenticated, updateAppointmentStatus);
router.put("/update-time/:appointmentId", isPatientAuthenticated, updateAppointmentTime);
router.delete("/delete/:id", isAdminAuthenticated, deleteAppointment);
router.get("/my-appointments", isPatientAuthenticated, getUserAppointments);
router.get("/get-available-slots", isPatientAuthenticated, getAvailableTimeSlots);

// Doctor-specific routes
router.get("/doctor/today", isDoctorAuthenticated, getDoctorTodayAppointments);
router.get("/doctor/completed", isDoctorAuthenticated, getDoctorCompletedAppointments);
router.get("/doctor/all", isDoctorAuthenticated, getDoctorAllAppointments);
router.get("/doctor/patients", isDoctorAuthenticated, getDoctorPatients);
router.put("/doctor/update-status/:id", isDoctorAuthenticated, updateDoctorAppointmentStatus);

export default router;
