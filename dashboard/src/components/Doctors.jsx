import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Context } from "../main";
import { Navigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import './Doctors.css';

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const { isAuthenticated } = useContext(Context);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [updateData, setUpdateData] = useState({
    fullName: "",
    email: "",
    phone: "",
    nic: "",
    dateOfBirth: "",
    gender: "",
    department: "",
  });

  // Fetch doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data } = await axios.get(
          "${import.meta.env.VITE_API_URL}/api/v1/user/doctors",
          { withCredentials: true }
        );
        if (data && data.doctors) {
          setDoctors(data.doctors);
          setFilteredDoctors(data.doctors);
        } else {
          console.log("No doctors data received");
          setDoctors([]);
          setFilteredDoctors([]);
        }
      } catch (error) {
        console.log("Error fetching doctors:", error.response?.data?.message || error.message);
        toast.error("Failed to fetch doctors");
        setDoctors([]);
        setFilteredDoctors([]);
      }
    };
    fetchDoctors();
  }, []);

  // Filter doctors based on search term
  useEffect(() => {
    const filtered = doctors.filter(doctor => 
      doctor.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.doctorDepartment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.phone?.includes(searchTerm)
    );
    setFilteredDoctors(filtered);
  }, [searchTerm, doctors]);

  // Delete doctor
  const handleDelete = async (id) => {
    try {
      const { data } = await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/v1/user/doctor/delete/${id}`,
        { withCredentials: true }
      );
      toast.success(data.message);
      setDoctors(doctors.filter((doctor) => doctor._id !== id));
      setFilteredDoctors(filteredDoctors.filter((doctor) => doctor._id !== id));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete doctor");
    }
  };

  // Update doctor
  const handleUpdateDoctor = async (e) => {
    e.preventDefault(); // Prevent form submission
    console.log("Updating doctor:", updateData); // Log the update data
    console.log("Doctor ID being updated:", editingDoctor._id); // Log the doctor ID being used

    try {
        const { data } = await axios.put(
            `${import.meta.env.VITE_API_URL}/api/v1/user/doctor/update/${editingDoctor._id}`,
            {
              ...updateData,
              doctorDepartment: updateData.department // Map department to doctorDepartment
            },  // Send the updateData object
            { withCredentials: true }
        );

        // Update the doctor list with the new doctor data
        setDoctors((prevDoctors) =>
            prevDoctors.map((doc) =>
                doc._id === editingDoctor._id ? { ...doc, ...data.doctor } : doc
            )
        );
        
        // Show success message
        toast.success(data.message);
        
        // Clear the editing state
        setEditingDoctor(null);
    } catch (error) {
        // Improved error handling
        console.error("Error updating doctor:", error.response?.data || error);
        toast.error(error.response?.data?.message || error.message || "Error updating doctor");
    }
};

  
  

  if (!isAuthenticated) {
    return <Navigate to={"/login"} />;
  }

  return (
    <section className="page doctors">
      <h1>DOCTORS</h1>
      <div className="search-container">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, department or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="banner">
        {filteredDoctors && filteredDoctors.length > 0 ? (
          filteredDoctors.map((element) => {
            console.log(element); // Debug: see what fields are present
            return (
              <div className="card" key={element._id}>
                {editingDoctor && editingDoctor._id === element._id ? (
                  <form onSubmit={handleUpdateDoctor}>
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={updateData.fullName}
                      onChange={(e) => setUpdateData({ ...updateData, fullName: e.target.value })}
                      required
                    />
                    <label>Email</label>
                    <input
                      type="email"
                      value={updateData.email}
                      onChange={(e) => setUpdateData({ ...updateData, email: e.target.value })}
                      required
                    />
                    <label>Phone</label>
                    <input
                      type="text"
                      value={updateData.phone}
                      onChange={(e) => setUpdateData({ ...updateData, phone: e.target.value })}
                      required
                    />
                    <label>NIC</label>
                    <input
                      type="text"
                      value={updateData.nic}
                      onChange={(e) => setUpdateData({ ...updateData, nic: e.target.value })}
                      required
                    />
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      value={updateData.dateOfBirth}
                      onChange={(e) => setUpdateData({ ...updateData, dateOfBirth: e.target.value })}
                      required
                    />
                    <label>Gender</label>
                    <select
                      value={updateData.gender}
                      onChange={(e) => setUpdateData({ ...updateData, gender: e.target.value })}
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                    <label>Department</label>
                    <select
                      value={updateData.department}
                      onChange={(e) => setUpdateData({ ...updateData, department: e.target.value })}
                      required
                    >
                      <option value="">Select Department</option>
                      <option value="Orthopedics">Orthopedics</option>
                      <option value="Physical Therapy">Physical Therapy</option>
                    </select>
                    <button type="submit" className="save-btn">Save</button>
                    <button
                      type="button"
                      onClick={() => setEditingDoctor(null)}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="details">
                      <p>Full Name: <span>{element.fullName}</span></p>
                      <p>Email: <span>{element.email}</span></p>
                      <p>Phone: <span>{element.phone}</span></p>
                      <p>Date of Birth: <span>{(element.dateOfBirth && element.dateOfBirth.trim() !== '' ? element.dateOfBirth : (element.dob && element.dob.trim() !== '' ? element.dob : 'Not Provided'))}</span></p>
                      <p>Department: <span>{(element.doctorDepartment && element.doctorDepartment.trim() !== '' ? element.doctorDepartment : (element.department && element.department.trim() !== '' ? element.department : 'Not Provided'))}</span></p>
                      <p>NIC: <span>{(element.nic && element.nic.trim() !== '' ? element.nic : (element.NIC && element.NIC.trim() !== '' ? element.NIC : 'Not Provided'))}</span></p>
                      <p>Gender: <span>{element.gender}</span></p>
                    </div>
                    <div className="btn-group">
                      <button
                        className="btn btn-update"
                        onClick={() => {
                          setEditingDoctor(element);
                          setUpdateData({
                            fullName: element.fullName || '',
                            email: element.email || '',
                            phone: element.phone || '',
                            nic: element.nic || '',
                            dateOfBirth: element.dateOfBirth || '',
                            gender: element.gender || '',
                            department: element.doctorDepartment || element.department || '',
                          });
                        }}
                      >
                        Update Doctor
                      </button>
                      <button
                        className="btn btn-delete"
                        onClick={() => handleDelete(element._id)}
                      >
                        Delete Doctor
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        ) : (
          <h1>No Registered Doctors Found!</h1>
        )}
      </div>
    </section>
  );
};

export default Doctors;
