import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("📡 Fetching patients...");

    const fetchPatients = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/appointment/doctor/patients`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        console.log("✅ Fetched patients:", response.data.patients);
        setPatients(response.data.patients);
      } catch (error) {
        console.error("❌ Error fetching patients:", error);
        setError('Failed to fetch patients');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const filteredPatients = patients.filter(patient =>
    patient.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'danger';
      default: return 'info';
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        Loading patients...
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="header-title">All Patients</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Manage and view all registered patients
          </p>
        </div>
        <div className="header-actions">
          <div className="form-group" style={{ margin: 0, minWidth: '300px' }}>
            <input
              type="text"
              placeholder="Search patients by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{patients.length}</div>
          <div className="stat-label">Total Patients</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {patients.filter(p => p.appointments?.some(a => a.status === 'pending')).length}
          </div>
          <div className="stat-label">With Pending Appointments</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {patients.filter(p => p.appointments?.length > 0).length}
          </div>
          <div className="stat-label">With Appointments</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {patients.filter(p => !p.appointments || p.appointments.length === 0).length}
          </div>
          <div className="stat-label">New Patients</div>
        </div>
      </div>

      {/* Patients Table */}
      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">Patient Records</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Showing {filteredPatients.length} of {patients.length} patients
          </p>
        </div>
        
        {filteredPatients.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Contact Info</th>
                <th>Medical Info</th>
                <th>Vital Signs</th>
                <th>Appointments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <tr key={patient._id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                        {patient.fullName}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {patient.gender} • {patient.dob?.substring(0, 10)}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <div style={{ marginBottom: '0.25rem' }}>{patient.email}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {patient.phone}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ maxWidth: '200px' }}>
                      <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        <strong>History:</strong> {patient.medicalHistory || "None"}
                      </div>
                      <div style={{ fontSize: '0.875rem' }}>
                        <strong>Complaint:</strong> {patient.complain || "None"}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.875rem' }}>
                      <div>BP: {patient.bloodPressure || "N/A"}</div>
                      <div>O₂: {patient.oxygenLevel || "N/A"}</div>
                      <div>HR: {patient.heartRate || "N/A"} bpm</div>
                      <div>Temp: {patient.temperature || "N/A"}°C</div>
                    </div>
                  </td>
                  <td>
                    <div>
                      {patient.appointments?.length > 0 ? (
                        <div>
                          {patient.appointments.slice(0, 2).map((appt, index) => (
                            <div key={index} style={{ marginBottom: '0.25rem' }}>
                              <span className={`status-badge ${getStatusColor(appt.status)}`}>
                                {appt.status}
                              </span>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {new Date(appt.appointment_date).toLocaleDateString()} at {appt.appointment_time}
                              </div>
                            </div>
                          ))}
                          {patient.appointments.length > 2 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              +{patient.appointments.length - 2} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          No appointments
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-outline" style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                        👁️ View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
            <h3>No patients found</h3>
            <p>Try adjusting your search terms or add a new patient.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Patients;
