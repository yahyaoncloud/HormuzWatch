import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Radar,
  AreaChart,
  BellDot,
  HeartPulse,
  ScrollText,
  Sparkles,
  BookMarked,
  Sun,
  Moon,
  Menu,
  X,
  Shield,
  ShieldCheck,
  LogOut,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useWebSocket } from "../context/WebSocketContext";
import { useAuth } from "../context/AuthContext";
import { isPrimaryAdmin } from "../config/auth";
import { Tooltip } from "../components/ui/tooltip";
import logo from "../assets/logo.png";

const navItems = [
  { path: "/dashboard", icon: Radar, label: "Dashboard" },
  { path: "/about", icon: BookMarked, label: "About" },
  { path: "/analytics", icon: AreaChart, label: "Analytics" },
  { path: "/insights", icon: Sparkles, label: "Insights" },
  { path: "/news", icon: BookMarked, label: "News" },
  { path: "/docs", icon: BookMarked, label: "Docs" },
  { path: "/settings", icon: ScrollText, label: "Settings" },
  { path: "/admin", icon: ShieldCheck, label: "Admin", adminOnly: true },
];

export default function RootLayout() {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopMoreOpen, setDesktopMoreOpen] = useState(false);
  const { isConnected, tracks } = useWebSocket();
  const { user, logout, expiresAt } = useAuth();
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isPrimaryAdmin(user));
  const sessionExpiry = expiresAt ? new Date(expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

  const toggleDark = () => {
    setDarkMode((p) => !p);
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── Navigation Bar ── */}
      <header className="nav-bar">
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            minHeight: "64px",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          {/* Brand */}
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                background: "rgba(15,23,42,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden"
              }}
            >
              <img src={logo} alt="HormuzWatch Logo" style={{ width: "120%", height: "120%", objectFit: "cover" }} />
            </div>
            <div style={{ lineHeight: 1.15 }}>
              <div
                style={{
                  fontSize: "1rem",
                  fontWeight: 800,
                  color: "#f8fafc",
                  letterSpacing: "-0.02em",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                HormuzWatch
              </div>
              <div
                style={{
                  fontSize: "0.625rem",
                  color: "#94a3b8",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontFamily: "'JetBrains Mono', monospace",
                  marginTop: "2px",
                }}
              >
                Geospatial Intel
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              flex: 1,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
            className="hide-mobile"
          >
            {/* Primary Links */}
            {visibleNavItems.slice(0, 3).map(({ path, icon: Icon, label }) => {
              const active =
                location.pathname === path ||
                (path === "/dashboard" && location.pathname === "/");
              return (
                <Link
                  key={path}
                  to={path}
                  className={`nav-link ${active ? "nav-link-active" : ""}`}
                >
                  <Icon size={15} strokeWidth={active ? 2.5 : 2} />
                  <span>{label}</span>
                </Link>
              );
            })}

            {/* Dropdown for More Links */}
            {visibleNavItems.length > 3 && (
              <div 
                style={{ position: "relative" }} 
                onMouseEnter={() => setDesktopMoreOpen(true)}
                onMouseLeave={() => setDesktopMoreOpen(false)}
              >
                <button className="nav-link" style={{ cursor: "pointer", background: "transparent", border: "none" }}>
                  <Menu size={15} strokeWidth={2} />
                  <span>More</span>
                </button>
                
                {desktopMoreOpen && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    paddingTop: "8px", // Invisible bridge to prevent hover loss
                    zIndex: 1000,
                  }}>
                    <div style={{
                      background: "rgba(15,23,42,0.98)",
                      border: "1px solid rgba(148,163,184,0.15)",
                      borderRadius: "8px",
                      padding: "8px",
                      minWidth: "160px",
                      backdropFilter: "blur(12px)",
                      boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}>
                      {visibleNavItems.slice(3).map(({ path, icon: Icon, label }) => {
                        const active = location.pathname === path;
                        return (
                          <Link
                            key={path}
                            to={path}
                            className={`nav-link ${active ? "nav-link-active" : ""}`}
                            style={{ width: "100%", justifyContent: "flex-start", padding: "8px 12px", border: "none" }}
                            onClick={() => setDesktopMoreOpen(false)}
                          >
                            <Icon size={15} strokeWidth={active ? 2.5 : 2} />
                            <span>{label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Right Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            {/* Connection badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "5px 12px",
                borderRadius: "6px",
                fontSize: "0.6875rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: isConnected
                  ? "rgba(34,197,94,0.1)"
                  : "rgba(239,68,68,0.1)",
                border: isConnected
                  ? "1px solid rgba(34,197,94,0.3)"
                  : "1px solid rgba(239,68,68,0.3)",
                color: isConnected ? "#86efac" : "#fca5a5",
                fontFamily: "'JetBrains Mono', monospace",
              }}
              className="hide-mobile"
            >
              {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isConnected
                ? `${tracks.size} Tracked`
                : "Offline"}
            </div>

            {/* Dark mode toggle */}
            {/* <Tooltip content="Toggle Theme" position="bottom">
              <button
                className="btn-ghost btn btn-sm hide-mobile"
                onClick={toggleDark}
                style={{ height: "32px", width: "32px", padding: 0 }}
              >
                {darkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </Tooltip> */}

            {user && (
              <div
                className="hide-mobile"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: "1px solid rgba(148,163,184,0.12)",
                  background: "rgba(15,23,42,0.35)",
                  color: "#cbd5e1",
                  fontSize: "0.6875rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  maxWidth: "220px",
                }}
              >
                <Shield size={12} color={isPrimaryAdmin(user) ? "#a5b4fc" : "#64748b"} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.username}
                </span>
                <span style={{ color: "#64748b", textTransform: "uppercase" }}>
                  {sessionExpiry ? `UNTIL ${sessionExpiry}` : user.role}
                </span>
              </div>
            )}

            <Tooltip content="Logout" position="bottom">
              <button
                className="btn-ghost btn btn-sm"
                onClick={() => void logout()}
                style={{ height: "32px", width: "32px", padding: 0 }}
                aria-label="Logout"
              >
                <LogOut size={15} />
              </button>
            </Tooltip>

            {/* Mobile hamburger */}
            <button
              className="nav-mobile-btn show-mobile"
              onClick={() => setMobileOpen((p) => !p)}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="nav-mobile-menu">
            {visibleNavItems.map(({ path, icon: Icon, label }) => {
              const active =
                location.pathname === path ||
                (path === "/dashboard" && location.pathname === "/");
              return (
                <Link
                  key={path}
                  to={path}
                  className={`nav-link ${active ? "nav-link-active" : ""}`}
                  style={{ justifyContent: "flex-start", padding: "10px 12px" }}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              );
            })}
            <div
              style={{
                marginTop: "8px",
                paddingTop: "12px",
                borderTop: "1px solid rgba(148,163,184,0.1)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.75rem",
                color: isConnected ? "#86efac" : "#fca5a5",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
              }}
            >
              {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isConnected
                ? `LIVE · ${tracks.size} TRACKED`
                : "DISCONNECTED"}
            </div>
            {user && (
              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop: "1px solid rgba(148,163,184,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: "#e2e8f0", fontSize: "0.8125rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.username}
                  </div>
                  <div style={{ color: "#64748b", fontSize: "0.6875rem", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>
                    {sessionExpiry ? `SESSION UNTIL ${sessionExpiry}` : user.role}
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setMobileOpen(false);
                    void logout();
                  }}
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── Page Content ── */}
      <main style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
        <Outlet />
      </main>

      {/* ── Footer ── */}
      {location.pathname !== "/dashboard" && location.pathname !== "/" && (
        <footer style={{
          padding: "24px 16px",
          textAlign: "center",
          fontSize: "0.6875rem",
          color: "#64748b",
          fontFamily: "'JetBrains Mono', monospace",
          borderTop: "1px solid rgba(148,163,184,0.05)",
          zIndex: 1,
          position: "relative",
          background: "rgba(11,18,32,0.8)",
          letterSpacing: "0.05em",
          marginTop: "auto"
        }}>
          <div style={{ marginBottom: "8px" }}>
            HORMUZWATCH COMMAND AND CONTROL © {new Date().getFullYear()} — UNCLASSIFIED // FOR OFFICIAL USE ONLY
          </div>
          <div>
            <Link to="/disclaimer" style={{ color: "#818cf8", textDecoration: "none" }}>Disclaimer & Terms of Use</Link>
          </div>
        </footer>
      )}
    </div>
  );
}
