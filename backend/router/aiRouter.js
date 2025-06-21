import express from "express";
import { 
  aiChat, 
  aiHealthCheck, 
  getChatHistory, 
  updateAIModel, 
  initializeAIModel,
  testRAGModel,
  getDetailedResponse
} from "../controller/aiController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// Public AI chat endpoint
router.post("/chat", aiChat);

// Get detailed RAG response
router.post("/detailed", getDetailedResponse);

// Health check endpoint
router.get("/health", aiHealthCheck);

// Protected routes (require authentication)
router.get("/history/:userId", isAuthenticated, getChatHistory);

// Admin only routes
router.post("/update-model", isAuthenticated, updateAIModel);
router.post("/initialize-model", isAuthenticated, initializeAIModel);

// Test RAG model endpoint
router.post("/test", testRAGModel);

export default router; 