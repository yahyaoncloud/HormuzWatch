import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, User, UserPlus, AlertCircle, CheckCircle2, Mail } from "lucide-react";
import logo from "../assets/logo.png";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess("Registration successful. Redirecting to login...");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setError(data.error || "Registration failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)",
      padding: "20px"
    }}>
      <div style={{
        background: "rgba(11,18,32,0.8)",
        border: "1px solid rgba(148,163,184,0.1)",
        borderRadius: "12px",
        padding: "40px",
        width: "100%",
        maxWidth: "400px",
        backdropFilter: "blur(12px)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
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
            Operator Registration
          </p>
        </div>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#ef4444",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "24px",
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div style={{
            background: "rgba(34,197,94,0.1)",
            border: "1px solid rgba(34,197,94,0.2)",
            color: "#22c55e",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "24px",
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <CheckCircle2 size={16} />
            {success}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 700, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Username</label>
            <div style={{ position: "relative" }}>
              <User size={18} color="#64748b" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: "100%",
                  background: "rgba(15,23,42,0.6)",
                  border: "1px solid rgba(148,163,184,0.2)",
                  borderRadius: "6px",
                  padding: "12px 12px 12px 40px",
                  color: "#f8fafc",
                  fontSize: "0.875rem",
                  outline: "none",
                  transition: "border-color 0.2s ease"
                }}
                onFocus={(e) => e.target.style.borderColor = "#6366f1"}
                onBlur={(e) => e.target.style.borderColor = "rgba(148,163,184,0.2)"}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 700, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email Address</label>
            <div style={{ position: "relative" }}>
              <Mail size={18} color="#64748b" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  background: "rgba(15,23,42,0.6)",
                  border: "1px solid rgba(148,163,184,0.2)",
                  borderRadius: "6px",
                  padding: "12px 12px 12px 40px",
                  color: "#f8fafc",
                  fontSize: "0.875rem",
                  outline: "none",
                  transition: "border-color 0.2s ease"
                }}
                onFocus={(e) => e.target.style.borderColor = "#6366f1"}
                onBlur={(e) => e.target.style.borderColor = "rgba(148,163,184,0.2)"}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 700, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Password</label>
            <div style={{ position: "relative" }}>
              <Lock size={18} color="#64748b" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  background: "rgba(15,23,42,0.6)",
                  border: "1px solid rgba(148,163,184,0.2)",
                  borderRadius: "6px",
                  padding: "12px 12px 12px 40px",
                  color: "#f8fafc",
                  fontSize: "0.875rem",
                  outline: "none",
                  transition: "border-color 0.2s ease"
                }}
                onFocus={(e) => e.target.style.borderColor = "#6366f1"}
                onBlur={(e) => e.target.style.borderColor = "rgba(148,163,184,0.2)"}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 700, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Confirm Password</label>
            <div style={{ position: "relative" }}>
              <Lock size={18} color="#64748b" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  background: "rgba(15,23,42,0.6)",
                  border: "1px solid rgba(148,163,184,0.2)",
                  borderRadius: "6px",
                  padding: "12px 12px 12px 40px",
                  color: "#f8fafc",
                  fontSize: "0.875rem",
                  outline: "none",
                  transition: "border-color 0.2s ease"
                }}
                onFocus={(e) => e.target.style.borderColor = "#6366f1"}
                onBlur={(e) => e.target.style.borderColor = "rgba(148,163,184,0.2)"}
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
              marginTop: "8px",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Creating Profile..." : <><UserPlus size={18} /> Register</>}
          </button>
        </form>

        <div style={{ marginTop: "24px", textAlign: "center", fontSize: "0.8125rem", color: "#64748b" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#818cf8", textDecoration: "none", fontWeight: 600 }}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}
