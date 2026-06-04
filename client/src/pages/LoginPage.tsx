import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { Lock, User, LogIn, AlertCircle } from "lucide-react";
import logo from "../assets/logo.png";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user, {
          sessionId: data.sessionId,
          expiresAt: data.expiresAt,
        });
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(15,23,42,0.6)",
    border: "1px solid rgba(148,163,184,0.15)",
    borderRadius: "6px",
    padding: "12px 12px 12px 42px",
    color: "#f8fafc",
    fontSize: "0.875rem",
    outline: "none",
    transition: "border-color 0.25s ease, box-shadow 0.25s ease",
    fontFamily: "'Inter', sans-serif",
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(ellipse at 30% 20%, rgba(79,70,229,0.08) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(56,189,248,0.05) 0%, transparent 50%), #020617",
      padding: "20px",
    }}>
      {/* Scanline texture */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(148,163,184,0.015) 2px, rgba(148,163,184,0.015) 4px)",
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        background: "rgba(11,18,32,0.7)",
        border: "1px solid rgba(148,163,184,0.1)",
        borderRadius: "12px",
        padding: "44px 40px 36px",
        width: "100%",
        maxWidth: "400px",
        backdropFilter: "blur(16px)",
        boxShadow: "0 25px 60px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.05)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            background: "rgba(15,23,42,0.4)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: "8px",
            marginBottom: "16px"
          }}>
            <img src={logo} alt="HormuzWatch Logo" style={{ width: "120%", height: "120%", objectFit: "cover" }} />
          </div>
          <h1 style={{
            fontSize: "1.375rem",
            fontWeight: 800,
            color: "#f8fafc",
            margin: "0 0 4px 0",
            letterSpacing: "-0.02em",
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            HormuzWatch
          </h1>
          <p style={{
            color: "#94a3b8",
            fontSize: "0.6875rem",
            fontWeight: 700,
            margin: 0,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}>
            Operator Authentication
          </p>
        </div>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.15)",
            color: "#ef4444",
            padding: "10px 12px",
            borderRadius: "6px",
            marginBottom: "24px",
            fontSize: "0.8125rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={{
              display: "block", color: "#64748b", fontSize: "0.625rem", fontWeight: 700,
              marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.12em",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              Username
            </label>
            <div style={{ position: "relative" }}>
              <User size={16} color="#475569" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter username"
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = "#6366f1"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(148,163,184,0.15)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
          </div>

          <div>
            <label style={{
              display: "block", color: "#64748b", fontSize: "0.625rem", fontWeight: 700,
              marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.12em",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={16} color="#475569" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = "#6366f1"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(148,163,184,0.15)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "4px",
              cursor: loading ? "wait" : "pointer"
            }}
          >
            {loading ? "Authenticating..." : <><LogIn size={16} /> Sign In</>}
          </button>
        </form>

        <div style={{
          marginTop: "28px", textAlign: "center", fontSize: "0.8125rem", color: "#475569",
          borderTop: "1px solid rgba(148,163,184,0.08)", paddingTop: "20px",
        }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "#818cf8", textDecoration: "none", fontWeight: 700 }}>
            Request Access
          </Link>
        </div>
      </div>
    </div>
  );
}
