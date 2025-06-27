import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Context } from "../main";

const DoctorReviewDashboard = () => {
  const { doctor, loading: authLoading } = useContext(Context);
  const [pendingItems, setPendingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [editResponse, setEditResponse] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Use doctor ID from context, fallback to localStorage
  const doctorId = doctor?._id || localStorage.getItem("doctorId");

  useEffect(() => {
    if (!authLoading && doctorId) {
      fetchPending();
    } else if (!authLoading && !doctorId) {
      setError("Doctor not authenticated. Please log in again.");
    }
    // eslint-disable-next-line
  }, [authLoading, doctorId]);

  const fetchPending = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`/api/chat-history/pending/${doctorId}`);
      setPendingItems(res.data.sessions || []);
    } catch (err) {
      setError("Failed to fetch pending items");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (sessionIdx, msgIdx) => {
    setSelected({ sessionIdx, msgIdx });
    const msg = pendingItems[sessionIdx].messages[msgIdx];
    setEditResponse(msg.doctorEditedResponse || msg.content || "");
  };

  const handleApprove = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const session = pendingItems[selected.sessionIdx];
      // Ensure doctorId and action are always sent, and doctorEditedResponse is string or object
      const payload = {
        doctorId: doctorId,
        action: "approve",
        doctorEditedResponse: editResponse
      };
      await axios.post(`/api/chat-history/review/${session._id}/${selected.msgIdx}`, payload);
      toast.success("Approved and sent to user!");
      fetchPending();
      setSelected(null);
    } catch (err) {
      // Log the payload and error for debugging
      console.error("Review Approve Error Payload:", {
        doctorId,
        action: "approve",
        doctorEditedResponse: editResponse
      });
      console.error("Review Approve Error:", err, err?.response?.data);
      toast.error("Failed to approve");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const session = pendingItems[selected.sessionIdx];
      const payload = {
        doctorId: doctorId,
        action: "reject",
        doctorComment: "Not appropriate. Please revise."
      };
      await axios.post(`/api/chat-history/review/${session._id}/${selected.msgIdx}`, payload);
      toast.info("Rejected and user notified.");
      fetchPending();
      setSelected(null);
    } catch (err) {
      // Log the payload and error for debugging
      console.error("Review Reject Error Payload:", {
        doctorId,
        action: "reject",
        doctorComment: "Not appropriate. Please revise."
      });
      console.error("Review Reject Error:", err, err?.response?.data);
      toast.error("Failed to reject");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="doctor-review-dashboard" style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>
      <h2>Pending AI Responses</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}
      {!loading && pendingItems.length === 0 && <div>No pending items.</div>}
      <div style={{ display: "flex", gap: 32 }}>
        <div style={{ flex: 1 }}>
          <h3>Pending List</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {pendingItems.map((session, sIdx) =>
              session.messages.map((msg, mIdx) =>
                msg.status === "pending" ? (
                  <li key={session._id + mIdx} style={{ marginBottom: 16, border: selected && selected.sessionIdx === sIdx && selected.msgIdx === mIdx ? "2px solid #003366" : "1px solid #ccc", borderRadius: 8, padding: 12, cursor: "pointer" }} onClick={() => handleSelect(sIdx, mIdx)}>
                    <div><b>Submitted:</b> {new Date(msg.timestamp).toLocaleString()}</div>
                    <div><b>Preview:</b> {msg.content?.slice(0, 60)}...</div>
                  </li>
                ) : null
              )
            )}
          </ul>
        </div>
        <div style={{ flex: 2 }}>
          {selected && (() => {
            const session = pendingItems[selected.sessionIdx];
            const msg = session.messages[selected.msgIdx];
            const hasImage = msg.imageData && typeof msg.imageData.data === 'string' && msg.imageData.data.length > 100;
            return (
              <div style={{ border: "1px solid #003366", borderRadius: 8, padding: 24, background: "#f8faff", color: '#222' }}>
                <h3 style={{ color: '#003366' }}>Review Item</h3>
                <div><b>Submitted:</b> {new Date(msg.timestamp).toLocaleString()}</div>
                <div style={{ margin: "16px 0" }}>
                  <b>Image:</b><br />
                  {hasImage ? (
                    <img src={`data:${msg.imageData.contentType};base64,${msg.imageData.data}`} alt="Medical" style={{ maxWidth: 300, borderRadius: 8, border: "1px solid #ccc" }} onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <span style={{ color: '#888' }}>No image available or image data is invalid.</span>
                  )}
                </div>
                <div style={{ margin: "12px 0" }}>
                  <b>User Input:</b>
                  <div style={{ background: "#fff", padding: 8, borderRadius: 4, border: "1px solid #eee", color: '#222' }}>{msg.role === "user" ? msg.content : session.messages.find(m => m.role === "user")?.content}</div>
                </div>
                {msg.analysisResults ? (
                  <div style={{ margin: "12px 0" }}>
                    <b>AI (LLM) Response:</b>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                      <label><strong>Diagnosis:</strong>
                        <input type="text" value={editResponse.diagnosis ?? msg.analysisResults?.diagnosis ?? (typeof msg.content === 'string' ? msg.content : '')} onChange={e => setEditResponse(r => ({ ...r, diagnosis: e.target.value }))} style={{ width: '100%', borderRadius: 4, border: '1px solid #ccc', padding: 6, marginTop: 2, color: '#222', background: '#fff' }} />
                      </label>
                      <label><strong>Medication:</strong>
                        <input type="text" value={editResponse.medication ?? msg.analysisResults?.medication ?? ''} onChange={e => setEditResponse(r => ({ ...r, medication: e.target.value }))} style={{ width: '100%', borderRadius: 4, border: '1px solid #ccc', padding: 6, marginTop: 2, color: '#222', background: '#fff' }} />
                      </label>
                      <label><strong>Treatment Plan / Findings:</strong>
                        <input type="text" value={editResponse.findings ?? msg.analysisResults?.findings ?? ''} onChange={e => setEditResponse(r => ({ ...r, findings: e.target.value }))} style={{ width: '100%', borderRadius: 4, border: '1px solid #ccc', padding: 6, marginTop: 2, color: '#222', background: '#fff' }} />
                      </label>
                      <label><strong>Recommendations:</strong>
                        <input type="text" value={editResponse.recommendations ?? msg.analysisResults?.recommendations ?? ''} onChange={e => setEditResponse(r => ({ ...r, recommendations: e.target.value }))} style={{ width: '100%', borderRadius: 4, border: '1px solid #ccc', padding: 6, marginTop: 2, color: '#222', background: '#fff' }} />
                      </label>
                      <label><strong>Follow-up:</strong>
                        <input type="text" value={editResponse.followUp ?? msg.analysisResults?.followUp ?? ''} onChange={e => setEditResponse(r => ({ ...r, followUp: e.target.value }))} style={{ width: '100%', borderRadius: 4, border: '1px solid #ccc', padding: 6, marginTop: 2, color: '#222', background: '#fff' }} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div style={{ margin: "12px 0" }}>
                    <b>AI (LLM) Response:</b>
                    <textarea value={editResponse || msg.content || ''} onChange={e => setEditResponse(e.target.value)} rows={6} style={{ width: "100%", borderRadius: 4, border: "1px solid #ccc", padding: 8, color: '#222', background: '#fff' }} />
                  </div>
                )}
                <div style={{ display: "flex", gap: 16 }}>
                  <button onClick={handleApprove} disabled={actionLoading} style={{ background: "#003366", color: "#fff", padding: "8px 24px", border: "none", borderRadius: 4, fontWeight: 600 }}>Approve & Send</button>
                  <button onClick={handleReject} disabled={actionLoading} style={{ background: "#fff", color: "#003366", border: "1px solid #003366", padding: "8px 24px", borderRadius: 4, fontWeight: 600 }}>Reject</button>
                  <button onClick={() => setSelected(null)} style={{ marginLeft: "auto", background: "#eee", border: "none", borderRadius: 4, padding: "8px 16px", color: '#222' }}>Cancel</button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
      <ToastContainer position="top-center" />
    </div>
  );
};

export default DoctorReviewDashboard; 