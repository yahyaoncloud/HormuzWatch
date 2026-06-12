import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, User, UserPlus, AlertCircle, CheckCircle2, Mail, Shield, Wifi } from "lucide-react";
import logo from "../assets/logo.png";
import { supabase } from "../services/supabase";
import GlobeCanvas from "../components/GlobeCanvas";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(15,23,42,0.6)",
  border: "1px solid rgba(148,163,184,0.15)",
  borderRadius: "7px",
  padding: "11px 12px 11px 42px",
  color: "#f8fafc",
  fontSize: "0.875rem",
  outline: "none",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  fontFamily: "'Space Grotesk', 'Inter', sans-serif",
  boxSizing: "border-box" as const,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#64748b",
  fontSize: "0.625rem",
  fontWeight: 700,
  marginBottom: "7px",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontFamily: "'JetBrains Mono', monospace",
};

const focus = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = "rgba(99,102,241,0.5)";
  e.target.style.boxShadow = "0 0 0 3px rgba(79,70,229,0.12)";
};
const blur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = "rgba(148,163,184,0.15)";
  e.target.style.boxShadow = "none";
};

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

    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }

    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          }
        }
      });
      
      if (signUpError) {
        setError(signUpError.message);
      } else {
        setSuccess("Registration successful. Please check your email for a verification link.");
        setTimeout(() => navigate("/login"), 3500);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "#050816",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Grid overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage:
          "linear-gradient(rgba(79,70,229,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(79,70,229,0.025) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }} />

      {/* Radial ambient glow */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse at 20% 50%, rgba(79,70,229,0.07) 0%, transparent 55%), radial-gradient(ellipse at 80% 50%, rgba(56,189,248,0.04) 0%, transparent 50%)",
      }} />

      {/* ══ LEFT PANEL ════════════════════════════════════════════════════════ */}
      <div style={{
        position: "relative", zIndex: 10,
        width: "100%",
        maxWidth: "480px",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "40px 48px",
        borderRight: "1px solid rgba(148,163,184,0.08)",
        background: "rgba(5,8,22,0.85)",
        backdropFilter: "blur(8px)",
        flexShrink: 0,
        overflowY: "auto",
      }}>

        {/* Brand header */}
        <div style={{ marginBottom: "36px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
            <div style={{
              width: "40px", height: "40px",
              background: "rgba(15,23,42,0.8)",
              borderRadius: "8px", overflow: "hidden",
              border: "1px solid rgba(148,163,184,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <img src={logo} alt="HormuzWatch" style={{ width: "120%", height: "120%", objectFit: "cover" }} />
            </div>
            <div>
              <div style={{ fontSize: "0.9375rem", fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em", fontFamily: "'Space Grotesk', sans-serif" }}>
                HormuzWatch
              </div>
              <div style={{ fontSize: "0.5625rem", color: "#64748b", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", marginTop: "1px" }}>
                Geospatial Intel Platform
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <div style={{ width: "20px", height: "1px", background: "rgba(99,102,241,0.6)" }} />
              <span style={{
                fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.14em",
                textTransform: "uppercase", color: "#6366f1",
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                Operator Registration
              </span>
            </div>
            <h1 style={{
              fontSize: "1.75rem", fontWeight: 800, color: "#f8fafc",
              margin: 0, letterSpacing: "-0.03em", lineHeight: 1.15,
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              Request Access
            </h1>
            <p style={{ color: "#475569", fontSize: "0.8125rem", marginTop: "8px", lineHeight: 1.6 }}>
              Submit your profile for admin review. Access is granted after approval.
            </p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            color: "#fca5a5", padding: "10px 14px", borderRadius: "7px",
            marginBottom: "20px", fontSize: "0.8125rem",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0, color: "#ef4444" }} />
            {error}
          </div>
        )}

        {success && (
          <div style={{
            background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
            color: "#86efac", padding: "10px 14px", borderRadius: "7px",
            marginBottom: "20px", fontSize: "0.8125rem",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <CheckCircle2 size={14} style={{ flexShrink: 0, color: "#22c55e" }} />
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div>
            <label style={labelStyle}>Username</label>
            <div style={{ position: "relative" }}>
              <User size={14} color="#475569" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                required placeholder="Choose a username" style={inputStyle} onFocus={focus} onBlur={blur} autoComplete="username" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Email Address</label>
            <div style={{ position: "relative" }}>
              <Mail size={14} color="#475569" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="you@example.com" style={inputStyle} onFocus={focus} onBlur={blur} autoComplete="email" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: "relative" }}>
              <Lock size={14} color="#475569" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required placeholder="Min. 6 characters" style={inputStyle} onFocus={focus} onBlur={blur} autoComplete="new-password" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Confirm Password</label>
            <div style={{ position: "relative" }}>
              <Lock size={14} color="#475569" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                required placeholder="Re-enter password" style={inputStyle} onFocus={focus} onBlur={blur} autoComplete="new-password" />
            </div>
          </div>

          {/* Approval notice */}
          <div style={{
            background: "rgba(79,70,229,0.06)",
            border: "1px solid rgba(79,70,229,0.18)",
            borderRadius: "7px",
            padding: "10px 14px",
            display: "flex", alignItems: "flex-start", gap: "10px",
          }}>
            <Shield size={13} color="#6366f1" style={{ flexShrink: 0, marginTop: "2px" }} />
            <p style={{ color: "#64748b", fontSize: "0.75rem", margin: 0, lineHeight: 1.5, fontFamily: "'Space Grotesk', sans-serif" }}>
              Access requires admin approval. You'll be notified once your account is activated.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", padding: "11px 16px", cursor: loading ? "wait" : "pointer", fontSize: "0.875rem" }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                <span style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                Submitting...
              </span>
            ) : (
              <><UserPlus size={15} /> Request Access</>
            )}
          </button>
        </form>

        <div style={{
          marginTop: "28px", paddingTop: "20px",
          borderTop: "1px solid rgba(148,163,184,0.08)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: "0.8125rem",
        }}>
          <span style={{ color: "#475569" }}>
            Have an account?{" "}
            <Link to="/login" style={{ color: "#818cf8", fontWeight: 700 }}>Sign In</Link>
          </span>
          <Link to="/" style={{ color: "#475569", fontSize: "0.75rem", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}>
            ← Public Map
          </Link>
        </div>

        {/* Security notice */}
        <div style={{
          position: "absolute", bottom: "24px", left: "48px", right: "48px",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <Shield size={11} color="#334155" />
          <span style={{ fontSize: "0.625rem", color: "#334155", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em" }}>
            REGISTRATION PENDING ADMIN REVIEW · TLS ENCRYPTED
          </span>
        </div>
      </div>

      {/* ══ RIGHT PANEL — Globe ════════════════════════════════════════════════ */}
      <div style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
      }}
        className="hide-mobile"
      >
        {/* Platform label */}
        <div style={{
          position: "absolute", top: "40px", left: "48px", zIndex: 5,
          display: "flex", flexDirection: "column", gap: "6px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Wifi size={11} color="#22c55e" />
            <span style={{ fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#4ade80", fontFamily: "'JetBrains Mono', monospace" }}>
              Live Threat Monitor
            </span>
          </div>
          <div style={{ fontSize: "0.6875rem", color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>
            Strait of Hormuz · AIS Active
          </div>
        </div>

        {/* Scan-lines */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          pointerEvents: "none", zIndex: 1,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(148,163,184,0.012) 3px, rgba(148,163,184,0.012) 4px)",
        }} />

        {/* Globe */}
        <div style={{
          position: "absolute",
          right: "-20%",
          bottom: "-15%",
          zIndex: 2,
          opacity: 0.92,
          animation: "globeFadeIn 1.8s ease-out forwards",
        }}>
          <GlobeCanvas size={820} />
        </div>

        {/* Left-edge vignette */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
          background: "linear-gradient(to right, rgba(5,8,22,0.6) 0%, transparent 30%, transparent 70%, rgba(5,8,22,0.3) 100%)",
        }} />

        {/* Coordinate badge */}
        <div style={{
          position: "absolute", bottom: "40px", left: "48px", zIndex: 5,
          display: "flex", flexDirection: "column", gap: "4px",
        }}>
          <div style={{ fontSize: "0.5625rem", color: "#334155", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Watch Zone
          </div>
          <div style={{ fontSize: "0.75rem", color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
            26.06°N  56.28°E
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
            <span className="badge badge-info" style={{ fontSize: "0.5rem", padding: "1px 7px" }}>HORMUZ</span>
            <span className="badge badge-connected" style={{ fontSize: "0.5rem", padding: "1px 7px" }}>TRACKING</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes globeFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 0.92; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
