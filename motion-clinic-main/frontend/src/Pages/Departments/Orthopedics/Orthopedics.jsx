import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next"; // Import translation
import "./Orthopedics.css"; // Import the updated CSS

const Orthopedics = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(); // Initialize translation function

  const handleAppointment = () => {
    navigate("/appointment");
  };

  return (
    <div className="orthopedics-page">
      {/* Main Layout with Sidebar */}
      <div className="orthopedics-layout">
        {/* Sidebar Section */}
        <div className="sidebar">
          <ul>
            <li onClick={() => navigate("/orthopedics")}>{t("orthopedics")}</li>
            <li onClick={() => navigate("/physiotherapy")}>{t("physiotherapy")}</li>
            <li onClick={() => navigate("/sports-injuries")}>{t("sports_injuries")}</li>
            <li onClick={() => navigate("/pediatric-orthopedics")}>
              {t("pediatric_orthopedics")}
            </li>
            <li onClick={() => navigate("/spine-care")}>{t("spine_care")}</li>
            <li onClick={() => navigate("/joint-replacement")}>{t("joint_replacement")}</li>
          </ul>
        </div>

        {/* Content Section */}
        <div className="content">
          {/* Header Section */}
          <div className="orthopedics-header">
            <div className="orthopedics-header-content">
              <h1>{t("orthopedics")}</h1>
              <button className="appointment-btn" onClick={handleAppointment}>
                {t("book_appointment")}
              </button>
            </div>
            <img
              src="/Orthopedics.png"
              alt={t("orthopedics")}
              className="orthopedics-image"
            />
          </div>

          {/* Details Section */}
          <div className="orthopedics-details">
            <h3>{t("orthopedics")}</h3>
            <p>{t("welcome_motion_clinic")}</p>
            <p>{t("motion_clinic_intro")}</p>

            <h3>{t("comprehensive_orthopedic_services")}</h3>
            <ul>
              <li>
                <strong>{t("diagnostic_therapeutic_consultations")}:</strong>{" "}
                {t("diagnostic_therapeutic_consultations_desc")}
              </li>
              <li>
                <strong>{t("sports_injuries_management")}:</strong>{" "}
                {t("sports_injuries_management_desc")}
              </li>
              {/* Add remaining list items with translations */}
            </ul>

            <h3>{t("why_choose_motion_clinic")}</h3>
            <p>{t("motion_clinic_priority")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orthopedics;
