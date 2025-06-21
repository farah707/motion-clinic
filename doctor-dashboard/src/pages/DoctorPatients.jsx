import React, { useEffect, useState } from "react";
import axios from "axios";

const DoctorPatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = () => {
    axios
      .get("http://localhost:4000/api/v1/user/my-patients", {
        withCredentials: true,
      })
      .then((res) => {
        setPatients(res.data.patients);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Error fetching doctor's patients:", err);
        setLoading(false);
      });
  };

  const handleEditClick = (patient) => {
    setEditingId(patient._id);
    setFormData({
      medicalHistory: patient.medicalHistory || "",
      bloodPressure: patient.bloodPressure || "",
      oxygenLevel: patient.oxygenLevel || "",
      heartRate: patient.heartRate || "",
      temperature: patient.temperature || "",
    });
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (id) => {
  console.log("💾 Saving for ID:", id); // Debug log

  try {
    await axios.put(`http://localhost:4000/api/v1/user/update-medical/${id}`, formData, {
      withCredentials: true,
    });

    console.log("✅ Save successful");
    setEditingId(null);
    setFormData({});
    fetchPatients();  // Re-fetch updated data
  } catch (err) {
    console.error("❌ Save error:", err);
  }
};



  const handleCancel = () => {
    setEditingId(null);
    setFormData({});
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>👨‍⚕️ My Patients with Appointments</h2>
      {loading ? (
        <p>Loading...</p>
      ) : patients.length > 0 ? (
        patients.map((patient) => (
          <div
            key={patient._id}
            style={{
              border: "1px solid #ccc",
              padding: "1rem",
              marginBottom: "2rem",
              borderRadius: "10px",
              backgroundColor: "#fdfdfd",
            }}
          >
            <h3>{patient.fullName}</h3>
            <p><strong>Email:</strong> {patient.email}</p>
            <p><strong>Phone:</strong> {patient.phone}</p>
            <p><strong>Gender:</strong> {patient.gender}</p>

            {editingId === patient._id ? (
              <>
                <h4>📝 Edit Medical Info</h4>
                <label>
                  Medical History:
                  <textarea
                    name="medicalHistory"
                    value={formData.medicalHistory}
                    onChange={handleChange}
                    rows={3}
                    style={{ width: "100%" }}
                  />
                </label>
<br />

                <br />
                <label>
                  Blood Pressure:
                  <input
                    type="text"
                    name="bloodPressure"
                    value={formData.bloodPressure}
                    onChange={handleChange}
                    style={{ width: "100%" }}
                  />
                </label>
                <br />
                <label>
                  Oxygen Level:
                  <input
                    type="text"
                    name="oxygenLevel"
                    value={formData.oxygenLevel}
                    onChange={handleChange}
                    style={{ width: "100%" }}
                  />
                </label>
                <br />
                <label>
                  Heart Rate:
                  <input
                    type="text"
                    name="heartRate"
                    value={formData.heartRate}
                    onChange={handleChange}
                    style={{ width: "100%" }}
                  />
                </label>
                <br />
                <label>
                  Temperature:
                  <input
                    type="text"
                    name="temperature"
                    value={formData.temperature}
                    onChange={handleChange}
                    style={{ width: "100%" }}
                  />
                </label>
                <br />
                <button onClick={() => handleSave(patient._id)}>💾 Save</button>
                <button onClick={handleCancel} style={{ marginLeft: "1rem", color: "red" }}>
                  ❌ Cancel
                </button>
              </>
            ) : (
              <>
                <p><strong>Medical History:</strong> {patient.medicalHistory || "None"}</p>
                <p><strong>Complaint:</strong> {patient.complain || "None"}</p>

                <hr />
                <h4>🩺 Vital Signs</h4>
                <p><strong>Blood Pressure:</strong> {patient.bloodPressure || "N/A"}</p>
                <p><strong>Oxygen Level:</strong> {patient.oxygenLevel || "N/A"}%</p>
                <p><strong>Heart Rate:</strong> {patient.heartRate || "N/A"} bpm</p>
                <p><strong>Temperature:</strong> {patient.temperature || "N/A"} °C</p>
                <button onClick={() => handleEditClick(patient)}>✏️ Edit</button>
              </>
            )}

            <hr />
            <h4>📅 Appointments</h4>
            {patient.appointments?.map((appt, idx) => (
              <div key={idx}>
                📅 <strong>{new Date(appt.appointment_date).toLocaleDateString()}</strong> at 🕒 {appt.appointment_time}
              </div>
            ))}
          </div>
        ))
      ) : (
        <p>No patients found.</p>
      )}
    </div>
  );
};

export default DoctorPatients;
