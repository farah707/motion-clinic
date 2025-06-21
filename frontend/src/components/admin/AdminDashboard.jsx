import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAppointments();
    // Set up polling for new notifications every 30 seconds
    const interval = setInterval(fetchAppointments, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('/api/v1/appointment/getall', {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });

      // Filter appointments that need attention (pending or recently updated)
      const pendingAppointments = response.data.appointments.filter(
        app => app.status === 'pending' || app.status === 'updated'
      );

      // Sort by date and time
      pendingAppointments.sort((a, b) => {
        const dateA = new Date(a.appointment_date);
        const dateB = new Date(b.appointment_date);
        return dateA - dateB;
      });

      setAppointments(pendingAppointments);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('Failed to fetch appointments');
      setLoading(false);
    }
  };

  const handleAppointmentAction = async (appointmentId, action) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.put(
        `/api/v1/appointment/update/${appointmentId}`,
        { status: action },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );

      if (response.data.success) {
        // Update the appointments list
        setAppointments(prevAppointments =>
          prevAppointments.map(app =>
            app._id === appointmentId
              ? { ...app, status: action }
              : app
          )
        );
      }
    } catch (err) {
      console.error('Error updating appointment:', err);
      setError('Failed to update appointment');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      
      <div className="appointments-section">
        <h2>Pending Appointments</h2>
        {appointments.length === 0 ? (
          <p>No pending appointments</p>
        ) : (
          <div className="appointments-list">
            {appointments.map(appointment => (
              <div key={appointment._id} className="appointment-card">
                <div className="appointment-header">
                  <h3>Appointment #{appointment._id.slice(-4)}</h3>
                  <span className={`status ${appointment.status}`}>
                    {appointment.status}
                  </span>
                </div>
                <div className="appointment-details">
                  <p><strong>Patient:</strong> {appointment.fullName}</p>
                  <p><strong>Email:</strong> {appointment.email}</p>
                  <p><strong>Phone:</strong> {appointment.phone}</p>
                  <p><strong>Date:</strong> {new Date(appointment.appointment_date).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> {appointment.appointment_time}</p>
                  <p><strong>Department:</strong> {appointment.department}</p>
                  {appointment.status === 'updated' && (
                    <div className="update-notice">
                      <p>⚠️ This appointment was recently updated by the patient</p>
                    </div>
                  )}
                </div>
                <div className="appointment-actions">
                  <button
                    onClick={() => handleAppointmentAction(appointment._id, 'approved')}
                    className="btn-approve"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAppointmentAction(appointment._id, 'cancelled')}
                    className="btn-cancel"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard; 