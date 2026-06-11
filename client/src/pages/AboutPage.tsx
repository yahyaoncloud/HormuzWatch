import {
  Radar, Globe, BrainCircuit, Server, Database, Shield,
  ExternalLink, Layers, Cpu, Activity, Code2, Cloud
} from "lucide-react";
import { Link } from "react-router-dom";

// ── Design primitives ────────────────────────────────────────────────────────

const prose: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.8,
  color: "#94a3b8",
  margin: "0 0 20px",
};

const h2Style: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  lineHeight: 1.25,
  color: "#f8fafc",
  margin: "40px 0 12px",
};

const h3Style: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#818cf8",
  margin: "24px 0 8px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  fontFamily: "'JetBrains Mono', monospace",
};

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "36px 0" }}>
      <div style={{ flex: 1, height: "0.5px", background: "rgba(148,163,184,0.12)" }} />
      <Radar size={14} color="#334155" />
      <div style={{ flex: 1, height: "0.5px", background: "rgba(148,163,184,0.12)" }} />
    </div>
  );
}

function Tag({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span style={{
      display: "inline-block",
      fontSize: "11px",
      padding: "3px 10px",
      border: accent ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(148,163,184,0.15)",
      borderRadius: "999px",
      color: accent ? "#818cf8" : "#64748b",
      background: accent ? "rgba(79,70,229,0.08)" : "transparent",
      marginRight: "6px",
      marginBottom: "6px",
      letterSpacing: "0.04em",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {children}
    </span>
  );
}

function StackRow({ icon: Icon, color, label, sublabel }: {
  icon: React.ElementType; color: string; label: string; sublabel: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px",
      padding: "10px 14px", borderRadius: "8px",
      background: "rgba(15,23,42,0.5)",
      border: "1px solid rgba(148,163,184,0.08)",
    }}>
      <div style={{
        width: "30px", height: "30px", borderRadius: "7px", flexShrink: 0,
        background: `${color}14`, border: `1px solid ${color}28`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={14} color={color} />
      </div>
      <div>
        <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#e2e8f0", lineHeight: 1.2 }}>{label}</div>
        <div style={{ fontSize: "0.6875rem", color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginTop: "2px" }}>{sublabel}</div>
      </div>
    </div>
  );
}

function TimelineEntry({ date, title, body, isLatest = false }: {
  date: string; title: string; body: string; isLatest?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: "20px", marginBottom: "24px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{
          width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0, marginTop: "4px",
          background: isLatest ? "#6366f1" : "rgba(148,163,184,0.3)",
          border: isLatest ? "2px solid #818cf8" : "2px solid rgba(148,163,184,0.2)",
          boxShadow: isLatest ? "0 0 8px rgba(99,102,241,0.5)" : "none",
        }} />
        <div style={{ flex: 1, width: "1px", background: "rgba(148,163,184,0.1)", marginTop: "6px" }} />
      </div>
      <div style={{ paddingBottom: "8px" }}>
        <div style={{
          fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "0.12em",
          color: isLatest ? "#6366f1" : "#475569", marginBottom: "4px",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {date}
        </div>
        <div style={{ fontSize: "15px", fontWeight: 600, color: "#f8fafc", marginBottom: "6px", lineHeight: 1.3 }}>
          {title}
        </div>
        <p style={{ fontSize: "14px", lineHeight: 1.7, color: "#94a3b8", margin: 0 }}>{body}</p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <article className="page-container fade-up" style={{ margin: "0 auto" }}>

      {/* ── Header ── */}
      <header style={{ marginBottom: "40px" }}>
        <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.16em", color: "#475569", marginBottom: "16px", fontFamily: "'JetBrains Mono', monospace" }}>
          Open-source intelligence · Strait of Hormuz
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
          <div style={{
            width: "44px", height: "44px", borderRadius: "10px",
            background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Radar size={22} color="#818cf8" />
          </div>
          <h1 style={{ fontSize: "32px", fontWeight: 700, lineHeight: 1.15, color: "#f8fafc", margin: 0, letterSpacing: "-0.5px" }}>
            About HormuzWatch
          </h1>
        </div>

        <p style={{ fontSize: "17px", lineHeight: 1.7, color: "#94a3b8", margin: "0 0 20px", borderLeft: "3px solid rgba(99,102,241,0.5)", paddingLeft: "16px" }}>
          A real-time, open-source geospatial intelligence platform monitoring the Strait of Hormuz.
          Tracking vessels, aircraft, environmental anomalies, and geopolitical events — continuously,
          using only public data sources.
        </p>

        <div style={{ display: "flex", gap: "20px", fontSize: "12px", color: "#475569", borderTop: "0.5px solid rgba(148,163,184,0.1)", borderBottom: "0.5px solid rgba(148,163,184,0.1)", padding: "10px 0", flexWrap: "wrap", fontFamily: "'JetBrains Mono', monospace" }}>
          <span>Founded Q4 2025</span>
          <span style={{ color: "rgba(148,163,184,0.2)" }}>·</span>
          <span>Public Beta Q2 2026</span>
          <span style={{ color: "rgba(148,163,184,0.2)" }}>·</span>
          <span>Persian Gulf · Gulf of Oman</span>
          <span style={{ color: "rgba(148,163,184,0.2)" }}>·</span>
          <span>Educational / Portfolio</span>
        </div>
      </header>

      {/* ── Why we built this ── */}
      <section>
        <h2 style={h2Style}>Why we built this</h2>
        <p style={prose}>
          The Strait of Hormuz is a 21-mile-wide chokepoint through which roughly a fifth of the
          world's oil supply passes every day. It is surrounded by nations with competing interests,
          patrolled by rival navies, and crossed by thousands of commercial vessels each month.
          What happens there matters — economically, geopolitically, and for global security.
        </p>
        <p style={prose}>
          Yet most people have no real-time visibility into it. HormuzWatch was built as a
          portfolio and educational project to explore what a production-grade geospatial
          intelligence platform looks like — combining live telemetry ingestion, machine learning
          anomaly detection, and a modern command-and-control UI, entirely from public data sources.
        </p>
        <p style={prose}>
          It is not an operational intelligence tool. It is a demonstration of engineering discipline,
          system design, and the application of real-time ML to streaming geospatial data.
        </p>
      </section>

      <Divider />

      {/* ── What we track ── */}
      <section>
        <h2 style={h2Style}>What HormuzWatch monitors</h2>
        <p style={prose}>The platform ingests and correlates live data across four domains simultaneously.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          <StackRow icon={Globe}      color="#38bdf8"  label="Maritime Vessels"       sublabel="AISStream WebSocket · MMSI, position, speed, course" />
          <StackRow icon={Activity}   color="#6366f1"  label="Aircraft"               sublabel="OpenSky Network REST poll · ADS-B state vectors" />
          <StackRow icon={Layers}     color="#ef4444"  label="Thermal Anomalies"      sublabel="NASA FIRMS · MODIS & VIIRS active fire data" />
          <StackRow icon={Code2}      color="#b87333"  label="Geopolitical Events"     sublabel="GDELT Project · news-derived event database" />
          <StackRow icon={Cloud}      color="#22c55e"  label="Marine Weather"          sublabel="Open-Meteo · sea-state and visibility forecasts" />
        </div>

        <p style={prose}>
          Data from all five sources is normalized into a unified telemetry schema, persisted to
          SQLite, and broadcast to connected clients via a WebSocket hub with sub-100ms latency.
        </p>
      </section>

      <Divider />

      {/* ── Architecture ── */}
      <section>
        <h2 style={h2Style}>How it works</h2>
        <p style={prose}>
          The backend is a Go 1.22 API server built with Gin, hosting a WebSocket hub that fans
          out real-time telemetry to all connected browser clients. Background workers continuously
          poll or stream from each data source. When new data arrives, it is scored by the ML
          engine, persisted, and broadcast.
        </p>

        <h3 style={h3Style}>Machine Learning Pipeline</h3>
        <p style={prose}>
          A Python FastAPI service hosts an ensemble anomaly detector combining{" "}
          <strong style={{ color: "#e2e8f0" }}>IsolationForest</strong> and{" "}
          <strong style={{ color: "#e2e8f0" }}>LocalOutlierFactor</strong>, calibrated via
          Isotonic Regression to emit a normalized [0–100] probability score. Features include
          course delta, heading variance, speed anomalies, signal gaps, distance to restricted
          zones, and per-track EWMA deviations. SHAP explainability breaks down each high-risk
          score into its contributing factors.
        </p>

        <h3 style={h3Style}>Frontend</h3>
        <p style={prose}>
          The client is a React 18 + Vite SPA using react-leaflet for the geospatial map layer,
          react-leaflet-markercluster for track density management, and a custom WebSocket context
          that maintains live state for all tracked objects. The design system follows a
          Bloomberg Terminal / Palantir aesthetic with a strict dark-mode token set.
        </p>

        <h3 style={h3Style}>Deployment</h3>
        <p style={prose}>
          The production architecture targets Azure: the Go backend and Python ML service run as
          Docker containers on Azure Container Apps, persisting to Azure PostgreSQL. The React
          frontend is deployed as an Azure Static Web App. CI/CD pipelines push dev builds to
          Docker Hub and production images to Azure Container Registry.
        </p>

        <div style={{ marginTop: "16px", marginBottom: "4px" }}>
          <div style={{ fontSize: "11px", color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px", fontFamily: "'JetBrains Mono', monospace" }}>Tech Stack</div>
          {[
            { t: "Go 1.22", accent: true }, { t: "Gin", accent: false },
            { t: "React 18", accent: true }, { t: "TypeScript", accent: false },
            { t: "Vite", accent: false }, { t: "react-leaflet", accent: false },
            { t: "Python 3.12", accent: true }, { t: "FastAPI", accent: false },
            { t: "scikit-learn", accent: false }, { t: "SQLite / PostgreSQL", accent: false },
            { t: "Docker", accent: false }, { t: "Azure Container Apps", accent: true },
            { t: "GitHub Actions", accent: false }, { t: "WebSocket", accent: false },
          ].map(({ t, accent }) => <Tag key={t} accent={accent}>{t}</Tag>)}
        </div>
      </section>

      <Divider />

      {/* ── Data Sources ── */}
      <section>
        <h2 style={h2Style}>Data sources & integrity</h2>
        <p style={prose}>
          Every data point displayed by HormuzWatch originates from a public, open-access source.
          No proprietary feeds, no classified data, no purchased maritime intelligence. The platform
          operates entirely within the terms of service of each upstream provider.
        </p>
        <p style={prose}>
          AIS and ADS-B data represent self-reported positions and are subject to gaps, errors, and
          deliberate spoofing. Anomaly scores produced by the ML engine are statistical outputs —
          not indicators of real-world threat. See the{" "}
          <Link to="/disclaimer" style={{ color: "#818cf8" }}>full disclaimer</Link> for details.
        </p>
      </section>

      <Divider />

      {/* ── Timeline ── */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ ...h2Style, marginBottom: "28px" }}>Project timeline</h2>

        <TimelineEntry
          date="Q4 2025"
          title="Concept & first prototype"
          body="Started as a portfolio project. Integrated AISStream WebSocket, built the Go backend and basic React map. Proved the real-time pipeline was viable."
        />
        <TimelineEntry
          date="Q1 2026"
          title="Multi-domain expansion"
          body="Added OpenSky aircraft tracking, NASA FIRMS thermal anomalies, GDELT geopolitical events, and Open-Meteo marine weather. ML anomaly detection engine integrated."
        />
        <TimelineEntry
          date="Q1–Q2 2026"
          title="Platform hardening"
          body="Added RBAC auth, admin approval workflow, audit trails, SHAP explainability, WebSocket reconnection logic, and Docker containerization for all services."
        />
        <TimelineEntry
          date="Q2 2026"
          title="Azure cloud architecture"
          body="Designed and documented full Azure deployment: Container Apps for backend, Azure Static Web Apps for frontend, PostgreSQL Flexible Server, Key Vault, and GitHub Actions CI/CD pipelines."
          isLatest
        />
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "0.5px solid rgba(148,163,184,0.1)", paddingTop: "20px", fontSize: "12px", color: "#475569", lineHeight: 1.6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Code2 size={13} color="#6366f1" />
          </div>
          <div>
            <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "13px" }}>Yahya</div>
            <div style={{ color: "#475569", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace" }}>Cloud Engineer · DevOps · MLOps</div>
          </div>
          <a
            href="https://yahyaoncloud.vercel.app/about"
            target="_blank"
            rel="noreferrer"
            style={{ marginLeft: "auto", color: "#6366f1", textDecoration: "none", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}
          >
            Portfolio <ExternalLink size={11} />
          </a>
        </div>
        <p style={{ margin: "0 0 6px" }}>
          HormuzWatch is an independent, open-source educational project. All displayed data is
          sourced from public AIS, ADS-B, satellite, and open-data APIs. No government, military,
          or commercial intelligence affiliation.
        </p>
        <p style={{ margin: 0, color: "#334155", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}>
          Strait of Hormuz · Persian Gulf · Gulf of Oman · Est. 2025
        </p>
      </footer>
    </article>
  );
}
