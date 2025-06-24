import express from "express";
import { 
  saveChatMessage, 
  getChatHistory, 
  getChatSession, 
  deleteChatSession, 
  getChatStats, 
  getPendingForDoctor, 
  doctorReview 
} from "../controller/chatHistoryController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// Save chat message
router.post("/save", isAuthenticated, saveChatMessage);

// Get user's chat history
router.get("/history/:userId", isAuthenticated, getChatHistory);

// Get specific chat session
router.get("/session/:sessionId", isAuthenticated, getChatSession);

// Delete chat session
router.delete("/session/:sessionId", isAuthenticated, deleteChatSession);

// Get chat statistics
router.get("/stats/:userId", isAuthenticated, getChatStats);

// Get all pending items for doctor
router.get("/pending/:doctorId", isAuthenticated, getPendingForDoctor);

// Doctor reviews (approve/reject/edit) a message
router.post("/review/:sessionId/:messageIndex", isAuthenticated, doctorReview);

export default router; 