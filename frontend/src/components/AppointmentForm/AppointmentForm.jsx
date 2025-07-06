import axios from "axios";
import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "./Appointment.css";
import { useTranslation } from "react-i18next";
import { Context } from "../../main";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const AppointmentForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useContext(Context);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    gender: "",
    dob: "",
    appointmentDate: "",
    appointmentTime: "",
    department: "Orthopedics",
    doctorFullName: "",
    doctorId: "",
    address: "",
    hasVisited: false
  });

  // Auto-fill user data when component mounts
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        gender: user.gender || "",
        dob: user.dob ? user.dob.split('T')[0] : "",
      }));
    }
  }, [user]);

  const [doctors, setDoctors] = useState([]);
  const departmentsArray = ["Orthopedics", "Physical Therapy"];

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{11}$/;
    const today = new Date();
    today.setHours(0,0,0,0);
    const appointmentDate = new Date(formData.appointmentDate);
    appointmentDate.setHours(0,0,0,0);

    if (!formData.fullName) newErrors.fullName = t("fullNameRequired");
    if (!formData.email) newErrors.email = t("emailRequired");
    else if (!emailRegex.test(formData.email)) newErrors.email = t("invalidEmail");
    if (!formData.phone) newErrors.phone = t("phoneRequired");
    else if (!phoneRegex.test(formData.phone)) newErrors.phone = t("invalidPhone");
    if (!formData.gender) newErrors.gender = t("genderRequired");
    if (!formData.appointmentDate) newErrors.appointmentDate = t("appointmentDateRequired");
    else if (appointmentDate < today) newErrors.appointmentDate = t("appointmentDatePast");
    if (!formData.appointmentTime) newErrors.appointmentTime = t("appointmentTimeRequired");
    if (!formData.department) newErrors.department = t("departmentRequired");
    if (!formData.doctorFullName) newErrors.doctorFullName = t("doctorRequired");
    if (!formData.address) newErrors.address = t("addressRequired");

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchDoctors = async (retryCount = 3) => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/v1/user/doctors`, {
        withCredentials: true,
      });
      setDoctors(data.doctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      if (retryCount > 0) {
        setTimeout(() => fetchDoctors(retryCount - 1), 1000);
      } else {
        toast.error(t("errorFetchingDoctors"));
      }
    }
  };

  useEffect(() => {
    if (formData.department) {
      fetchDoctors();
    }
  }, [formData.department]);

  useEffect(() => {
    const fetchAvailableTimeSlots = async () => {
      if (formData.appointmentDate && formData.doctorId) {
        setFetchingSlots(true);
        setAvailableTimeSlots([]);
        try {
          const { data } = await axios.get(
            `${API_BASE_URL}/api/v1/appointment/get-available-slots`,
            {
              params: { date: formData.appointmentDate, doctorId: formData.doctorId },
              withCredentials: true,
            }
          );
          setAvailableTimeSlots(data.availableSlots);
        } catch (error) {
          console.error("Error fetching available time slots:", error);
          toast.error(t(error.response?.data?.message || "Error fetching available time slots."));
          setAvailableTimeSlots([]);
        } finally {
          setFetchingSlots(false);
        }
      } else {
        setAvailableTimeSlots([]);
        setFormData(prev => ({ ...prev, appointmentTime: "" }));
      }
    };

    fetchAvailableTimeSlots();
  }, [formData.appointmentDate, formData.doctorId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error(t("pleaseFixErrors"));
      return;
    }

    // Additional validation for appointment time
    if (!formData.appointmentDate || !formData.appointmentTime || !formData.doctorId) {
      toast.error(t("Please select a date, time, and doctor"));
      return;
    }

    // Check if the selected time slot is still available
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/api/v1/appointment/get-available-slots`,
        {
          params: { 
            date: formData.appointmentDate, 
            doctorId: formData.doctorId 
          },
          withCredentials: true,
        }
      );

      if (!data.availableSlots.includes(formData.appointmentTime)) {
        toast.error(t("This time slot is no longer available. Please select another time."));
        return;
      }

      setShowConfirm(true);
    } catch (error) {
      console.error("Error checking time slot:", error);
      toast.error(t("Error checking time slot availability"));
    }
  };

  const handleConfirmAppointment = async () => {
    try {
      setLoading(true);
      
      // Validate required fields
      if (!formData.appointmentDate || !formData.appointmentTime || !formData.doctorId) {
        toast.error(t("Please fill in all required fields"));
        return;
      }

      // Format the date to ensure consistency
      const formattedDate = new Date(formData.appointmentDate).toISOString().split('T')[0];

      // Use the authenticated user's data consistently
      const appointmentData = {
        fullName: user.fullName,
        email: user.email,
        phone: formData.phone,
        gender: formData.gender,
        dob: formData.dob,
        appointment_date: formattedDate,
        appointment_time: formData.appointmentTime,
        department: formData.department,
        doctor: { fullName: formData.doctorFullName },
        doctorId: formData.doctorId,
        hasVisited: Boolean(formData.hasVisited),
        address: formData.address,
        userId: user._id,
        status: "pending"
      };

      // Validate required fields
      if (!appointmentData.phone || !appointmentData.gender || !appointmentData.dob || !appointmentData.address) {
        toast.error(t("Please fill in all required fields"));
        return;
      }

      console.log("Submitting appointment data:", appointmentData);

      const { data } = await axios.post(
        `${API_BASE_URL}/api/v1/appointment/post`,
        appointmentData,
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );

      console.log("Appointment confirmed successfully:", data);
      toast.success(t(data.message || "Appointment Sent!"));
      
      // Reset form
      setFormData({
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        gender: user.gender || "",
        dob: user.dob ? user.dob.split('T')[0] : "",
        appointmentDate: "",
        appointmentTime: "",
        department: "Orthopedics",
        doctorFullName: "",
        doctorId: "",
        address: "",
        hasVisited: false
      });
      setAvailableTimeSlots([]);
      setShowConfirm(false);
    } catch (error) {
      console.error("Error confirming appointment:", error);
      // Log the full error response from the backend
      if (error.response) {
        console.error("Backend Error Response:", error.response.data);
        console.error("Backend Error Status:", error.response.status);
      } else if (error.request) {
        console.error("No response received:", error.request);
      } else {
        console.error("Error setting up request:", error.message);
      }

      const errorMessage = error.response?.data?.message || t("errorBookingAppointment");
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/");
  };

  return (
    <div className="container form-component appointment-form">
      <h2>{t("appointment")}</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="fullName">{t("fullName")}</label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            placeholder={t("enterFullName")}
            aria-describedby="fullNameError"
            className={errors.fullName ? 'error' : ''}
            disabled
          />
          {errors.fullName && <span className="error-message" id="fullNameError">{errors.fullName}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">{t("email")}</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder={t("enterEmail")}
            aria-describedby="emailError"
            className={errors.email ? 'error' : ''}
            disabled
          />
          {errors.email && <span className="error-message" id="emailError">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="phone">{t("mobileNumber")}</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder={t("enterPhone")}
            aria-describedby="phoneError"
            className={errors.phone ? 'error' : ''}
          />
          {errors.phone && <span className="error-message" id="phoneError">{errors.phone}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="gender">{t("gender")}</label>
          <select
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
            aria-describedby="genderError"
            className={errors.gender ? 'error' : ''}
          >
            <option value="">{t("selectGender")}</option>
            <option value="Male">{t("male")}</option>
            <option value="Female">{t("female")}</option>
          </select>
          {errors.gender && <span className="error-message" id="genderError">{errors.gender}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="dob">{t("date Of Birth")}</label>
          <input
            type="date"
            id="dob"
            name="dob"
            value={formData.dob}
            onChange={handleInputChange}
            aria-describedby="dobError"
            className={errors.dob ? 'error' : ''}
          />
          {errors.dob && <span className="error-message" id="dobError"> {errors.dob}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="department">{t("department")}</label>
          <select
            id="department"
            name="department"
            value={formData.department}
            onChange={handleInputChange}
            aria-describedby="departmentError"
            className={errors.department ? 'error' : ''}
          >
            {departmentsArray.map((dept, index) => (
              <option value={dept} key={index}>
                {t(dept)}
              </option>
            ))}
          </select>
          {errors.department && <span className="error-message" id="departmentError">{errors.department}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="doctorFullName">{t("doctor Name")}</label>
          <select
            id="doctorFullName"
            name="doctorFullName"
            value={formData.doctorFullName}
            onChange={(e) => {
              const selectedDoctor = doctors.find(doc => doc.fullName === e.target.value);
              setFormData(prev => ({
                ...prev,
                doctorFullName: e.target.value,
                doctorId: selectedDoctor ? selectedDoctor._id : ""
              }));
              if (errors.doctorFullName) {
                setErrors(prev => ({ ...prev, doctorFullName: '' }));
              }
            }}
            aria-describedby="doctorFullNameError"
            className={errors.doctorFullName ? 'error' : ''}
            disabled={!formData.department || doctors.length === 0}
          >
            <option value="">{t("selectDoctor")}</option>
            {doctors
              .filter(doc => doc.doctorDepartment === formData.department)
              .map((ele) => (
              <option value={ele.fullName} key={ele._id}>
                {`${ele.fullName} (${ele.doctorDepartment})`}
              </option>
            ))}
          </select>
          {errors.doctorFullName && <span className="error-message" id="doctorFullNameError">{errors.doctorFullName}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="appointmentDate">{t("appointmentDate")}</label>
          <input
            type="date"
            id="appointmentDate"
            name="appointmentDate"
            value={formData.appointmentDate}
            onChange={handleInputChange}
            aria-describedby="appointmentDateError"
            className={errors.appointmentDate ? 'error' : ''}
          />
          {errors.appointmentDate && <span className="error-message" id="appointmentDateError">{errors.appointmentDate}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="appointmentTime">{t("appointmentTime")}</label>
          <select
            id="appointmentTime"
            name="appointmentTime"
            value={formData.appointmentTime}
            onChange={handleInputChange}
            aria-describedby="appointmentTimeError"
            className={errors.appointmentTime ? 'error' : ''}
            disabled={!formData.appointmentDate || !formData.doctorId || fetchingSlots || availableTimeSlots.length === 0}
          >
            <option value="">
              {fetchingSlots 
                ? t("Fetching slots...") 
                : !formData.appointmentDate || !formData.doctorId 
                  ? t("Select date and doctor first") 
                  : availableTimeSlots.length === 0 
                    ? t("No available slots") 
                    : t("Select a time slot")}
            </option>
            {availableTimeSlots.map(slot => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
          {errors.appointmentTime && <span className="error-message" id="appointmentTimeError">{errors.appointmentTime}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="address">{t("address")}</label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            aria-describedby="addressError"
            className={errors.address ? 'error' : ''}
            placeholder={t("address")}
          />
          {errors.address && <span className="error-message" id="addressError">{errors.address}</span>}
        </div>

        <div className="form-group checkbox-group">
          <input
            type="checkbox"
            id="hasVisited"
            name="hasVisited"
            checked={formData.hasVisited}
            onChange={handleInputChange}
          />
          <label htmlFor="hasVisited">{t("hasVisited")}</label>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? t("Submitting...") : t("Submit Appointment")}
        </button>
      </form>

      {showConfirm && (
        <div className="confirmation-modal">
          <div className="confirmation-content">
            <h3>{t("Confirm Appointment")}</h3>
            <p>{t("reviewDetails")}</p>
            <ul>
              <li><strong>{t("fullName")}:</strong> {formData.fullName}</li>
              <li><strong>{t("email")}:</strong> {formData.email}</li>
              <li><strong>{t("mobile Number")}:</strong> {formData.phone}</li>
              <li><strong>{t("gender")}:</strong> {t(formData.gender.toLowerCase())}</li>
              <li><strong>{t("date Of Birth")}:</strong> {formData.dob}</li>
              <li><strong>{t("appointment Date")}:</strong> {formData.appointmentDate}</li>
              <li><strong>{t("appointment Time")}:</strong> {formData.appointmentTime}</li>
              <li><strong>{t("department")}:</strong> {t(formData.department.toLowerCase())}</li>
              <li><strong>{t("doctor Name")}:</strong> {formData.doctorFullName}</li>
              <li><strong>{t("address")}:</strong> {formData.address}</li>
              <li><strong>{t("hasVisited")}:</strong> {formData.hasVisited ? t("yes") : t("no")}</li>
            </ul>
            <div className="modal-actions">
              <button onClick={handleConfirmAppointment} disabled={loading}>
                {loading ? t("Confirming...") : t("Confirm")}
              </button>
              <button onClick={() => setShowConfirm(false)} disabled={loading}>
                {t("Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentForm;
