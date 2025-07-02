import React, { useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Context } from "../main";
import { toast } from "react-toastify";

const Login = () => {
  const navigate = useNavigate();
  const { setIsAuthenticated, setDoctor } = useContext(Context);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Doctor"); // force doctor role
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/v1/user/login`,
        {
          email,
          password,
          role, // Must be "Doctor"
        },
        {
          withCredentials: true, // ✅ This sends the cookie to the browser
        }
      );

      console.log("✅ Login success", res.data);
      
      // Store token and user data
      localStorage.setItem('authToken', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      // Update context
      setDoctor(res.data.user);
      setIsAuthenticated(true);
      
      toast.success("Login successful! Welcome back, Doctor.");
      navigate("/"); // ✅ Redirect to dashboard after successful login
    } catch (err) {
      console.error("❌ Login error", err.response?.data?.message || err.message);
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="container form-component">
      <img src="/logo.png" alt="logo" className="logo" />
      <h1 className="form-title">WELCOME TO MOTION CLINIC</h1>
      <p>Doctor Portal - Secure Access to Patient Management</p>
      <form onSubmit={handleLogin}>
        <div>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div style={{ justifyContent: "center", alignItems: "center" }}>
          <button type="submit" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </div>
      </form>
      
      <div style={{ 
        marginTop: '2rem', 
        textAlign: 'center',
        padding: '1rem',
        background: 'rgba(57, 57, 217, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(57, 57, 217, 0.2)'
      }}>
        <p style={{ 
          margin: '0', 
          fontSize: '0.9rem', 
          color: '#666',
          fontWeight: '500'
        }}>
          🔐 Secure access to patient records and appointment management
        </p>
      </div>
    </section>
  );
};

export default Login;
