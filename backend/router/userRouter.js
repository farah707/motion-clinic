import express from "express";
import {
  addNewAdmin,
  addNewDoctor,
  deleteDoctor,
  getAllDoctors,
  getUserDetails,
  getUserProfile,
  googleAuth,
  googleAuthCallback,
  handleUpdateMedicalHistory,
  login,
  logout, // Import the universal logout function
  logoutAdmin,
  logoutPatient,
  logoutUser,
  patientRegister,
  updateDoctor,
  deleteMyAccount,
  updateProfile,
  getNotificationSettings,
  updateNotificationSettings,
  forgotPassword,
  resetPassword,
  getAllPatients,
  getDoctorPatients,
  updateMedicalInfoByDoctor,
} from "../controller/userController.js";
import {
  isAdminAuthenticated,
  isAuthenticated,
  isPatientAuthenticated,
  isDoctorAuthenticated,
  isAuthorized 
} from "../middlewares/auth.js";

const router = express.Router();

// Health check endpoint for Railway
router.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    message: "Server is running",
    timestamp: new Date().toISOString()
  });
});

// Google OAuth routes
router.get('/auth/google', googleAuth);
router.get('/auth/google/callback', googleAuthCallback);

// Public routes
router.post("/patient/register", patientRegister);
router.post("/login", login);
router.post("/patient/login", login);

// Password Reset Routes
router.post("/password/forgot", forgotPassword);
router.put("/password/reset/:token", resetPassword);

// Admin routes - requires admin authentication
router.post("/admin/addnew", isAdminAuthenticated, addNewAdmin);
router.post("/doctor/addnew", isAdminAuthenticated, addNewDoctor);
router.get("/api/v1/doctors", getAllDoctors);
router.get("/admin/logout", isAdminAuthenticated, logoutAdmin);

// Patient routes - requires patient authentication
router.get("/patient/me", isPatientAuthenticated, getUserDetails);
router.get("/admin/me", isAdminAuthenticated, getUserDetails);
router.get("/doctor/me", isDoctorAuthenticated, getUserDetails);
router.get("/patient/logout", isPatientAuthenticated, logoutPatient);
router.delete('/me/delete', isAuthenticated, deleteMyAccount);
// Add universal logout route that works for any authenticated user
router.get("/logout", isAuthenticated, logout);
router.get("/patient/logout", isPatientAuthenticated, logout);
router.post("/logout", isAuthenticated, logoutUser);
// Other routes remain the same
router.put("/patient/me", isPatientAuthenticated, updateProfile);
router.put("/update-profile", isAuthenticated, updateProfile);
router.get('/profile', isPatientAuthenticated, getUserProfile);
router.put("/patient/me", isPatientAuthenticated, handleUpdateMedicalHistory);
router.put("/patient/medical-history", isPatientAuthenticated, handleUpdateMedicalHistory);
router.get("/doctors", getAllDoctors);
router.delete("/doctor/delete/:id", isAdminAuthenticated, deleteDoctor);
router.put("/doctor/update/:id", isAdminAuthenticated, updateDoctor);
router.get("/notification-settings", isAuthenticated, getNotificationSettings);
router.put("/notification-settings/update", isAuthenticated, updateNotificationSettings);

router.get("/patients", getAllPatients);
router.get("/my-patients", isDoctorAuthenticated, getDoctorPatients);
router.put("/update-medical/:id", isAuthenticated, updateMedicalInfoByDoctor);



export default router;

