import { useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { Context } from "../main";
import { toast } from "react-toastify";

const TokenHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setIsAuthenticated, setUser } = useContext(Context);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("authToken", token);

      // Fetch user data with the token
      axios
        .get("https://your-backend-url.com/api/user", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          setUser(response.data.user); // Update user context
          setIsAuthenticated(true);
          navigate("/", { replace: true });
        })
        .catch((error) => {
          console.error("Error fetching user data:", error);
          toast.error("Invalid or expired token. Please log in again.");
          localStorage.removeItem("authToken"); // Remove invalid token
          setIsAuthenticated(false);
          navigate("/login", { replace: true });
        });
    }
  }, [location, navigate, setIsAuthenticated, setUser]);

  return null;
};

export default TokenHandler;
