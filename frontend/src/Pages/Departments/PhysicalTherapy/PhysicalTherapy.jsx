import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./PhysicalTherapy.css";

const PhysicalTherapy = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(); // Import translation function

  const handleAppointment = () => {
    navigate("/appointment");
  };

  return (
    <div className="physical-therapy-page">
      {/* Sidebar Navigation */}
      <div className="side-navigation">
        <ul>
          <li>{t("physiotherapy")}</li>
          <li>{t("cardiopulmonary_physiotherapy")}</li>
          <li>{t("geriatric_physiotherapy")}</li>
          <li>{t("neurological_physiotherapy")}</li>
          <li>{t("orthopedic_physiotherapy")}</li>
          <li>{t("pediatric_physiotherapy")}</li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="content">
        {/* Header Section */}
        <div className="physical-therapy-header">
          <div className="physical-therapy-header-content">
            <h1>{t("physical_therapy")}</h1>
            <p>{t("regain_strength")}</p>
            <button className="appointment-btn" onClick={handleAppointment}>
              {t("book_appointment")}
            </button>
          </div>
          <img
            src="/pt.png"
            alt={t("physical_therapy")}
            className="physical-therapy-image"
          />
        </div>

        {/* Details Section */}
        <div className="physical-therapy-details">
          <p>{t("physiotherapy_intro")}</p>

          <h3>{t("what_is_physiotherapy")}</h3>
          <p>{t("physiotherapy_definition")}</p>

          <h3>{t("our_services")}</h3>
          <ul>
            <li>
              <strong>{t("therapeutic_massages")}:</strong> {t("therapeutic_massages_desc")}
            </li>
            <li>
              <strong>{t("heat_therapy")}:</strong> {t("heat_therapy_desc")}
            </li>
            <li>
              <strong>{t("electrotherapy")}:</strong> {t("electrotherapy_desc")}
            </li>
            <li>
              <strong>{t("rehab_exercises")}:</strong> {t("rehab_exercises_desc")}
            </li>
            <li>
              <strong>{t("patient_education")}:</strong> {t("patient_education_desc")}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PhysicalTherapy;
