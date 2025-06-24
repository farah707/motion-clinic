import React from "react";
import AppointmentForm from "../../components/AppointmentForm/AppointmentForm";
import "./Appointment.css"; // Import CSS for styling
import { useTranslation } from "react-i18next";
const Appointment = () => {
  
  return (
    <div className="appointment-page">
      <AppointmentForm />
    </div>
  );
};

export default Appointment;
