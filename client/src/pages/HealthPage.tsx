import { Activity, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

const SERVICES = [
  { name: "AIS Telemetry Ingestion", status: "healthy", latency: "12ms", uptime: "99.97%" },
  { name: "Anomaly Detection Engine", status: "healthy", latency: "34ms", uptime: "99.91%" },
  { name: "WebSocket Stream Hub", status: "healthy", latency: "8ms", uptime: "100%" },
  { name: "Heatmap Aggregator", status: "degraded", latency: "180ms", uptime: "98.4%" },
  { name: "Geofence Monitor", status: "healthy", latency: "22ms", uptime: "99.88%" },
  { name: "Alert Dispatcher", status: "healthy", latency: "16ms", uptime: "99.95%" },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "healthy") return <CheckCircle size={15} color="#22c55e" />;
  if (status === "degraded") return <AlertTriangle size={15} color="#d97706" />;
  return <XCircle size={15} color="#ef4444" />;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "healthy")
    return <span className="badge badge-low">Nominal</span>;
  if (status === "degraded")
    return <span className="badge badge-medium">Degraded</span>;
  return <span className="badge badge-critical">Offline</span>;
}

export default function HealthPage() {
  const healthy = SERVICES.filter((s) => s.status === "healthy").length;
  const degraded = SERVICES.filter((s) => s.status === "degraded").length;
  const offline = SERVICES.filter((s) => s.status === "offline").length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="section-eyebrow" style={{ marginBottom: "4px" }}>
          System Monitoring
        </div>
        <h1 className="page-title">Service Health</h1>
      </div>

      {/* Summary */}
      <div className="metrics-grid" style={{ marginBottom: "20px" }}>
        {[
          { label: "Nominal", value: healthy, color: "#22c55e", dim: "rgba(34,197,94,0.1)", icon: CheckCircle },
          { label: "Degraded", value: degraded, color: "#d97706", dim: "rgba(217,119,6,0.1)", icon: AlertTriangle },
          { label: "Offline", value: offline, color: "#ef4444", dim: "rgba(239,68,68,0.1)", icon: XCircle },
          { label: "Total Services", value: SERVICES.length, color: "#6366f1", dim: "rgba(79,70,229,0.1)", icon: Activity },
        ].map(({ label, value, color, dim, icon: Icon }) => (
          <div key={label} className="intel-panel" style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div style={{ width: "30px", height: "30px", borderRadius: "6px", background: dim, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={15} color={color} />
              </div>
              <span className="section-eyebrow">{label}</span>
            </div>
            <div style={{ fontSize: "1.625rem", fontWeight: 800, color, letterSpacing: "-0.02em" }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Services Table */}
      <div className="intel-panel" style={{ overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(148,163,184,0.1)" }}>
          <div className="section-eyebrow">Service Registry</div>
        </div>
        <div className="intel-table-wrap">
          <table className="intel-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Status</th>
                <th>Latency</th>
                <th>Uptime (30d)</th>
              </tr>
            </thead>
            <tbody>
              {SERVICES.map((s) => (
                <tr key={s.name}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <StatusIcon status={s.status} />
                      <span style={{ fontWeight: 500, color: "#e2e8f0" }}>{s.name}</span>
                    </div>
                  </td>
                  <td><StatusBadge status={s.status} /></td>
                  <td style={{ color: s.status === "degraded" ? "#d97706" : "#94a3b8", fontWeight: s.status === "degraded" ? 700 : 400 }}>
                    {s.latency}
                  </td>
                  <td style={{ color: "#94a3b8" }}>{s.uptime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
