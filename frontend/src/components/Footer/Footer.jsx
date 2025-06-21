import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FaFacebook, FaPhone } from "react-icons/fa";
import "./Footer.css";

const Footer = () => {
  const { t } = useTranslation();
  
  return (
    <footer className="footer-container">
      <div className="footer-content">
        <div className="footer-logo">
          <img src="/logo.png" alt={t("Motion Clinic Logo")} />
          <p>{t("Motion Clinic, dedicated to providing excellent patient care, advanced diagnostics, and preventive health services.")}</p>
        </div>

        <div className="footer-links">
          <h4>{t("Important Links")}</h4>
          <ul>
            <li><Link to="/">{t("Home")}</Link></li>
            <li><Link to="/appointment">{t("Appointment")}</Link></li>
            <li><Link to="/departments">{t("Departments")}</Link></li>
            <li><Link to="/contact">{t("Contact Us")}</Link></li>
            <li><Link to="/about">{t("About Us")}</Link></li>
          </ul>
        </div>

        <div className="footer-contact">
          <h4>{t("Contact Us")}</h4>
          <p><FaPhone /> {t("+20 1004000777")}</p>
          <p>
            <Link to="/contact" className="contact-link">{t("Contact Us Page")}</Link>
          </p>
          <div className="social-icons">
            <a href="https://www.facebook.com/motionclinic4" target="_blank" rel="noopener noreferrer">
              <FaFacebook />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
