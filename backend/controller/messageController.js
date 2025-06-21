import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Message } from "../models/messageSchema.js";

export const sendMessage = catchAsyncErrors(async (req, res, next) => {
  const { fullName, email, phone, message, googleId, isVerified } = req.body;

  if (!fullName || !email || !phone || !message) {
    return next(new ErrorHandler("Please fill out the entire form!", 400));
  }

  await Message.create({ fullName, email, phone, message, googleId, isVerified });

  res.status(200).json({
    success: true,
    message: "Message sent!",
  });
});


export const getAllMessages = catchAsyncErrors(async (req, res, next) => {
  const messages = await Message.find();
  res.status(200).json({
    success: true,
    messages,
  });
});
