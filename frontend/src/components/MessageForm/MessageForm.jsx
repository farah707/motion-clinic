import axios from "axios";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import "./MessageForm.css";

const MessageForm = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
    fullName: ""
  });

  const fetchUserData = async () => {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/user/profile`, { withCredentials: true });
      if (data.user) {
        setFormData({
          firstName: data.user.firstName || "",
          lastName: data.user.lastName || "",
          email: data.user.email || "",
          phone: data.user.phone || "",
          message: "",
          fullName: data.user.fullName || ""
        });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`;
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/message/send`, {
        fullName,
        email: formData.email,
        phone: formData.phone,
        message: formData.message
      }, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" }
      });

      toast.success(res.data.message);
      setFormData(prev => ({
        ...prev,
        message: ""
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || t("Error occurred"));
    }
  };

  return (
    <div className="contact-page">
      <div className="contact-header">
        <h2>{t("getInTouch")}</h2>
        <p>{t("contactUsDescription")}</p>
      </div>
      
      <div className="contact-container">
        <form className="message-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>{t("firstName")}</label>
              <input
                type="text"
                name="firstName"
                placeholder={t("firstName")}
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>{t("lastName")}</label>
              <input
                type="text"
                name="lastName"
                placeholder={t("lastName")}
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>{t("email")}</label>
              <input
                type="email"
                name="email"
                placeholder={t("yourEmail")}
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>{t("phoneNumber")}</label>
              <input
                type="tel"
                name="phone"
                placeholder={t("phoneNumber")}
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>{t("message")}</label>
            <textarea
              name="message"
              placeholder={t("typeYourMessage")}
              rows="5"
              value={formData.message}
              onChange={handleChange}
              required
            ></textarea>
          </div>
          
          <button type="submit" className="submit-btn">
            {t("Submit Message")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MessageForm;
