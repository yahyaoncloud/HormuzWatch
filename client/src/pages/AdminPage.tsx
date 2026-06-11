import { useEffect, useState, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldOff,
  Mail,
  Clock,
  RefreshCw,
  Search,
  Users,
  UserCheck,
  AlertTriangle,
  Trash2,
  Ban,
  RotateCcw,
} from "lucide-react";
import { api } from "../services/api";

interface UserRecord {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

type FilterTab = "all" | "approved" | "pending" | "blacklisted";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  approved: { label: "Active", color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.3)" },
  pending: { label: "Pending", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)" },
  blacklisted: { label: "Blacklisted", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" },
};

const TABS: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All Users", icon: <Users size={14} /> },
  { key: "approved", label: "Active", icon: <UserCheck size={14} /> },
  { key: "pending", label: "Pending", icon: <Clock size={14} /> },
  { key: "blacklisted", label: "Blacklisted", icon: <Ban size={14} /> },
];

export default function AdminPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const [actionError, setActionError] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    type: "blacklist" | "unblacklist" | "delete" | "approve";
    username: string;
  } | null>(null);

  const fetchAllUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getUsers();
      if (res.ok) {
        const data = await res.json();
        setUsers(data || []);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to fetch users");
      }
    } catch {
      setError("Network error fetching users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const showStatus = (msg: string, isError = false) => {
    if (isError) {
      setActionError(msg);
      setActionStatus("");
    } else {
      setActionStatus(msg);
      setActionError("");
    }
    setTimeout(() => {
      setActionStatus("");
      setActionError("");
    }, 4000);
  };

  const approveUser = async (username: string) => {
    try {
      const res = await api.approveUser(username);
      if (res.ok) {
        showStatus(`${username} approved successfully`);
        setUsers((prev) =>
          prev.map((u) => (u.username === username ? { ...u, status: "approved" } : u))
        );
      } else {
        const data = await res.json();
        showStatus(`Error: ${data.error}`, true);
      }
    } catch {
      showStatus("Network error approving user", true);
    }
  };

  const blacklistUser = async (username: string) => {
    try {
      const res = await api.blacklistUser(username);
      if (res.ok) {
        showStatus(`${username} blacklisted successfully`);
        setUsers((prev) =>
          prev.map((u) => (u.username === username ? { ...u, status: "blacklisted" } : u))
        );
      } else {
        const data = await res.json();
        showStatus(`Error: ${data.error}`, true);
      }
    } catch {
      showStatus("Network error blacklisting user", true);
    }
  };

  const unblacklistUser = async (username: string) => {
    try {
      const res = await api.unblacklistUser(username);
      if (res.ok) {
        showStatus(`${username} restored successfully`);
        setUsers((prev) =>
          prev.map((u) => (u.username === username ? { ...u, status: "approved" } : u))
        );
      } else {
        const data = await res.json();
        showStatus(`Error: ${data.error}`, true);
      }
    } catch {
      showStatus("Network error restoring user", true);
    }
  };

  const deleteUser = async (username: string) => {
    try {
      const res = await api.deleteUser(username);
      if (res.ok) {
        showStatus(`${username} deleted successfully`);
        setUsers((prev) => prev.filter((u) => u.username !== username));
      } else {
        const data = await res.json();
        showStatus(`Error: ${data.error}`, true);
      }
    } catch {
      showStatus("Network error deleting user", true);
    }
  };

  const executeConfirmedAction = () => {
    if (!confirmAction) return;
    switch (confirmAction.type) {
      case "approve":
        approveUser(confirmAction.username);
        break;
      case "blacklist":
        blacklistUser(confirmAction.username);
        break;
      case "unblacklist":
        unblacklistUser(confirmAction.username);
        break;
      case "delete":
        deleteUser(confirmAction.username);
        break;
    }
    setConfirmAction(null);
  };

  const filteredUsers = useMemo(() => {
    let result = users;
    if (activeTab !== "all") {
      result = result.filter((u) => u.status === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
      );
    }
    return result;
  }, [users, activeTab, searchQuery]);

  const tabCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = { all: users.length, approved: 0, pending: 0, blacklisted: 0 };
    users.forEach((u) => {
      if (u.status in counts) counts[u.status as FilterTab]++;
    });
    return counts;
  }, [users]);

  return (
    <div className="page-container fade-up" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid rgba(148,163,184,0.1)", paddingBottom: "16px" }}>
        <ShieldCheck size={28} color="#6366f1" />
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#f8fafc", fontFamily: "'Space Grotesk', sans-serif" }}>
            User Management
          </h1>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", marginTop: "4px" }}>
            Admin-only: manage operator access, blacklisting, and roles
          </p>
        </div>
        <button onClick={fetchAllUsers} className="btn btn-ghost" disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div style={{ padding: "16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", color: "#ef4444", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}
      {actionStatus && (
        <div style={{ padding: "16px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "6px", color: "#22c55e", fontSize: "0.875rem" }}>
          {actionStatus}
        </div>
      )}
      {actionError && (
        <div style={{ padding: "16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", color: "#ef4444", fontSize: "0.875rem" }}>
          {actionError}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px",
              borderRadius: "6px", border: "1px solid",
              borderColor: activeTab === tab.key ? "rgba(99,102,241,0.4)" : "rgba(148,163,184,0.1)",
              background: activeTab === tab.key ? "rgba(99,102,241,0.15)" : "rgba(15,23,42,0.4)",
              color: activeTab === tab.key ? "#a5b4fc" : "#94a3b8",
              fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer",
              fontFamily: "'Space Grotesk', sans-serif", transition: "all 0.15s",
            }}
          >
            {tab.icon}
            {tab.label}
            <span style={{
              fontSize: "0.6875rem", padding: "1px 6px", borderRadius: "10px",
              background: activeTab === tab.key ? "rgba(99,102,241,0.2)" : "rgba(148,163,184,0.1)",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div style={{ position: "relative" }}>
        <Search size={14} color="#64748b" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
        <input
          type="text"
          placeholder="Search by username, email, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%", padding: "10px 12px 10px 36px", borderRadius: "6px",
            border: "1px solid rgba(148,163,184,0.15)", background: "rgba(15,23,42,0.6)",
            color: "#f8fafc", fontSize: "0.8125rem", outline: "none",
            fontFamily: "'JetBrains Mono', monospace", boxSizing: "border-box",
          }}
        />
      </div>

      {/* Users Table */}
      <div style={{ background: "rgba(15,23,42,0.6)", borderRadius: "8px", border: "1px solid rgba(148,163,184,0.1)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(148,163,184,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1rem", color: "#f8fafc" }}>
            {TABS.find((t) => t.key === activeTab)?.label} ({filteredUsers.length})
          </h2>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <Users size={32} color="#64748b" opacity={0.6} />
            <div>{searchQuery ? "No users match your search." : "No users in this category."}</div>
          </div>
        ) : (
          <div className="intel-table-wrap">
            <table className="intel-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const sc = STATUS_CONFIG[user.status] || STATUS_CONFIG.approved;
                  return (
                    <tr key={user.id}>
                      <td style={{ fontWeight: 600, color: "#f8fafc" }}>{user.username}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#cbd5e1" }}>
                          <Mail size={14} color="#64748b" /> {user.email}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: "0.6875rem", padding: "2px 8px", borderRadius: "4px", fontWeight: 700,
                          textTransform: "uppercase", letterSpacing: "0.05em",
                          fontFamily: "'JetBrains Mono', monospace",
                          background: user.role === "admin" ? "rgba(139,92,246,0.15)" : "rgba(148,163,184,0.1)",
                          color: user.role === "admin" ? "#a78bfa" : "#94a3b8",
                          border: `1px solid ${user.role === "admin" ? "rgba(139,92,246,0.3)" : "rgba(148,163,184,0.15)"}`,
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontSize: "0.6875rem", padding: "2px 8px", borderRadius: "4px", fontWeight: 700,
                          textTransform: "uppercase", letterSpacing: "0.05em",
                          fontFamily: "'JetBrains Mono', monospace",
                          background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                        }}>
                          {sc.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#cbd5e1", fontSize: "0.8125rem" }}>
                          <Clock size={14} color="#64748b" /> {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                          {/* Pending: Approve / Delete */}
                          {user.status === "pending" && (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => setConfirmAction({ type: "approve", username: user.username })}
                                title="Approve user"
                              >
                                <CheckCircle2 size={13} /> Approve
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setConfirmAction({ type: "delete", username: user.username })}
                                style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.2)" }}
                                title="Deny & delete user"
                              >
                                <XCircle size={13} /> Deny
                              </button>
                            </>
                          )}

                          {/* Active: Blacklist / Delete */}
                          {user.status === "approved" && (
                            <>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setConfirmAction({ type: "blacklist", username: user.username })}
                                style={{ color: "#f59e0b", borderColor: "rgba(245,158,11,0.2)" }}
                                title="Blacklist user (revoke access)"
                              >
                                <ShieldOff size={13} /> Blacklist
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setConfirmAction({ type: "delete", username: user.username })}
                                style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.2)" }}
                                title="Delete user permanently"
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </>
                          )}

                          {/* Blacklisted: Unblacklist / Delete */}
                          {user.status === "blacklisted" && (
                            <>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setConfirmAction({ type: "unblacklist", username: user.username })}
                                style={{ color: "#22c55e", borderColor: "rgba(34,197,94,0.2)" }}
                                title="Restore access"
                              >
                                <RotateCcw size={13} /> Restore
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setConfirmAction({ type: "delete", username: user.username })}
                                style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.2)" }}
                                title="Delete user permanently"
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 9999, padding: "16px",
          }}
          onClick={() => setConfirmAction(null)}
        >
          <div
            style={{
              background: "#1e293b", border: "1px solid rgba(148,163,184,0.2)",
              borderRadius: "12px", padding: "24px", maxWidth: "420px", width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <AlertTriangle size={24} color={
                confirmAction.type === "delete" ? "#ef4444" :
                confirmAction.type === "blacklist" ? "#f59e0b" :
                confirmAction.type === "approve" ? "#22c55e" : "#3b82f6"
              } />
              <h3 style={{ margin: 0, color: "#f8fafc", fontSize: "1.1rem", fontFamily: "'Space Grotesk', sans-serif" }}>
                {confirmAction.type === "approve" && `Approve ${confirmAction.username}?`}
                {confirmAction.type === "blacklist" && `Blacklist ${confirmAction.username}?`}
                {confirmAction.type === "unblacklist" && `Restore ${confirmAction.username}?`}
                {confirmAction.type === "delete" && `Delete ${confirmAction.username}?`}
              </h3>
            </div>
            <p style={{ color: "#94a3b8", fontSize: "0.875rem", lineHeight: 1.6, margin: "0 0 20px 0" }}>
              {confirmAction.type === "approve" && "This will grant the user access to the platform. They will be notified via email."}
              {confirmAction.type === "blacklist" && "This will immediately revoke the user's access and terminate all active sessions. They will be notified via email."}
              {confirmAction.type === "unblacklist" && "This will restore the user's access to the platform. They will be notified via email."}
              {confirmAction.type === "delete" && "This will permanently remove the user and all their sessions. This action cannot be undone."}
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setConfirmAction(null)}>
                Cancel
              </button>
              <button
                className="btn"
                onClick={executeConfirmedAction}
                style={{
                  background: confirmAction.type === "delete" ? "#ef4444" :
                    confirmAction.type === "blacklist" ? "#f59e0b" :
                    confirmAction.type === "approve" ? "#22c55e" : "#3b82f6",
                  color: "#fff", fontWeight: 600,
                }}
              >
                {confirmAction.type === "approve" && <><CheckCircle2 size={14} /> Approve</>}
                {confirmAction.type === "blacklist" && <><ShieldOff size={14} /> Blacklist</>}
                {confirmAction.type === "unblacklist" && <><RotateCcw size={14} /> Restore</>}
                {confirmAction.type === "delete" && <><Trash2 size={14} /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}