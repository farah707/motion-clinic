import React from "react";
import { useTranslation } from "react-i18next";
import MessageForm from "../../components/MessageForm/MessageForm";
import "./ContactUs.css";


const ContactUs = () => {
  const { t } = useTranslation(); // Hook for translations

  return (
    <div className="contact-us">
    
      <MessageForm />
    </div>
  );
};

export default ContactUs;
