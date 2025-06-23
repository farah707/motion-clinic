// Settings.jsx
import { useEffect, useState, useContext } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Settings.css";
import { Context } from "../../main"; // Import Context to access user data

const Settings = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useContext(Context); // Get user from context

  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState("medium");
  const [language, setLanguage] = useState("en");
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("account"); // New state for active tab

  // User profile state
  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    username: "",
    phone: "",
    // bio: "", // Removed as per user request
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // New state variables for notification settings
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [notificationDays, setNotificationDays] = useState(0);
  const [notificationHours, setNotificationHours] = useState(0);
  const [notificationMinutes, setNotificationMinutes] = useState(0);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode") === "true";
    const savedFontSize = localStorage.getItem("fontSize") || "medium";
    const savedLanguage = localStorage.getItem("language") || "en";
    const savedEmailNotifications = localStorage.getItem("emailNotificationsEnabled") === "true";
    const savedNotificationDays = parseInt(localStorage.getItem("notificationDays")) || 0;
    const savedNotificationHours = parseInt(localStorage.getItem("notificationHours")) || 0;
    const savedNotificationMinutes = parseInt(localStorage.getItem("notificationMinutes")) || 0;

    setDarkMode(savedDarkMode);
    setFontSize(savedFontSize);
    setLanguage(savedLanguage);
    setEmailNotificationsEnabled(savedEmailNotifications);
    setNotificationDays(savedNotificationDays);
    setNotificationHours(savedNotificationHours);
    setNotificationMinutes(savedNotificationMinutes);

    i18n.changeLanguage(savedLanguage);
    applyTheme(savedDarkMode);
    applyFontSize(savedFontSize);

    // Populate profile data from user context on component mount
    if (user) {
      setProfileData({
        fullName: user.fullName || "",
        email: user.email || "",
        username: user.username || "", // Assuming user has a username field
        phone: user.phone || "",
        // bio: user.bio || "", // Assuming user has a bio field
      });
    }

    fetchNotificationSettings();
  }, [i18n, user]); // Add user to dependency array

  const fetchNotificationSettings = async () => {
    try {
      const response = await axios.get("http://localhost:4000/api/v1/user/notification-settings", {
        withCredentials: true
      });
      const { settings } = response.data;
      setEmailNotificationsEnabled(settings.emailNotificationsEnabled);
      setNotificationDays(settings.notificationDays);
      setNotificationHours(settings.notificationHours);
      setNotificationMinutes(settings.notificationMinutes);
    } catch (error) {
      console.error("Error fetching notification settings:", error);
    }
  };

  const applyTheme = (dark) => {
    document.body.classList.toggle("dark-mode", dark);
  };

  const applyFontSize = (size) => {
    document.documentElement.style.fontSize =
      size === "small" ? "14px" : size === "large" ? "18px" : "16px";
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("darkMode", newDarkMode);
    applyTheme(newDarkMode);
  };

  const handleFontSizeChange = (event) => {
    const newSize = event.target.value;
    setFontSize(newSize);
    localStorage.setItem("fontSize", newSize);
    applyFontSize(newSize);
  };

  const handleLanguageChange = (event) => {
    const newLanguage = event.target.value;
    setLanguage(newLanguage);
    localStorage.setItem("language", newLanguage);
    i18n.changeLanguage(newLanguage);
  };

  const handleEmailNotificationsToggle = () => {
    const newValue = !emailNotificationsEnabled;
    setEmailNotificationsEnabled(newValue);
    localStorage.setItem("emailNotificationsEnabled", newValue);
  };

  const handleNotificationTimeChange = (type, event) => {
    const value = parseInt(event.target.value) || 0;
    if (type === "days") {
      setNotificationDays(value);
      localStorage.setItem("notificationDays", value);
    } else if (type === "hours") {
      setNotificationHours(value);
      localStorage.setItem("notificationHours", value);
    } else if (type === "minutes") {
      setNotificationMinutes(value);
      localStorage.setItem("notificationMinutes", value);
    }
  };

  const handleSaveNotificationSettings = async () => {
    setIsLoading(true);
    try {
      console.log("Saving notification settings:", {
        emailNotificationsEnabled,
        notificationDays,
        notificationHours,
        notificationMinutes
      });

      const response = await axios.put(
        "http://localhost:4000/api/v1/user/notification-settings/update",
        {
          emailNotificationsEnabled,
          notificationDays,
          notificationHours,
          notificationMinutes,
        },
        {
          withCredentials: true,
        }
      );

      console.log("Save response:", response.data);

      setNotificationMessage("Notification settings saved successfully! A confirmation email has been sent.");
      setShowNotification(true);
    } catch (error) {
      console.error("Error saving notification settings:", error.response?.data || error);
      setNotificationMessage("Error saving notification settings. Please try again.");
      setShowNotification(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNavigate = () => {
    navigate("/delete-account");
  };

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      // Assuming an API endpoint for updating user profile
      const response = await axios.put(
        "http://localhost:4000/api/v1/user/update-profile", // Adjust this endpoint as needed
        profileData,
        { withCredentials: true }
      );
      console.log("Profile update response:", response.data);
      // Optionally update user context or show success message
      setNotificationMessage("Profile updated successfully!");
      setShowNotification(true);
    } catch (error) {
      console.error("Error updating profile:", error.response?.data || error);
      setNotificationMessage("Error updating profile. Please try again.");
      setShowNotification(true);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div
          className={`tab-item ${activeTab === "account" ? "active" : ""}`}
          onClick={() => setActiveTab("account")}
        >
          {t("Account Settings")}
        </div>
        <div
          className={`tab-item ${activeTab === "interface" ? "active" : ""}`}
          onClick={() => setActiveTab("interface")}
        >
          {t("Interface")}
        </div>
        <div
          className={`tab-item ${activeTab === "login" ? "active" : ""}`}
          onClick={() => setActiveTab("login")}
        >
          {t("Login & Security")}
        </div>
        <div
          className={`tab-item ${activeTab === "notification" ? "active" : ""}`}
          onClick={() => setActiveTab("notification")}
        >
          {t("Notification Settings")}
        </div>
      </div>

      <div className="settings-content">
        {activeTab === "account" && (
          <div className="account-settings-section">
            {/* Your Profile Picture section removed as per user request */}

            <div className="profile-fields">
              <div className="form-group-settings">
                <label>{t("Full name")}</label>
                <input
                  type="text"
                  name="fullName"
                  value={profileData.fullName}
                  onChange={handleProfileInputChange}
                  disabled // As per image, disabled
                />
              </div>
              <div className="form-group-settings">
                <label>{t("Email address")}</label>
                <input
                  type="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleProfileInputChange}
                  disabled // As per image, disabled
                />
                <span className="verified-status">Verified</span>
              </div>
              <div className="form-group-settings">
                <label>{t("Username")}</label>
                <input
                  type="text"
                  name="username"
                  value={profileData.username}
                  onChange={handleProfileInputChange}
                />
              </div>
              <div className="form-group-settings">
                <label>{t("Phone number")}</label>
                <input
                  type="text"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleProfileInputChange}
                />
                <span className="verified-status">Verified</span>
              </div>
            </div>
            <button
              className="update-profile-btn"
              onClick={handleUpdateProfile}
              disabled={isUpdatingProfile}
            >
              {isUpdatingProfile ? t("Updating...") : t("Update Profile")}
            </button>
          </div>
        )}

        {activeTab === "login" && (
          <div className="login-security-section">
            <h3>{t("Login & Security Settings")}</h3>
            <div className="login-security-actions">
              <button className="forgot-password-btn" onClick={() => navigate("/forgot-password")}>
                {t("Forget Password")}
              </button>
              <button className="delete-account-btn" onClick={handleDeleteNavigate}>
                {t("deleteMyAccount")}
              </button>
            </div>
          </div>
        )}

        {activeTab === "notification" && (
          <div className="notification-settings-section">
            <h3>{t("Notification Settings")}</h3>
            <div className="setting-option">
              <label>{t("emailNotifications")}</label>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={emailNotificationsEnabled}
                  onChange={handleEmailNotificationsToggle}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-option">
              <label>{t("notificationReminder")}</label>
              <div className="notification-time-inputs">
                <input
                  type="number"
                  min="0"
                  value={notificationDays}
                  onChange={(e) => handleNotificationTimeChange("days", e)}
                  placeholder="Days"
                />
                <span>{t("days")},</span>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={notificationHours}
                  onChange={(e) => handleNotificationTimeChange("hours", e)}
                  placeholder="Hours"
                />
                <span>{t("hours")},</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={notificationMinutes}
                  onChange={(e) => handleNotificationTimeChange("minutes", e)}
                  placeholder="Minutes"
                />
                <span>{t("minutes")}.</span>
              </div>
            </div>

            <button
              className="save-notification-btn"
              onClick={handleSaveNotificationSettings}
              disabled={isLoading}
            >
              {isLoading ? t("Saving...") : t("Save Notification Settings")}
            </button>
            {showNotification && (
              <div className="notification-modal">
                <div className="notification-content">
                  <p>{notificationMessage}</p>
                  <button onClick={() => setShowNotification(false)}>Close</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "interface" && (
          <div className="interface-settings-section">
            <h3>{t("Interface Settings")}</h3>
            <div className="setting-option">
              <label>{t("darkMode")}</label>
              <label className="toggle-switch">
                <input type="checkbox" checked={darkMode} onChange={toggleDarkMode} />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-option">
              <label>{t("fontSize")}</label>
              <select value={fontSize} onChange={handleFontSizeChange}>
                <option value="small">{t("small")}</option>
                <option value="medium">{t("medium")}</option>
                <option value="large">{t("large")}</option>
              </select>
            </div>

            <div className="setting-option">
              <label>{t("language")}</label>
              <select value={language} onChange={handleLanguageChange}>
                <option value="en">{t("english")}</option>
                <option value="ar">{t("arabic")}</option>
                <option value="fr">{t("french")}</option>
              </select>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default Settings;
