import { BookOpen, Server, Code2, Globe, ArrowRight } from "lucide-react";

const ARCHITECTURE = [
  { label: "Telemetry Feed", desc: "Real-time asset tracking ingestion", icon: Globe, color: "#6366f1" },
  { label: "Go Backend", desc: "WebSocket hub & anomaly engine", icon: Server, color: "#b87333" },
  { label: "ML Scoring", desc: "Multi-factor threat assessment", icon: Code2, color: "#6366f1" },
  { label: "React Frontend", desc: "Intelligence dashboard UI", icon: BookOpen, color: "#b87333" },
];

export default function DocsPage() {
  return (
    <div className="page-container fade-up">
      <div className="page-header">
        <div className="section-eyebrow" style={{ marginBottom: "4px" }}>
          System Reference
        </div>
        <h1 className="page-title">Documentation</h1>
      </div>

      <div className="content-grid-2" style={{ alignItems: "start" }}>
        {/* Project Overview */}
        <div className="stack">
          <div className="intel-panel" style={{ padding: "22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <BookOpen size={16} color="#6366f1" />
              <div className="section-eyebrow">Project Overview</div>
            </div>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#f8fafc", marginBottom: "10px" }}>
              HormuzWatch Intelligence Platform
            </h2>
            <p style={{ fontSize: "0.875rem", color: "#94a3b8", lineHeight: 1.65, marginBottom: "14px" }}>
              Real-time multi-domain intelligence platform for geospatial surveillance, asset tracking,
              anomaly detection, and threat assessment across strategic regions —
              providing situational awareness for critical global transit corridors.
            </p>

            <div className="intel-divider" />

            <div className="section-eyebrow" style={{ marginBottom: "12px" }}>
              Capabilities
            </div>
            <ul className="stack-sm">
              {[
                "Live telemetry tracking via WebSocket stream",
                "Multi-factor anomaly scoring (speed, course, signal age)",
                "Geofenced operational area monitoring",
                "Threat heatmap visualization",
                "Security audit trail with RBAC enforcement",
              ].map((item) => (
                <li
                  key={item}
                  style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "0.8125rem", color: "#cbd5e1" }}
                >
                  <ArrowRight size={12} color="#b87333" style={{ flexShrink: 0, marginTop: "2px" }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Start */}
          <div className="intel-panel" style={{ padding: "22px" }}>
            <div className="section-eyebrow" style={{ marginBottom: "14px" }}>
              Quick Start
            </div>
            <pre
              style={{
                background: "rgba(5,8,22,0.8)",
                border: "1px solid rgba(148,163,184,0.1)",
                borderRadius: "6px",
                padding: "14px 16px",
                fontSize: "0.8125rem",
                color: "#a5b4fc",
                fontFamily: '"IBM Plex Mono", monospace',
                overflowX: "auto",
                lineHeight: 1.7,
              }}
            >
              {`# Start all services
docker-compose up --build

# Frontend  → http://localhost:3000
# API       → http://localhost:8080
# WebSocket → ws://localhost:8080/ws/stream`}
            </pre>
          </div>
        </div>

        {/* Architecture */}
        <div className="stack">
          <div className="intel-panel" style={{ padding: "22px" }}>
            <div className="section-eyebrow" style={{ marginBottom: "16px" }}>
              System Architecture
            </div>
            <div className="stack-sm">
              {ARCHITECTURE.map(({ label, desc, icon: Icon, color }, i) => (
                <div key={label}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 14px",
                      borderRadius: "6px",
                      background: "rgba(15,23,42,0.6)",
                      border: "1px solid rgba(148,163,184,0.08)",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "6px",
                        background: color === "#6366f1" ? "rgba(79,70,229,0.12)" : "rgba(184,115,51,0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={15} color={color} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "0.875rem" }}>{label}</div>
                      <div style={{ fontSize: "0.75rem", color: "#475569" }}>{desc}</div>
                    </div>
                    {i < ARCHITECTURE.length - 1 && (
                      <ArrowRight size={14} color="#475569" style={{ marginLeft: "auto" }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contributing */}
          <div className="intel-panel" style={{ padding: "22px" }}>
            <div className="section-eyebrow" style={{ marginBottom: "14px" }}>
              Contributing
            </div>
            <p style={{ fontSize: "0.875rem", color: "#94a3b8", lineHeight: 1.65, marginBottom: "14px" }}>
              Feature branches follow the <code style={{ color: "#a5b4fc", background: "rgba(79,70,229,0.1)", padding: "1px 6px", borderRadius: "3px" }}>feat/*</code> convention.
              Commit messages use <code style={{ color: "#a5b4fc", background: "rgba(79,70,229,0.1)", padding: "1px 6px", borderRadius: "3px" }}>feat(scope): summary</code> format.
              Submit PRs against <code style={{ color: "#a5b4fc", background: "rgba(79,70,229,0.1)", padding: "1px 6px", borderRadius: "3px" }}>main</code>.
            </p>
            <p style={{ fontSize: "0.875rem", color: "#94a3b8" }}>
              See <span style={{ color: "#6366f1" }}>docs/CONTRIBUTING.md</span> for full contribution guidelines.
            </p>
          </div>
          {/* Created By */}
          <div className="intel-panel" style={{ padding: "22px" }}>
            <div className="section-eyebrow" style={{ marginBottom: "14px" }}>
              Created By
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "#f8fafc",
                    marginBottom: "4px",
                  }}
                >
                  HormuzShield / GeospatialOps AI
                </div>

                <div
                  style={{
                    fontSize: "0.8125rem",
                    color: "#64748b",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Project Maintainer
                </div>
              </div>

              <div
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  background: "rgba(15,23,42,0.6)",
                  border: "1px solid rgba(148,163,184,0.08)",
                }}
              >
                <div
                  style={{
                    color: "#e2e8f0",
                    fontWeight: 600,
                    marginBottom: "6px",
                  }}
                >
                  Yahya
                </div>

                <div
                  style={{
                    fontSize: "0.8125rem",
                    color: "#94a3b8",
                    marginBottom: "10px",
                  }}
                >
                  Cloud Engineer · DevOps · MLOps
                </div>

                <a
                  href="https://yahyaoncloud.vercel.app/about"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "#6366f1",
                    textDecoration: "none",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                  }}
                >
                  yahyaoncloud.vercel.app/about →
                </a>
              </div>

              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "#94a3b8",
                  lineHeight: 1.7,
                }}
              >
                Interested in contributing? Review{" "}
                <span style={{ color: "#6366f1" }}>
                  CONTRIBUTING.md
                </span>{" "}
                for development workflow, contribution guidelines,
                and coding standards.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
