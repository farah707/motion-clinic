import 'font-awesome/css/font-awesome.min.css';
import React from "react";
import { useTranslation } from "react-i18next";
import Departments from "../../components/Departments/Departments";
import MessageForm from "../../components/MessageForm/MessageForm";
import "./Home.css";

const Home = () => {
  const { t } = useTranslation(); // Hook for translations

  return (
    <>
      <div className="home">
        <div className="overlay"></div> {/* Overlay for opacity */}
        <h1>{t("home_welcome")}</h1>
        <p>{t("home_excellence")}</p>
        <button className="call-now-btn">{t("home_call_now")}</button>
        <img src="/Hero.jpg" alt="Hero" className="hero-image" />
      </div>

      <div className="home-cards-container">
        <div className="home-card">
          <i className="fa fa-hospital-o card-logo"></i>
          <h3>{t("home_our_departments")}</h3>
          <p>{t("home_our_departments_desc")}</p>
        </div>
        <div className="home-card">
          <i className="fa fa-stethoscope card-logo"></i>
          <h3>{t("home_specialized_services")}</h3>
          <p>{t("home_specialized_services_desc")}</p>
        </div>
        <div className="home-card">
          <i className="fa fa-comments card-logo"></i>
          <h3>{t("home_online_consultation")}</h3>
          <p>{t("home_online_consultation_desc")}</p>
        </div>
        <div className="home-card">
          <i className="fa fa-plus-circle card-logo"></i>
          <h3>{t("home_new_services")}</h3>
          <p>{t("home_new_services_desc")}</p>
        </div>
      </div>

      <div className="departments-container" id="departments-section">
        <Departments />
      </div>

      <MessageForm />
    </>
  );
};

export default Home;
