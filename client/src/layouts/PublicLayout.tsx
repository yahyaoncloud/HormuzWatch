import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, LogIn, UserPlus, Shield, ArrowLeft, LogOut, Menu, X } from "lucide-react";
import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";

export default function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDocs = location.pathname === "/docs";
  const { isAuthenticated, logout } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "#f8fafc", display: "flex", flexDirection: "column" }}>
      {/* Navbar */}
      <header style={{
        padding: "16px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid rgba(148,163,184,0.1)",
        background: "rgba(11,18,32,0.95)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        gap: "16px"
      }}>
        {/* Brand */}
        <Link to="/" onClick={closeMenu} style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
          <div style={{
            width: "36px", height: "36px", background: "rgba(15,23,42,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "6px", overflow: "hidden"
          }}>
            <img src={logo} alt="Logo" style={{ width: "120%", height: "120%", objectFit: "cover" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#f8fafc", margin: 0, letterSpacing: "-0.02em", fontFamily: "'Space Grotesk', sans-serif" }}>HormuzWatch</h1>
            <div style={{ fontSize: "0.625rem", color: "#94a3b8", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>Public Portal</div>
          </div>
        </Link>

        {/* Mobile Menu Button */}
        <button 
          className="show-mobile"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{ 
            background: "transparent", border: "1px solid rgba(148,163,184,0.2)", 
            color: "#f8fafc", padding: "8px", borderRadius: "6px", cursor: "pointer",
            display: "none" // Managed by CSS
          }}
        >
          {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Links - Desktop */}
        <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link to="/" className="btn btn-ghost" style={{ color: "#94a3b8" }}>
            <ArrowLeft size={14} /> Map
          </Link>
          {!isDocs && (
            <Link to="/docs" className="btn btn-ghost" style={{ color: "#94a3b8" }}>
              <BookOpen size={14} /> Docs
            </Link>
          )}
          {isDocs && (
            <Link to="/disclaimer" className="btn btn-ghost" style={{ color: "#94a3b8" }}>
              <Shield size={14} /> Disclaimer
            </Link>
          )}

          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="btn btn-ghost" style={{ color: "#818cf8" }}>
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="btn btn-ghost"
                style={{ color: "#fca5a5", borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)" }}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                <LogIn size={14} /> Sign In
              </Link>
              <Link to="/register" className="btn btn-primary">
                <UserPlus size={14} /> Access
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="show-mobile" style={{
          flexDirection: "column", background: "rgba(11,18,32,0.98)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(148,163,184,0.1)", padding: "16px 32px", gap: "12px",
          position: "sticky", top: "69px", zIndex: 40,
        }}>
          <Link to="/" onClick={closeMenu} className="btn btn-ghost" style={{ color: "#94a3b8", justifyContent: "flex-start" }}>
            <ArrowLeft size={14} /> Map
          </Link>
          <Link to="/docs" onClick={closeMenu} className="btn btn-ghost" style={{ color: "#94a3b8", justifyContent: "flex-start" }}>
            <BookOpen size={14} /> Docs
          </Link>
          <Link to="/disclaimer" onClick={closeMenu} className="btn btn-ghost" style={{ color: "#94a3b8", justifyContent: "flex-start" }}>
            <Shield size={14} /> Disclaimer
          </Link>

          <div style={{ height: "1px", background: "rgba(148,163,184,0.1)", margin: "8px 0" }} />

          {isAuthenticated ? (
            <>
              <Link to="/dashboard" onClick={closeMenu} className="btn btn-ghost" style={{ color: "#818cf8", justifyContent: "flex-start" }}>
                Dashboard
              </Link>
              <button
                onClick={() => { handleLogout(); closeMenu(); }}
                className="btn btn-ghost"
                style={{ color: "#fca5a5", borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)", justifyContent: "center" }}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Link to="/login" onClick={closeMenu} className="btn btn-ghost" style={{ justifyContent: "center" }}>
                <LogIn size={14} /> Sign In
              </Link>
              <Link to="/register" onClick={closeMenu} className="btn btn-primary" style={{ justifyContent: "center" }}>
                <UserPlus size={14} /> Access
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <main style={{ flex: 1, position: "relative" }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{
        padding: "24px",
        textAlign: "center",
        borderTop: "1px solid rgba(148,163,184,0.1)",
        background: "rgba(11,18,32,0.95)",
        marginTop: "auto"
      }}>
        <div style={{ fontSize: "0.6875rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em", marginBottom: "8px" }}>
          HORMUZWATCH COMMAND AND CONTROL © {new Date().getFullYear()} — UNCLASSIFIED
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
          <Link to="/docs" style={{ color: "#6366f1", fontSize: "0.75rem", textDecoration: "none" }}>Documentation</Link>
          <Link to="/disclaimer" style={{ color: "#6366f1", fontSize: "0.75rem", textDecoration: "none" }}>Disclaimer</Link>
        </div>
      </footer>
    </div>
  );
}
