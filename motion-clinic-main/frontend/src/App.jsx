import axios from "axios";
import { useContext, useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import Footer from "./components/Footer/Footer";
import Navbar from "./components/Navbar/Navbar";
import PatientProfile from "./components/patientproflie/patientprofile";
import i18n from "./i18n";
import { Context } from "./main";
import AboutUs from "./Pages/AboutUs/AboutUs";
import Appointment from "./Pages/Appointment/Appointment";
import ContactUs from "./Pages/ContactUs/ContactUs";
import Departments from "./Pages/Departments/Departments";
import Orthopedics from "./Pages/Departments/Orthopedics/Orthopedics";
import PhysicalTherapy from "./Pages/Departments/PhysicalTherapy/PhysicalTherapy";
import Home from "./Pages/Home/Home";
import Login from "./Pages/Login/Login";
import Register from "./Pages/Register/Register";
import Settings from "./Pages/settings/Settings";
import DeleteAccount from "./Pages/Delete_account/Delete_account";
import ForgotPassword from "./Pages/ForgotPassword/ForgotPassword";
import ResetPassword from "./Pages/ResetPassword/ResetPassword";
import AdminDashboard from "./Pages/Admin/AdminDashboard";
import AIChat from "./Pages/AIChat/AIChat";
import ChatHistory from "./Pages/ChatHistory/ChatHistory";

// Use environment variable for API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

// Helper component to handle token from URL
const TokenHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setIsAuthenticated, setUser } = useContext(Context);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const userId = params.get("userId");

    if (token) {
      localStorage.setItem("authToken", token); // Store the token
      setIsAuthenticated(true);

      if (userId) {
        const fetchUserDetails = async () => {
          try {
            const response = await axios.get(`${API_BASE_URL}/api/v1/user/profile`, {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true,
            });

            if (response.data.success) {
              setUser(response.data.user);
              localStorage.setItem("userData", JSON.stringify(response.data.user));
              toast.success("Successfully logged in!");
            }
          } catch (error) {
            console.error("Error fetching user details:", error);
          }
        };

        fetchUserDetails();
      }

      navigate("/", { replace: true }); // Remove token from URL
    }
  }, [location, navigate, setIsAuthenticated, setUser]);

  return null;
};

// Protected route component for admin
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useContext(Context);
  
  if (!isAuthenticated || user.role !== "Admin") {
    return <Navigate to="/login" />;
  }
  
  return children;
};

const App = () => {
  const { isAuthenticated, setIsAuthenticated, setUser } = useContext(Context);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("authToken");

      if (!token) {
        setIsAuthenticated(false);
        setUser({});
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/api/v1/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });

        if (response.data.success) {
          setIsAuthenticated(true);
          setUser(response.data.user);
        } else {
          // Token exists but is invalid
          localStorage.removeItem("authToken");
          setIsAuthenticated(false);
          setUser({});
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        localStorage.removeItem("authToken");
        setIsAuthenticated(false);
        setUser({});
      }
    };

    fetchUser();
  }, [setIsAuthenticated, setUser]);

  return (
    <I18nextProvider i18n={i18n}>
      {/* Wrap the app in a flex column layout */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Router basename="/">
          <TokenHandler />
          <Navbar />
          {/* Main content area fills available space */}
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/appointment" element={isAuthenticated ? <Appointment /> : <Navigate to="/login" />} />
              <Route path="/departments" element={<Departments />} />
              <Route path="/orthopedics" element={<Orthopedics />} />
              <Route path="/physical-therapy" element={<PhysicalTherapy />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/ai-chat" element={isAuthenticated ? <AIChat /> : <Navigate to="/login" />} />
              <Route path="/chat-history" element={isAuthenticated ? <ChatHistory /> : <Navigate to="/login" />} />
              <Route path="/signup" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/password/reset/:token" element={<ResetPassword />} />
              <Route path="/settings" element={<Settings />} />
              {/* Protected routes */}
              <Route path="/profile" element={isAuthenticated ? <PatientProfile /> : <Navigate to="/login" />} />
              <Route path="/delete-account" element={isAuthenticated ? <DeleteAccount /> : <Navigate to="/login" />} />
              {/* Admin routes */}
              <Route 
                path="/admin/dashboard" 
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } 
              />
            </Routes>
          </div>
          <Footer />
          <ToastContainer position="top-center" />
        </Router>
      </div>
    </I18nextProvider>
  );
};

export default App;
