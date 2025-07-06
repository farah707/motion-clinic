// backend/app.js
import { config } from 'dotenv';
config(); // Load env variables

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
// import fileUpload from "express-fileupload"; // Comment out since we're using multer
import session from "express-session";
import passport from "passport";
import setupPassport from './config/setupPassport.js';
import { dbConnection } from './database/dbConnection.js';
import { errorMiddleware } from "./middlewares/error.js";
import appointmentRouter from "./router/appointmentRouter.js";
import messageRouter from "./router/messageRouter.js";
import notificationRouter from "./router/notificationRouter.js";
import userRouter from "./router/userRouter.js";
import aiRouter from "./router/aiRouter.js";
import chatHistoryRouter from "./router/chatHistoryRouter.js";

const app = express();

// Connect to DB once when app loads
dbConnection();

// CORS
app.use(
  cors({
    origin: [process.env.FRONTEND_URL_ONE, process.env.FRONTEND_URL_TWO, process.env.FRONTEND_URL_THREE],
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
  })
);

// Session setup
app.use(session({
  secret: process.env.JWT_SECRET_KEY,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  }
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Comment out fileUpload since we're using multer
// app.use(fileUpload({
//   useTempFiles: true,
//   tempFileDir: "/tmp/",
// }));

// Passport setup
setupPassport();
app.use(passport.initialize());
app.use(passport.session());

// Root route for testing
app.get("/", (req, res) => {
  res.json({ 
    message: "Motion Clinic API is running!", 
    status: "success",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check route for Railway
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy",
    message: "Motion Clinic API is healthy!",
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use("/api/v1/user", userRouter);
app.use("/api/v1/appointment", appointmentRouter);
app.use("/api/v1/message", messageRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/ai", aiRouter);
app.use("/api/chat-history", chatHistoryRouter);

// Error handler
app.use(errorMiddleware);

export default app;
