import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen, Server, Cpu, Database, Globe, Shield, Activity,
  ArrowRight, ChevronRight, Code2, Layers, Lock, Zap, BarChart2,
  GitBranch, Terminal, AlertTriangle, ExternalLink, LogIn, UserPlus,
  Radio, Eye, BrainCircuit, Cloud, Package, Key, BarChart, Monitor,
  Laptop, Boxes, LogOut, Menu, X
} from "lucide-react";
import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Section { id: string; label: string; icon: React.ElementType; }

const NAV_SECTIONS: Section[] = [
  { id: "overview",      label: "Overview",         icon: BookOpen    },
  { id: "architecture",  label: "Architecture",     icon: Layers      },
  { id: "data-sources",  label: "Data Sources",     icon: Globe       },
  { id: "ml-engine",     label: "ML Engine",        icon: BrainCircuit},
  { id: "api-reference", label: "API Reference",    icon: Terminal    },
  { id: "security",      label: "Security & Auth",  icon: Lock        },
  { id: "disclaimer",    label: "Legal",            icon: Shield      },
];

const DATA_SOURCES = [
  { name: "AISStream",       domain: "AIS / Maritime",        description: "Real-time global AIS vessel tracking via WebSocket. Provides MMSI, position, speed, course, and vessel metadata.",                       license: "Free tier, public data",       color: "#38bdf8" },
  { name: "OpenSky Network", domain: "ADS-B / Aviation",      description: "Crowdsourced ADS-B aircraft state vectors. Provides ICAO24, callsign, altitude, velocity, and heading.",                                 license: "Non-commercial, public data",  color: "#6366f1" },
  { name: "GDELT Project",   domain: "Events / OSINT",        description: "Global event database derived from news media. Used for geopolitical context layers in threat visualization.",                             license: "Open access",                  color: "#b87333" },
  { name: "NASA FIRMS",      domain: "Thermal / Environmental",description: "Fire and thermal anomaly detection from MODIS and VIIRS satellite instruments.",                                                          license: "Public domain",                color: "#ef4444" },
  { name: "Open-Meteo",      domain: "Weather / Maritime",    description: "Open-source weather forecast API for sea-state and visibility context overlays.",                                                         license: "CC BY 4.0",                    color: "#22c55e" },
];

const REST_ENDPOINTS = [
  { method: "GET",  path: "/api/v1/tracks",                desc: "Fetch all active tracked objects (vessels + aircraft)",    auth: false },
  { method: "GET",  path: "/api/v1/analytics/anomalies",   desc: "Historical anomaly score reports with pagination",          auth: true  },
  { method: "GET",  path: "/api/v1/analytics/track/:id",   desc: "Full telemetry history for a specific track",               auth: true  },
  { method: "POST", path: "/api/predict",                  desc: "Internal ML inference scoring trigger (service-to-service)",auth: true  },
  { method: "GET",  path: "/api/v1/news",                  desc: "Geopolitical event feed from GDELT processing pipeline",    auth: true  },
  { method: "GET",  path: "/api/v1/health",                desc: "System health status — backend, DB, and ML service",       auth: false },
];

const METHOD_COLOR: Record<string, string> = { GET: "#22c55e", POST: "#6366f1", PUT: "#f59e0b", DELETE: "#ef4444" };

const scrollTo = (id: string) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

// ─────────────────────────────────────────────────────────────────────────────
// Architecture Diagram Data
// ─────────────────────────────────────────────────────────────────────────────

/** A single "row" in the architecture diagram */
interface DiagramRow {
  label: string;          // row / tier label shown to the left
  color: string;          // accent colour
  nodes: DiagramNode[];
}

interface DiagramNode {
  label: string;
  sublabel?: string;
  icon: React.ElementType;
  color: string;
  badge?: string;
  badgeColor?: string;
}

const DEV_ROWS: DiagramRow[] = [
  {
    label: "External APIs",
    color: "#38bdf8",
    nodes: [
      { label: "AISStream",    sublabel: "WebSocket",         icon: Radio,   color: "#38bdf8" },
      { label: "OpenSky",      sublabel: "REST Poll",          icon: Radio,   color: "#6366f1" },
      { label: "GDELT / FIRMS",sublabel: "HTTP REST",          icon: Globe,   color: "#b87333" },
      { label: "Open-Meteo",   sublabel: "HTTP REST",          icon: Globe,   color: "#22c55e" },
    ],
  },
  {
    label: "Backend",
    color: "#b87333",
    nodes: [
      { label: "Go API Server", sublabel: "localhost:8080", icon: Server,   color: "#b87333", badge: "Go 1.22", badgeColor: "#38bdf8" },
      { label: "WebSocket Hub", sublabel: "ws broadcast",   icon: Activity, color: "#b87333", badge: "100ms",   badgeColor: "#22c55e" },
    ],
  },
  {
    label: "ML & Storage",
    color: "#6366f1",
    nodes: [
      { label: "Python ML Service", sublabel: "localhost:8001",  icon: BrainCircuit, color: "#6366f1", badge: "FastAPI", badgeColor: "#818cf8" },
      { label: "PostgreSQL",        sublabel: "localhost:5432",  icon: Database,     color: "#22c55e", badge: "Docker",  badgeColor: "#38bdf8" },
    ],
  },
  {
    label: "Frontend",
    color: "#f59e0b",
    nodes: [
      { label: "React + Vite", sublabel: "localhost:5173", icon: Monitor, color: "#f59e0b", badge: "HMR", badgeColor: "#f59e0b" },
    ],
  },
  {
    label: "Browser",
    color: "#94a3b8",
    nodes: [
      { label: "User Browser", sublabel: "REST + WebSocket", icon: Laptop, color: "#94a3b8" },
    ],
  },
];

const AZURE_ROWS: DiagramRow[] = [
  {
    label: "External APIs",
    color: "#38bdf8",
    nodes: [
      { label: "AISStream",     sublabel: "WebSocket",  icon: Radio,  color: "#38bdf8" },
      { label: "OpenSky",       sublabel: "REST Poll",  icon: Radio,  color: "#6366f1" },
      { label: "GDELT / FIRMS", sublabel: "HTTP REST",  icon: Globe,  color: "#b87333" },
      { label: "Open-Meteo",    sublabel: "HTTP REST",  icon: Globe,  color: "#22c55e" },
    ],
  },
  {
    label: "Ingestion Layer",
    color: "#0078d4",
    nodes: [
      { label: "Azure Container Apps", sublabel: "Go API + WebSocket Hub", icon: Boxes,  color: "#0078d4", badge: "ACA", badgeColor: "#0078d4" },
      { label: "Azure Container Registry", sublabel: "Docker image store", icon: Package, color: "#0078d4", badge: "ACR", badgeColor: "#0078d4" },
    ],
  },
  {
    label: "ML & Storage",
    color: "#6366f1",
    nodes: [
      { label: "Vercel Serverless",       sublabel: "Python ML Functions", icon: BrainCircuit, color: "#6366f1", badge: "Serverless", badgeColor: "#818cf8" },
      { label: "Azure PostgreSQL",        sublabel: "Flexible Server",     icon: Database,     color: "#0078d4", badge: "PaaS",       badgeColor: "#0078d4" },
    ],
  },
  {
    label: "Security / Ops",
    color: "#22c55e",
    nodes: [
      { label: "Azure Key Vault",      sublabel: "Secrets & certs",   icon: Key,      color: "#22c55e", badge: "AKV", badgeColor: "#22c55e" },
      { label: "Azure Monitor",        sublabel: "Logs & metrics",    icon: BarChart, color: "#f59e0b", badge: "AMS", badgeColor: "#f59e0b" },
      { label: "Log Analytics WS",     sublabel: "Query & alerts",    icon: Activity, color: "#f59e0b", badge: "LAW", badgeColor: "#f59e0b" },
    ],
  },
  {
    label: "Delivery",
    color: "#0078d4",
    nodes: [
      { label: "Azure Static Web Apps", sublabel: "React + CDN edge",  icon: Cloud,   color: "#0078d4", badge: "SWA",  badgeColor: "#0078d4" },
    ],
  },
  {
    label: "Browser",
    color: "#94a3b8",
    nodes: [
      { label: "User Browser", sublabel: "REST + WebSocket", icon: Laptop, color: "#94a3b8" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Architecture Diagram Component
// ─────────────────────────────────────────────────────────────────────────────
function ArchDiagram({ rows, accentColor }: { rows: DiagramRow[]; accentColor: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {rows.map((row, ri) => (
        <div key={row.label}>
          {/* Row */}
          <div style={{ display: "flex", gap: "12px", alignItems: "stretch" }}>
            {/* Tier label (left spine) */}
            <div style={{
              width: "120px", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "flex-end",
              paddingRight: "12px",
            }}>
              <div style={{
                padding: "4px 10px", borderRadius: "5px",
                background: `${row.color}12`, border: `1px solid ${row.color}30`,
                fontSize: "0.625rem", color: row.color,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.08em", textAlign: "center",
                whiteSpace: "nowrap",
              }}>
                {row.label}
              </div>
            </div>

            {/* Nodes */}
            <div style={{ flex: 1, display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", padding: "10px 0" }}>
              {row.nodes.map((node) => {
                const Icon = node.icon;
                return (
                  <div key={node.label} style={{
                    flex: "1 1 160px", minWidth: "140px", maxWidth: "220px",
                    padding: "12px 14px", borderRadius: "8px",
                    background: "rgba(15,23,42,0.7)",
                    border: `1px solid ${node.color}28`,
                    display: "flex", flexDirection: "column", gap: "6px",
                    position: "relative",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <div style={{
                        width: "26px", height: "26px", borderRadius: "6px",
                        background: `${node.color}14`, border: `1px solid ${node.color}30`,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <Icon size={13} color={node.color} />
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#e2e8f0", lineHeight: 1.2 }}>{node.label}</div>
                        {node.sublabel && (
                          <div style={{ fontSize: "0.625rem", color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginTop: "1px" }}>{node.sublabel}</div>
                        )}
                      </div>
                    </div>
                    {node.badge && (
                      <span style={{
                        alignSelf: "flex-start",
                        padding: "1px 7px", borderRadius: "3px",
                        background: `${node.badgeColor ?? node.color}12`,
                        border: `1px solid ${node.badgeColor ?? node.color}30`,
                        fontSize: "0.5625rem", color: node.badgeColor ?? node.color,
                        fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em",
                      }}>{node.badge}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Connector arrow between rows */}
          {ri < rows.length - 1 && (
            <div style={{ display: "flex", alignItems: "center", paddingLeft: "132px", height: "28px" }}>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0",
              }}>
                <div style={{ width: "1px", height: "12px", background: `linear-gradient(to bottom, ${accentColor}40, ${accentColor}80)` }} />
                {/* arrowhead */}
                <svg width="10" height="6" viewBox="0 0 10 6" style={{ display: "block" }}>
                  <path d="M0 0 L5 6 L10 0" fill="none" stroke={accentColor} strokeWidth="1.5" strokeOpacity="0.7" />
                </svg>
              </div>
              <div style={{ marginLeft: "12px", fontSize: "0.5625rem", color: "#334155", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.07em" }}>
                {ri === 0 ? "raw telemetry" : ri === 1 ? "processed + scored" : ri === 2 ? "ML results + stored" : ri === 3 ? "served via CDN" : "user traffic"}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function PublicDocsPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [archTab, setArchTab] = useState<"dev" | "azure">("azure");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // Scroll spy to update active section based on scroll position
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-80px 0px -60% 0px" } // trigger near the top
    );

    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Auto-scroll mobile nav to keep active item in view
  useEffect(() => {
    const mobileNav = document.querySelector(".docs-mobile-nav");
    const activeBtn = mobileNav?.querySelector(`button[data-id="${activeSection}"]`);
    if (mobileNav && activeBtn) {
      const navRect = mobileNav.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      // If button is outside visible area of mobileNav, scroll it into view
      if (btnRect.left < navRect.left || btnRect.right > navRect.right) {
        activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [activeSection]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "#f8fafc", fontFamily: "'Space Grotesk', sans-serif", position: "relative" }}>

      {/* BG grid */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(79,70,229,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(79,70,229,0.03) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />

      {/* ── Top Nav ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, padding: "0 32px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(2,6,23,0.95)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(148,163,184,0.1)" }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "6px", overflow: "hidden", background: "rgba(15,23,42,0.6)" }}>
            <img src={logo} alt="HormuzWatch" style={{ width: "120%", height: "120%", objectFit: "cover" }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.9375rem", color: "#f8fafc", letterSpacing: "-0.02em" }}>HormuzWatch</div>
            <div style={{ fontSize: "0.5rem", color: "#6366f1", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.15em", textTransform: "uppercase" }}>Documentation</div>
          </div>
        </Link>
          <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Link to="/disclaimer" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "6px", border: "1px solid rgba(148,163,184,0.12)", color: "#94a3b8", fontSize: "0.8125rem", textDecoration: "none" }}
              onMouseOver={e => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)")}
              onMouseOut={e => (e.currentTarget.style.borderColor = "rgba(148,163,184,0.12)")}>
              <Shield size={13} /> Disclaimer
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "6px", background: "rgba(79,70,229,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8", fontSize: "0.8125rem", fontWeight: 600, textDecoration: "none" }}>
                  Dashboard
                </Link>
                <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "6px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}>
                  <LogOut size={13} /> Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "6px", background: "rgba(79,70,229,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8", fontSize: "0.8125rem", fontWeight: 600, textDecoration: "none" }}>
                  <LogIn size={13} /> Sign In
                </Link>
                <Link to="/register" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "6px", background: "#4f46e5", color: "#fff", fontSize: "0.8125rem", fontWeight: 600, textDecoration: "none" }}>
                  <UserPlus size={13} /> Request Access
                </Link>
              </>
            )}
            {/* Mobile sidebar toggle for docs sections */}
            <button
              onClick={() => setMobileSidebarOpen(p => !p)}
              style={{ display: "none", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "7px", border: "1px solid rgba(148,163,184,0.15)", background: "transparent", color: "#94a3b8", cursor: "pointer" }}
              className="docs-mobile-menu-btn"
            >
              {mobileSidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="show-mobile"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              background: "transparent", border: "1px solid rgba(148,163,184,0.2)",
              color: "#f8fafc", padding: "8px", borderRadius: "6px", cursor: "pointer",
              display: "none"
            }}
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
      </header>

      {/* Mobile Dropdown Menu for Global Navbar */}
      {isMobileMenuOpen && (
        <div className="show-mobile" style={{
          flexDirection: "column", background: "rgba(11,18,32,0.98)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(148,163,184,0.1)", padding: "16px 32px", gap: "12px",
          position: "sticky", top: "60px", zIndex: 99,
        }}>
          <Link to="/disclaimer" onClick={() => setIsMobileMenuOpen(false)} style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8", fontSize: "0.8125rem", textDecoration: "none", padding: "8px 0" }}>
            <Shield size={14} /> Disclaimer
          </Link>
          <div style={{ height: "1px", background: "rgba(148,163,184,0.1)", margin: "4px 0" }} />
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} style={{ display: "flex", alignItems: "center", gap: "6px", color: "#818cf8", fontSize: "0.8125rem", fontWeight: 600, textDecoration: "none", padding: "8px 0" }}>
                <Activity size={14} /> Dashboard
              </Link>
              <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "6px", color: "#fca5a5", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", background: "transparent", border: "none", padding: "8px 0", width: "100%", textAlign: "left" }}>
                <LogOut size={14} /> Sign Out
              </button>
            </>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "8px" }}>
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "6px", background: "rgba(79,70,229,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8", fontSize: "0.8125rem", fontWeight: 600, textDecoration: "none" }}>
                <LogIn size={13} /> Sign In
              </Link>
              <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "6px", background: "#4f46e5", color: "#fff", fontSize: "0.8125rem", fontWeight: 600, textDecoration: "none" }}>
                <UserPlus size={13} /> Access
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Hero ── */}
      <div style={{ padding: "64px 32px 48px", background: "linear-gradient(135deg,rgba(79,70,229,0.08) 0%,rgba(56,189,248,0.04) 50%,transparent 100%)", borderBottom: "1px solid rgba(148,163,184,0.08)", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "20px", background: "rgba(79,70,229,0.12)", border: "1px solid rgba(99,102,241,0.25)", fontSize: "0.6875rem", color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "20px" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#6366f1", display: "inline-block" }} />
            System Reference
          </div>
          <h1 style={{ fontSize: "clamp(2rem,4vw,3.25rem)", fontWeight: 900, color: "#f8fafc", letterSpacing: "-0.03em", marginBottom: "16px", lineHeight: 1.1 }}>
            HormuzWatch<br />
            <span style={{ background: "linear-gradient(90deg,#6366f1,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Intelligence Platform</span>
          </h1>
          <p style={{ fontSize: "1.0625rem", color: "#64748b", maxWidth: "640px", lineHeight: 1.7, marginBottom: "32px" }}>
            A real-time multi-domain intelligence platform for geospatial surveillance, asset tracking,
            anomaly detection, and threat assessment across the Strait of Hormuz corridor.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("api-reference")} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 20px", borderRadius: "8px", background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}>
              <Terminal size={15} /> API Reference <ChevronRight size={14} />
            </button>
            <button onClick={() => scrollTo("architecture")} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 20px", borderRadius: "8px", background: "rgba(148,163,184,0.07)", border: "1px solid rgba(148,163,184,0.15)", color: "#94a3b8", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}>
              <Layers size={15} /> Architecture
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Section Nav (horizontal pill strip) ── */}
      <div className="docs-mobile-nav" style={{ display: "none", overflowX: "auto", padding: "12px 16px", borderBottom: "1px solid rgba(148,163,184,0.08)", gap: "6px", background: "rgba(5,8,22,0.95)", position: "sticky", top: "60px", zIndex: 90 }}>
        {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
          <button key={id} data-id={id}
            onClick={() => { setActiveSection(id); scrollTo(id); }}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "20px", whiteSpace: "nowrap", border: activeSection === id ? "1px solid rgba(99,102,241,0.35)" : "1px solid rgba(148,163,184,0.1)", background: activeSection === id ? "rgba(79,70,229,0.12)" : "transparent", color: activeSection === id ? "#818cf8" : "#64748b", fontSize: "0.75rem", fontWeight: activeSection === id ? 600 : 400, cursor: "pointer", transition: "all 0.15s" }}>
            <Icon size={11} />{label}
          </button>
        ))}
      </div>

      {/* ── Sidebar + Content ── */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", alignItems: "start", position: "relative", zIndex: 1 }} className="docs-layout-grid">

        {/* Sidebar */}
        <aside style={{ 
          position: "sticky", 
          top: "84px", 
          padding: "24px", 
          background: "rgba(15,23,42,0.6)", 
          border: "1px solid rgba(148,163,184,0.1)", 
          borderRadius: "12px", 
          maxHeight: "calc(100vh - 110px)", 
          overflowY: "auto",
          marginTop: "48px"
        }} className="docs-sidebar">
          <div style={{ fontSize: "0.6875rem", color: "#475569", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px", paddingLeft: "4px" }}>Contents</div>
          <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
              <button key={id}
                onClick={() => { setActiveSection(id); scrollTo(id); }}
                style={{ display: "flex", alignItems: "center", gap: "9px", padding: "8px 12px", borderRadius: "7px", background: activeSection === id ? "rgba(79,70,229,0.12)" : "transparent", border: activeSection === id ? "1px solid rgba(99,102,241,0.25)" : "1px solid transparent", color: activeSection === id ? "#818cf8" : "#475569", fontSize: "0.8125rem", fontWeight: activeSection === id ? 600 : 400, cursor: "pointer", textAlign: "left", transition: "all 0.15s", width: "100%" }}
                onMouseOver={e => { if (activeSection !== id) e.currentTarget.style.color = "#94a3b8"; }}
                onMouseOut={e => { if (activeSection !== id) e.currentTarget.style.color = "#475569"; }}>
                <Icon size={13} />
                {label}
              </button>
            ))}
          </nav>

          <div style={{ marginTop: "32px", padding: "16px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(148,163,184,0.08)" }}>
            <div style={{ fontSize: "0.625rem", color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", marginBottom: "10px" }}>Quick Links</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Link to="/" style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "0.75rem", textDecoration: "none" }}><Globe size={11} /> Live Map</Link>
              <Link to="/live" style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "0.75rem", textDecoration: "none" }}><Activity size={11} /> Public Feed</Link>
              <Link to="/disclaimer" style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "0.75rem", textDecoration: "none" }}><Shield size={11} /> Disclaimer</Link>
              <a href="https://yahyaoncloud.vercel.app/about" target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "0.75rem", textDecoration: "none" }}><ExternalLink size={11} /> Author</a>
            </div>
          </div>
        </aside>

        {/* ── Content ── */}
        <main style={{ padding: "48px 0 96px", display: "flex", flexDirection: "column", gap: "64px" }}>

          {/* OVERVIEW */}
          <section id="overview">
            <SectionHeader icon={BookOpen} label="Overview" color="#6366f1" />
            <p style={{ fontSize: "0.9375rem", color: "#94a3b8", lineHeight: 1.75, marginBottom: "24px" }}>
              HormuzWatch is an <strong style={{ color: "#e2e8f0" }}>educational and portfolio project</strong> demonstrating
              cloud architecture, real-time data engineering, and machine learning applied to maritime and aviation
              domain awareness. The platform ingests live telemetry from public APIs and surfaces anomaly detections,
              threat heatmaps, and geospatial intelligence visualizations.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "12px", marginBottom: "32px" }}>
              {[
                { label: "Live Vessel Tracks",     value: "AIS",        color: "#38bdf8" },
                { label: "Aircraft State Vectors",  value: "ADS-B",      color: "#6366f1" },
                { label: "Anomaly Detection",       value: "ML Ensemble",color: "#b87333" },
                { label: "Update Latency",          value: "~100ms",     color: "#22c55e" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: "16px", borderRadius: "8px", background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.08)" }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace", marginBottom: "4px" }}>{value}</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: "20px", borderRadius: "8px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: "2px" }} />
                <p style={{ fontSize: "0.875rem", color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>
                  <strong style={{ color: "#f8fafc" }}>This is not an operational tool.</strong> Anomaly scores and risk levels are
                  illustrative outputs of statistical ML models. See the <Link to="/disclaimer" style={{ color: "#818cf8" }}>full disclaimer</Link>.
                </p>
              </div>
            </div>
          </section>

          {/* ── ARCHITECTURE (tabbed) ── */}
          <section id="architecture">
            <SectionHeader icon={Layers} label="Architecture" color="#b87333" />
            <p style={{ fontSize: "0.9375rem", color: "#94a3b8", lineHeight: 1.75, marginBottom: "24px" }}>
              The platform has two deployment modes: a <strong style={{ color: "#e2e8f0" }}>local dev environment</strong> and
              a <strong style={{ color: "#0078d4" }}>fully Azure-hosted production deployment</strong>. Toggle the tabs below
              to explore each end-to-end architecture.
            </p>

            {/* Tab bar */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "24px", padding: "4px", background: "rgba(15,23,42,0.6)", borderRadius: "10px", border: "1px solid rgba(148,163,184,0.1)", width: "fit-content" }}>
              {([
                { key: "dev",   label: "Dev (Local)",  icon: Laptop, accentColor: "#22c55e", desc: "No cloud" },
                { key: "azure", label: "Azure Cloud",  icon: Cloud,  accentColor: "#0078d4", desc: "Production" },
              ] as const).map(({ key, label, icon: TabIcon, accentColor, desc }) => (
                <button key={key}
                  onClick={() => setArchTab(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: "7px",
                    padding: "8px 16px", borderRadius: "7px",
                    background: archTab === key ? (key === "azure" ? "rgba(0,120,212,0.15)" : "rgba(34,197,94,0.12)") : "transparent",
                    border: archTab === key ? `1px solid ${accentColor}40` : "1px solid transparent",
                    color: archTab === key ? accentColor : "#475569",
                    fontSize: "0.8125rem", fontWeight: archTab === key ? 700 : 400,
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                  <TabIcon size={13} />
                  {label}
                  <span style={{ fontSize: "0.5625rem", padding: "1px 6px", borderRadius: "3px", background: archTab === key ? `${accentColor}20` : "rgba(148,163,184,0.1)", color: archTab === key ? accentColor : "#334155", fontFamily: "'JetBrains Mono', monospace" }}>{desc}</span>
                </button>
              ))}
            </div>

            {/* Diagram panel */}
            <div style={{ background: "rgba(5,8,22,0.7)", border: `1px solid ${archTab === "azure" ? "rgba(0,120,212,0.2)" : "rgba(34,197,94,0.15)"}`, borderRadius: "12px", padding: "28px 24px" }}>

              {/* Legend */}
              <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid rgba(148,163,184,0.08)", flexWrap: "wrap" }}>
                <div style={{ fontSize: "0.6875rem", color: archTab === "azure" ? "#0078d4" : "#22c55e", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
                  {archTab === "azure" ? "☁ Azure Production Architecture" : "⚡ Local Development Architecture"}
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {(archTab === "azure"
                    ? [{ color: "#0078d4", label: "Azure Services" }, { color: "#6366f1", label: "Vercel / External" }, { color: "#38bdf8", label: "Data Sources" }]
                    : [{ color: "#22c55e", label: "Local Process" },  { color: "#6366f1", label: "ML Service" },        { color: "#38bdf8", label: "Data Sources" }]
                  ).map(({ color, label }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: color }} />
                      <span style={{ fontSize: "0.625rem", color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <ArchDiagram rows={archTab === "azure" ? AZURE_ROWS : DEV_ROWS} accentColor={archTab === "azure" ? "#0078d4" : "#22c55e"} />
            </div>

            {/* Azure services breakdown (only shown on azure tab) */}
            {archTab === "azure" && (
              <div style={{ marginTop: "24px" }}>
                <div style={{ fontSize: "0.6875rem", color: "#0078d4", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "14px" }}>
                  Azure Services Used
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "10px" }}>
                  {[
                    { name: "Azure Container Apps",         abbr: "ACA", desc: "Hosts the Go API server + WebSocket hub in a managed serverless container environment.", color: "#0078d4", icon: Boxes    },
                    { name: "Azure Container Registry",     abbr: "ACR", desc: "Private Docker image registry for versioned container builds.",                           color: "#0078d4", icon: Package  },
                    { name: "Azure Database for PostgreSQL",abbr: "PGFS",desc: "Fully managed Flexible Server for time-series data storage and RBAC audit trails.",       color: "#0078d4", icon: Database },
                    { name: "Azure Static Web Apps",        abbr: "SWA", desc: "Hosts the React frontend with global CDN edge distribution and automatic HTTPS.",         color: "#0078d4", icon: Globe    },
                    { name: "Azure Key Vault",              abbr: "AKV", desc: "Centralized secret management for API keys, JWT signing keys, and DB connection strings.", color: "#22c55e", icon: Key      },
                    { name: "Azure Monitor + Log Analytics",abbr: "AMS", desc: "Collects structured application logs, performance metrics, and alert triggers.",            color: "#f59e0b", icon: BarChart },
                  ].map(({ name, abbr, desc, color, icon: SvcIcon }) => (
                    <div key={name} style={{ padding: "14px 16px", borderRadius: "8px", background: "rgba(15,23,42,0.6)", border: `1px solid ${color}20` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <SvcIcon size={13} color={color} />
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#e2e8f0" }}>{name}</span>
                        <span style={{ marginLeft: "auto", padding: "1px 6px", borderRadius: "3px", background: `${color}14`, border: `1px solid ${color}30`, fontSize: "0.5625rem", color, fontFamily: "'JetBrains Mono', monospace" }}>{abbr}</span>
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "#475569", lineHeight: 1.55, margin: 0 }}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dev environment breakdown */}
            {archTab === "dev" && (
              <div style={{ marginTop: "24px", padding: "18px 20px", borderRadius: "8px", background: "rgba(15,23,42,0.5)", border: "1px solid rgba(34,197,94,0.15)" }}>
                <div style={{ fontSize: "0.6875rem", color: "#22c55e", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>Local Dev Stack</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "8px" }}>
                  {[
                    { port: ":5173", service: "React + Vite (HMR)",   cmd: "npm run dev",          color: "#f59e0b" },
                    { port: ":8080", service: "Go API + WebSocket",     cmd: "go run cmd/main.go",   color: "#b87333" },
                    { port: ":8001", service: "Python ML (FastAPI)",    cmd: "uvicorn main:app",     color: "#6366f1" },
                    { port: ":5432", service: "PostgreSQL (Docker)",    cmd: "docker compose up db", color: "#22c55e" },
                  ].map(({ port, service, cmd, color }) => (
                    <div key={port} style={{ padding: "10px 12px", borderRadius: "6px", background: "rgba(5,8,22,0.6)", border: "1px solid rgba(148,163,184,0.07)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <code style={{ fontSize: "0.6875rem", color, fontFamily: "'JetBrains Mono', monospace" }}>{port}</code>
                        <span style={{ fontSize: "0.75rem", color: "#e2e8f0", fontWeight: 600 }}>{service}</span>
                      </div>
                      <code style={{ fontSize: "0.625rem", color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>$ {cmd}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* DATA SOURCES */}
          <section id="data-sources">
            <SectionHeader icon={Globe} label="Data Sources" color="#38bdf8" />
            <p style={{ fontSize: "0.9375rem", color: "#94a3b8", lineHeight: 1.75, marginBottom: "24px" }}>
              All data is sourced exclusively from <strong style={{ color: "#e2e8f0" }}>public, freely available APIs</strong>.
              No classified, restricted, or proprietary data is accessed or stored.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {DATA_SOURCES.map(({ name, domain, description, license, color }) => (
                <div key={name} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "16px", alignItems: "center", padding: "16px 18px", borderRadius: "8px", background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.08)" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: `${color}12`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Globe size={16} color={color} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: "0.875rem", marginBottom: "3px" }}>{name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#475569", marginBottom: "4px", fontFamily: "'JetBrains Mono', monospace" }}>{domain}</div>
                    <div style={{ fontSize: "0.8125rem", color: "#64748b", lineHeight: 1.5 }}>{description}</div>
                  </div>
                  <div style={{ padding: "3px 10px", borderRadius: "4px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", fontSize: "0.625rem", color: "#22c55e", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>
                    {license}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ML ENGINE */}
          <section id="ml-engine">
            <SectionHeader icon={BrainCircuit} label="ML Engine" color="#6366f1" />
            <p style={{ fontSize: "0.9375rem", color: "#94a3b8", lineHeight: 1.75, marginBottom: "24px" }}>
              Anomaly scoring is performed by a two-stage ML pipeline deployed as a serverless Python function on Vercel.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "12px", marginBottom: "24px" }}>
              {[
                { title: "Stage 1 — Ensemble Scoring", icon: BarChart2, color: "#6366f1", body: "IsolationForest and LocalOutlierFactor models trained on baseline behavioral distributions. Both scores are combined via a weighted average." },
                { title: "Stage 2 — Calibration",      icon: Zap,       color: "#b87333", body: "Raw combined score is passed through an Isotonic Regression calibrator, producing a normalized probability output in the [0–100] range." },
                { title: "Explainability",              icon: Eye,       color: "#22c55e", body: "Tree-based SHAP values decompose each anomaly score to show which kinematic features (speed delta, course deviation, signal gap) drove the alert." },
              ].map(({ title, icon: Icon, color, body }) => (
                <div key={title} style={{ padding: "20px", borderRadius: "8px", background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.08)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={14} color={color} />
                    </div>
                    <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: "0.8125rem" }}>{title}</div>
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "#64748b", lineHeight: 1.65, margin: 0 }}>{body}</p>
                </div>
              ))}
            </div>
            <div style={{ padding: "16px 20px", borderRadius: "8px", background: "rgba(5,8,22,0.8)", border: "1px solid rgba(148,163,184,0.1)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem" }}>
              <div style={{ color: "#475569", marginBottom: "8px", fontSize: "0.625rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Features Analysed</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {["course_delta","heading_variance","speed_deviation","signal_gap_sec","dist_to_restricted_km","ewma_speed","ewma_course","geofence_violation"].map(f => (
                  <code key={f} style={{ padding: "3px 8px", borderRadius: "4px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", color: "#a5b4fc" }}>{f}</code>
                ))}
              </div>
            </div>
          </section>

          {/* API REFERENCE */}
          <section id="api-reference">
            <SectionHeader icon={Terminal} label="API Reference" color="#b87333" />
            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Radio size={14} color="#38bdf8" />
                <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: "0.875rem" }}>WebSocket Stream</span>
                <span style={{ padding: "2px 8px", borderRadius: "4px", background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", fontSize: "0.625rem", color: "#38bdf8", fontFamily: "'JetBrains Mono', monospace" }}>LIVE</span>
              </div>
              <pre style={{ background: "rgba(5,8,22,0.9)", border: "1px solid rgba(148,163,184,0.1)", borderRadius: "8px", padding: "16px", fontSize: "0.75rem", color: "#a5b4fc", fontFamily: "'JetBrains Mono', monospace", overflowX: "auto", lineHeight: 1.7 }}>{`ws://api.hormuzwatch.net/ws/stream
Authorization: ?token=<jwt_access_token>

{
  "type": "track_update",
  "track": {
    "id": "vessel-370123000",
    "domain": "vessel",
    "lat": 26.154,
    "lng": 55.432,
    "speed": 14.5,
    "course": 210.0,
    "anomaly_score": 82.4,
    "risk_level": "CRITICAL",
    "severity": "critical"
  }
}`}</pre>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Code2 size={14} color="#b87333" />
                <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: "0.875rem" }}>REST Endpoints</span>
                <span style={{ padding: "2px 8px", borderRadius: "4px", background: "rgba(184,115,51,0.08)", border: "1px solid rgba(184,115,51,0.2)", fontSize: "0.625rem", color: "#b87333", fontFamily: "'JetBrains Mono', monospace" }}>Base: /api</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {REST_ENDPOINTS.map(({ method, path, desc, auth }) => (
                  <div key={path} style={{ display: "grid", gridTemplateColumns: "60px auto 1fr auto", gap: "12px", alignItems: "center", padding: "12px 16px", borderRadius: "6px", background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.07)" }}>
                    <span style={{ fontSize: "0.6875rem", fontWeight: 800, color: METHOD_COLOR[method] ?? "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{method}</span>
                    <code style={{ fontSize: "0.75rem", color: "#cbd5e1", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>{path}</code>
                    <span style={{ fontSize: "0.8125rem", color: "#475569" }}>{desc}</span>
                    <span style={{ fontSize: "0.625rem", padding: "2px 7px", borderRadius: "4px", background: auth ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)", border: `1px solid ${auth ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`, color: auth ? "#f87171" : "#4ade80", fontFamily: "'JetBrains Mono', monospace" }}>{auth ? "Auth" : "Public"}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SECURITY */}
          <section id="security">
            <SectionHeader icon={Lock} label="Security & Auth" color="#22c55e" />
            <p style={{ fontSize: "0.9375rem", color: "#94a3b8", lineHeight: 1.75, marginBottom: "24px" }}>
              Access to the dashboard is gated via JWT-based authentication with a request-approval workflow.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "12px" }}>
              {[
                { label: "Authentication",   desc: "JWT access tokens with short expiry and refresh token rotation.", icon: Lock,      color: "#6366f1" },
                { label: "Authorization",    desc: "Role-based access control (RBAC) with admin and operator tiers.", icon: Shield,    color: "#22c55e" },
                { label: "Approval Workflow",desc: "New registrations require admin approval before dashboard access.", icon: GitBranch, color: "#b87333" },
                { label: "Audit Trail",      desc: "All privileged actions logged to PostgreSQL with timestamps.",      icon: Eye,       color: "#38bdf8" },
              ].map(({ label, desc, icon: Icon, color }) => (
                <div key={label} style={{ padding: "18px", borderRadius: "8px", background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.08)" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "7px", background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                    <Icon size={15} color={color} />
                  </div>
                  <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: "0.875rem", marginBottom: "6px" }}>{label}</div>
                  <p style={{ fontSize: "0.8125rem", color: "#64748b", lineHeight: 1.6, margin: 0 }}>{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* DISCLAIMER */}
          <section id="disclaimer">
            <SectionHeader icon={Shield} label="Legal & Disclaimer" color="#ef4444" />
            <div style={{ padding: "24px", borderRadius: "10px", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.2)", marginBottom: "16px" }}>
              <p style={{ fontSize: "0.9375rem", color: "#94a3b8", lineHeight: 1.75, margin: "0 0 16px" }}>
                HormuzWatch is an <strong style={{ color: "#f8fafc" }}>educational and portfolio project</strong> and is{" "}
                <strong style={{ color: "#f87171" }}>not an operational intelligence product</strong>. The platform must not
                be used for navigation, military planning, security decisions, or any real-world safety-critical purpose.
              </p>
              <p style={{ fontSize: "0.9375rem", color: "#94a3b8", lineHeight: 1.75, margin: "0 0 16px" }}>
                All data is sourced from public APIs. No classified data is accessed. Anomaly scores are illustrative statistical outputs.
              </p>
              <p style={{ fontSize: "0.9375rem", color: "#94a3b8", lineHeight: 1.75, margin: 0 }}>
                Terminology such as "threat" refers purely to abstract mathematical deviations and does not constitute assertions about real-world events.
              </p>
            </div>
            <Link to="/disclaimer" style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "10px 20px", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>
              <Shield size={14} /> Read Full Disclaimer & Terms <ArrowRight size={13} />
            </Link>
          </section>

          {/* CTA */}
          <div style={{ padding: "40px", borderRadius: "12px", textAlign: "center", background: "linear-gradient(135deg,rgba(79,70,229,0.1),rgba(56,189,248,0.06))", border: "1px solid rgba(99,102,241,0.2)" }}>
            {isAuthenticated ? (
              <>
                <div style={{ fontSize: "0.75rem", color: "#6366f1", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>Operator Access</div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f8fafc", marginBottom: "12px" }}>You're signed in.</h2>
                <p style={{ color: "#64748b", fontSize: "0.9375rem", marginBottom: "24px" }}>Head back to the command dashboard to monitor live telemetry and intelligence feeds.</p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                  <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: "7px", padding: "11px 24px", borderRadius: "8px", background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "#fff", fontWeight: 700, fontSize: "0.875rem", textDecoration: "none" }}>
                    <Activity size={15} /> Open Dashboard
                  </Link>
                  <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "11px 24px", borderRadius: "8px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}>
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: "0.75rem", color: "#6366f1", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>Get Access</div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f8fafc", marginBottom: "12px" }}>Ready to explore the platform?</h2>
                <p style={{ color: "#64748b", fontSize: "0.9375rem", marginBottom: "24px" }}>Request access to the full dashboard or sign in if you already have an account.</p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                  <Link to="/register" style={{ display: "flex", alignItems: "center", gap: "7px", padding: "11px 24px", borderRadius: "8px", background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "#fff", fontWeight: 700, fontSize: "0.875rem", textDecoration: "none" }}>
                    <UserPlus size={15} /> Request Access
                  </Link>
                  <Link to="/login" style={{ display: "flex", alignItems: "center", gap: "7px", padding: "11px 24px", borderRadius: "8px", background: "rgba(148,163,184,0.07)", border: "1px solid rgba(148,163,184,0.15)", color: "#94a3b8", fontWeight: 600, fontSize: "0.875rem", textDecoration: "none" }}>
                    <LogIn size={15} /> Sign In
                  </Link>
                </div>
              </>
            )}
          </div>

        </main>
      </div>

      {/* Footer */}
      <footer style={{ padding: "24px 32px", textAlign: "center", borderTop: "1px solid rgba(148,163,184,0.08)", background: "rgba(2,6,23,0.8)", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: "0.6875rem", color: "#334155", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em", marginBottom: "8px" }}>
          HORMUZWATCH COMMAND AND CONTROL © {new Date().getFullYear()} — UNCLASSIFIED // FOR OFFICIAL USE ONLY
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
          <Link to="/" style={{ color: "#475569", fontSize: "0.75rem", textDecoration: "none" }}>Home</Link>
          <Link to="/live" style={{ color: "#475569", fontSize: "0.75rem", textDecoration: "none" }}>Live Feed</Link>
          <Link to="/disclaimer" style={{ color: "#475569", fontSize: "0.75rem", textDecoration: "none" }}>Disclaimer</Link>
          <a href="https://yahyaoncloud.vercel.app/about" target="_blank" rel="noreferrer" style={{ color: "#475569", fontSize: "0.75rem", textDecoration: "none" }}>Author</a>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", paddingBottom: "14px", borderBottom: "1px solid rgba(148,163,184,0.08)" }}>
      <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: `${color}12`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color={color} />
      </div>
      <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#f8fafc", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>{label}</h2>
    </div>
  );
}
