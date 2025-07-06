import React, { useState, useEffect } from "react";
import axios from "axios";

const TodayAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTodayAppointments();
  }, []);

  const fetchTodayAppointments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/appointment/doctor/today`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log("📅 Today's appointments received:", response.data.appointments);
      setAppointments(response.data.appointments);
    } catch (error) {
      console.error('❌ Error fetching today\'s appointments:', error);
      setError('Failed to fetch today\'s appointments');
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    // Debug: Log the first appointment to see its structure
    if (appointments.length > 0 && appointments.indexOf(appointment) === 0) {
      console.log("🔍 First appointment structure:", appointment);
    }
    
    const searchLower = searchTerm.toLowerCase();
    
    // Search in populated userId fields
    const nameMatch = (appointment.userId?.fullName || '').toLowerCase().includes(searchLower);
    const emailMatch = (appointment.userId?.email || '').toLowerCase().includes(searchLower);
    const phoneMatch = (appointment.userId?.phone || '').toLowerCase().includes(searchLower);
    
    return nameMatch || emailMatch || phoneMatch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'completed': return 'info';
      case 'cancelled': return 'danger';
      default: return 'info';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return '✅';
      case 'pending': return '⏳';
      case 'completed': return '✅';
      case 'cancelled': return '❌';
      default: return '📋';
    }
  };

  const handleStatusUpdate = async (appointmentId, newStatus) => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/v1/appointment/doctor/update-status/${appointmentId}`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setAppointments(prev => 
        prev.map(apt => 
          apt._id === appointmentId ? { ...apt, status: newStatus } : apt
        )
      );
      
      console.log(`✅ Updated appointment ${appointmentId} to ${newStatus}`);
      alert(`Appointment status updated to ${newStatus}`);
    } catch (error) {
      console.error("❌ Error updating appointment status:", error);
      alert("Error updating appointment status. Please try again.");
    }
  };

  const getTodayStats = () => {
    const total = appointments.length;
    const approved = appointments.filter(apt => apt.status === 'approved').length;
    const pending = appointments.filter(apt => apt.status === 'pending').length;
    const completed = appointments.filter(apt => apt.status === 'completed').length;
    const cancelled = appointments.filter(apt => apt.status === 'cancelled').length;

    return { total, approved, pending, completed, cancelled };
  };

  const stats = getTodayStats();

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        Loading today's appointments...
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="header-title">Today's Appointments</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Manage your appointments for {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={fetchTodayAppointments}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Today's Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.approved}</div>
          <div className="stat-label">Approved</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.cancelled}</div>
          <div className="stat-label">Cancelled</div>
        </div>
      </div>

      {/* Search */}
      <div className="dashboard-card" style={{ marginBottom: '1.5rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <input
            type="text"
            placeholder="Search patients by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
          />
        </div>
      </div>

      {/* Today's Appointments Table */}
      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">Today's Schedule</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Showing {filteredAppointments.length} of {appointments.length} appointments
          </p>
        </div>
        
        {filteredAppointments.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient Info</th>
                <th>Department</th>
                <th>Medical Info</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments
                .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
                .map((appointment, index) => (
                <tr key={`${appointment._id}-${index}`}>
                  <td>
                    <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                      {appointment.appointment_time}
                    </div>
                  </td>
                  <td>
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                        {appointment.userId?.fullName || 'Unknown Patient'}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        {appointment.userId?.email || 'No email'}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {appointment.userId?.phone || 'No phone'}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      backgroundColor: 'var(--primary-color)', 
                      color: 'white', 
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      {appointment.department}
                    </span>
                  </td>
                  <td>
                    <div style={{ maxWidth: '200px' }}>
                      <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        <strong>Complaint:</strong> {appointment.userId?.complain || 'No complaint recorded'}
                      </div>
                      <div style={{ fontSize: '0.875rem' }}>
                        <strong>History:</strong> {appointment.userId?.medicalHistory || 'No medical history recorded'}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{getStatusIcon(appointment.status)}</span>
                      <span className={`status-badge ${getStatusColor(appointment.status)}`}>
                        {appointment.status}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.5rem', fontSize: '0.75rem' }}
                        onClick={() => handleStatusUpdate(appointment._id, 'approved')}
                        disabled={appointment.status === 'approved'}
                      >
                        ✅ Approve
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.5rem', fontSize: '0.75rem' }}
                        onClick={() => handleStatusUpdate(appointment._id, 'completed')}
                        disabled={appointment.status === 'completed'}
                      >
                        ✅ Complete
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.5rem', fontSize: '0.75rem' }}
                        onClick={() => handleStatusUpdate(appointment._id, 'cancelled')}
                        disabled={appointment.status === 'cancelled'}
                      >
                        ❌ Cancel
                      </button>
                      <button className="btn btn-primary" style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                        👁️ View Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
            <h3>No appointments today</h3>
            <p>You have no scheduled appointments for today.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodayAppointments; 