import { Brain, ChevronRight, AlertTriangle } from "lucide-react";
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

export default function InsightsPage() {
  const { tracks, anomalies } = useWebSocket();

  const threatenedTracks = Array.from(tracks.values())
    .filter((v) => v.severity !== "low")
    .sort((a, b) => b.anomalyScore - a.anomalyScore);

  return (
    <div className="page-container fade-up">
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div className="section-eyebrow" style={{ marginBottom: "4px" }}>
            AI-Powered Analysis
          </div>
          <h1 className="page-title">Intelligence Insights</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "6px", background: "rgba(79,70,229,0.1)", border: "1px solid rgba(79,70,229,0.2)" }}>
          <Brain size={14} color="#6366f1" />
          <span style={{ fontSize: "0.75rem", color: "#a5b4fc", fontWeight: 600 }}>
            ML Model Active
          </span>
        </div>
      </div>

      {threatenedTracks.length === 0 ? (
        <div className="intel-panel" style={{ padding: "48px", textAlign: "center", color: "#475569" }}>
          <Brain size={36} style={{ margin: "0 auto 14px", opacity: 0.25 }} />
          <div style={{ fontWeight: 600, color: "#64748b", marginBottom: "6px" }}>No Anomalies Detected</div>
          <div style={{ fontSize: "0.875rem" }}>All assets are operating within normal parameters</div>
        </div>
      ) : (
        <div className="stack">
          {threatenedTracks.map((track) => {
            const anomaly = anomalies.get(track.id);
            return (
              <div key={track.id} className="intel-panel intel-panel-indigo" style={{ padding: "20px" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "rgba(79,70,229,0.12)", border: "1px solid rgba(79,70,229,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <AlertTriangle size={15} color="#6366f1" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: "#f8fafc", fontSize: "0.9375rem" }}>{track.name}</div>
                      <div style={{ fontSize: "0.6875rem", color: "#475569" }}>{track.id}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.8125rem", color: "#94a3b8" }}>
                      Score: <strong style={{ color: track.anomalyScore >= 75 ? "#ef4444" : "#b87333" }}>{track.anomalyScore}/100</strong>
                    </span>
                    <SeverityBadge severity={track.severity} />
                  </div>
                </div>

                <div className="copper-bar" style={{ marginBottom: "14px" }} />

                {anomaly ? (
                  <div className="content-grid-2">
                    {/* Detection factors */}
                    <div>
                      <div className="section-eyebrow" style={{ marginBottom: "10px" }}>
                        Detection Factors
                      </div>
                      <ul className="stack-sm">
                        {anomaly.reasons.map((r, i) => (
                          <li key={i} className="indigo-line-left" style={{ fontSize: "0.8125rem", color: "#cbd5e1", lineHeight: 1.5 }}>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Recommended response */}
                    <div>
                      <div className="section-eyebrow" style={{ marginBottom: "10px" }}>
                        Response Recommendations
                      </div>
                      <ul className="stack-sm">
                        {anomaly.actions.map((a, i) => (
                          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "0.8125rem", color: "#cbd5e1", lineHeight: 1.5 }}>
                            <ChevronRight size={13} color="#b87333" style={{ flexShrink: 0, marginTop: "2px" }} />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "0.875rem", color: "#475569" }}>
                    No detailed anomaly data available for this asset.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
