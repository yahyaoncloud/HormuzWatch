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
  Wifi,
  WifiOff,
} from "lucide-react";
import { useWebSocket } from "../context/WebSocketContext";
import { Tooltip } from "../components/ui/tooltip";
import logo from "../assets/logo.png";

const navItems = [
  { path: "/dashboard", icon: Radar, label: "Dashboard" },
  { path: "/analytics", icon: AreaChart, label: "Analytics" },
  { path: "/insights", icon: Sparkles, label: "Insights" },
  { path: "/docs", icon: BookMarked, label: "Docs" },
];

export default function RootLayout() {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isConnected, vessels } = useWebSocket();

  const toggleDark = () => {
    setDarkMode((p) => !p);
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* ── Navigation Bar ── */}
      <header className="nav-bar">
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "0 16px",
            height: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
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
              flexWrap: "nowrap",
              overflow: "hidden",
            }}
            className="hide-mobile"
          >
            {navItems.map(({ path, icon: Icon, label }) => {
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
                ? `${vessels.size} Tracked`
                : "Offline"}
            </div>

            {/* Dark mode toggle */}
            <Tooltip content="Toggle Theme" position="bottom">
              <button
                className="btn-ghost btn btn-sm"
                onClick={toggleDark}
                style={{ height: "32px", width: "32px", padding: 0 }}
              >
                {darkMode ? <Sun size={15} /> : <Moon size={15} />}
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
            {navItems.map(({ path, icon: Icon, label }) => {
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
                ? `LIVE · ${vessels.size} TRACKED`
                : "DISCONNECTED"}
            </div>
          </div>
        )}
      </header>

      {/* ── Page Content ── */}
      <main style={{ position: "relative", zIndex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}
