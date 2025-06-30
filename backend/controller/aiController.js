import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import ragAssistant from "../utils/ragModel.js";
import ChatHistory from "../models/chatHistorySchema.js";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { Notification } from "../models/notificationSchema.js";
import mongoose from "mongoose";

// TODO: Import your trained RAG model here
// import { yourRAGModel } from '../utils/ragModel.js';

// Placeholder for RAG model response
const mockRAGResponse = async (query) => {
  // This is a placeholder - replace with your actual RAG model
  const responses = {
    "headache": "Headaches can be caused by various factors including stress, dehydration, lack of sleep, or underlying medical conditions. For mild headaches, try resting in a quiet, dark room, staying hydrated, and taking over-the-counter pain relievers. If headaches are severe, frequent, or accompanied by other symptoms, please consult a healthcare provider.",
    "fever": "A fever is typically a sign that your body is fighting an infection. For adults, a fever above 103°F (39.4°C) requires medical attention. Stay hydrated, rest, and monitor your temperature. If fever persists for more than 3 days or is accompanied by severe symptoms, seek medical care.",
    "cough": "Coughs can be caused by colds, allergies, or respiratory infections. Stay hydrated, use honey for soothing, and consider over-the-counter cough suppressants. If cough persists for more than 2 weeks or is accompanied by fever, difficulty breathing, or chest pain, consult a doctor.",
    "back pain": "Back pain is common and often related to muscle strain, poor posture, or stress. Rest, gentle stretching, and over-the-counter pain relievers can help. If pain is severe, persistent, or accompanied by numbness/tingling, seek medical evaluation.",
    "appointment": "To schedule an appointment, you can use our online booking system or contact our clinic directly. Please have your insurance information and medical history ready. For urgent care needs, please call our emergency line.",
    "default": "I'm here to help with general health information and guidance. For specific medical advice, diagnosis, or treatment, please consult with a qualified healthcare provider. I can help you understand symptoms, prepare for appointments, and provide general wellness information."
  };

  const lowerQuery = query.toLowerCase();
  
  for (const [key, response] of Object.entries(responses)) {
    if (lowerQuery.includes(key)) {
      return response;
    }
  }
  
  return responses.default;
};

// Save chat message to history
const saveToChatHistory = async (userId, sessionId, message, responseData) => {
  try {
    if (!userId) return; // Skip if no user ID

    // Find existing session or create new one
    let chatSession = await ChatHistory.findOne({ 
      userId, 
      sessionId, 
      type: 'ai_chat'
    });

    if (!chatSession) {
      chatSession = new ChatHistory({
        userId,
        sessionId,
        type: 'ai_chat',
        messages: []
      });
    }

    // Add user message
    chatSession.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Add AI response
    if (responseData) {
      const aiMessage = {
        role: 'ai',
        content: responseData.response || responseData.answer || '',
        timestamp: new Date(),
        responseTime: responseData.responseTime,
        retrievedCases: responseData.retrieved_cases || []
      };

      chatSession.messages.push(aiMessage);
    }

    // Update title based on first message
    if (chatSession.messages.length === 2) {
      const firstMessage = chatSession.messages[0].content;
      chatSession.title = firstMessage.length > 50 ? firstMessage.substring(0, 50) + '...' : firstMessage;
  }

    await chatSession.save();
    console.log('[CHAT HISTORY] Saved message to history');

  } catch (error) {
    console.error('[CHAT HISTORY] Error saving to history:', error);
  }
};

// Save image analysis to chat history
const saveImageAnalysisToHistory = async (userId, sessionId, imageType, imagePath, analysisResult) => {
  try {
    if (!userId) return; // Skip if no user ID

    // Find existing session or create new one
    let chatSession = await ChatHistory.findOne({ 
      userId, 
      sessionId, 
      type: 'image_analysis'
    });

    if (!chatSession) {
      chatSession = new ChatHistory({
        userId,
        sessionId,
        type: 'image_analysis',
        messages: []
      });
    }

    // Add user message (image upload)
    chatSession.messages.push({
      role: 'user',
      content: `Uploaded ${imageType} image for analysis`,
      timestamp: new Date(),
      imageType: imageType,
      imageUrl: imagePath
    });

    // Add AI analysis response
    if (analysisResult) {
      const aiMessage = {
        role: 'ai',
        content: analysisResult.diagnosis || 'Analysis completed',
        timestamp: new Date(),
        imageType: imageType,
        analysisResults: {
          diagnosis: analysisResult.diagnosis || '',
          confidence: analysisResult.confidence || 0,
          findings: analysisResult.findings || '',
          recommendations: analysisResult.recommendations || ''
        },
        imageUrl: imagePath
      };

      chatSession.messages.push(aiMessage);
    }

    // Update title
    if (chatSession.messages.length === 2) {
      chatSession.title = `${imageType.toUpperCase()} Image Analysis`;
    }

    await chatSession.save();
    console.log('[CHAT HISTORY] Saved image analysis to history');

  } catch (error) {
    console.error('[CHAT HISTORY] Error saving image analysis to history:', error);
  }
};

// Helper to create doctor notification for pending LLM response
async function notifyDoctorOfPendingLLM({ doctorId, userId, sessionId, chatType }) {
  if (!doctorId) return;
  try {
    await Notification.create({
      recipientId: doctorId,
      recipientType: "Doctor",
      type: "ai_response_pending",
      title: "New AI Response Pending Review",
      message: `A new ${chatType === 'image_analysis' ? 'image analysis' : 'AI chat'} from user ${userId} is awaiting your review.`,
      data: {
        patientId: userId,
        doctorId,
        sessionId,
        chatType
      }
    });
    console.log(`[NOTIFY] Doctor ${doctorId} notified of pending LLM response.`);
  } catch (err) {
    console.error('[NOTIFY] Error creating doctor notification:', err);
  }
}

// Chat endpoint for AI assistant
export const aiChat = catchAsyncErrors(async (req, res, next) => {
  try {
    const { message, userId, age, gender, sessionId } = req.body;

    if (!message || !message.trim()) {
      return next(new ErrorHandler("Message is required", 400));
    }
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.error("[AIChat] Invalid or missing userId:", userId);
      return next(new ErrorHandler("Invalid or missing userId", 400));
    }
    if (!sessionId) {
      console.error("[AIChat] Missing sessionId");
      return next(new ErrorHandler("Missing sessionId", 400));
    }

    console.log(`AI Chat Request - User: ${userId}, Query: ${message}, Age: ${age}, Gender: ${gender}`);

    const context = {
      age: age || null,
      gender: gender || null
    };

    // Query the LLM (RAG model)
    let llmResponse = null;
    try {
      llmResponse = await ragAssistant.query(message, context);
    } catch (err) {
      console.error("[AIChat] LLM error:", err);
      return next(new ErrorHandler("AI model error", 500));
    }

    // Save to chat history as pending
    try {
      let chatSession = await ChatHistory.findOne({ userId, sessionId, type: 'ai_chat' });
      if (!chatSession) {
        chatSession = new ChatHistory({ userId, sessionId, type: 'ai_chat', messages: [] });
      }
      // Add user message
      chatSession.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });
      // Add AI response as pending
      chatSession.messages.push({
        role: 'ai',
        content: llmResponse.response || llmResponse.answer || '',
        timestamp: new Date(),
        responseTime: llmResponse.responseTime,
        retrievedCases: llmResponse.retrieved_cases || [],
        status: 'pending',
        approved: false
      });
      if (chatSession.messages.length === 2) {
        chatSession.title = chatSession.messages[0].content.length > 50 ? chatSession.messages[0].content.substring(0, 50) + '...' : chatSession.messages[0].content;
      }
      await chatSession.save();
      console.log('[AIChat] Saved pending LLM response for doctor approval');

      // Find a doctor to notify (for demo, notify the first doctor)
      const doctor = await (await import("../models/userSchema.js")).User.findOne({ role: "Doctor" });
      if (doctor) {
        await notifyDoctorOfPendingLLM({ doctorId: doctor._id, userId, sessionId, chatType: 'ai_chat' });
      }
    } catch (err) {
      console.error('[AIChat] Error saving pending message:', err, { userId, sessionId, message });
      return next(new ErrorHandler('Failed to save chat for doctor approval: ' + err.message, 500));
    }

    // Respond to user: waiting for doctor approval
    res.status(200).json({
      success: true,
      response: null,
      message: 'Waiting for doctor approval...',
      waitingForApproval: true
    });
  } catch (error) {
    console.error("AI Chat Error:", error);
    return next(new ErrorHandler("Error processing request: " + error.message, 500));
  }
});

// Health check endpoint for AI service
export const aiHealthCheck = catchAsyncErrors(async (req, res, next) => {
  try {
    const healthStatus = await ragAssistant.healthCheck();
    
    res.status(200).json({
      success: true,
      ...healthStatus
    });
  } catch (error) {
    return next(new ErrorHandler("AI service health check failed", 500));
  }
});

// Initialize AI model endpoint (admin only)
export const initializeAIModel = catchAsyncErrors(async (req, res, next) => {
  try {
    const result = await ragAssistant.initializeModel();
    
    res.status(200).json({
      success: true,
      message: "AI model initialization completed",
      ...result
    });
  } catch (error) {
    console.error("Model initialization error:", error);
    return next(new ErrorHandler("Failed to initialize AI model", 500));
  }
});

// Get chat history (optional feature)
export const getChatHistory = catchAsyncErrors(async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // TODO: Implement chat history storage and retrieval
    // This would typically involve a database to store chat sessions
    
    res.status(200).json({
      success: true,
      history: [], // Placeholder for chat history
      message: "Chat history feature not yet implemented"
    });
  } catch (error) {
    return next(new ErrorHandler("Error retrieving chat history", 500));
  }
});

// Update AI model (admin only)
export const updateAIModel = catchAsyncErrors(async (req, res, next) => {
  try {
    const { modelConfig } = req.body;
    
    // TODO: Implement model update logic
    // This would typically involve updating model parameters or retraining
    
    res.status(200).json({
      success: true,
      message: "AI model update initiated",
      timestamp: new Date()
    });
  } catch (error) {
    return next(new ErrorHandler("Error updating AI model", 500));
  }
});

// Test endpoint for RAG model
export const testRAGModel = catchAsyncErrors(async (req, res, next) => {
  try {
    const { query, age, gender } = req.body;

    if (!query) {
      return next(new ErrorHandler("Query is required", 400));
    }

    // Initialize RAG model if not already initialized
    if (!ragAssistant.isInitialized) {
      const initialized = await ragAssistant.initialize();
      if (!initialized) {
        return next(new ErrorHandler("AI model not available", 503));
      }
    }

    const context = {
      age: age || null,
      gender: gender || null
    };

    const response = await ragAssistant.query(query, context);

    res.status(200).json({
      success: true,
      query: query,
      response: response,
      timestamp: new Date()
    });

  } catch (error) {
    console.error("RAG Test Error:", error);
    return next(new ErrorHandler("Error testing RAG model", 500));
  }
});

// Get detailed RAG response endpoint
export const getDetailedResponse = catchAsyncErrors(async (req, res, next) => {
  try {
    const { message, userId, age, gender } = req.body;

    if (!message || !message.trim()) {
      return next(new ErrorHandler("Message is required", 400));
    }

    console.log(`Detailed Response Request - User: ${userId}, Query: ${message}`);

    // Try to initialize RAG model if not already initialized
    if (!ragAssistant.isInitialized) {
      console.log("RAG model not initialized, attempting to initialize...");
      try {
        const initialized = await ragAssistant.initialize();
        if (!initialized) {
          return next(new ErrorHandler("AI model not available", 503));
        }
      } catch (initError) {
        console.error("RAG model initialization error:", initError);
        return next(new ErrorHandler("AI model not available", 503));
      }
    }

    // Query the RAG model (this will use cache if available)
    const context = {
      age: age || null,
      gender: gender || null
    };

    console.log("Querying RAG model for detailed response...");
    const startTime = Date.now();
    const ragResponse = await ragAssistant.query(message, context);
    const responseTime = Date.now() - startTime;
    console.log(`Detailed RAG response received in ${responseTime}ms:`, ragResponse);

    res.status(200).json({
      success: true,
      response: ragResponse.response || ragResponse.answer || "I'm sorry, I couldn't process your request at the moment. Please try again.",
      retrieved_cases: ragResponse.retrieved_cases || [],
      timestamp: new Date(),
      query: message,
      isDetailed: true,
      responseTime: responseTime
    });

  } catch (error) {
    console.error("Detailed Response Error:", error);
    return next(new ErrorHandler("Error processing detailed request", 500));
  }
});

// Image Analysis endpoint
export const analyzeImage = catchAsyncErrors(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorHandler("No image file uploaded.", 400));
  }
  if (!req.body.type) {
    fs.unlinkSync(req.file.path); // Clean up uploaded file
    return next(new ErrorHandler("Image type (ct, xray, mri) is required.", 400));
  }

  const imagePath = req.file.path;
  const modelType = req.body.type;
  const { userId, sessionId } = req.body;
  
  // Use the lightweight version that works with 8GB RAM
  const scriptPath = path.join(process.cwd(), 'scripts', 'lightweight_image_analyzer.py');

  const pythonProcess = spawn('python', [scriptPath, '--image_path', imagePath, '--model_type', modelType]);

  let result = '';
  let error = '';

  pythonProcess.stdout.on('data', (data) => {
    result += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    error += data.toString();
  });

  pythonProcess.on('close', async (code) => {
    if (code !== 0) {
      console.error(`Python Script Error: ${error}`);
      fs.unlinkSync(imagePath); // Clean up uploaded file
      return next(new ErrorHandler("Failed to analyze the image.", 500));
    }
    try {
      const jsonResponse = JSON.parse(result);
      console.log('[IMAGE ANALYSIS] Python response:', JSON.stringify(jsonResponse, null, 2));
      
      if (jsonResponse.error) {
        fs.unlinkSync(imagePath); // Clean up uploaded file
        return next(new ErrorHandler(jsonResponse.error, 500));
      }

      // Read the image file data BEFORE deleting it
      const imageBuffer = fs.readFileSync(imagePath);
      console.log('[IMAGE ANALYSIS] Image buffer size:', imageBuffer.length, 'bytes');
      console.log('[IMAGE ANALYSIS] Image file info:', {
        path: imagePath,
        mimetype: req.file.mimetype,
        originalname: req.file.originalname,
        size: req.file.size
      });
      
      // Clean up the uploaded file
      fs.unlinkSync(imagePath);

      // Prepare analysis results
      const analysisResults = {
        diagnosis: jsonResponse.final_diagnosis || jsonResponse.diagnosis || "Analysis completed",
        confidence: jsonResponse.similarity_score || jsonResponse.confidence || "N/A",
        findings: jsonResponse.treatment_plan || jsonResponse.findings || "Treatment plan available",
        recommendations: jsonResponse.recommendations || "Based on analysis, consult with a specialist.",
        followUp: jsonResponse.follow_up || "Schedule follow-up appointment.",
        medication: jsonResponse.medication_prescribed || "Medication should be prescribed by a qualified healthcare provider.",
        source: jsonResponse.source || "AI Analysis",
      };

      // Save to chat history with image data as pending
      if (userId && sessionId) {
        try {
          let chatSession = await ChatHistory.findOne({ userId, sessionId, type: 'image_analysis' });
          if (!chatSession) {
            chatSession = new ChatHistory({ userId, sessionId, type: 'image_analysis', messages: [] });
          }
          // Add user message (image upload)
          chatSession.messages.push({
            role: 'user',
            content: `Uploaded ${modelType.toUpperCase()} image for analysis`,
            timestamp: new Date(),
            imageType: modelType,
            imageData: {
              data: imageBuffer,
              contentType: req.file.mimetype,
              filename: req.file.originalname,
            }
          });
          // Add AI analysis response as pending
          chatSession.messages.push({
            role: 'ai',
            content: analysisResults.diagnosis || 'Analysis completed',
            timestamp: new Date(),
            imageType: modelType,
            analysisResults: analysisResults,
            imageData: {
              data: imageBuffer,
              contentType: req.file.mimetype,
              filename: req.file.originalname,
            },
            status: 'pending',
            approved: false
          });
          if (chatSession.messages.length === 2) {
            chatSession.title = `${modelType.toUpperCase()} Image Analysis`;
          }
          await chatSession.save();
          console.log('[IMAGE ANALYSIS] Saved pending image analysis for doctor approval');

          // Find a doctor to notify (for demo, notify the first doctor)
          const doctor = await (await import("../models/userSchema.js")).User.findOne({ role: "Doctor" });
          if (doctor) {
            await notifyDoctorOfPendingLLM({ doctorId: doctor._id, userId, sessionId, chatType: 'image_analysis' });
          }
        } catch (historyError) {
          console.error('[IMAGE ANALYSIS] Error saving image analysis to history:', historyError);
          return next(new ErrorHandler('Failed to save image analysis for doctor approval', 500));
        }
      } else {
        console.log('[IMAGE ANALYSIS] Skipping chat history save - missing userId or sessionId:', { userId: !!userId, sessionId: !!sessionId });
      }

      // Respond to user: waiting for doctor approval
      res.status(200).json({
        success: true,
        message: 'Waiting for doctor approval...',
        waitingForApproval: true
      });
    } catch (parseError) {
      console.error('Error parsing Python response:', parseError);
      fs.unlinkSync(imagePath); // Clean up uploaded file
      return next(new ErrorHandler("Failed to parse analysis results.", 500));
    }
  });

  pythonProcess.on('error', (err) => {
    fs.unlinkSync(imagePath);
    console.error('Failed to start Python process:', err);
    return next(new ErrorHandler("Failed to start analysis process.", 500));
  });
}); 