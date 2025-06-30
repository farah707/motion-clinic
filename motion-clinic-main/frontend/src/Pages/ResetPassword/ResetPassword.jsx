import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useParams, useNavigate } from "react-router-dom";
import "./ResetPassword.css"; // We will create this CSS file next
import { useTranslation } from "react-i18next";

const ResetPassword = () => {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (password !== confirmPassword) {
      toast.error(t("Passwords do not match."));
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.put(
        `http://localhost:4000/api/v1/user/password/reset/${token}`,
        { password, confirmPassword },
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );
      toast.success(t(response.data.message));
      navigate("/login"); // Redirect to login page after successful reset
    } catch (error) {
      toast.error(t(error.response?.data?.message || "Failed to reset password."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="reset-password-container">
      <h2>{t("Reset Password")}</h2>
      <p>{t("Enter your new password.")}</p>
      <form onSubmit={handleResetPassword}>
        <input
          type="password"
          placeholder={t("New Password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder={t("Confirm New Password")}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? t("Resetting...") : t("Reset Password")}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword; 