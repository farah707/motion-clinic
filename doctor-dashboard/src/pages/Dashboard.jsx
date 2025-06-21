import React, { useContext, useState, useEffect } from "react";
import { Context } from "../main";

const Dashboard = () => {
  const { doctor } = useContext(Context);
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0
  });

  // Mock data - replace with actual API calls
  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setStats({
        totalPatients: 156,
        todayAppointments: 8,
        pendingAppointments: 12,
        completedAppointments: 89
      });
    }, 1000);
  }, []);

  const recentActivities = [
    {
      id: 1,
      type: "appointment",
      message: "New appointment scheduled with Sarah Johnson",
      time: "2 hours ago",
      status: "pending"
    },
    {
      id: 2,
      type: "patient",
      message: "Patient Michael Brown updated their profile",
      time: "4 hours ago",
      status: "completed"
    },
    {
      id: 3,
      type: "appointment",
      message: "Appointment with Emma Wilson completed",
      time: "6 hours ago",
      status: "completed"
    },
    {
      id: 4,
      type: "patient",
      message: "New patient registration: David Lee",
      time: "1 day ago",
      status: "pending"
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'danger';
      default: return 'info';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'appointment': return '📅';
      case 'patient': return '👤';
      default: return '📋';
    }
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="header-title">Welcome back, Dr. {doctor.fullName}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Here's what's happening with your patients today
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary">
            📅 View Today's Schedule
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Total Patients</h3>
            <div className="card-icon primary">👥</div>
          </div>
          <div className="card-value">{stats.totalPatients}</div>
          <p className="card-description">Registered patients under your care</p>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Today's Appointments</h3>
            <div className="card-icon success">📅</div>
          </div>
          <div className="card-value">{stats.todayAppointments}</div>
          <p className="card-description">Scheduled appointments for today</p>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Pending Appointments</h3>
            <div className="card-icon warning">⏳</div>
          </div>
          <div className="card-value">{stats.pendingAppointments}</div>
          <p className="card-description">Awaiting confirmation</p>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Completed</h3>
            <div className="card-icon success">✅</div>
          </div>
          <div className="card-value">{stats.completedAppointments}</div>
          <p className="card-description">Appointments completed this month</p>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">Recent Activities</h2>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {recentActivities.map((activity) => (
            <div
              key={activity.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                borderBottom: '1px solid var(--border-color)',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--background-color)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <div style={{ fontSize: '1.5rem' }}>
                {getActivityIcon(activity.type)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                  {activity.message}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {activity.time}
                </div>
              </div>
              <span className={`status-badge ${getStatusColor(activity.status)}`}>
                {activity.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
