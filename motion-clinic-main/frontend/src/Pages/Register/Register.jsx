import axios from "axios";
import React, { useContext, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { Context } from "../../main";
import GoogleAuthButton from "../../components/GoogleAuthButton/OAuthButton";
import "./Register.css";

const Register = () => {
  const { isAuthenticated, setIsAuthenticated } = useContext(Context);
  const { t } = useTranslation(); // Import translation hook

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");  
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const navigateTo = useNavigate();

  const handleRegistration = async (e) => {
    e.preventDefault();

    console.log("Input Data:", { fullName, email, phone, dob, gender, password, confirmPassword });

    if (password !== confirmPassword) {
      toast.error(t("Passwords do not match!"));
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:4000/api/v1/user/patient/register",
        { fullName, email, phone, dob, gender, password },
        { headers: { "Content-Type": "application/json" } }
      );

      console.log("Server Response:", response.data);
      toast.success(t("Registration successful!"));
      navigateTo("/login");
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || t("Something went wrong!"));
    }
  };

  if (isAuthenticated) {
    return <Navigate to={"/"} />;
  }

  return (
    <div className="container form-component register-form">
      <h2>{t("Sign Up")}</h2>
      <p>{t("Please Sign Up To Continue")}</p>
      <form onSubmit={handleRegistration}>
        <input
          type="text"
          placeholder={t("Full Name")}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <input
          type="email"
          placeholder={t("Email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="text"
          placeholder={t("Phone Number")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          type="date"
          placeholder={t("Date of Birth")}
          value={dob}
          onChange={(e) => setDob(e.target.value)}
        />
        <select value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="">{t("Select Gender")}</option>
          <option value="Male">{t("Male")}</option>
          <option value="Female">{t("Female")}</option>
        </select>
        <input
          type="password"
          placeholder={t("Password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder={t("Confirm Password")}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <button type="submit">{t("Register")}</button>
      </form>

      <GoogleAuthButton />

      <p>
        {t("Already Registered?")}{" "}
        <Link to={"/signin"}>{t("Login Now")}</Link>
      </p>
    </div>
  );
};

export default Register;
