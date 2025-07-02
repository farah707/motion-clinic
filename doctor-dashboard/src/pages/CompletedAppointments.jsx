import React, { useState, useEffect } from "react";
import axios from "axios";

const CompletedAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCompletedAppointments();
  }, []);

  const fetchCompletedAppointments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/appointment/doctor/completed`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setAppointments(response.data.appointments);
    } catch (error) {
      console.error('❌ Error fetching completed appointments:', error);
      setError('Failed to fetch completed appointments');
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = appointment.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.patientEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = dateFilter === "all" || 
                       (dateFilter === "today" && appointment.appointment_date === new Date().toISOString().split('T')[0]) ||
                       (dateFilter === "this-week" && isThisWeek(appointment.appointment_date)) ||
                       (dateFilter === "this-month" && isThisMonth(appointment.appointment_date));

    return matchesSearch && matchesDate;
  });

  const isThisWeek = (dateString) => {
    const appointmentDate = new Date(dateString);
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    return appointmentDate >= startOfWeek && appointmentDate <= endOfWeek;
  };

  const isThisMonth = (dateString) => {
    const appointmentDate = new Date(dateString);
    const today = new Date();
    return appointmentDate.getMonth() === today.getMonth() && 
           appointmentDate.getFullYear() === today.getFullYear();
  };

  const getCompletedStats = () => {
    const total = appointments.length;
    const thisWeek = appointments.filter(apt => isThisWeek(apt.appointment_date)).length;
    const thisMonth = appointments.filter(apt => isThisMonth(apt.appointment_date)).length;
    const totalPatients = new Set(appointments.map(apt => apt.patientId)).size;

    return { total, thisWeek, thisMonth, totalPatients };
  };

  const stats = getCompletedStats();

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        Loading completed appointments...
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="header-title">Completed Appointments</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            View all your completed appointments and patient history
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={fetchCompletedAppointments}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.thisWeek}</div>
          <div className="stat-label">This Week</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.thisMonth}</div>
          <div className="stat-label">This Month</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalPatients}</div>
          <div className="stat-label">Unique Patients</div>
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
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="form-input"
            style={{ minWidth: '150px' }}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
          </select>
        </div>
      </div>

      {/* Completed Appointments Table */}
      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">Completed Appointments History</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Showing {filteredAppointments.length} of {appointments.length} completed appointments
          </p>
        </div>
        
        {filteredAppointments.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Patient Info</th>
                <th>Department</th>
                <th>Medical Info</th>
                <th>Completion Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments
                .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date))
                .map((appointment) => (
                <tr key={appointment._id}>
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
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                        {appointment.patientName}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        {appointment.patientEmail}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {appointment.patientPhone}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      backgroundColor: 'var(--success-color)', 
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
                        <strong>Complaint:</strong> {appointment.complaint}
                      </div>
                      <div style={{ fontSize: '0.875rem' }}>
                        <strong>History:</strong> {appointment.medicalHistory}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>✅</span>
                      <span className="status-badge success">
                        Completed
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-primary" style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                        👁️ View Details
                      </button>
                      <button className="btn btn-outline" style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                        📝 Add Notes
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h3>No completed appointments found</h3>
            <p>No completed appointments match your current filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompletedAppointments; 