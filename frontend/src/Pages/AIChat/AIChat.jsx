import React, { useState, useRef, useEffect } from 'react';
import './AIChat.css';

const AIChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI medical assistant. I can help you with general health information, appointment guidance, and answer medical questions. How can I assist you today?",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingDetailed, setIsGettingDetailed] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Get instant response first
      const response = await fetch('http://localhost:4000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          userId: localStorage.getItem('userId') || 'anonymous'
        })
      });

      const data = await response.json();
      
      const aiMessage = {
        id: Date.now() + 1,
        text: data.response || "I'm sorry, I couldn't process your request at the moment. Please try again.",
        sender: 'ai',
        timestamp: new Date(),
        isInstant: data.isInstant,
        originalQuery: inputMessage
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm sorry, there was an error processing your request. Please try again later.",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetDetailedResponse = async (messageId, originalQuery) => {
    setIsGettingDetailed(true);
    
    try {
      const response = await fetch('http://localhost:4000/api/ai/detailed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: originalQuery,
          userId: localStorage.getItem('userId') || 'anonymous'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Update the existing message with detailed response
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, text: data.response, isDetailed: true }
            : msg
        ));
      }
    } catch (error) {
      console.error('Error getting detailed response:', error);
    } finally {
      setIsGettingDetailed(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="ai-chat-container">
      <div className="ai-chat-header">
        <h2>AI Medical Assistant</h2>
        <p>Get instant answers to your medical questions</p>
      </div>

      <div className="ai-chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.sender === 'user' ? 'user-message' : 'ai-message'}`}
          >
            <div className="message-content">
              <p>{message.text}</p>
              <span className="message-time">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              
              {/* Show "Get Detailed Analysis" button for instant responses */}
              {message.sender === 'ai' && message.isInstant && !message.isDetailed && (
                <button
                  className="detailed-analysis-btn"
                  onClick={() => handleGetDetailedResponse(message.id, message.originalQuery)}
                  disabled={isGettingDetailed}
                >
                  {isGettingDetailed ? 'Analyzing...' : 'Get Detailed Analysis'}
                </button>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message ai-message">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-chat-input">
        <div className="input-container">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your medical question here..."
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="send-button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22,2 15,22 11,13 2,9"></polygon>
            </svg>
          </button>
        </div>
      </div>

      <div className="ai-chat-disclaimer">
        <p>
          <strong>Disclaimer:</strong> This AI assistant provides general health information only. 
          It is not a substitute for professional medical advice, diagnosis, or treatment. 
          Always consult with a qualified healthcare provider for medical concerns.
        </p>
      </div>
    </div>
  );
};

export default AIChat; 