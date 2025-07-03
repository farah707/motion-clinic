import passport from "passport";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Appointment } from "../models/appointmentSchema.js";
import { User } from "../models/userSchema.js";
import { generateToken } from "../utils/jwtToken.js";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from "crypto"; // Import crypto

// Function to check if password meets criteria
const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z]).+$/; // At least one lowercase letters
  return passwordRegex.test(password);
};


export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email']
});

export const googleAuthCallback = async (req, res, next) => {
  passport.authenticate('google', async (err, user, info) => {
    if (err) {
      return next(err); // Pass error to Express error handler
    }
    if (!user) {
      return res.status(401).json({ message: "Authentication failed" });
    }

    // Get the redirect URL from query params or use default
    const redirectUrl = req.query.redirect_url || process.env.FRONTEND_URL || 'http://localhost:5173/';

    try {
      // Generate JWT token
      const token = user.generateJsonWebToken();
      
      // Set appropriate cookie based on user role
      const cookieName = user.role === 'Admin' ? 'adminToken' : 
                        user.role === 'Patient' ? 'patientToken' : 
                        user.role === 'Doctor' ? 'doctorToken' : 'token';
      
      // Two options for handling authentication:
      
      // Option 1: API response (for API clients)
      if (req.xhr || req.headers.accept.includes('application/json')) {
        return res.status(200).json({ 
          success: true,
          message: "Login successful via Google",
          token, 
          user 
        });
      }
      
      // Option 2: Redirect with token (for web browser flow)
      // Construct redirect URL with token as query parameter
      const finalRedirectUrl = `${redirectUrl}?token=${token}&userId=${user._id}&role=${user.role}`;
      
      // Store token in cookie and redirect
      res.cookie(cookieName, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      return res.redirect(finalRedirectUrl);
    } catch (error) {
      console.error('Error in Google auth callback:', error);
      return next(new ErrorHandler("Authentication failed", 500));
    }
  })(req, res, next);
};export const patientRegister = catchAsyncErrors(async (req, res, next) => {
  const { fullName, email, phone, dob, gender, password, googleId } = req.body;

  // Validate required fields
  if (!fullName || !email || !phone || !dob || !gender || (!googleId && !password)) {
    return next(new ErrorHandler("Please Fill Full Form!", 400));
  }

  // Validate email format (should be @gmail.com)
  if (!email.endsWith("@gmail.com")) {
    return next(new ErrorHandler("Email should be a Gmail address!", 400));
  }

  // Validate password (if not using Google)
  if (!googleId && !validatePassword(password)) {
    return next(new ErrorHandler("Password must contain at least one number, one uppercase letter, and one lowercase letter!", 400));
  }

  // Check if the user is already registered
  const isRegistered = await User.findOne({ email });
  if (isRegistered) {
    return next(new ErrorHandler("User already Registered!", 400));
  }

  // Create a new user without medicalHistory field
  const user = await User.create({
    fullName,
    email,
    phone,
    dob,
    gender,
    password: googleId ? undefined : password, // Set password if not using Google login
    googleId, // If using Google, store googleId
    role: "Patient", // Default role for patient registration
  });

  // Generate a token and respond
  generateToken(user, "User Registered!", 200, res);
});

export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password, role, googleId } = req.body; // Removed confirmPassword from here

  if (!email || (!googleId && !password) || !role) {
    return next(new ErrorHandler("Please Fill Full Form!", 400));
  }

  // Validate email format (should be @gmail.com)
  if (!email.endsWith("@gmail.com")) {
    return next(new ErrorHandler("Email should be a Gmail address!", 400));
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid Email Or Password!", 400));
  }

  // If user has googleId but no password (OAuth only user)
  if (user.googleId && !user.password) {
    return next(new ErrorHandler("Please login with Google", 400));
  }

  const isPasswordMatch = googleId ? true : await user.comparePassword(password);
  if (!isPasswordMatch) {
    return next(new ErrorHandler("Invalid Email Or Password!", 400));
  }
  if (role !== user.role) {
    return next(new ErrorHandler(`${role} Not Found With This Role!`, 400));
  }

  generateToken(user, "Login Successfully!", 201, res);
});

export const addNewDoctor = catchAsyncErrors(async (req, res, next) => {
  const {
    fullName,
    email,
    phone,
    nic,
    dob,
    gender,
    password,
    doctorDepartment,
  } = req.body;

  if (
    !fullName ||
    !email ||
    !phone ||
    !nic ||
    !dob ||
    !gender ||
    !password ||
    !doctorDepartment
  ) {
    return next(new ErrorHandler("Please Fill Full Form!", 400));
  }

  // Validate email format
  if (!email.endsWith("@gmail.com")) {
    return next(new ErrorHandler("Email must be @gmail.com", 400));
  }

  // Password validation
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)/;
  if (!passwordRegex.test(password)) {
    return next(new ErrorHandler("Password must contain at least one number and one capital letter", 400));
  }

  const isRegistered = await User.findOne({ email });
  if (isRegistered) {
    return next(
      new ErrorHandler("Doctor With This Email Already Exists!", 400)
    );
  }

  const doctor = await User.create({
    fullName,
    email,
    phone,
    nic,
    dob,
    gender,
    password,
    role: "Doctor",
    doctorDepartment,
  });

  res.status(200).json({
    success: true,
    message: "New Doctor Registered",
    doctor,
  });
});

export const addNewAdmin = catchAsyncErrors(async (req, res, next) => {
  const { fullName, email, phone, nic, gender, password, dob } = req.body;
  
  // Validate required fields
  if (!fullName || !email || !phone || !nic || !gender || !password || !dob) {
    return next(new ErrorHandler("Please Fill Full Form!", 400));
  }

  // Validate email format (should be @gmail.com)
  if (!email.endsWith("@gmail.com")) {
    return next(new ErrorHandler("Email should be a Gmail address!", 400));
  }

  // Validate password
  if (!validatePassword(password)) {
    return next(new ErrorHandler("Password must contain at least one number and one uppercase letter!", 400));
  }

  const isRegistered = await User.findOne({ email });
  if (isRegistered) {
    return next(new ErrorHandler(`${isRegistered.role} With This Email Already Exists!`, 400));
  }

  const admin = await User.create({
    fullName,
    email,
    phone,
    nic,
    gender,
    password,
    role: "Admin",
    dob,
  });
  res.status(200).json({
    success: true,
    message: "New Admin Registered",
    admin,
  });
});

export const deleteDoctor = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params; 

  
  const doctor = await User.findById(id);

  if (!doctor || doctor.role !== "Doctor") {
    return next(new ErrorHandler("Doctor Not Found!", 404));
  }

  console.log("Doctor to be deleted:", doctor);

  const deletedAppointments = await Appointment.deleteMany({ doctorId: id });
  console.log(`Deleted ${deletedAppointments.deletedCount} appointments.`);

  await doctor.deleteOne();

  res.status(200).json({
    success: true,
    message: `Doctor and ${deletedAppointments.deletedCount} related appointments deleted successfully!`,
  });
});

export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params; 
    const updateData = req.body; 

    if (!id || !Object.keys(updateData).length) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    
    console.log("Updating doctor with ID:", id);
    console.log("Update Data:", updateData);

    const doctor = await User.findByIdAndUpdate(
      id, 
      { ...updateData, role: 'Doctor' }, 
      { new: true } 
    );

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.status(200).json({ message: "Doctor updated successfully", doctor });
  } catch (error) {
    console.error("Error updating doctor:", error.message); 
    res.status(500).json({ message: "Internal Server Error" });
  }
};



export const logoutUser = (req, res) => {
  res
    .status(200)
    .cookie("token", "", {
      expires: new Date(Date.now()),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    })
    .json({
      success: true,
      message: "Logged Out Successfully!",
    });
};


export const getAllDoctors = catchAsyncErrors(async (req, res, next) => {
  const doctors = await User.find({ role: "Doctor" }).select("-password");
  res.status(200).json({
    success: true,
    doctors,
  });
});

export const getUserDetails = catchAsyncErrors(async (req, res, next) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    user,
  });
});

// In userController.js
export const logout = catchAsyncErrors(async (req, res, next) => {
  console.log("Logout attempt started"); // Debug log
  
  try {
    // 1. Remove JWT token cookie
    res.cookie('token', '', {
      expires: new Date(Date.now()),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });

    // 2. Remove patient token cookie
    res.cookie('patientToken', '', {
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });

    // 3. Remove admin token cookie
    res.cookie('adminToken', '', {
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });

    // 4. Clear session synchronously
    if (req.session) {
      req.session = null;
    }

    console.log("Cookies and session cleared"); // Debug log

    return res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error("Logout error:", error); // Debug log
    return next(new ErrorHandler("Error during logout", 500));
  }
});
// Update logoutAdmin to use the universal logout
export const logoutAdmin = catchAsyncErrors(async (req, res, next) => {
  return logout(req, res, next);
});

// Update logoutPatient to use the universal logout
export const logoutPatient = catchAsyncErrors(async (req, res, next) => {
  return logout(req, res, next);
});
export const updateProfile = catchAsyncErrors(async (req, res, next) => {
  try {
    console.log("=== Update Profile Request ===");
    console.log("User ID:", req.user.id);
    console.log("Request Body:", req.body);

    // Find the user first
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log("User not found with ID:", req.user.id);
      return next(new ErrorHandler("User not found", 404));
    }

    console.log("Found user:", user);

    // Update fields individually
    if (req.body.fullName && req.body.fullName.trim()) {
      user.fullName = req.body.fullName.trim();
    }
    
    if (req.body.email && req.body.email.trim()) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ 
        email: req.body.email.trim(), 
        _id: { $ne: req.user.id } 
      });
      
      if (existingUser) {
        console.log("Email already in use by user:", existingUser._id);
        return next(new ErrorHandler("Email already in use", 400));
      }
      user.email = req.body.email.trim();
    }
    
    if (req.body.phone) {
      const cleanedPhone = req.body.phone.replace(/\D/g, '');
      console.log("Cleaned phone number:", cleanedPhone);
      
      if (cleanedPhone.length !== 11) {
        console.log("Invalid phone number length:", cleanedPhone.length);
        return next(new ErrorHandler("Phone number must be exactly 11 digits", 400));
      }
      user.phone = cleanedPhone;
    }
    
    if (req.body.dob) {
      user.dob = req.body.dob;
    }
    
    if (req.body.gender) {
      user.gender = req.body.gender;
    }
    
    // Handle doctor-specific fields
    if (req.body.doctorDepartment) {
      // Validate department for doctors
      if (user.role === 'Doctor') {
        const allowedDepartments = ['Orthopedics', 'Physical Therapy'];
        if (!allowedDepartments.includes(req.body.doctorDepartment)) {
          return next(new ErrorHandler("Invalid department. Must be 'Orthopedics' or 'Physical Therapy'", 400));
        }
        user.doctorDepartment = req.body.doctorDepartment;
      }
    }
    
    // Handle optional fields
    if (req.body.medicalHistory !== undefined) {
      user.medicalHistory = req.body.medicalHistory;
    }
    
    if (req.body.complain !== undefined) {
      user.complain = req.body.complain;
    }
    
    // Handle vital signs - accept any value without validation
    if (req.body.bloodPressure !== undefined) {
      user.bloodPressure = String(req.body.bloodPressure || "");
    }
    
    if (req.body.oxygenLevel !== undefined) {
      user.oxygenLevel = String(req.body.oxygenLevel || "");
    }
    
    if (req.body.heartRate !== undefined) {
      user.heartRate = String(req.body.heartRate || "");
    }
    
    if (req.body.temperature !== undefined) {
      user.temperature = String(req.body.temperature || "");
    }

    // Handle notification preferences
    if (req.body.emailNotificationsEnabled !== undefined) {
      user.emailNotificationsEnabled = req.body.emailNotificationsEnabled;
    }
    
    if (req.body.notificationDays !== undefined) {
      user.notificationDays = req.body.notificationDays;
    }
    
    if (req.body.notificationHours !== undefined) {
      user.notificationHours = req.body.notificationHours;
    }
    
    if (req.body.notificationMinutes !== undefined) {
      user.notificationMinutes = req.body.notificationMinutes;
    }

    // Save the updated user
    const updatedUser = await user.save();
    console.log("User updated successfully:", updatedUser);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error in updateProfile:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    // Handle specific error types
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return next(new ErrorHandler(messages.join(', '), 400));
    }
    if (error.name === 'CastError') {
      return next(new ErrorHandler("Invalid data format", 400));
    }
    
    return next(new ErrorHandler(error.message || "Error updating profile", 500));
  }
});


// Get User Profile
export const getUserProfile = catchAsyncErrors(async (req, res, next) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    user,
  });
});

export const handleUpdateMedicalHistory = catchAsyncErrors(async (req, res, next) => {
  const { medicalHistory } = req.body;

  if (!medicalHistory) {
    return next(new ErrorHandler("Medical history is required!", 400));
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { $set: { medicalHistory } }, // Only update medical history
    { new: true, runValidators: true }
  );

  if (!updatedUser) {
    return next(new ErrorHandler("User not found!", 404));
  }

  res.status(200).json({
    success: true,
    message: "Medical history updated successfully",
    user: updatedUser,
  });
});




export const deleteMyAccount = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id; // assuming you use JWT auth middleware that sets req.user

  const user = await User.findById(userId);

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Optionally delete related appointments
  const deletedAppointments = await Appointment.deleteMany({ 
    $or: [{ doctorId: userId }, { patientId: userId }]
  });

  await user.deleteOne();

  // Clear the auth cookie
  const cookieName = user.role === 'Admin' ? 'adminToken' : 
                    user.role === 'Patient' ? 'patientToken' : 
                    user.role === 'Doctor' ? 'doctorToken' : 'token';

  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  });

  res.status(200).json({
    success: true,
    message: "Your account and associated data have been deleted",
    deletedAppointments: deletedAppointments.deletedCount
  });
});

export const getNotificationSettings = catchAsyncErrors(async (req, res, next) => {
  const user = req.user; // User is available from isAuthenticated middleware

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  res.status(200).json({
    success: true,
    settings: {
      emailNotificationsEnabled: user.emailNotificationsEnabled,
      notificationDays: user.notificationDays,
      notificationHours: user.notificationHours,
      notificationMinutes: user.notificationMinutes,
    },
  });
});

export const updateNotificationSettings = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;
  const { emailNotificationsEnabled, notificationDays, notificationHours, notificationMinutes } = req.body;

  if (!process.env.SMTP_MAIL || !process.env.SMTP_PASSWORD) {
    console.error("Email configuration missing");
    return next(new ErrorHandler("Email configuration is not set up properly", 500));
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      console.error("User not found for ID:", req.user._id);
      return next(new ErrorHandler("User not found", 404));
    }

    console.log("User found for update:", user._id, "Email:", user.email);

    // Update notification settings
    user.emailNotificationsEnabled = emailNotificationsEnabled;
    user.notificationDays = notificationDays;
    user.notificationHours = notificationHours;
    user.notificationMinutes = notificationMinutes;

    await user.save();
    console.log("User settings saved successfully");

    // Send confirmation email if enabled
    if (emailNotificationsEnabled) {
      console.log("Attempting to send confirmation email to:", user.email);
      const message = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #0056b3;">Notification Settings Updated!</h2>
          <p>Dear ${user.fullName},</p>
          <p>Your notification settings for Motion Clinic have been successfully updated.</p>
          <p>Here are your new settings:</p>
          <ul>
            <li><strong>Email Notifications:</strong> ${emailNotificationsEnabled ? 'Enabled' : 'Disabled'}</li>
            <li><strong>Reminder Time:</strong> ${notificationDays} days, ${notificationHours} hours, ${notificationMinutes} minutes before your appointment.</li>
          </ul>
          <p>If you have any questions, please do not hesitate to contact us.</p>
          <p>Sincerely,</p>
          <p>The Motion Clinic Team</p>
        </div>
      `;
      try {
        await sendEmail({
          email: user.email,
          subject: "Notification Settings Confirmation",
          message,
        });
        console.log("Confirmation email sent successfully");
      } catch (emailError) {
        console.error("Error sending confirmation email:", emailError);
        // Do not return an error response, just log it. The settings were saved successfully.
      }
    }

    res.status(200).json({
      success: true,
      message: "Notification settings updated and confirmation email sent successfully!",
    });
  } catch (error) {
    console.error("Error in updateNotificationSettings:", error);
    return next(new ErrorHandler("Error saving notification settings. Please try again.", 500));
  }
});

export const forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ErrorHandler("Please enter your email", 400));
  }

  const user = await User.findOne({ email });

  if (!user) {
    return next(new ErrorHandler("User not found with this email", 404));
  }

  // Get ResetPassword Token
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  const resetPasswordUrl = `${process.env.FRONTEND_URL_ONE}/password/reset/${resetToken}`;

  const message = `Your password reset token is as follows:\n\n${resetPasswordUrl}\n\nIf you have not requested this email, then ignore it.`;

  try {
    await sendEmail({
      email: user.email,
      subject: `Motion Clinic Password Recovery`,
      message,
    });

    res.status(200).json({
      success: true,
      message: `Email sent to ${user.email} successfully`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorHandler(error.message, 500));
  }
});
 




export const getAllPatients = async (req, res, next) => {
  try {
    const patients = await User.find({ role: "Patient" }).select("-password");

    const patientsWithAppointments = await Promise.all(
      patients.map(async (patient) => {
        const appointments = await Appointment.find({ userId: patient._id }).select(
          "appointment_date appointment_time status"
        );
        return {
          ...patient.toObject(),
          appointments,
        };
      })
    );

    res.status(200).json({
      success: true,
      patients: patientsWithAppointments,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};


// Get all patients who have appointments with the logged-in doctor
import mongoose from "mongoose";

export const getDoctorPatients = async (req, res, next) => {
  try {
    const doctorId = req.user._id;
    console.log("Doctor ID:", doctorId);

    const appointments = await Appointment.find({
      doctorId: new mongoose.Types.ObjectId(doctorId),
    }).populate("userId");

    console.log("Found appointments:", appointments.length);

    const patients = appointments.map((appt) => ({
      ...appt.userId.toObject(),
      appointments: [
        {
          appointment_date: appt.appointment_date,
          appointment_time: appt.appointment_time,
          status: appt.status,
        },
      ],
    }));

    return res.status(200).json({ success: true, patients });
  } catch (error) {
    console.error("❌ Error in getDoctorPatients:", error);
    next(error);
  }
};

export const updateMedicalInfoByDoctor = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const {
    medicalHistory,
    bloodPressure,
    oxygenLevel,
    heartRate,
    temperature,
  } = req.body;

  const patient = await User.findById(id);

  if (!patient || patient.role !== "Patient") {
    return next(new ErrorHandler("Patient not found", 404));
  }

  // Update the fields
  patient.medicalHistory = medicalHistory;
  patient.bloodPressure = bloodPressure;
  patient.oxygenLevel = oxygenLevel;
  patient.heartRate = heartRate;
  patient.temperature = temperature;

  await patient.save();

  res.status(200).json({
    success: true,
    message: "Patient information updated successfully",
    patient,
  });
});



export const resetPassword = catchAsyncErrors(async (req, res, next) => {
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      new ErrorHandler("Password Reset Token is invalid or has been expired", 400)
    );
  }

  if (req.body.password !== req.body.confirmPassword) {
    return next(new ErrorHandler("Password does not match", 400));
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "Password Updated Successfully",
  });
});




