import React, { useContext, useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { Context } from "../../main";
import GoogleAuthButton from "../../components/GoogleAuthButton/OAuthButton";
import "./Login.css";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Login = () => {
  const { t } = useTranslation();

  const { isAuthenticated, setIsAuthenticated, setUser } = useContext(Context);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("Patient");
  const navigateTo = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setIsAuthenticated(true);
      console.log(t("User already authenticated, redirecting to home..."));
      navigateTo("/");
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:4000/api/v1/user/patient/login",
        { email, password, role },
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
      console.log(t("Login Response:"), response.data);

      setLoading(false);
      
      if (response.data.success) {
        localStorage.setItem("authToken", response.data.token);
        setIsAuthenticated(true);

        if (response.data.user) {
          setUser(response.data.user);
          localStorage.setItem("userData", JSON.stringify(response.data.user));
        }

        toast.success(t(response.data.message || "Login successful!"));
        console.log(t("Login successful, navigating to home..."));
        navigateTo("/");
      } else {
        toast.error(t(response.data.message || "Login failed!"));
      }
    } catch (error) {
      setLoading(false);
      toast.error(t(error.response?.data?.message || "Login failed!"));
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div className="container form-component login-form">
      <h2>{t("Login")}</h2>
      <p>{t("Please login to continue")}</p>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder={t("Email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder={t("Password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="Patient">{t("Patient")}</option>
          <option value="Admin">{t("Admin")}</option>
          <option value="Doctor">{t("Doctor")}</option>
        </select>
        <button type="submit" disabled={loading}>
          {loading ? t("Logging in...") : t("Login")}
        </button>
      </form>
      <GoogleAuthButton />
      <p>
        {t("Don't have an account?")} <Link to={"/signup"}>{t("Sign Up Now")}</Link>
      </p>
      <p>
        <Link to={"/forgot-password"}>{t("Forgot Password?")}</Link>
      </p>
    </div>
  );
};

export default Login;