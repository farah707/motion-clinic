import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import ChatHistory from "../models/chatHistorySchema.js";
import mongoose from "mongoose";

// Save chat message to history
export const saveChatMessage = catchAsyncErrors(async (req, res, next) => {
  try {
    const { userId, sessionId, type, message, responseData } = req.body;

    if (!userId || !sessionId || !type || !message) {
      return next(new ErrorHandler("Missing required fields", 400));
    }

    // Find existing session or create new one
    let chatSession = await ChatHistory.findOne({ 
      userId, 
      sessionId, 
      type 
    });

    if (!chatSession) {
      chatSession = new ChatHistory({
        userId,
        sessionId,
        type,
        messages: []
      });
    }

    // Add user message
    chatSession.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Add AI response if provided
    if (responseData) {
      const aiMessage = {
        role: 'ai',
        content: responseData.response || responseData.answer || '',
        timestamp: new Date()
      };

      // Add AI chat specific data
      if (type === 'ai_chat') {
        aiMessage.responseTime = responseData.responseTime;
        aiMessage.retrievedCases = responseData.retrieved_cases || [];
      }

      // Add image analysis specific data
      if (type === 'image_analysis') {
        aiMessage.imageType = responseData.imageType;
        aiMessage.analysisResults = {
          diagnosis: responseData.diagnosis || '',
          confidence: responseData.confidence || 0,
          findings: responseData.findings || '',
          recommendations: responseData.recommendations || ''
        };
        aiMessage.imageUrl = responseData.imageUrl;
      }

      chatSession.messages.push(aiMessage);
    }

    // Update title based on first message
    if (chatSession.messages.length === 2) { // User + AI message
      const firstMessage = chatSession.messages[0].content;
      chatSession.title = firstMessage.length > 50 ? firstMessage.substring(0, 50) + '...' : firstMessage;
    }

    await chatSession.save();

    res.status(200).json({
      success: true,
      message: "Chat message saved successfully",
      sessionId: chatSession._id
    });

  } catch (error) {
    console.error("Error saving chat message:", error);
    return next(new ErrorHandler("Error saving chat message", 500));
  }
});

// Get user's chat history
export const getChatHistory = catchAsyncErrors(async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { type, page = 1, limit = 10 } = req.query;

    const query = { userId };
    if (type) {
      query.type = type;
    }

    const skip = (page - 1) * limit;

    const chatSessions = await ChatHistory.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('title type createdAt updatedAt messages');

    const total = await ChatHistory.countDocuments(query);

    res.status(200).json({
      success: true,
      chatSessions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error("Error getting chat history:", error);
    return next(new ErrorHandler("Error retrieving chat history", 500));
  }
});

// Get specific chat session
export const getChatSession = catchAsyncErrors(async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.query;

    const query = { _id: sessionId };
    if (userId) {
      query.userId = userId;
    }

    const chatSessionDoc = await ChatHistory.findOne(query);

    if (!chatSessionDoc) {
      return next(new ErrorHandler("Chat session not found", 404));
    }

    // Convert to plain JS object
    const chatSession = chatSessionDoc.toObject();

    console.log('[CHAT HISTORY] Sending session to frontend:', {
      sessionId: chatSession._id,
      messageCount: chatSession.messages.length,
      hasImageData: chatSession.messages.some(msg => msg.imageData)
    });

    // Log details about image data in messages and convert to base64 if needed
    chatSession.messages.forEach((message, index) => {
      if (message.imageData && message.imageData.data) {
        console.log(`[CHAT HISTORY] Message ${index} image data:`, {
          contentType: message.imageData.contentType,
          filename: message.imageData.filename,
          dataType: typeof message.imageData.data,
          dataConstructor: message.imageData.data?.constructor?.name,
          dataLength: message.imageData.data ? message.imageData.data.length : 'undefined'
        });
        if (Buffer.isBuffer(message.imageData.data)) {
          message.imageData.data = message.imageData.data.toString('base64');
          console.log(`[CHAT HISTORY] Converted Buffer to base64 for message ${index}, base64 length: ${message.imageData.data.length}`);
        } else if (
          typeof message.imageData.data === 'object' &&
          message.imageData.data.type === 'Buffer' &&
          Array.isArray(message.imageData.data.data)
        ) {
          const buf = Buffer.from(message.imageData.data.data);
          message.imageData.data = buf.toString('base64');
          console.log(`[CHAT HISTORY] Converted {type: 'Buffer'} object to base64 for message ${index}, base64 length: ${message.imageData.data.length}`);
        }
      }
    });

    res.status(200).json({
      success: true,
      chatSession
    });

  } catch (error) {
    console.error("Error getting chat session:", error);
    return next(new ErrorHandler("Error retrieving chat session", 500));
  }
});

// Delete chat session
export const deleteChatSession = catchAsyncErrors(async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.body;

    const query = { _id: sessionId };
    if (userId) {
      query.userId = userId;
    }

    const chatSession = await ChatHistory.findOneAndDelete(query);

    if (!chatSession) {
      return next(new ErrorHandler("Chat session not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Chat session deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting chat session:", error);
    return next(new ErrorHandler("Error deleting chat session", 500));
  }
});

// Get chat statistics
export const getChatStats = catchAsyncErrors(async (req, res, next) => {
  try {
    const { userId } = req.params;

    const stats = await ChatHistory.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalMessages: { $sum: { $size: '$messages' } },
          lastActivity: { $max: '$updatedAt' }
        }
      }
    ]);

    const totalSessions = await ChatHistory.countDocuments({ userId });
    const totalMessages = await ChatHistory.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: { $size: '$messages' } } } }
    ]);

    res.status(200).json({
      success: true,
      stats: stats.reduce((acc, stat) => {
        acc[stat._id] = stat;
        return acc;
      }, {}),
      totalSessions,
      totalMessages: totalMessages[0]?.total || 0
    });

  } catch (error) {
    console.error("Error getting chat stats:", error);
    return next(new ErrorHandler("Error retrieving chat statistics", 500));
  }
});

// Get all pending items for doctor
export const getPendingForDoctor = catchAsyncErrors(async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing doctorId' });
    }
    // Find all messages with status 'pending' assigned to this doctor or unassigned
    const sessions = await ChatHistory.find({
      $or: [
        { doctorId },
        { doctorId: { $exists: false } }
      ],
      'messages.status': 'pending'
    }).sort({ updatedAt: -1 });

    // Convert imageData.data to base64 for all messages in all sessions
    const sessionsObj = sessions.map(session => {
      const obj = session.toObject();
      obj.messages.forEach((message, index) => {
        if (message.imageData && message.imageData.data) {
          if (Buffer.isBuffer(message.imageData.data)) {
            message.imageData.data = message.imageData.data.toString('base64');
          } else if (
            typeof message.imageData.data === 'object' &&
            message.imageData.data.type === 'Buffer' &&
            Array.isArray(message.imageData.data.data)
          ) {
            const buf = Buffer.from(message.imageData.data.data);
            message.imageData.data = buf.toString('base64');
          }
        }
      });
      return obj;
    });

    res.status(200).json({ success: true, sessions: sessionsObj });
  } catch (error) {
    console.error("Error fetching pending items:", error);
    return next(new ErrorHandler("Error fetching pending items", 500));
  }
});

// Doctor reviews (approve/reject/edit) a message
export const doctorReview = catchAsyncErrors(async (req, res, next) => {
  try {
    const { sessionId, messageIndex } = req.params;
    const { doctorId, action, doctorEditedResponse, doctorComment } = req.body;
    // action: 'approve' | 'reject'
    if (!['approve', 'reject'].includes(action)) {
      return next(new ErrorHandler("Invalid action", 400));
    }
    const chatSession = await ChatHistory.findById(sessionId);
    if (!chatSession) {
      return next(new ErrorHandler("Chat session not found", 404));
    }
    const message = chatSession.messages[messageIndex];
    if (!message) {
      return next(new ErrorHandler("Message not found", 404));
    }
    if (message.status !== 'pending') {
      return next(new ErrorHandler("Message already reviewed", 400));
    }
    // Atomic update
    message.status = action === 'approve' ? 'approved' : 'rejected';
    message.approved = action === 'approve';
    message.reviewedBy = doctorId;
    message.reviewedAt = new Date();
    if (action === 'approve') {
      if (doctorEditedResponse) {
        message.doctorEditedResponse = doctorEditedResponse;
        message.content = doctorEditedResponse; // update content to edited
      }
      chatSession.doctorId = doctorId;
    } else {
      message.doctorComment = doctorComment || '';
    }
    await chatSession.save();
    // Optionally, notify user (add a notification field or collection)
    res.status(200).json({ success: true, message: `Message ${action}d successfully` });
  } catch (error) {
    console.error("Error in doctor review:", error);
    return next(new ErrorHandler("Error in doctor review", 500));
  }
}); 