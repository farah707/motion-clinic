import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Departments.css";

const Departments = () => {
  const { t } = useTranslation(); // Hook for translations

  // Define the departments array with names and images
  const departments = [
    {
      name: t("orthopedics"),
      path: "/orthopedics",
      image: "/Orthopedics.png",
    },
    {
      name: t("physical_therapy"),
      path: "/physical-therapy",
      image: "/pt.png",
    },
    // Add more departments here
  ];

  const [hoveredDepartment, setHoveredDepartment] = useState(null);

  return (
    <div className="departments">
      <h1>{t("our_departments")}</h1>

      <div className="department-list">
        {departments.map((department, index) => (
          <div
            key={index}
            className="department-card"
            onMouseEnter={() => setHoveredDepartment(department.name)}
            onMouseLeave={() => setHoveredDepartment(null)}
          >
            {/* Show the image on hover */}
            <img
              src={department.image}
              alt={department.name}
              className={`department-image ${hoveredDepartment === department.name ? 'hovered' : ''}`}
            />
            <Link to={department.path} className="department-link">
              {department.name}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Departments;
