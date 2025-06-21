import React, { useContext, useEffect, useState } from "react";
import { Context } from "../main";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { GoCheckCircleFill } from "react-icons/go";
import { AiFillCloseCircle } from "react-icons/ai";
import { FaTrashAlt } from "react-icons/fa"; // Trash icon for delete button
import { FaSearch } from "react-icons/fa";

const Dashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [doctorsCount, setDoctorsCount] = useState(0);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const { data } = await axios.get(
          "http://localhost:4000/api/v1/appointment/getall",
          { withCredentials: true }
        );
        setAppointments(data.appointments);
        setFilteredAppointments(data.appointments);
      } catch (error) {
        setAppointments([]);
        setFilteredAppointments([]);
      }
    };
    fetchAppointments();

    const fetchDoctorsCount = async () => {
      try {
        const { data } = await axios.get(
          "http://localhost:4000/api/v1/user/doctors",
          { withCredentials: true }
        );
        if (data && data.doctors) {
          setDoctorsCount(data.doctors.length);
        } else {
          console.log("No doctors data received");
          setDoctorsCount(0);
        }
      } catch (error) {
        console.error("Error fetching doctors count:", error.response?.data?.message || error.message);
        setDoctorsCount(0);
      }
    };
    fetchDoctorsCount();
  }, []);

  // Filter appointments based on search term
  useEffect(() => {
    const filtered = appointments.filter(appointment => 
      appointment.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.phone?.includes(searchTerm)
    );
    setFilteredAppointments(filtered);
  }, [searchTerm, appointments]);

  const handleUpdateStatus = async (appointmentId, status) => {
    try {
      const { data } = await axios.put(
        `http://localhost:4000/api/v1/appointment/update/${appointmentId}`,
        { status },
        { withCredentials: true }
      );
      setAppointments((prevAppointments) =>
        prevAppointments.map((appointment) =>
          appointment._id === appointmentId
            ? { ...appointment, status }
            : appointment
        )
      );
      toast.success(data.message);
    } catch (error) {
      toast.error(error.response.data.message);
    }
  };

  const handleDeleteAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.delete(
        `http://localhost:4000/api/v1/appointment/delete/${appointmentId}`,
        { withCredentials: true }
      );
      // Filter out the deleted appointment from the state
      setAppointments((prevAppointments) =>
        prevAppointments.filter((appointment) => appointment._id !== appointmentId)
      );
      toast.success(data.message);
    } catch (error) {
      toast.error(error.response.data.message || "Error deleting appointment");
    }
  };

  const { isAuthenticated, admin } = useContext(Context);
  if (!isAuthenticated) {
    return <Navigate to={"/login"} />;
  }

  return (
    <>
      <section className="dashboard page">
        <div className="banner">
          <div className="firstBox">
            <img src="/doc.png" alt="docImg" />
            <div className="content">
              <div>
                <p>Hello ,</p>
                <h5>{admin && `${admin.fullName}`}</h5>
              </div>
              <p>
                This dashboard provides a comprehensive view of your appointments, patient details, and schedule.
                Here, you can efficiently manage daily tasks, review patient histories, and track upcoming appointments. Have a great day!
              </p>
            </div>
          </div>
          <div className="secondBox">
            <p>Total Appointments</p>
            <h3>{appointments.length}</h3>
          </div>
          <div className="thirdBox">
            <p>Registered Doctors</p>
            <h3>{doctorsCount}</h3>
          </div>
        </div>
        <div className="banner">
          <div className="search-container">
            <h5>Appointments</h5>
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by patient name or phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Doctor</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Visited</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments && filteredAppointments.length > 0
                  ? filteredAppointments.map((appointment) => (
                      <tr key={appointment._id}>
                        <td>{appointment.fullName}</td>
                        <td>{appointment.appointment_date.substring(0, 16)}</td>
                        <td>{appointment.doctor.fullName}</td>
                        <td>{appointment.department}</td>
                        <td>
                          <select
                            className={
                              appointment.status === "pending"
                                ? "value-pending"
                                : appointment.status === "approved"
                                ? "value-accepted"
                                : "value-rejected"
                            }
                            value={appointment.status}
                            onChange={(e) =>
                              handleUpdateStatus(appointment._id, e.target.value)
                            }
                          >
                            <option value="pending" className="value-pending">
                              Pending
                            </option>
                            <option value="approved" className="value-accepted">
                              Approved
                            </option>
                            <option value="cancelled" className="value-rejected">
                              Cancelled
                            </option>
                          </select>
                        </td>
                        <td>
                          {appointment.hasVisited ? (
                            <GoCheckCircleFill className="green" />
                          ) : (
                            <AiFillCloseCircle className="red" />
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteAppointment(appointment._id)}
                            className="delete-btn"
                          >
                            <FaTrashAlt />
                          </button>
                        </td>
                      </tr>
                    ))
                  : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center" }}>
                        No Appointments Found!
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
};

export default Dashboard;
