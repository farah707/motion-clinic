import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './AIChat.css';

// --- Sub-components for better organization ---

const ChatWindow = () => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your AI medical assistant. How can I assist you today?", sender: 'ai', timestamp: new Date() }
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
    const userMessage = { id: Date.now(), text: inputMessage, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/ai/chat', { message: inputMessage });
      const data = response.data;
      const aiMessage = {
        id: Date.now() + 1,
        text: data.response || "Sorry, I couldn't process that.",
        sender: 'ai',
        timestamp: new Date(),
        isInstant: data.isInstant,
        originalQuery: inputMessage
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = { id: Date.now() + 1, text: "An error occurred. Please try again.", sender: 'ai', timestamp: new Date() };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetDetailedResponse = async (messageId, originalQuery) => {
    setIsGettingDetailed(true);
    try {
      const response = await axios.post('/api/ai/detailed', { message: originalQuery });
      if (response.data.success) {
        setMessages(prev => prev.map(msg =>
          msg.id === messageId ? { ...msg, text: response.data.response, isDetailed: true } : msg
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
    <>
      <div className="ai-chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.sender === 'user' ? 'user-message' : 'ai-message'}`}>
            <div className="message-content">
              <p>{message.text}</p>
              <span className="message-time">{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
            <div className="message-content"><div className="typing-indicator"><span></span><span></span><span></span></div></div>
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
          <button onClick={handleSendMessage} disabled={isLoading || !inputMessage.trim()} className="send-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22,2 15,22 11,13 2,9"></polygon></svg>
          </button>
        </div>
      </div>
    </>
  );
};

const ImageAnalysisWindow = () => {
  const [imageType, setImageType] = useState('ct');
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setAnalysisResult(null);
      setError('');
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please select an image file first.');
      return;
    }
    setIsLoading(true);
    setError('');
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('type', imageType);

    try {
      const response = await axios.post('/api/ai/image-analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        setAnalysisResult(response.data.analysis);
      } else {
        setError(response.data.message || 'Analysis failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during analysis.');
      console.error('Image analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="image-analysis-container">
      <div className="image-controls">
        <div className="image-type-selector">
          <h3>Select Image Type</h3>
          <div className="radio-group">
            {['ct', 'xray', 'mri'].map(type => (
              <label key={type}>
                <input type="radio" name="imageType" value={type} checked={imageType === type} onChange={(e) => setImageType(e.target.value)} />
                {type.toUpperCase()}
              </label>
            ))}
          </div>
        </div>
        <div className="image-upload">
          <input type="file" id="file-upload" onChange={handleFileChange} accept="image/jpeg,image/png,image/dcm" />
          <label htmlFor="file-upload" className="upload-btn">Choose Image</label>
          <button onClick={handleAnalyze} disabled={isLoading || !selectedFile} className="analyze-btn">
            {isLoading ? 'Analyzing...' : 'Analyze Image'}
          </button>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
      <div className="analysis-content">
        <div className="image-preview">
          {preview ? <img src={preview} alt="Selected Preview" /> : <div className="placeholder">Image Preview</div>}
        </div>
        <div className="analysis-results">
          {isLoading && <div className="typing-indicator"><span></span><span></span><span></span></div>}
          {analysisResult ? (
            <div className="result-card">
              <h3>Analysis Report</h3>
              <p><strong>Source:</strong> {analysisResult.source || 'N/A'}</p>
              <p><strong>Similarity Score:</strong> {analysisResult.similarity_score || 'N/A'}</p>
              <p><strong>Final Diagnosis:</strong> {analysisResult.final_diagnosis || 'Not determined'}</p>
              <p><strong>Treatment Plan:</strong> {analysisResult.treatment_plan || 'Not determined'}</p>
              <p><strong>Medication Prescribed:</strong> {analysisResult.medication_prescribed || 'Not determined'}</p>
              <p><strong>Recommendations:</strong> {analysisResult.recommendations || 'Not determined'}</p>
              <p><strong>Follow-up:</strong> {analysisResult.follow_up || 'Not determined'}</p>
            </div>
          ) : !isLoading && <div className="placeholder">Results will appear here.</div>}
        </div>
      </div>
    </div>
  );
};


// --- Main AIChat Component ---

const AIChat = () => {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'image'

  return (
    <div className="ai-chat-container">
      <div className="ai-chat-header">
        <h2>AI Medical Assistant</h2>
        <p>Your integrated solution for medical queries and image analysis</p>
      </div>

      <div className="ai-chat-tabs">
        <button className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
          AI Chat
        </button>
        <button className={`tab-btn ${activeTab === 'image' ? 'active' : ''}`} onClick={() => setActiveTab('image')}>
          Medical Image Analysis
        </button>
      </div>

      <div className="ai-chat-content">
        {activeTab === 'chat' && <ChatWindow />}
        {activeTab === 'image' && <ImageAnalysisWindow />}
      </div>
      
      <div className="ai-chat-disclaimer">
        <p>
          <strong>Disclaimer:</strong> This AI assistant provides general health information only. It is not a substitute for professional medical advice.
        </p>
      </div>
    </div>
  );
};

export default AIChat; 