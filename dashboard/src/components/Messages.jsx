import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Context } from "../main";
import { Navigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import "./Messages.css";

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredMessages, setFilteredMessages] = useState([]);
  const { isAuthenticated } = useContext(Context);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data } = await axios.get(
          "http://localhost:4000/api/v1/message/getall",
          { withCredentials: true }
        );
        if (data && data.messages) {
          console.log("Messages data received from API:", data.messages);
          setMessages(data.messages);
          setFilteredMessages(data.messages);
        } else {
          console.log("No messages data received or data.messages is empty.");
          setMessages([]);
          setFilteredMessages([]);
        }
      } catch (error) {
        console.log("Error fetching messages:", error.response?.data?.message || error.message);
        toast.error("Failed to fetch messages");
        setMessages([]);
        setFilteredMessages([]);
      }
    };
    fetchMessages();
  }, []);

  // Filter messages based on search term
  useEffect(() => {
    if (!Array.isArray(messages)) {
      console.warn("Messages is not an array, cannot filter.", messages);
      setFilteredMessages([]);
      return;
    }

    const filtered = messages.filter(message => {
      if (!message) {
        console.warn("Encountered a null or undefined message object:", message);
        return false;
      }
      const fullName = message.fullName?.toLowerCase() || '';
      const email = message.email?.toLowerCase() || '';
      const phone = message.phone || '';
      const searchTermLower = searchTerm.toLowerCase();

      return fullName.includes(searchTermLower) ||
             email.includes(searchTermLower) ||
             phone.includes(searchTerm);
    });
    setFilteredMessages(filtered);
  }, [searchTerm, messages]);

  if (!isAuthenticated) {
    return <Navigate to={"/login"} />;
  }

  return (
    <section className="page messages">
      <h1>MESSAGES</h1>
      <div className="search-container">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, email or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="banner">
        {filteredMessages && filteredMessages.length > 0 ? (
          filteredMessages.map((element) => {
            return (
              <div className="card" key={element._id}>
                <div className="details">
                  <p>
                    Full Name: <span>{element.fullName || 'N/A'}</span>
                  </p>
                  <p>
                    Email: <span>{element.email || 'N/A'}</span>
                  </p>
                  <p>
                    Phone: <span>{element.phone || 'N/A'}</span>
                  </p>
                  <p>
                    Message: <span>{element.message || 'N/A'}</span>
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <h1>No Messages!</h1>
        )}
      </div>
    </section>
  );
};

export default Messages;
