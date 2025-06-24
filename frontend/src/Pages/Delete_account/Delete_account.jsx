// Delete_account.jsx
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Context } from "../../main";
import "./Delete_account.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const DeleteAccount = () => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setIsAuthenticated, setUser } = useContext(Context);

  const handleDeleteClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmYes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/user/me/delete`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Account deleted successfully");
        // Clear authentication state
        setIsAuthenticated(false);
        setUser({});
        // Clear any stored auth data
        localStorage.clear();
        sessionStorage.clear();
        // Navigate to home page
        navigate("/", { replace: true });
      } else {
        toast.error(data.message || "Failed to delete account");
      }
    } catch (err) {
      console.error("Delete account error:", err);
      toast.error("Error deleting account. Please try again.");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const handleConfirmNo = () => {
    setShowConfirm(false);
  };

  return (
    <div className="container form-component">
      <div className="delete-container">
        <h2>Delete My Account</h2>
        <p>Warning: This action cannot be undone. All your data will be permanently deleted.</p>
        <button 
          className="delete-btn" 
          onClick={handleDeleteClick}
          disabled={loading}
        >
          {loading ? "Processing..." : "Delete My Account"}
        </button>

        {showConfirm && (
          <>
            <div className="overlay"></div>
            <div className="confirmation-popup">
              <p>Are you sure you want to delete your account?</p>
              <div className="button-container">
                <button 
                  onClick={handleConfirmYes} 
                  className="confirm-yes"
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Yes, Delete"}
                </button>
                <button 
                  onClick={handleConfirmNo} 
                  className="confirm-no"
                  disabled={loading}
                >
                  No, Cancel
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteAccount;
