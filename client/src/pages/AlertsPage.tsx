import { AlertTriangle, Clock, Filter } from "lucide-react";
import { useWebSocket } from "../context/WebSocketContext";

function SeverityBadge({ severity }: { severity: string }) {
  const cls: Record<string, string> = {
    critical: "badge-critical",
    high: "badge-high",
    medium: "badge-medium",
    low: "badge-low",
  };
  return (
    <span className={`badge ${cls[severity] ?? "badge-info"}`}>{severity}</span>
  );
}

export default function AlertsPage() {
  const { tracks, anomalies } = useWebSocket();

  const rows = Array.from(anomalies.entries()).map(([id, anomaly]) => ({
    id,
    track: tracks.get(id),
    anomaly,
  }));

  const sorted = rows.sort((a, b) => {
    const order: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return (order[b.anomaly.severity] ?? 0) - (order[a.anomaly.severity] ?? 0);
  });

  return (
    <div className="page-container">
      <div
        className="page-header"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div className="section-eyebrow" style={{ marginBottom: "4px" }}>
            Real-Time Intelligence
          </div>
          <h1 className="page-title">Threat Alerts</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button className="btn btn-ghost btn-sm">
            <Filter size={13} />
            Filter
          </button>
        </div>
      </div>

      <div className="intel-panel" style={{ overflow: "hidden" }}>
        {sorted.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "#475569",
            }}
          >
            <AlertTriangle
              size={32}
              style={{ margin: "0 auto 12px", opacity: 0.3 }}
            />
            <div style={{ fontSize: "0.875rem" }}>
              No active alerts — all tracks nominal
            </div>
          </div>
        ) : (
          <div className="intel-table-wrap">
            <table className="intel-table">
              <thead>
                <tr>
                  <th>Track ID / Asset</th>
                  <th>Severity</th>
                  <th>Score</th>
                  <th>Position</th>
                  <th>Speed</th>
                  <th>Detection Reasons</th>
                  <th>Last Update</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ id, track, anomaly }) => (
                  <tr key={id}>
                    <td>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "#f8fafc",
                          fontSize: "0.8125rem",
                        }}
                      >
                        {track?.name ?? "Unknown"}
                      </div>
                      <div style={{ fontSize: "0.6875rem", color: "#475569" }}>
                        {id}
                      </div>
                    </td>
                    <td>
                      <SeverityBadge severity={anomaly.severity} />
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            anomaly.score >= 75
                              ? "#ef4444"
                              : anomaly.score >= 50
                              ? "#b87333"
                              : "#22c55e",
                        }}
                      >
                        {anomaly.score}
                      </span>
                      <span style={{ color: "#475569", fontSize: "0.75rem" }}>
                        /100
                      </span>
                    </td>
                    <td style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
                      {track
                        ? `${(track.lat || 0).toFixed(3)}°N, ${(track.lon || 0).toFixed(3)}°E`
                        : "—"}
                    </td>
                    <td style={{ color: "#94a3b8" }}>
                      {track ? `${(track.speed || 0).toFixed(1)} kts` : "—"}
                    </td>
                    <td>
                      <ul
                        style={{
                          listStyle: "none",
                          fontSize: "0.75rem",
                          color: "#94a3b8",
                        }}
                      >
                        {anomaly.reasons.slice(0, 2).map((r, i) => (
                          <li key={i}>· {r}</li>
                        ))}
                        {anomaly.reasons.length > 2 && (
                          <li style={{ color: "#6366f1" }}>
                            +{anomaly.reasons.length - 2} more
                          </li>
                        )}
                      </ul>
                    </td>
                    <td style={{ color: "#475569", fontSize: "0.75rem" }}>
                      <Clock size={11} style={{ display: "inline", marginRight: 4 }} />
                      {track?.lastUpdate
                        ? new Date(track.lastUpdate).toLocaleTimeString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
