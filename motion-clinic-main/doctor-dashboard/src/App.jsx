import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import TodayAppointments from "./pages/TodayAppointments";
import Patients from "./pages/Patients";
import Appointments from "./pages/Appointments";
import Login from "./pages/Login";
import DoctorPatients from "./pages/DoctorPatients";
import Settings from "./pages/Settings";
import CompletedAppointments from "./pages/CompletedAppointments";
import DoctorReviewDashboard from "./components/DoctorReviewDashboard";

import { Context } from "./main";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AppContent = () => {
  const { isAuthenticated, loading, doctor } = useContext(Context);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        Loading...
      </div>
    );
  }

  // If not authenticated, show login page
  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
        <ToastContainer position="top-center" />
      </Router>
    );
  }

  // If authenticated, show dashboard
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/login" element={<Navigate to="/" />} />
            
            {/* ✅ Default path shows Today's Appointments */}
            <Route path="/" element={<TodayAppointments />} />

            <Route path="/today-appointments" element={<TodayAppointments />} />
            <Route path="/my-patients" element={<DoctorPatients />} />
            <Route path="/completed-appointments" element={<CompletedAppointments />} />
            <Route path="/all-appointments" element={<Appointments />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/review-dashboard" element={<DoctorReviewDashboard />} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
      <ToastContainer position="top-center" />
    </Router>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
