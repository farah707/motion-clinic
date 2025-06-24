import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import ragAssistant from "../utils/ragModel.js";
import ChatHistory from "../models/chatHistorySchema.js";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

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

// Global cache for RAG responses
const globalResponseCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Get cached response
const getCachedResponse = (query, context) => {
  const cacheKey = `${query.toLowerCase().trim()}_${context.age || 'noage'}_${context.gender || 'nogender'}`;
  const cached = globalResponseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }
  return null;
};

// Cache response
const cacheResponse = (query, context, response) => {
  const cacheKey = `${query.toLowerCase().trim()}_${context.age || 'noage'}_${context.gender || 'nogender'}`;
  globalResponseCache.set(cacheKey, {
    response,
    timestamp: Date.now()
  });
  
  // Limit cache size
  if (globalResponseCache.size > 500) {
    const firstKey = globalResponseCache.keys().next().value;
    globalResponseCache.delete(firstKey);
  }
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

// Chat endpoint for AI assistant
export const aiChat = catchAsyncErrors(async (req, res, next) => {
  try {
    const { message, userId, age, gender, sessionId } = req.body;

    if (!message || !message.trim()) {
      return next(new ErrorHandler("Message is required", 400));
    }

    console.log(`AI Chat Request - User: ${userId}, Query: ${message}, Age: ${age}, Gender: ${gender}`);

    const context = {
      age: age || null,
      gender: gender || null
    };

    // Check global cache first (fastest)
    const cachedResponse = getCachedResponse(message, context);
    if (cachedResponse) {
      console.log('[CACHE] Using cached response');
      
      // Save to chat history even for cached responses
      if (userId && sessionId) {
        await saveToChatHistory(userId, sessionId, message, cachedResponse);
      }
      
      return res.status(200).json({
        success: true,
        response: cachedResponse.response || cachedResponse.answer,
        retrieved_cases: cachedResponse.retrieved_cases || [],
        timestamp: new Date(),
        query: message,
        responseTime: 0
      });
    }

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

    // Query the RAG model with timeout
    console.log('[RAG] Querying RAG model...');
    const startTime = Date.now();
    const ragResponse = await Promise.race([
      ragAssistant.query(message, context),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('RAG timeout')), 30000) // 30 second timeout
      )
    ]);
    
    const responseTime = Date.now() - startTime;
    console.log(`[RAG] Response received in ${responseTime}ms`);

    // Cache the RAG response for future use
    cacheResponse(message, context, ragResponse);

    // Save to chat history
    if (userId && sessionId) {
      await saveToChatHistory(userId, sessionId, message, {
        ...ragResponse,
        responseTime
      });
    }

    res.status(200).json({
      success: true,
      response: ragResponse.response || ragResponse.answer || "I'm sorry, I couldn't process your request at the moment. Please try again.",
      retrieved_cases: ragResponse.retrieved_cases || [],
      timestamp: new Date(),
      query: message,
      responseTime: responseTime
    });

  } catch (error) {
    console.error("AI Chat Error:", error);
    return next(new ErrorHandler("Error processing request", 500));
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

      // Save to chat history with image data
      if (userId && sessionId) {
        console.log('[CHAT HISTORY] Attempting to save image analysis:', { userId, sessionId, modelType });
        try {
          // Find existing session or create new one
          let chatSession = await ChatHistory.findOne({ 
            userId, 
            sessionId, 
            type: 'image_analysis'
          });

          console.log('[CHAT HISTORY] Existing session found:', !!chatSession);

          if (!chatSession) {
            chatSession = new ChatHistory({
              userId,
              sessionId,
              type: 'image_analysis',
              messages: []
            });
            console.log('[CHAT HISTORY] Created new session');
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

          console.log('[CHAT HISTORY] Added user message with image data size:', imageBuffer.length);

          // Add AI analysis response
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
            }
          });

          console.log('[CHAT HISTORY] Added AI message with image data size:', imageBuffer.length);

          // Update title
          if (chatSession.messages.length === 2) {
            chatSession.title = `${modelType.toUpperCase()} Image Analysis`;
          }

          await chatSession.save();
          console.log('[CHAT HISTORY] Successfully saved image analysis to history with image data');

        } catch (historyError) {
          console.error('[CHAT HISTORY] Error saving image analysis to history:', historyError);
          console.error('[CHAT HISTORY] Error details:', {
            message: historyError.message,
            code: historyError.code,
            name: historyError.name
          });
          
          // Check if it's a document size issue
          if (historyError.message && historyError.message.includes('document too large')) {
            console.error('[CHAT HISTORY] Document size limit exceeded. Image size:', imageBuffer.length, 'bytes');
          }
        }
      } else {
        console.log('[CHAT HISTORY] Skipping chat history save - missing userId or sessionId:', { userId: !!userId, sessionId: !!sessionId });
      }

      res.status(200).json({
        success: true,
        diagnosis: analysisResults.diagnosis,
        confidence: analysisResults.confidence,
        findings: analysisResults.findings,
        recommendations: analysisResults.recommendations,
        followUp: analysisResults.followUp,
        medication: analysisResults.medication,
        source: analysisResults.source,
        timestamp: new Date()
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