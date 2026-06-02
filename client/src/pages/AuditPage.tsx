import { Shield, User, Clock, CheckCircle, XCircle } from "lucide-react";

const EVENTS = [
  { actor: "analyst.ops@hormuzwatch.mil", action: "VIEW", target: "Track ID-9876543", time: "09:41:02Z", result: "allowed" },
  { actor: "system.anomaly@engine", action: "DETECT", target: "Anomaly #A-441", time: "09:40:55Z", result: "allowed" },
  { actor: "admin.fleet@hormuzwatch.mil", action: "EXPORT", target: "Alert Report Q2", time: "09:39:11Z", result: "allowed" },
  { actor: "analyst.ops@hormuzwatch.mil", action: "DELETE", target: "Config Rule #12", time: "09:38:44Z", result: "denied" },
  { actor: "system.geofence@monitor", action: "ALERT", target: "Zone Bravo Breach", time: "09:37:22Z", result: "allowed" },
  { actor: "external.api@telemetry-feed", action: "PUSH", target: "Telemetry batch #8812", time: "09:36:50Z", result: "allowed" },
  { actor: "admin.fleet@hormuzwatch.mil", action: "MODIFY", target: "Geofence Zone Alpha", time: "09:35:03Z", result: "allowed" },
  { actor: "analyst.jr@hormuzwatch.mil", action: "ACCESS", target: "Classified Route Data", time: "09:33:18Z", result: "denied" },
];

export default function AuditPage() {
  const allowed = EVENTS.filter((e) => e.result === "allowed").length;
  const denied = EVENTS.filter((e) => e.result === "denied").length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="section-eyebrow" style={{ marginBottom: "4px" }}>
          Security Operations
        </div>
        <h1 className="page-title">Audit Trail</h1>
      </div>

      {/* Summary */}
      <div className="content-grid-2" style={{ marginBottom: "20px" }}>
        <div className="intel-panel" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle size={17} color="#22c55e" />
          </div>
          <div>
            <div className="section-eyebrow" style={{ marginBottom: "2px" }}>Authorized Events</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#22c55e", letterSpacing: "-0.02em" }}>{allowed}</div>
          </div>
        </div>
        <div className="intel-panel" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <XCircle size={17} color="#ef4444" />
          </div>
          <div>
            <div className="section-eyebrow" style={{ marginBottom: "2px" }}>Denied / Blocked</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ef4444", letterSpacing: "-0.02em" }}>{denied}</div>
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="intel-panel" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(148,163,184,0.1)", display: "flex", alignItems: "center", gap: "8px" }}>
          <Shield size={14} color="#6366f1" />
          <div className="section-eyebrow">Security Event Log</div>
        </div>
        <div className="intel-table-wrap">
          <table className="intel-table">
            <thead>
              <tr>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Timestamp</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {EVENTS.map((e, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <User size={12} color="#475569" />
                      <span style={{ fontSize: "0.8125rem", color: "#cbd5e1" }}>{e.actor}</span>
                    </div>
                  </td>
                  <td>
                    <code style={{ fontSize: "0.75rem", color: "#a5b4fc", background: "rgba(79,70,229,0.1)", padding: "2px 7px", borderRadius: "3px" }}>
                      {e.action}
                    </code>
                  </td>
                  <td style={{ color: "#94a3b8", fontSize: "0.8125rem" }}>{e.target}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#475569", fontSize: "0.75rem" }}>
                      <Clock size={11} />
                      {e.time}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${e.result === "allowed" ? "badge-low" : "badge-critical"}`}>
                      {e.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
