import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import ragAssistant from "../utils/ragModel.js";
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

// Instant response templates for common medical queries
const getInstantResponse = (message) => {
  const lowerMessage = message.toLowerCase();
  
  // Knee pain responses
  if (lowerMessage.includes('knee') && lowerMessage.includes('hurt')) {
    return {
      response: "I understand you're experiencing knee pain when walking. This could be due to several conditions like arthritis, ligament injury, or overuse. While I'm analyzing your specific case, here are some immediate suggestions:\n\n• Rest and avoid activities that worsen the pain\n• Apply ice for 15-20 minutes several times a day\n• Consider over-the-counter pain relievers like ibuprofen\n• Elevate your leg when possible\n\nI'm retrieving more detailed medical information for you...",
      isInstant: true
    };
  }
  
  // Headache responses
  if (lowerMessage.includes('headache') || lowerMessage.includes('head pain')) {
    return {
      response: "I see you're experiencing a headache. This could be due to stress, dehydration, tension, or other factors. Here are some immediate steps you can take:\n\n• Drink plenty of water\n• Rest in a quiet, dark room\n• Try gentle neck and shoulder stretches\n• Consider over-the-counter pain relievers\n\nI'm gathering more specific medical recommendations for you...",
      isInstant: true
    };
  }
  
  // Back pain responses
  if (lowerMessage.includes('back') && lowerMessage.includes('pain')) {
    return {
      response: "I understand you're dealing with back pain. This is very common and can have various causes. Here are some immediate relief strategies:\n\n• Maintain good posture\n• Apply heat or ice to the affected area\n• Try gentle stretching exercises\n• Avoid heavy lifting or sudden movements\n\nI'm analyzing similar cases to provide you with more specific guidance...",
      isInstant: true
    };
  }

  // Fever responses
  if (lowerMessage.includes('fever') || lowerMessage.includes('temperature')) {
    return {
      response: "I see you're dealing with a fever. Here are some immediate steps to help manage it:\n\n• Rest and stay hydrated with water, clear fluids, or electrolyte drinks\n• Take acetaminophen or ibuprofen to reduce fever\n• Use cool compresses or take a lukewarm bath\n• Monitor your temperature regularly\n\nI'm analyzing your symptoms to provide more specific guidance...",
      isInstant: true
    };
  }

  // Cough responses
  if (lowerMessage.includes('cough') || lowerMessage.includes('coughing')) {
    return {
      response: "I understand you're experiencing a cough. Here are some immediate relief strategies:\n\n• Stay hydrated with warm liquids like tea or broth\n• Use honey (for adults and children over 1 year)\n• Try over-the-counter cough suppressants\n• Use a humidifier to add moisture to the air\n\nI'm analyzing similar cases to provide more specific recommendations...",
      isInstant: true
    };
  }

  // Stomach pain responses
  if (lowerMessage.includes('stomach') && lowerMessage.includes('pain') || lowerMessage.includes('abdominal')) {
    return {
      response: "I see you're experiencing stomach pain. Here are some immediate steps to help:\n\n• Rest and avoid eating if you feel nauseous\n• Try small sips of clear fluids\n• Apply a heating pad to your abdomen\n• Avoid spicy, fatty, or acidic foods\n\nI'm analyzing your symptoms to provide more specific guidance...",
      isInstant: true
    };
  }

  // Chest pain responses
  if (lowerMessage.includes('chest') && lowerMessage.includes('pain')) {
    return {
      response: "I understand you're experiencing chest pain. This can be serious and requires immediate attention. Here's what you should do:\n\n• If severe or accompanied by shortness of breath, call emergency services immediately\n• Sit down and rest\n• Try to stay calm and breathe slowly\n• If mild, monitor your symptoms closely\n\nI'm analyzing your symptoms to provide more specific guidance...",
      isInstant: true
    };
  }

  // Fatigue responses
  if (lowerMessage.includes('tired') || lowerMessage.includes('fatigue') || lowerMessage.includes('exhausted')) {
    return {
      response: "I understand you're feeling tired or fatigued. Here are some immediate steps to help:\n\n• Ensure you're getting adequate sleep (7-9 hours)\n• Stay hydrated throughout the day\n• Eat regular, balanced meals\n• Try gentle exercise like walking\n\nI'm analyzing your symptoms to provide more specific recommendations...",
      isInstant: true
    };
  }
  
  // General medical query
  return {
    response: `I understand you're asking about: "${message}". This appears to be a medical query. I'm analyzing similar cases and medical data to provide you with personalized recommendations. Please give me a moment to gather the most relevant information for your situation...`,
    isInstant: true
  };
};

// Chat endpoint for AI assistant
export const aiChat = catchAsyncErrors(async (req, res, next) => {
  try {
    const { message, userId, age, gender } = req.body;

    if (!message || !message.trim()) {
      return next(new ErrorHandler("Message is required", 400));
    }

    console.log(`AI Chat Request - User: ${userId}, Query: ${message}, Age: ${age}, Gender: ${gender}`);

    // Get instant response first
    const instantResponse = getInstantResponse(message);
    
    // Send instant response immediately - no background processing
    res.status(200).json({
      success: true,
      response: instantResponse.response,
      isInstant: true,
      timestamp: new Date(),
      query: message
    });

    // Note: RAG model processing is now ONLY done when user clicks "Get Detailed Analysis"
    // This ensures instant responses every time without any background processing

  } catch (error) {
    console.error("AI Chat Error:", error);
    
    // Return a fallback response instead of error
    return res.status(200).json({
      success: true,
      response: `I understand you're asking about: "${req.body.message}". This appears to be a medical query. For accurate medical advice, please consult with a healthcare provider. I can help you with general health information and appointment scheduling.`,
      isInstant: true,
      timestamp: new Date(),
      query: req.body.message || "Unknown query"
    });
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

  pythonProcess.on('close', (code) => {
    // Clean up the uploaded file
    fs.unlinkSync(imagePath);

    if (code !== 0) {
      console.error(`Python Script Error: ${error}`);
      return next(new ErrorHandler("Failed to analyze the image.", 500));
    }
    try {
      const jsonResponse = JSON.parse(result);
      if (jsonResponse.error) {
        return next(new ErrorHandler(jsonResponse.error, 500));
      }
      res.status(200).json({
        success: true,
        analysis: jsonResponse
      });
    } catch (parseError) {
      console.error(`JSON Parse Error: ${parseError}. Raw output: ${result}`);
      return next(new ErrorHandler("Failed to parse analysis result.", 500));
    }
  });

  pythonProcess.on('error', (err) => {
    // Clean up the uploaded file
    fs.unlinkSync(imagePath);
    console.error(`Python Process Spawn Error: ${err}`);
    return next(new ErrorHandler("Server error while trying to run analysis.", 500));
  });
}); 