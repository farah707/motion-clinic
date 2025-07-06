import React, { useState, useEffect } from "react";
import axios from "axios";

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`http://localhost:4000/api/v1/appointment/doctor/all`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setAppointments(response.data.appointments);
    } catch (error) {
      console.error('❌ Error fetching appointments:', error);
      setError('Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    const searchLower = searchTerm.toLowerCase();
    
    // Search in populated userId fields
    const nameMatch = (appointment.userId?.fullName || '').toLowerCase().includes(searchLower);
    const emailMatch = (appointment.userId?.email || '').toLowerCase().includes(searchLower);
    const phoneMatch = (appointment.userId?.phone || '').toLowerCase().includes(searchLower);
    
    const matchesSearch = nameMatch || emailMatch || phoneMatch;
    
    const matchesStatus = statusFilter === "all" || appointment.status === statusFilter;
    
    const matchesDate = dateFilter === "all" || 
                       (dateFilter === "today" && appointment.appointment_date === new Date().toISOString().split('T')[0]) ||
                       (dateFilter === "tomorrow" && appointment.appointment_date === new Date(Date.now() + 86400000).toISOString().split('T')[0]) ||
                       (dateFilter === "this-week" && isThisWeek(appointment.appointment_date));

    return matchesSearch && matchesStatus && matchesDate;
  });

  const isThisWeek = (dateString) => {
    const appointmentDate = new Date(dateString);
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    return appointmentDate >= startOfWeek && appointmentDate <= endOfWeek;
  };

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
      const token = localStorage.getItem('authToken');
      const response = await axios.put(
        `http://localhost:4000/api/v1/appointment/doctor/update-status/${appointmentId}`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update local state with the response
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

  const getAppointmentStats = () => {
    const total = appointments.length;
    const approved = appointments.filter(apt => apt.status === 'approved').length;
    const pending = appointments.filter(apt => apt.status === 'pending').length;
    const completed = appointments.filter(apt => apt.status === 'completed').length;
    const cancelled = appointments.filter(apt => apt.status === 'cancelled').length;

    return { total, approved, pending, completed, cancelled };
  };

  const stats = getAppointmentStats();

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        Loading appointments...
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="header-title">My Appointments</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Manage and view all your scheduled appointments
          </p>
        </div>
        <div className="header-actions">
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total Appointments</div>
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

      {/* Filters */}
      <div className="dashboard-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0, minWidth: '300px' }}>
            <input
              type="text"
              placeholder="Search by patient name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </div>
          
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input"
            style={{ minWidth: '150px' }}
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="form-input"
            style={{ minWidth: '150px' }}
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="this-week">This Week</option>
          </select>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">Appointment Schedule</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Showing {filteredAppointments.length} of {appointments.length} appointments
          </p>
        </div>
        
        {filteredAppointments.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Patient Info</th>
                <th>Date & Time</th>
                <th>Department</th>
                <th>Medical Info</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((appointment) => (
                <tr key={appointment._id}>
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
                    <div>
                      <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                        {new Date(appointment.appointment_date).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {appointment.appointment_time}
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
            <h3>No appointments found</h3>
            <p>Try adjusting your filters or schedule a new appointment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Appointments;
