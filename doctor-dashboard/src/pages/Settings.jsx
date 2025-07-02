import React, { useState, useContext, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { Context } from "../main";
import axios from "axios";
import { toast } from "react-toastify";

const Settings = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { doctor, setDoctor } = useContext(Context);
  const [settings, setSettings] = useState({
    notifications: true,
    emailAlerts: true
  });
  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    phone: "",
    doctorDepartment: ""
  });
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Load doctor's data
  useEffect(() => {
    if (doctor) {
      setSettings(prev => ({
        ...prev,
        emailAlerts: doctor.emailNotificationsEnabled || false
      }));
      setProfileData({
        fullName: doctor.fullName || "",
        email: doctor.email || "",
        phone: doctor.phone || "",
        doctorDepartment: doctor.doctorDepartment || ""
  });
    }
  }, [doctor]);

  const handleSettingChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateNotificationPreferences = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      await axios.put(`${import.meta.env.VITE_API_URL}/api/v1/user/update-profile`, {
        emailNotificationsEnabled: settings.emailAlerts
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      toast.success("Notification preferences updated successfully!");
    } catch (error) {
      console.error("❌ Error updating notification preferences:", error);
      toast.error("Failed to update notification preferences");
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      setProfileLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await axios.put(`${import.meta.env.VITE_API_URL}/api/v1/user/update-profile`, profileData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Update the doctor context with new data
      if (response.data.user) {
        setDoctor(response.data.user);
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("❌ Error updating profile:", error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="header-title">Settings</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Manage your account preferences and profile information
          </p>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="dashboard-grid">
        {/* Profile Settings */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Profile Information</h3>
            <div className="card-icon primary">👤</div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input 
                type="text" 
                value={profileData.fullName}
                onChange={(e) => handleProfileChange('fullName', e.target.value)}
                className="form-input"
                placeholder="Enter your full name"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Email</label>
              <input 
                type="email" 
                value={profileData.email}
                onChange={(e) => handleProfileChange('email', e.target.value)}
                className="form-input"
                placeholder="Enter your email"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input 
                type="text" 
                value={profileData.phone}
                onChange={(e) => handleProfileChange('phone', e.target.value)}
                className="form-input"
                placeholder="Enter your phone number"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Department</label>
              <select 
                value={profileData.doctorDepartment}
                onChange={(e) => handleProfileChange('doctorDepartment', e.target.value)}
                className="form-input"
              >
                <option value="">Select Department</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="Physical Therapy">Physical Therapy</option>
              </select>
            </div>

            <button
              onClick={updateProfile}
              disabled={profileLoading}
              className="btn btn-primary"
              style={{ marginTop: '1rem' }}
            >
              {profileLoading ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </div>

        {/* Notifications Settings */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Notifications</h3>
            <div className="card-icon primary">🔔</div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>Email Notifications</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Receive email notifications for new appointments
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.emailAlerts}
                  onChange={(e) => handleSettingChange('emailAlerts', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>In-App Notifications</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Show notifications in the dashboard
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <button
              onClick={updateNotificationPreferences}
              disabled={loading}
              className="btn btn-primary"
              style={{ marginTop: '1rem' }}
            >
              {loading ? 'Updating...' : 'Save Notification Preferences'}
            </button>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Appearance</h3>
            <div className="card-icon success">🎨</div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>Dark Mode</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Switch to dark theme
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={isDarkMode}
                  onChange={toggleTheme}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Security</h3>
            <div className="card-icon danger">🔒</div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <button className="btn btn-outline" style={{ marginBottom: '1rem', width: '100%' }}>
              🔑 Change Password
            </button>
            <button className="btn btn-outline" style={{ marginBottom: '1rem', width: '100%' }}>
              📱 Two-Factor Authentication
            </button>
            <button className="btn btn-outline" style={{ width: '100%' }}>
              📋 Login History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 