import { useTranslation } from "react-i18next";
import "./AboutUs.css";

const AboutUs = () => {
  const { t } = useTranslation(); // Hook for translations

  return (
    <>
      {/* Header Section */}
      <header className="about-us-header">
        <div className="overlay"></div> {/* Overlay for opacity effect */}
        <img src="/aboutus.jpg" alt={`${t("about")} ${t("motion")} ${t("clinics")}`} className="header-image" />

        <div className="header-text"></div>
      </header>

      {/* About Section */}
      <section className="about-section">
        <div className="about-image">
          <img src="/clinic.jpg" alt={`${t("about")} ${t("motion")} ${t("clinics")}`} />
        </div>
        <div className="about-content">
          <h2>{t("about")} {t("motion")} {t("clinics")}</h2>
          <p>
            {t("motion")} {t("clinics")} {t("started")} {t("as")} {t("a")} {t("pioneer")} {t("in")} {t("the")} {t("region's")} {t("healthcare")} {t("services")}, 
            {t("focusing")} {t("on")} {t("holistic")} {t("and")} {t("personalized")} {t("care")}. 
            {t("we")} {t("offer")} {t("exceptional")} {t("services")} {t("in")} {t("orthopedics")}, {t("physical")} {t("therapy")}, {t("and")} {t("more")}, 
            {t("with")} {t("state-of-the-art")} {t("facilities")}.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="mission-section">
        <div className="mission-content">
          <h2>{t("mission")}</h2>
          <p>
            {t("our")} {t("mission")} {t("is")} {t("to")} {t("provide")} {t("the")} {t("highest")} {t("quality")} {t("healthcare")} {t("services")}, 
            {t("while")} {t("focusing")} {t("on")} {t("personalized")} {t("and")} {t("compassionate")} {t("care")} {t("for")} {t("every")} {t("patient")}.
          </p>
        </div>
        <div className="mission-image">
          <img src="/mission.png" alt={`${t("our")} ${t("mission")}`} />
        </div>
      </section>

      {/* Founder's Vision Section */}
      <section className="vision-section">
        <div className="vision-image">
          <img src="/vision.png" alt={t("vision")} />
        </div>
        <div className="vision-content">
          <h2>{t("the")} {t("founder")} {t("vision")}</h2>
          <p>
            {t("the")} {t("founder")} {t("envisioned")} {t("a")} {t("place")} {t("where")} {t("cutting-edge")} {t("healthcare")} {t("services")} 
            {t("and")} {t("patient-centered")} {t("care")} {t("meet")}. {t("since")} {t("2020")}, {t("motion")} {t("clinics")} {t("has")} {t("set")} 
            {t("the")} {t("standard")} {t("for")} {t("excellence")} {t("in")} {t("healthcare")}.
          </p>
        </div>
      </section>
    </>
  );
};

export default AboutUs;