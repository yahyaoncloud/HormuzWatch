import { useState, useEffect } from "react";
import HormuzMap from "../components/HormuzMap";
import { Link } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import {
  LogIn,
  UserPlus,
  Radar,
  Activity,
  AlertTriangle,
  Ship,
  Plane,
  Shield,
  Globe,
  ChevronRight,
  Eye,
  Zap,
  Menu,
  X,
} from "lucide-react";
import logo from "../assets/logo.png";

export default function PublicLandingPage() {
  const { tracks, isConnected } = useWebSocket();
  const [clock, setClock] = useState(new Date());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Fix #3: SSR Safety
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1920
  );

  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const isMobile = windowWidth < 768;

  // Fix #4: Clear stale layout state on screen rotation/resize
  useEffect(() => {
    if (!isMobile) {
      setMobileMenuOpen(false);
    }
  }, [isMobile]);

  const trackArray = Array.from(tracks.values());
  const vessels = trackArray.filter((t) => !t.id.startsWith("FLIGHT-"));
  const aircraft = trackArray.filter((t) => t.id.startsWith("FLIGHT-"));
  const threats = trackArray.filter((t) => t.anomalyScore >= 40);
  const criticals = trackArray.filter((t) => t.severity === "critical" || t.severity === "high");

  return (
    // Fix #2: Mobile Safari dynamic viewport support
    <div style={{ position: "relative", width: "100vw", height: "100dvh", overflow: "hidden", background: "#020617" }}>
      {/* Fullscreen Map */}
      <HormuzMap />

      {/* Vignette Overlay */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 999, pointerEvents: "none",
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(2,6,23,0.6) 100%)",
      }} />

      {/* ─── TOP NAV BAR ─── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 1001,
        padding: isMobile ? "12px 16px" : "16px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "linear-gradient(to bottom, rgba(2,6,23,0.95) 0%, rgba(2,6,23,0.7) 60%, transparent 100%)",
      }}>
        {/* Logo matching Dashboard theme */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: isMobile ? "32px" : "40px",
            height: isMobile ? "32px" : "40px",
            background: "rgba(15,23,42,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: "6px"
          }}>
            <img src={logo} alt="HormuzWatch Logo" style={{ width: "120%", height: "120%", objectFit: "cover" }} />
          </div>
          <div style={{ lineHeight: 1.15 }}>
            <h1 style={{
              fontSize: isMobile ? "0.95rem" : "1.125rem",
              fontWeight: 800,
              color: "#f8fafc",
              margin: 0,
              letterSpacing: "-0.02em",
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              HormuzWatch
            </h1>
            <div style={{
              fontSize: "0.625rem",
              color: "#94a3b8",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontFamily: "'JetBrains Mono', monospace",
              marginTop: "2px",
              display: isMobile ? "none" : "block",
            }}>
              Geospatial Intel
            </div>
          </div>
        </div>

        {/* Center Status */}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: isConnected ? "#22c55e" : "#ef4444",
                boxShadow: isConnected ? "0 0 8px #22c55e" : "0 0 8px #ef4444",
                animation: isConnected ? "pulse 2s infinite" : "none",
              }} />
              <span style={{ color: "#94a3b8", fontSize: "0.6875rem", fontFamily: "'JetBrains Mono', monospace" }}>
                {isConnected ? "FEED LIVE" : "OFFLINE"}
              </span>
            </div>
            <span style={{
              color: "#475569", fontSize: "0.6875rem",
              fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em",
            }}>
              {clock.toISOString().replace("T", " ").slice(0, 19)} UTC
            </span>
          </div>
        )}

        {/* Auth Buttons / Mobile Menu Trigger */}
        {isMobile ? (
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: "rgba(15,23,42,0.6)",
              border: "1px solid rgba(148,163,184,0.15)",
              color: "#f8fafc",
              borderRadius: "4px",
              padding: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link to="/login" className="btn btn-ghost">
              <LogIn size={14} /> Sign In
            </Link>
            <Link to="/register" className="btn btn-primary">
              <UserPlus size={14} /> Request Access
            </Link>
          </div>
        )}
      </div>

      {/* ─── MOBILE DROP DOWN NAV DRAWER ─── */}
      {isMobile && mobileMenuOpen && (
        <div style={{
          position: "absolute", top: "57px", left: 0, right: 0, zIndex: 1002,
          background: "rgba(11,18,32,0.98)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(148,163,184,0.15)",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          // Fix #7: Mobile max height and clipping fixes
          maxHeight: "calc(100dvh - 60px)",
          overflowY: "auto",
        }}>
          {/* Fix #1a: Property typo fixed (justifyBetween -> justifyContent) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(148,163,184,0.08)", paddingBottom: "10px", marginBottom: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{
                width: "7px", height: "7px", borderRadius: "50%",
                background: isConnected ? "#22c55e" : "#ef4444",
                boxShadow: isConnected ? "0 0 6px #22c55e" : "0 0 6px #ef4444",
              }} />
              <span style={{ color: "#94a3b8", fontSize: "0.625rem", fontFamily: "'JetBrains Mono', monospace" }}>
                {isConnected ? "SYSTEM OPERATIONAL" : "DISCONNECTED"}
              </span>
            </div>
            <span style={{ color: "#64748b", fontSize: "0.625rem", fontFamily: "'JetBrains Mono', monospace", marginLeft: "auto" }}>
              {clock.toISOString().slice(11, 19)} UTC
            </span>
          </div>
          <Link to="/login" className="btn btn-ghost" style={{ justifyContent: "center", width: "100%", padding: "10px" }} onClick={() => setMobileMenuOpen(false)}>
            <LogIn size={14} /> Sign In
          </Link>
          <Link to="/register" className="btn btn-primary" style={{ justifyContent: "center", width: "100%", padding: "10px" }} onClick={() => setMobileMenuOpen(false)}>
            <UserPlus size={14} /> Request Access
          </Link>
        </div>
      )}

      {/* ─── TELEMETRY CARD PANEL ─── */}
      {/* Fix #5: Adaptive grid layout switcher for desktop strip vs mobile compact banner */}
      {isMobile ? (
        <div style={{
          position: "absolute", top: "65px", left: "10px", right: "10px", zIndex: 1001,
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px",
        }}>
          {[
            { icon: <Ship size={14} />, label: "VSL", value: vessels.length, color: "#c47a3a" },
            { icon: <Plane size={14} />, label: "AIR", value: aircraft.length, color: "#38bdf8" },
            { icon: <AlertTriangle size={14} />, label: "TRT", value: threats.length, color: "#ef4444" },
            { icon: <Activity size={14} />, label: "ALL", value: trackArray.length, color: "#22c55e" },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: "rgba(11,18,32,0.85)", backdropFilter: "blur(8px)",
              border: "1px solid rgba(148,163,184,0.12)", borderRadius: "6px",
              padding: "6px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
            }}>
              <span style={{ color: stat.color }}>{stat.icon}</span>
              <span style={{ color: "#f8fafc", fontSize: "0.85rem", fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>{stat.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          position: "absolute", top: "90px", left: "20px", zIndex: 1001,
          display: "flex", flexDirection: "column", gap: "12px", width: "220px",
        }}>
          {[
            { icon: <Ship size={16} />, label: "VESSELS", value: vessels.length, color: "#c47a3a" },
            { icon: <Plane size={16} />, label: "AIRCRAFT", value: aircraft.length, color: "#38bdf8" },
            { icon: <AlertTriangle size={16} />, label: "THREATS", value: threats.length, color: "#ef4444" },
            { icon: <Activity size={16} />, label: "TOTAL TRACKS", value: trackArray.length, color: "#22c55e" },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: "rgba(11,18,32,0.85)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(148,163,184,0.12)",
              borderRadius: "8px",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ color: stat.color, background: `${stat.color}15`, padding: "6px", borderRadius: "6px" }}>{stat.icon}</span>
                <span style={{
                  color: "#94a3b8", fontSize: "0.625rem", fontWeight: 700,
                  letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace",
                }}>{stat.label}</span>
              </div>
              <span style={{
                color: "#f8fafc", fontSize: "1.25rem", fontWeight: 700,
                fontFamily: "'Space Grotesk', sans-serif",
              }}>{stat.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ─── BOTTOM-LEFT INFO CARD ─── */}
      <div style={{
        position: "absolute", 
        bottom: isMobile ? "0px" : "30px", 
        left: isMobile ? "0px" : "20px", 
        right: isMobile ? "0px" : "auto",
        zIndex: 1001,
        width: isMobile ? "100%" : "340px",
        background: "rgba(11,18,32,0.9)", 
        backdropFilter: "blur(16px)",
        border: isMobile ? "none" : "1px solid rgba(148,163,184,0.1)", 
        borderTop: isMobile ? "1px solid rgba(148,163,184,0.15)" : "1px solid rgba(148,163,184,0.1)",
        borderRadius: isMobile ? "0px" : "10px",
        padding: isMobile ? "16px" : "24px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: isMobile ? "8px" : "16px" }}>
          <Eye size={14} color="#818cf8" />
          <span style={{
            color: "#94a3b8", fontSize: "0.625rem", fontWeight: 700,
            letterSpacing: "0.12em", fontFamily: "'JetBrains Mono', monospace",
            textTransform: "uppercase",
          }}>
            Public Intelligence Feed
          </span>
        </div>

        <h2 style={{
          color: "#f8fafc", fontSize: isMobile ? "1rem" : "1.125rem", fontWeight: 800, margin: "0 0 10px 0",
          lineHeight: 1.3,
        }}>
          Strait of Hormuz<br />
          <span style={{ color: "#818cf8" }}>Real-Time Monitoring</span>
        </h2>

        {!isMobile && (
          <p style={{
            color: "#64748b", fontSize: "0.75rem", lineHeight: 1.6, margin: "0 0 20px 0",
          }}>
            Live tracking of maritime vessels and aviation assets transiting the world's most
            critical energy chokepoint. Anomaly detection powered by ML-driven behavioral analysis.
          </p>
        )}

        {/* Features Matrix */}
        {!isMobile && (
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "20px",
          }}>
            {[
              { icon: <Radar size={12} />, text: "AIS + ADS-B Fusion" },
              { icon: <Zap size={12} />, text: "ML Anomaly Scoring" },
              { icon: <Globe size={12} />, text: "GDELT Geopolitical" },
              { icon: <Shield size={12} />, text: "Geofence Alerting" },
            ].map((feat) => (
              <div key={feat.text} style={{
                display: "flex", alignItems: "center", gap: "6px",
                color: "#94a3b8", fontSize: "0.625rem", fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                <span style={{ color: "#6366f1" }}>{feat.icon}</span>
                {feat.text}
              </div>
            ))}
          </div>
        )}

        <Link to="/login" className="btn btn-primary" style={{ width: "100%", padding: "10px", marginTop: isMobile ? "4px" : "0px" }}>
          Access Full Command Center <ChevronRight size={16} />
        </Link>
      </div>

      {/* ─── BOTTOM-RIGHT LIVE THREAT TICKER / MOBILE THREAT BADGE ─── */}
      {/* Fix #6: Compact alert notification for mobile screens */}
      {isMobile ? (
        criticals.length > 0 && (
          <div style={{
            position: "absolute", top: "120px", right: "10px", zIndex: 1001,
            background: "rgba(239,68,68,0.9)", backdropFilter: "blur(4px)",
            padding: "6px 10px", borderRadius: "6px", fontSize: "12px",
            color: "#fff", fontWeight: 700, boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
          }}>
            {criticals.length} Alerts
          </div>
        )
      ) : (
        criticals.length > 0 && (
          <div style={{
            position: "absolute", bottom: "30px", right: "20px", zIndex: 1001,
            width: "300px",
            background: "rgba(11,18,32,0.85)", backdropFilter: "blur(16px)",
            border: "1px solid rgba(239,68,68,0.15)", borderRadius: "10px",
            padding: "16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          }}>
            {/* Fix #1b: Property typo fixed (justifyBetween -> justifyContent) */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertTriangle size={13} color="#ef4444" />
                <span style={{
                  color: "#ef4444", fontSize: "0.5625rem", fontWeight: 800,
                  letterSpacing: "0.12em", fontFamily: "'JetBrains Mono', monospace",
                  textTransform: "uppercase",
                }}>
                  Active Threat Alerts
                </span>
              </div>
              <span style={{
                background: "rgba(239,68,68,0.15)",
                color: "#ef4444", padding: "2px 6px", borderRadius: "3px",
                fontSize: "0.625rem", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
              }}>
                {criticals.length}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
              {criticals.slice(0, 5).map((t) => {
                const sevColor = t.severity === "critical" ? "#ef4444" : "#f59e0b";
                return (
                  <div key={t.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "rgba(239,68,68,0.05)",
                    border: `1px solid ${sevColor}22`,
                    borderRadius: "5px", padding: "8px 10px",
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        color: "#e2e8f0", fontSize: "0.75rem", fontWeight: 700,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>{t.name || t.id}</div>
                      <div style={{
                        color: "#64748b", fontSize: "0.5625rem",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>{t.id}</div>
                    </div>
                    <div style={{
                      background: `${sevColor}1a`, border: `1px solid ${sevColor}44`,
                      color: sevColor, padding: "2px 6px", borderRadius: "3px",
                      fontSize: "0.625rem", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
                      textTransform: "uppercase", flexShrink: 0,
                    }}>
                      {t.anomalyScore}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* ─── PULSE ANIMATION KEYFRAMES ─── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}