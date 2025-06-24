import React from "react";

const PatientCard = ({ patient }) => {
  return (
    <div className="patient-card">
      <h3>{patient.fullName}</h3>
      <p>Email: {patient.email}</p>
      <p>Phone: {patient.phone}</p>
      <p>DOB: {patient.dob}</p>
      <p>Gender: {patient.gender}</p>
      {patient.medicalHistory && <p>History: {patient.medicalHistory}</p>}
    </div>
  );
};

export default PatientCard;
