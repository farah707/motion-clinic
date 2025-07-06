import React, { useState, createContext, useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import axios from "axios";

// Create the global context
export const Context = createContext();

const AppWrapper = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          // Verify token with backend
          const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/user/doctor/me`, {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (response.data.user && response.data.user.role === "Doctor") {
            setDoctor(response.data.user);
            setIsAuthenticated(true);
          } else {
            // Clear invalid token
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
          }
        }
      } catch (error) {
        console.error("❌ Auth check failed:", error);
        // Clear invalid tokens
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <Context.Provider
      value={{ 
        isAuthenticated, 
        setIsAuthenticated, 
        doctor, 
        setDoctor,
        loading 
      }}
    >
      <App />
    </Context.Provider>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
);
