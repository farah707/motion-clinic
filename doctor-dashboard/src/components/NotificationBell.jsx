import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch notifications on component mount
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await axios.get("http://localhost:4000/api/v1/notifications?limit=10", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get("http://localhost:4000/api/v1/notifications/unread-count", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error("❌ Error fetching unread count:", error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.put(`http://localhost:4000/api/v1/notifications/${notificationId}/read`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification._id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("❌ Error marking notification as read:", error);
      toast.error("Error marking notification as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.put("http://localhost:4000/api/v1/notifications/mark-all-read", {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("❌ Error marking all notifications as read:", error);
      toast.error("Error marking notifications as read");
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment_booking': return '📅';
      case 'appointment_update': return '✏️';
      case 'appointment_cancelled': return '❌';
      case 'status_change': return '🔄';
      case 'reminder': return '⏰';
      case 'ai_response_pending': return '🤖';
      default: return '🔔';
    }
  };

  return (
    <div className="notification-bell" style={{ position: 'relative' }}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          padding: '8px',
          borderRadius: '50%',
          transition: 'background-color 0.2s ease',
          color: 'var(--text-primary)',
          fontSize: '1.5rem'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--background-color)'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              background: 'var(--danger-color)',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              minWidth: '20px'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: '0',
            width: '400px',
            maxWidth: '90vw',
            maxHeight: '500px',
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            overflow: 'hidden'
          }}
          className="notification-dropdown"
        >
          {/* Header */}
          <div
            style={{
              padding: '1rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--background-color)'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
              Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔔</div>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    backgroundColor: notification.isRead ? 'transparent' : 'rgba(37, 99, 235, 0.05)',
                    position: 'relative'
                  }}
                  onClick={() => {
                    markAsRead(notification._id);
                    if (notification.type === 'ai_response_pending') {
                      window.location.href = '/doctor-review';
                    }
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--background-color)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = notification.isRead ? 'transparent' : 'rgba(37, 99, 235, 0.05)'}
                >
                  {!notification.isRead && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        width: '8px',
                        height: '8px',
                        background: 'var(--primary-color)',
                        borderRadius: '50%'
                      }}
                    />
                  )}
                  
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '1.25rem', marginTop: '0.125rem' }}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: notification.isRead ? '400' : '600',
                          marginBottom: '0.25rem',
                          color: 'var(--text-primary)'
                        }}
                      >
                        {notification.type === 'ai_response_pending' ? 'AI Response Pending Review' : notification.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          color: 'var(--text-secondary)',
                          marginBottom: '0.5rem',
                          lineHeight: '1.4'
                        }}
                      >
                        {notification.type === 'ai_response_pending' ? 'A new AI chat or image analysis is awaiting your review.' : notification.message}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {formatTimeAgo(notification.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              style={{
                padding: '0.75rem',
                borderTop: '1px solid var(--border-color)',
                textAlign: 'center',
                background: 'var(--background-color)'
              }}
            >
              <button
                onClick={fetchNotifications}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-color)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default NotificationBell; 