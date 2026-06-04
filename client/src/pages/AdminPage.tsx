import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck, Mail, Clock, RefreshCw } from "lucide-react";

interface PendingUser {
  username: string;
  email: string;
  createdAt: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionStatus, setActionStatus] = useState("");

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/auth/pending", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data || []);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to fetch pending users");
      }
    } catch (err) {
      setError("Network error fetching pending users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const approveUser = async (username: string) => {
    try {
      setActionStatus(`Approving ${username}...`);
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/auth/approve/${username}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setActionStatus(`${username} approved successfully!`);
        // Remove user from the local list
        setUsers(users.filter(u => u.username !== username));
        setTimeout(() => setActionStatus(""), 3000);
      } else {
        const data = await res.json();
        setActionStatus(`Error approving ${username}: ${data.error}`);
        setTimeout(() => setActionStatus(""), 5000);
      }
    } catch (err) {
      setActionStatus(`Network error approving ${username}`);
      setTimeout(() => setActionStatus(""), 5000);
    }
  };

  return (
    <div style={{
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "32px 16px",
      display: "flex",
      flexDirection: "column",
      gap: "24px"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid rgba(148,163,184,0.1)", paddingBottom: "16px" }}>
        <ShieldCheck size={28} color="#6366f1" />
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#f8fafc", fontFamily: "'Space Grotesk', sans-serif" }}>Admin Approvals</h1>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", marginTop: "4px" }}>
            Manage pending operator access requests
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: "16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", color: "#ef4444", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      {actionStatus && (
        <div style={{ padding: "16px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "6px", color: "#a5b4fc", fontSize: "0.875rem" }}>
          {actionStatus}
        </div>
      )}

      <div style={{ background: "rgba(15,23,42,0.6)", borderRadius: "8px", border: "1px solid rgba(148,163,184,0.1)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(148,163,184,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1rem", color: "#f8fafc" }}>Pending Registrations ({users.length})</h2>
          <button onClick={fetchPendingUsers} className="btn btn-ghost" disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
        
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading pending users...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <CheckCircle2 size={32} color="#22c55e" opacity={0.6} />
            <div>No pending registrations to review.</div>
          </div>
        ) : (
          <div className="intel-table-wrap">
            <table className="intel-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Requested At</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.username}>
                    <td style={{ fontWeight: 600, color: "#f8fafc" }}>{user.username}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#cbd5e1" }}>
                        <Mail size={14} color="#64748b" /> {user.email}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#cbd5e1" }}>
                        <Clock size={14} color="#64748b" /> {new Date(user.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => approveUser(user.username)}
                        >
                          <CheckCircle2 size={14} /> Approve
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => alert("Deny functionality not implemented yet.")}
                          style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.2)" }}
                        >
                          <XCircle size={14} /> Deny
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
