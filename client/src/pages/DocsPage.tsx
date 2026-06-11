import { BookOpen, Server, Code2, Globe, ArrowRight, Shield, Activity, Cpu, Database } from "lucide-react";

const ARCHITECTURE = [
  { label: "Telemetry Feed", desc: "Real-time asset tracking ingestion (AISStream, OpenSky)", icon: Globe, color: "#6366f1" },
  { label: "Go Backend", desc: "WebSocket hub & sliding window anomaly engine", icon: Server, color: "#b87333" },
  { label: "ML Inference", desc: "Python Vercel function: IsolationForest + LOF ensemble", icon: Cpu, color: "#6366f1" },
  { label: "React Frontend", desc: "Command & Control dashboard UI", icon: BookOpen, color: "#b87333" },
  { label: "Azure PostgreSQL", desc: "Time-series storage for analytics and audit trails", icon: Database, color: "#6366f1" },
];

export default function DocsPage() {
  return (
    <div className="page-container fade-up" style={{ paddingBottom: "60px" }}>
      <div className="page-header">
        <div className="section-eyebrow" style={{ marginBottom: "4px" }}>
          System Reference
        </div>
        <h1 className="page-title">Documentation</h1>
      </div>

      <div className="content-grid-2" style={{ alignItems: "start" }}>
        {/* LEFT COLUMN */}
        <div className="stack">
          {/* Overview */}
          <div className="intel-panel" style={{ padding: "22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <BookOpen size={16} color="#6366f1" />
              <div className="section-eyebrow">Project Overview</div>
            </div>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#f8fafc", marginBottom: "10px" }}>
              HormuzWatch Intelligence Platform
            </h2>
            <p style={{ fontSize: "0.875rem", color: "#94a3b8", lineHeight: 1.65, marginBottom: "14px" }}>
              A real-time multi-domain intelligence platform built for geospatial surveillance, asset tracking, anomaly detection, and threat assessment across strategic global transit corridors.
            </p>

            <div className="intel-divider" />

            <div className="section-eyebrow" style={{ marginBottom: "12px" }}>Core Capabilities</div>
            <ul className="stack-sm">
              {[
                "Live telemetry tracking via WebSocket stream (100ms latency)",
                "Multi-factor anomaly scoring (kinematics, geofencing, ML)",
                "Risk visualization with SHAP feature explainability",
                "Regional threat heatmap generation",
                "Security audit trail with RBAC enforcement",
              ].map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "0.8125rem", color: "#cbd5e1" }}>
                  <ArrowRight size={12} color="#b87333" style={{ flexShrink: 0, marginTop: "2px" }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Machine Learning Engine */}
          <div className="intel-panel" style={{ padding: "22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <Cpu size={16} color="#6366f1" />
              <div className="section-eyebrow">Intelligence Layer</div>
            </div>
            <p style={{ fontSize: "0.875rem", color: "#94a3b8", lineHeight: 1.65, marginBottom: "14px" }}>
              The ML Engine evaluates streaming kinematics and contextual features to flag deviations from normal behavioral patterns.
            </p>
            <div className="stack-sm">
              <div style={{ padding: "12px", background: "rgba(15,23,42,0.6)", borderRadius: "6px", border: "1px solid rgba(148,163,184,0.08)" }}>
                <div style={{ color: "#e2e8f0", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "4px" }}>Model Architecture</div>
                <div style={{ color: "#94a3b8", fontSize: "0.75rem", lineHeight: 1.5 }}>
                  Ensemble of <strong>IsolationForest</strong> and <strong>LocalOutlierFactor</strong> algorithms, calibrated via Isotonic Regression to emit a normalized [0-100] probability score.
                </div>
              </div>
              <div style={{ padding: "12px", background: "rgba(15,23,42,0.6)", borderRadius: "6px", border: "1px solid rgba(148,163,184,0.08)" }}>
                <div style={{ color: "#e2e8f0", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "4px" }}>Features Analysed</div>
                <div style={{ color: "#94a3b8", fontSize: "0.75rem", lineHeight: 1.5 }}>
                  Course delta, heading variance, speed anomalies, signal gaps, distance to restricted zones, and per-track EWMA deviations.
                </div>
              </div>
              <div style={{ padding: "12px", background: "rgba(15,23,42,0.6)", borderRadius: "6px", border: "1px solid rgba(148,163,184,0.08)" }}>
                <div style={{ color: "#e2e8f0", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "4px" }}>Explainability</div>
                <div style={{ color: "#94a3b8", fontSize: "0.75rem", lineHeight: 1.5 }}>
                  Tree-based SHAP explainers break down high-risk anomaly scores to identify which behavioral traits triggered the alert.
                </div>
              </div>
            </div>
          </div>

          {/* Legal & Disclaimer */}
          <div className="intel-panel" style={{ padding: "22px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <Shield size={16} color="#ef4444" />
              <div className="section-eyebrow">Legal & Disclaimer</div>
            </div>
            <p style={{ fontSize: "0.875rem", color: "#94a3b8", lineHeight: 1.65, marginBottom: "14px" }}>
              HormuzWatch is an <strong>educational project</strong> and is not an operational intelligence product. The platform must not be used for navigation, military planning, security decisions, or any real-world safety-critical purpose.
            </p>
            <p style={{ fontSize: "0.875rem", color: "#94a3b8" }}>
              Please review the full terms in the <a href="/DISCLAIMER.md" target="_blank" rel="noreferrer" style={{ color: "#6366f1", textDecoration: "none" }}>DISCLAIMER.md</a> file at the repository root.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="stack">
          {/* Architecture */}
          <div className="intel-panel" style={{ padding: "22px" }}>
            <div className="section-eyebrow" style={{ marginBottom: "16px" }}>
              System Architecture
            </div>
            <div className="stack-sm">
              {ARCHITECTURE.map(({ label, desc, icon: Icon, color }, i) => (
                <div key={label}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "6px", background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.08)" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: color === "#6366f1" ? "rgba(79,70,229,0.12)" : "rgba(184,115,51,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={15} color={color} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "0.875rem" }}>{label}</div>
                      <div style={{ fontSize: "0.75rem", color: "#475569" }}>{desc}</div>
                    </div>
                    {i < ARCHITECTURE.length - 1 && <ArrowRight size={14} color="#475569" style={{ marginLeft: "auto" }} />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* API Reference */}
          <div className="intel-panel" style={{ padding: "22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <Activity size={16} color="#b87333" />
              <div className="section-eyebrow">API Reference</div>
            </div>
            
            <div style={{ marginBottom: "16px" }}>
              <div style={{ color: "#e2e8f0", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "8px" }}>WebSocket Stream</div>
              <pre style={{ background: "rgba(5,8,22,0.8)", border: "1px solid rgba(148,163,184,0.1)", borderRadius: "6px", padding: "12px", fontSize: "0.75rem", color: "#a5b4fc", fontFamily: '"IBM Plex Mono", monospace', overflowX: "auto" }}>
{`ws://api.hormuzwatch.net/ws/stream
Requires: ?token=<jwt_token>

Payload Example:
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
    "risk_level": "CRITICAL"
  }
}`}
              </pre>
            </div>

            <div>
              <div style={{ color: "#e2e8f0", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "8px" }}>REST Endpoints</div>
              <ul className="stack-sm" style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                <li><code style={{ color: "#86efac" }}>GET /api/v1/tracks</code> - Fetch active tracks</li>
                <li><code style={{ color: "#86efac" }}>GET /api/v1/analytics/anomalies</code> - Retrieve historical anomaly reports</li>
                <li><code style={{ color: "#86efac" }}>POST /api/predict</code> - (Internal) ML inference scoring trigger</li>
              </ul>
            </div>
          </div>

          {/* Created By & Contributing */}
          <div className="intel-panel" style={{ padding: "22px" }}>
            <div className="section-eyebrow" style={{ marginBottom: "14px" }}>Development & Contribution</div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              <p style={{ fontSize: "0.8125rem", color: "#94a3b8", lineHeight: 1.65, margin: 0 }}>
                Feature branches follow the <code style={{ color: "#a5b4fc", background: "rgba(79,70,229,0.1)", padding: "1px 6px", borderRadius: "3px" }}>feat/*</code> convention.
                Submit PRs against <code style={{ color: "#a5b4fc", background: "rgba(79,70,229,0.1)", padding: "1px 6px", borderRadius: "3px" }}>main</code>.
                See <span style={{ color: "#6366f1" }}>CONTRIBUTING.md</span> for full guidelines.
              </p>
            </div>

            <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.08)" }}>
              <div style={{ fontSize: "0.6875rem", color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>Project Maintainer</div>
              <div style={{ color: "#e2e8f0", fontWeight: 600, marginBottom: "2px" }}>Yahya</div>
              <div style={{ fontSize: "0.8125rem", color: "#94a3b8", marginBottom: "10px" }}>Cloud Engineer · DevOps · MLOps</div>
              <a href="https://yahyaoncloud.vercel.app/about" target="_blank" rel="noreferrer" style={{ color: "#6366f1", textDecoration: "none", fontSize: "0.8125rem", fontWeight: 600 }}>
                yahyaoncloud.vercel.app/about →
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
