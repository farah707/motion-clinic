import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "./ForgotPassword.css"; // We will create this CSS file next
import { useTranslation } from "react-i18next";

const ForgotPassword = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const response = await axios.post(
        "http://localhost:4000/api/v1/user/password/forgot",
        { email },
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );
      toast.success(t(response.data.message));
      setMessage(t("A password reset link has been sent to your email address."));
    } catch (error) {
      toast.error(t(error.response?.data?.message || "Failed to send reset link."));
      setMessage(t(error.response?.data?.message || "Failed to send reset link. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <h2>{t("Forgot Password")}</h2>
      <p>{t("Enter your email address to receive a password reset link.")}</p>
      <form onSubmit={handleForgotPassword}>
        <input
          type="email"
          placeholder={t("Email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? t("Sending...") : t("Send Reset Link")}
        </button>
      </form>
      {message && <p className="forgot-password-message">{message}</p>}
    </div>
  );
};

export default ForgotPassword; 