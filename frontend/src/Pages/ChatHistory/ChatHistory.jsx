import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Context } from '../../main';
import './ChatHistory.css';
import { FaRobot, FaUserCircle, FaArrowLeft, FaSearch, FaFilter, FaCalendarAlt, FaClock, FaTrashAlt, FaEye } from 'react-icons/fa';

const ChatHistory = () => {
  const { user } = useContext(Context);
  const [chatSessions, setChatSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  useEffect(() => {
    if (user?._id) {
      fetchChatHistory();
    }
  }, [user, filter, currentPage]);

  const fetchChatHistory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/chat-history/history/${user._id}`, {
        params: {
          type: filter === 'all' ? undefined : filter,
          page: currentPage,
          limit: 12
        }
      });
      
      setChatSessions(response.data.chatSessions);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionClick = async (sessionId) => {
    try {
      const response = await axios.get(`/api/chat-history/session/${sessionId}`, {
        params: { userId: user._id }
      });
      console.log('[FRONTEND] Received chat session:', response.data.chatSession);
      console.log('[FRONTEND] Session messages:', response.data.chatSession.messages);
      
      // Check for image data in messages
      response.data.chatSession.messages.forEach((message, index) => {
        console.log(`[FRONTEND] Message ${index} full structure:`, message);
        if (message.imageData) {
          let dataSample = 'undefined';
          if (message.imageData.data) {
            if (typeof message.imageData.data === 'string') {
              dataSample = message.imageData.data.substring(0, 50);
            } else if (Array.isArray(message.imageData.data)) {
              dataSample = message.imageData.data.slice(0, 10);
            } else {
              dataSample = 'unknown type';
            }
          }
          console.log(`[FRONTEND] Message ${index} has image data:`, {
            contentType: message.imageData.contentType,
            filename: message.imageData.filename,
            dataType: typeof message.imageData.data,
            dataConstructor: message.imageData.data?.constructor?.name,
            dataLength: message.imageData.data ? message.imageData.data.length : 'undefined',
            dataSample
          });
        } else {
          console.log(`[FRONTEND] Message ${index} has NO image data`);
        }
      });
      
      setSelectedSession(response.data.chatSession);
    } catch (error) {
      console.error('Error fetching session:', error);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      try {
        await axios.delete(`/api/chat-history/session/${sessionId}`, {
          data: { userId: user._id }
        });
        fetchChatHistory();
        if (selectedSession?._id === sessionId) {
          setSelectedSession(null);
        }
      } catch (error) {
        console.error('Error deleting session:', error);
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSessionIcon = (type) => {
    return type === 'ai_chat' ? '💬' : '🖼️';
  };

  const getSessionTypeLabel = (type) => {
    return type === 'ai_chat' ? 'AI Chat' : 'Image Analysis';
  };

  const getSessionTypeColor = (type) => {
    return type === 'ai_chat' ? '#667eea' : '#f093fb';
  };

  const filteredSessions = chatSessions.filter(session =>
    session.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getSessionTypeLabel(session.type).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMessagePreview = (messages) => {
    if (!messages || messages.length === 0) return 'No messages';
    const lastMessage = messages[messages.length - 1];
    return lastMessage.content?.substring(0, 60) + (lastMessage.content?.length > 60 ? '...' : '');
  };

  if (!user) {
    return (
      <div className="chat-history-container">
        <div className="chat-history-header">
          <h2>Chat History</h2>
          <p>Please log in to view your chat history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-history-container">
      <div className="chat-history-header">
        <div className="header-content">
          <h2>Chat History</h2>
          <p>Review and manage your AI conversations and image analyses</p>
        </div>
        <div className="header-actions">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
        </div>
      </div>

      <div className="chat-history-filters">
        <div className="filter-group">
          <FaFilter className="filter-icon" />
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Conversations</option>
            <option value="ai_chat">AI Chat</option>
            <option value="image_analysis">Image Analysis</option>
          </select>
        </div>
        <div className="session-count">
          {filteredSessions.length} conversation{filteredSessions.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="chat-history-content">
        <div className={`chat-sessions-container ${viewMode}`}>
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading your conversations...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h3>No conversations found</h3>
              <p>Start chatting with the AI or upload images for analysis to see your history here.</p>
              <button className="cta-button" onClick={() => window.location.href = '/ai-chat'}>
                Start New Conversation
              </button>
            </div>
          ) : (
            <>
              <div className={`sessions-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
                {filteredSessions.map((session) => (
                  <div 
                    key={session._id} 
                    className={`session-card ${selectedSession?._id === session._id ? 'active' : ''}`}
                    onClick={() => handleSessionClick(session._id)}
                  >
                    <div className="session-card-header">
                      <div className="session-type-badge" style={{ backgroundColor: getSessionTypeColor(session.type) }}>
                        {getSessionIcon(session.type)}
                        <span>{getSessionTypeLabel(session.type)}</span>
                      </div>
                      <div className="session-actions">
                        <button 
                          className="action-btn view-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSessionClick(session._id);
                          }}
                          title="View conversation"
                        >
                          <FaEye />
                        </button>
                        <button 
                          className="action-btn delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(session._id);
                          }}
                          title="Delete conversation"
                        >
                          <FaTrashAlt />
                        </button>
                      </div>
                    </div>
                    
                    <div className="session-card-content">
                      <h4 className="session-title">{session.title || 'Untitled Conversation'}</h4>
                      <p className="session-preview">{getMessagePreview(session.messages)}</p>
                      
                      <div className="session-meta">
                        <div className="meta-item">
                          <FaCalendarAlt />
                          <span>{formatDate(session.updatedAt)}</span>
                        </div>
                        <div className="meta-item">
                          <FaClock />
                          <span>{formatTime(session.updatedAt)}</span>
                        </div>
                        <div className="meta-item">
                          <span className="message-count">
                            {session.messages?.length || 0} message{(session.messages?.length || 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {totalPages > 1 && (
                <div className="pagination">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    Previous
                  </button>
                  <span className="page-info">Page {currentPage} of {totalPages}</span>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {selectedSession && (
          <div className="chat-session-detail">
            <div className="session-detail-header">
              <div className="session-detail-info">
                <h3>{selectedSession.title || 'Untitled Conversation'}</h3>
                <div className="session-detail-meta">
                  <span className="session-type" style={{ color: getSessionTypeColor(selectedSession.type) }}>
                    {getSessionTypeLabel(selectedSession.type)}
                  </span>
                  <span className="session-date">
                    {formatDate(selectedSession.updatedAt)} at {formatTime(selectedSession.updatedAt)}
                  </span>
                </div>
              </div>
              <button 
                className="close-btn"
                onClick={() => setSelectedSession(null)}
                title="Back to list"
              >
                <FaArrowLeft />
              </button>
            </div>
            
            <div className="session-messages timeline">
              {/* Only show approved messages to the user */}
              {selectedSession.messages
                .filter((message) =>
                  message.role === 'user' || (message.role === 'ai' && message.status === 'approved')
                )
                .map((message, index) => (
                  <div key={index} className={`message ${message.role === 'user' ? 'user-message' : 'ai-message'} bubble-animate`}>
                    <div className="message-content">
                      <p>{message.content}</p>
                      <span className="message-time">{formatTime(message.timestamp)}</span>
                      {message.role === 'ai' && message.responseTime && (
                        <div className="response-time">
                          <small>Response time: {message.responseTime}ms</small>
                        </div>
                      )}
                      {message.role === 'ai' && message.analysisResults && (
                        <div className="analysis-results">
                          <h4>Analysis Results:</h4>
                          {message.imageData && (
                            <div className="analysis-image">
                              {(() => {
                                try {
                                  const imageData = message.imageData.data;
                                  if (imageData) {
                                    let base64String;
                                    if (typeof imageData === 'string') {
                                      base64String = imageData;
                                    } else if (imageData && imageData.length > 0) {
                                      base64String = btoa(String.fromCharCode(...new Uint8Array(imageData)));
                                    } else {
                                      throw new Error('Image data is empty or corrupted');
                                    }
                                    return (
                                      <img 
                                        src={`data:${message.imageData.contentType};base64,${base64String}`}
                                        alt="Medical Image"
                                        className="medical-image"
                                        onError={(e) => {
                                          console.error('[FRONTEND] Image display error:', e);
                                          e.target.style.display = 'none';
                                          e.target.nextSibling.style.display = 'block';
                                        }}
                                      />
                                    );
                                  } else {
                                    return <p>Image data is empty or corrupted</p>;
                                  }
                                } catch (error) {
                                  console.error('[FRONTEND] Error converting image data:', error);
                                  return <p>Error displaying image: {error.message}</p>;
                                }
                              })()}
                            </div>
                          )}
                          <div className="analysis-details">
                            <p><strong>Diagnosis:</strong> {message.analysisResults.diagnosis || 'Not determined'}</p>
                            <p><strong>Confidence:</strong> {message.analysisResults.confidence || 'N/A'}</p>
                            <p><strong>Findings:</strong> {message.analysisResults.findings || 'Not determined'}</p>
                            <p><strong>Medication:</strong> {message.analysisResults.medication || 'Not determined'}</p>
                            <p><strong>Recommendations:</strong> {message.analysisResults.recommendations || 'Not determined'}</p>
                            <p><strong>Follow-up:</strong> {message.analysisResults.followUp || 'Not determined'}</p>
                            <p><strong>Source:</strong> {message.analysisResults.source || 'AI Analysis'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              {/* Show waiting or rejected state for latest AI/image message */}
              {(() => {
                const lastAI = selectedSession.messages.filter(m => m.role === 'ai').slice(-1)[0];
                if (lastAI && lastAI.status === 'pending') {
                  return <div className="message ai-message bubble-animate"><div className="message-content"><em>Waiting for doctor approval...</em></div></div>;
                }
                if (lastAI && lastAI.status === 'rejected') {
                  return <div className="message ai-message bubble-animate"><div className="message-content"><em>Rejected by doctor{lastAI.doctorComment ? `: ${lastAI.doctorComment}` : ''}</em></div></div>;
                }
                return null;
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHistory; 