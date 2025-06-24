import express from "express";
import { 
  aiChat, 
  aiHealthCheck, 
  getChatHistory, 
  updateAIModel, 
  initializeAIModel,
  testRAGModel,
  getDetailedResponse,
  analyzeImage
} from "../controller/aiController.js";
import { isAuthenticated } from "../middlewares/auth.js";
import upload from "../middlewares/upload.js";
import multer from "multer";

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

// Image Analysis Endpoint with error handling
router.post("/image-analyze", (req, res, next) => {
  upload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      return res.status(400).json({ 
        success: false, 
        message: `Upload error: ${err.message}` 
      });
    } else if (err) {
      // An unknown error occurred
      return res.status(400).json({ 
        success: false, 
        message: `File error: ${err.message}` 
      });
    }
    // Everything went fine, proceed to the controller
    analyzeImage(req, res, next);
  });
});

// Test RAG model endpoint
router.post("/test", testRAGModel);

export default router; 