import mongoose from "mongoose";
import validator from "validator";

const messageSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    minLength: [3, "Full name must contain at least 3 characters!"],
  },
  email: {
    type: String,
    required: true,
    validate: [validator.isEmail, "Provide a valid email!"],
  },
  phone: {
    type: String,
    required: true,
    minLength: [11, "Phone number must contain exactly 11 digits!"],
    maxLength: [11, "Phone number must contain exactly 11 digits!"],
  },
  message: {
    type: String,
    required: true,
    minLength: [10, "Message must contain at least 10 characters!"],
  },
  googleId: {
    type: String,
    default: null  // Will be populated for Google authenticated users
  },
  isVerified: {
    type: Boolean,
    default: false // Will be true for Google authenticated users
  },
});

export const Message = mongoose.model("Message", messageSchema);
