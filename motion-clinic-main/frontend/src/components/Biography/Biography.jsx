import React from "react";
import "./Biography.css";
import { useTranslation } from "react-i18next";

const Biography = ({ imageUrl }) => {
  const { t } = useTranslation();

  return (
    <div className="biography-container">
      <div className="biography">
        <div className="banner image-banner">
          <img src={imageUrl} alt={t("Who we are")} />
        </div>
        <div className="banner text-banner">
          <h3>{t("Who We Are")}</h3>
          <p>
            {t("We are a center specialized in orthopedics, surgery, physical therapy, rehabilitation before and after operations, therapeutic nutrition, and body alignment.")}
          </p>
          <p>
            {t("Our orthopedics department focuses on diagnosing, treating, and preventing conditions affecting the musculoskeletal system, including bones, joints, ligaments, muscles, and tendons.")}
          </p>
          {/* Add more content as needed */}
        </div>
      </div>
    </div>
  );
};

export default Biography;
