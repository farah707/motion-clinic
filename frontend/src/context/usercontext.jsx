// src/context/UserContext.js
import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

// Create Context
export const UserContext = createContext();

// Create Context Provider Component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Holds user info
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Authentication state

  // Check if the user is authenticated (You could check a token or user data here)
  useEffect(() => {
    axios
      .get("http://localhost:4000/api/v1/user/patient/me", { withCredentials: true })
      .then((response) => {
        setUser(response.data.user);
        setIsAuthenticated(true);
      })
      .catch(() => {
        setUser(null);
        setIsAuthenticated(false);
      });
  }, []);

  // Context value to be provided to children components
  const contextValue = {
    user,
    isAuthenticated,
    setIsAuthenticated,
    setUser,
  };

  return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>;
};
