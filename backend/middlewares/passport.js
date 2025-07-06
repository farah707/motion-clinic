import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from "../models/userSchema.js";

// Configure Passport
const setupPassport = () => {
  passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: ['profile', 'email'],
    profileFields: ['id', 'displayName', 'email', 'gender', 'phoneNumber']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const existingUser = await User.findOne({ googleId: profile.id });
  
      if (existingUser) {
        return done(null, existingUser);
      }
  
      const userByEmail = await User.findOne({ email: profile.emails[0].value });
  
      if (userByEmail) {
        userByEmail.googleId = profile.id;
        userByEmail.isVerified = true;
        userByEmail.gender = profile.gender || "Not Specified";
        userByEmail.phone = profile.phoneNumber || "";
        await userByEmail.save();
        return done(null, userByEmail);
      }
  
      const newUser = await User.create({
        fullName: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id,
        role: "Patient",
        isVerified: true,
        phone: profile.phoneNumber || "",
        gender: profile.gender || "Not Specified",
        dob: new Date(),
      });
  
      return done(null, newUser);
    } catch (error) {
      return done(error, null);
    }
  }));
  

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};

export default setupPassport;


import jwt from "jsonwebtoken";
import { User } from "../models/userSchema.js";
import { catchAsyncErrors } from "./catchAsyncErrors.js";
import ErrorHandler from "./error.js";
import { body } from 'express-validator';

// Centralized authentication logic
const authenticateUser = async (token) => {
  if (!token) {
    throw new ErrorHandler("Authentication token missing", 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ErrorHandler("User not found", 404);
    }
    return user;
  } catch (error) {
    throw new ErrorHandler("Invalid token", 401);
  }
};



// Middleware to authenticate dashboard users
export const isAdminAuthenticated = catchAsyncErrors(async (req, res, next) => {
  try {
    // Check for token in cookies or Authorization header (for API requests)
    const token = req.cookies.adminToken || (req.headers.authorization && req.headers.authorization.startsWith('Bearer') 
      ? req.headers.authorization.split(' ')[1] : null);
    
    req.user = await authenticateUser(token, ["Admin"]);
    next();
  } catch (err) {
    return next(new ErrorHandler(err.message || "Authentication failed", 401));
  }
});

// Similarly, adjust the `isPatientAuthenticated` middleware
export const isPatientAuthenticated = catchAsyncErrors(async (req, res, next) => {
  try {
    // Check for token in cookies or Authorization header (for API requests)
    const token = req.cookies.patientToken || (req.headers.authorization && req.headers.authorization.startsWith('Bearer') 
      ? req.headers.authorization.split(' ')[1] : null);
      console.log("Extracted Token:", token);
      console.log("Decoded Token:", jwt.verify(token, process.env.JWT_SECRET_KEY));

    req.user = await authenticateUser(token, ["Patient"]);
    next();
  } catch (err) {
    return next(new ErrorHandler(err.message || "Authentication failed", 401));
  }
});

// New general authentication middleware that works for all user types
export const isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  try {
    const token =
      req.cookies.adminToken ||
      req.cookies.patientToken ||
      req.cookies.doctorToken ||
      req.cookies.token ||
      (req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      return next(new ErrorHandler("Authentication token missing", 401));
    }

    req.user = await authenticateUser(token); // Now it returns a user instead of calling next()
    next();
  } catch (err) {
    next(err); // Correctly pass the error to Express error handler
  }
});

export const validateUser = [
  body('fullName')
    .isString()
    .withMessage('Full name is required and should be a string')
    .notEmpty()
    .withMessage('Full name cannot be empty'),
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address'),
  body('phone')
    .isMobilePhone()
    .withMessage('Please enter a valid phone number'),
  body('appointment_date')
    .isISO8601()
    .withMessage('Please enter a valid date'),
  body('department')
    .isString()
    .withMessage('Department must be a string')
    .notEmpty()
    .withMessage('Department cannot be empty'),
];

export const isAuthorized = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `${req.user.role} not allowed to access this resource!`,
          403
        )
      );
    }
    next();
  };
};
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Appointment } from "../models/appointmentSchema.js";
import { User } from "../models/userSchema.js";
import { generateToken } from "../utils/jwtToken.js";
import passport from "passport";
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
        secure: process.env.NODE_ENV === 'production', // Use secure in production
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





export const getAllDoctors = catchAsyncErrors(async (req, res, next) => {
  const doctors = await User.find({ role: "Doctor" });
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

export const logout = catchAsyncErrors(async (req, res, next) => {
  if (!req.user) {
    return next(new ErrorHandler("No active session found", 400));
  }
  
  // Determine which cookie to clear based on user role
  let cookieName;
  let message;
  
  if (req.user.role === "Admin") {
    cookieName = "adminToken";
    message = "Admin Logged Out Successfully.";
  } else if (req.user.role === "Patient") {
    cookieName = "patientToken";
    message = "Patient Logged Out Successfully.";
  } else if (req.user.role === "Doctor") {
    cookieName = "doctorToken";
    message = "Doctor Logged Out Successfully.";
  } else {
    cookieName = "token";
    message = "User Logged Out Successfully.";
  }
  
  // Clear authentication cookie
  res.cookie(cookieName, "", {
    httpOnly: true,
    expires: new Date(Date.now()),
  });
  
  // Destroy the session if using passport sessions
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
      }
      // Session is destroyed, continue with response
    });
  }
  
  // Logout from passport if it's being used
  if (req.logout) {
    req.logout();
  }
  
  // Send successful response
  res.status(200).json({
    success: true,
    message: message,
  });
});

// Update logoutAdmin to use the universal logout
export const logoutAdmin = catchAsyncErrors(async (req, res, next) => {
  return logout(req, res, next);
});

// Update logoutPatient to use the universal logout
export const logoutPatient = catchAsyncErrors(async (req, res, next) => {
  return logout(req, res, next);
});export const updateProfile = catchAsyncErrors(async (req, res, next) => {
  try {
    console.log("Request Body:", req.body); // Log the incoming data

    const { fullName, email, phone, dob, gender, medicalHistory, complain, bloodPressure, oxygenLevel, heartRate, temperature } = req.body;

    // Find and update the user by their ID
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id, // Replace this with the correct user ID logic
      { fullName, email, phone, dob, gender, medicalHistory, complain, bloodPressure, oxygenLevel, heartRate, temperature }, // Include medicalHistory
      { new: true, runValidators: true } // Return updated document and validate input
    );

    if (!updatedUser) {
      return next(new ErrorHandler("User not found!", 404)); // Handle not found error
    }

    // Respond with the updated user data
    res.status(200).json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error.message);

    // Respond with an internal server error if any exception occurs
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Get User Profile
export const getUserProfile = async (req, res) => { 
  try {
    const user = await User.findById(req.user.id); // req.user.id comes from JWT middleware
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


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


import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from "../models/userSchema.js";

// Configure Passport
const setupPassport = () => {
  // Google OAuth Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: ['profile', 'email', 'phone', 'https://www.googleapis.com/auth/userinfo.profile'], // Added phone and userinfo.profile
    profileFields: ['id', 'displayName', 'email', 'gender', 'phoneNumber']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Find or create user based on Google profile
      const existingUser = await User.findOne({ googleId: profile.id });
      
      if (existingUser) {
        return done(null, existingUser);
      }
      
      // Check if user with this email already exists
      const userByEmail = await User.findOne({ email: profile.emails[0].value });
      
      if (userByEmail) {
        // Link Google ID to existing account
        userByEmail.googleId = profile.id;
        userByEmail.isVerified = true;

        // Set gender and phone if available from the Google profile
        userByEmail.gender = profile.gender || "Not Specified"; // Default to "Not Specified" if no gender found
        userByEmail.phone = profile.phoneNumber || ""; // Default to empty string if phone is not provided

        await userByEmail.save();
        return done(null, userByEmail);
      }
      
      // Create new user from Google profile
      const newUser = await User.create({
        fullName: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id,
        role: "Patient", // Default role
        isVerified: true,
        // Set gender and phone if available from the Google profile
        phone: profile.phoneNumber || "", // Default to empty string if no phone found
        gender: profile.gender || "Not Specified", // Default to "Not Specified" if no gender found
        dob: new Date(), // Set a default date of birth
      });
      
      return done(null, newUser);
    } catch (error) {
      return done(error, null);
    }
  }));

  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};

export default setupPassport;


