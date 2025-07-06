import React, { useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Context } from "../main";
import NotificationBell from "./NotificationBell.jsx";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setIsAuthenticated, setDoctor, doctor } = useContext(Context);

  const navItems = [
    {
      path: "/today-appointments",
      label: "Today's Appointments",
      icon: "📅"
    },
    {
      path: "/my-patients",
      label: "My Patients",
      icon: "👨‍⚕️"
    },
    {
      path: "/completed-appointments",
      label: "Completed Appointments",
      icon: "✅"
    },
    {
      path: "/all-appointments",
      label: "All Appointments",
      icon: "📋"
    },
    {
      path: "/review-dashboard",
      label: "AI Review",
      icon: "🤖"
    }
  ];

  const settingsItems = [
    {
      path: "/settings",
      label: "Settings",
      icon: "⚙️"
    }
  ];

  const handleLogout = () => {
    // Clear authentication state
    setIsAuthenticated(false);
    setDoctor(null);
    
    // Clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Redirect to login
    navigate('/login');
    
    console.log("✅ Doctor logged out successfully");
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div
      style={{
        width: "280px",
        height: "100vh",
        background: "var(--surface-color)",
        borderRight: "1px solid var(--border-color)",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: "700",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Motion Clinic
          </h1>
          <NotificationBell />
        </div>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
            margin: 0,
          }}
        >
          Doctor Dashboard
        </p>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Settings Section */}
      <div style={{ marginTop: '1rem' }}>
        <div className="sidebar-nav">
          {settingsItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
        <div className="user-info">
          <div className="user-avatar">
            👨‍⚕️
          </div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
              {doctor?.fullName || 'Loading...'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {doctor?.doctorDepartment || doctor?.role || 'Doctor'}
            </div>
          </div>
        </div>
        
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="nav-item"
          style={{ 
            width: '100%', 
            textAlign: 'left',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            marginTop: '1rem',
            color: 'var(--danger-color)',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '1rem'
          }}
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
