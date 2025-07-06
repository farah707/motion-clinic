import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import validator from "validator";
import crypto from "crypto";

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, "User Full Name Is Required!"],
    minLength: [3, "User Full Name Must Contain At Least 3 Characters!"],
  },
  email: {
    type: String,
    required: [true, "User Email Is Required!"],
    validate: [validator.isEmail, "Provide A Valid User Email!"],
  },
  phone: {
    type: String,
    required: function() {
      // Only require phone if it's a new user
      return this.isNew;
    },
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty/null values
        // Remove any non-digit characters before validation
        const cleanPhone = v.replace(/\D/g, '');
        return cleanPhone.length === 11;
      },
      message: "Phone number must be exactly 11 digits"
    }
  },
  nic: {
    type: String,
    unique: true,
    required: function() {
      return this.isNew && (this.role === "Doctor" || this.role === "Admin");
    }
  },
  dob: {
    type: Date,
    required: [true, "Date Of Birth Is Required!"],
  },
  gender: {
    type: String,
    required: [true, "Gender Is Required!"],
    enum: ["Male", "Female"],
  },
  password: {
    type: String,
    minLength: [8, "Password Must Contain At Least 8 Characters!"],
    required: [true, "Password Is Required!"],
    select: false,
  },
  role: {
    type: String,
    required: [true, "User Role Is Required!"],
    enum: ["Patient", "Admin", "Doctor"],
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  medicalHistory: {
    type: String,
    default: "",
  },
  bloodPressure: {
    type: String,
    default: "",
    validate: {
      validator: function(v) {
        return true; // Accept any value
      }
    }
  },
  oxygenLevel: {
    type: String,
    default: "",
    validate: {
      validator: function(v) {
        return true; // Accept any value
      }
    }
  },
  heartRate: {
    type: String,
    default: "",
    validate: {
      validator: function(v) {
        return true; // Accept any value
      }
    }
  },
  temperature: {
    type: String,
    default: "",
    validate: {
      validator: function(v) {
        return true; // Accept any value
      }
    }
  },
  complain: {
    type: String,
    default: "",
  },
  patientID: {
    type: String,
    unique: true,
    sparse: true,
  },
  doctorDepartment: {
    type: String,
  },
  docAvatar: {
    public_id: String,
    url: String,
  },
  emailNotificationsEnabled: {
    type: Boolean,
    default: false,
  },
  notificationDays: {
    type: Number,
    default: 0,
    min: 0,
  },
  notificationHours: {
    type: Number,
    default: 0,
    min: 0,
    max: 23,
  },
  notificationMinutes: {
    type: Number,
    default: 0,
    min: 0,
    max: 59,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
});

// Password hashing middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// JWT token generation method
userSchema.methods.generateJsonWebToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

// Generate Password Reset Token
userSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set token expire time
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

  return resetToken;
};

export const User = mongoose.model("User", userSchema);