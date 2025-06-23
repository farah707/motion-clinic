import React from "react";
import { useTranslation } from "react-i18next";
import "./GoogleButton.css";

const GoogleAuthButton = () => {
  const { t } = useTranslation();
  const redirectUrl = encodeURIComponent(window.location.origin + "/");

  return (
    <div className="google-auth-container">
      <a href={`http://localhost:4000/api/v1/user/auth/google?redirect_url=${redirectUrl}`} className="google-btn">
        <div className="google-icon-wrapper">
          <img className="google-icon" src="/google.png" alt="Google logo" />
        </div>
        <p className="btn-text"><b>{t("Sign up/in with Google")}</b></p>
      </a>
    </div>
  );
};

export default GoogleAuthButton;