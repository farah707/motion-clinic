import mongoose from "mongoose";

const chatHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sessionId: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['ai_chat', 'image_analysis'],
    required: true,
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'ai'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // For AI chat messages
    responseTime: Number,
    retrievedCases: [{
      patient_id: String,
      diagnosis: String,
      treatment: String,
      medications: String,
      similarity_score: Number,
    }],
    // For image analysis messages
    imageType: String,
    imageData: {
      data: Buffer,
      contentType: String,
      filename: String,
    },
    analysisResults: {
      diagnosis: String,
      confidence: String,
      findings: String,
      recommendations: String,
      followUp: String,
      medication: String,
      source: String,
    },
    imageUrl: String,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  title: {
    type: String,
    default: function() {
      if (this.messages && this.messages.length > 0) {
        const firstMessage = this.messages[0].content;
        return firstMessage.length > 50 ? firstMessage.substring(0, 50) + '...' : firstMessage;
      }
      return 'New Conversation';
    }
  },
  summary: {
    type: String,
    default: '',
  },
});

// Update the updatedAt field on save
chatHistorySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create index for faster queries
chatHistorySchema.index({ userId: 1, createdAt: -1 });
chatHistorySchema.index({ sessionId: 1 });

const ChatHistory = mongoose.model("ChatHistory", chatHistorySchema);

export default ChatHistory; 