import axios from "axios";
import React, { useContext, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Context } from "../../main";
import "./Navbar.css";
import { useTranslation } from "react-i18next";
import { FaBars } from "react-icons/fa"; // Import hamburger icon

const Navbar = () => {
  const [show, setShow] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false); // Dropdown menu visibility state
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false); // New state for side menu
  const { isAuthenticated, setIsAuthenticated, user } = useContext(Context);
  const location = useLocation();
  const navigateTo = useNavigate();
  const { t, i18n } = useTranslation();

  const handleLogout = async () => {
    console.log("Starting logout process");
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log("Local storage cleared");

      await axios.post("http://localhost:4000/api/v1/user/logout", {}, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log("Server logout successful");

      if (window.google?.accounts && user?.googleId) {
        window.google.accounts.id.disableAutoSelect();
        localStorage.removeItem("google_auth_token");
        console.log("Google logout completed");
      }

      setIsAuthenticated(false);
      toast.success("Logged out successfully");
      navigateTo("/");
    } catch (error) {
      console.error("Logout error details:", error.response || error);
      setIsAuthenticated(false);
      toast.success("Logged out locally");
      navigateTo("/");
    }
  };

  useEffect(() => {
    if (window.google && window.google.accounts && isAuthenticated && user?.googleId) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com',
        callback: () => {},
      });
      console.log("Navbar - User:", user);
      console.log("Navbar - isAuthenticated:", isAuthenticated);
    }
  }, [isAuthenticated, user]);

  const isHomePage = location.pathname === "/";

  const toggleProfileMenu = () => {
    setMenuVisible(!menuVisible);
    setIsSideMenuOpen(false); // Close side menu when opening profile dropdown
  };

  const toggleSideMenu = () => {
    setIsSideMenuOpen(!isSideMenuOpen);
    setMenuVisible(false); // Close profile dropdown when opening side menu
  };

  // Close side menu and profile dropdown on route change
  useEffect(() => {
    setIsSideMenuOpen(false);
    setMenuVisible(false);
  }, [location.pathname]);

  return (
    <nav className={`navbar ${isHomePage ? "transparent" : "blue"}`}>
      {/* Logo Section */}
      <div className="logo">
        <img src="/logo.png" alt="logo" className="logo-img" />
      </div>

      {/* Desktop Navigation Links */}
      <div className="navLinks">
        <div className="links">
          <Link to="/">{t("home")}</Link>
          <Link to="/appointment">{t("appointment")}</Link>
          <Link to="/departments">{t("departments")}</Link>
          <Link to="/contact">{t("contact")}</Link>
          <Link to="/about">{t("about")}</Link>
        </div>
      </div>

      {/* Auth Buttons */}
      <div className="authButtons">
        {isAuthenticated ? (
          <>
            {/* Profile Button with Menu Icon */}
            <div className="profile-btn" onClick={toggleProfileMenu}>
              <div className="menu-icon">&#9776;</div>
              <div className={`dropdown-menu ${menuVisible ? "show" : ""}`}>
                <Link to="/profile">{t("profile")}</Link>
                <Link to="/settings">{t("settings")}</Link>
                {user?.role === "Admin" && (
                  <Link to="/admin/dashboard">{t("adminDashboard")}</Link>
                )}
                <button className="logoutBtn btn" onClick={handleLogout}>LOGOUT</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <button className="loginBtn btn" onClick={() => navigateTo("/login")}>
              {t("login")}
            </button>
            <button className="signupBtn btn" onClick={() => navigateTo("/signup")}>
              {t("signup")}
            </button>
          </>
        )}
      </div>

      {/* Mobile Hamburger Icon */}
      <div className="mobile-menu-icon" onClick={toggleSideMenu}>
        <FaBars />
      </div>

      {/* Mobile Side Menu */}
      <div className={`side-menu ${isSideMenuOpen ? "open" : ""}`}>
        <div className="side-menu-links">
          <Link to="/" onClick={toggleSideMenu}>{t("home")}</Link>
          <Link to="/appointment" onClick={toggleSideMenu}>{t("appointment")}</Link>
          <Link to="/departments" onClick={toggleSideMenu}>{t("departments")}</Link>
          <Link to="/contact" onClick={toggleSideMenu}>{t("contact")}</Link>
          <Link to="/about" onClick={toggleSideMenu}>{t("about")}</Link>
          {isAuthenticated ? (
            <>
              <Link to="/profile" onClick={toggleSideMenu}>{t("profile")}</Link>
              <Link to="/settings" onClick={toggleSideMenu}>{t("settings")}</Link>
              {user?.role === "Admin" && (
                <Link to="/admin/dashboard" onClick={toggleSideMenu}>{t("adminDashboard")}</Link>
              )}
              <button className="logoutBtn btn" onClick={() => { handleLogout(); toggleSideMenu(); }}>LOGOUT</button>
            </>
          ) : (
            <div className="mobile-auth-buttons">
              <button className="loginBtn btn" onClick={() => { navigateTo("/login"); toggleSideMenu(); }}>{t("login")}</button>
              <button className="signupBtn btn" onClick={() => { navigateTo("/signup"); toggleSideMenu(); }}>{t("signup")}</button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay for side menu */}
      {isSideMenuOpen && <div className="side-menu-overlay" onClick={toggleSideMenu}></div>}
    </nav>
  );
};

export default Navbar;
