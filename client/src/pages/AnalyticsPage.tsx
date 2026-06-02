import { BarChart3, TrendingUp, Activity, Zap } from "lucide-react";
import { useWebSocket } from "../context/WebSocketContext";

function StatBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "6px",
        }}
      >
        <span style={{ fontSize: "0.8125rem", color: "#94a3b8" }}>{label}</span>
        <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#f8fafc" }}>
          {value}
        </span>
      </div>
      <div
        style={{
          height: "4px",
          background: "rgba(148,163,184,0.1)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: "2px",
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { vessels, anomalies } = useWebSocket();

  const vesselArr = Array.from(vessels.values());
  const critical = vesselArr.filter((v) => v.severity === "critical").length;
  const high = vesselArr.filter((v) => v.severity === "high").length;
  const medium = vesselArr.filter((v) => v.severity === "medium").length;
  const low = vesselArr.filter((v) => v.severity === "low").length;
  const total = vesselArr.length || 1;

  const avgSpeed =
    vesselArr.length > 0
      ? (vesselArr.reduce((a, v) => a + v.speed, 0) / vesselArr.length).toFixed(1)
      : "0.0";

  const avgScore =
    vesselArr.length > 0
      ? Math.round(vesselArr.reduce((a, v) => a + v.anomalyScore, 0) / vesselArr.length)
      : 0;

  const topThreats = vesselArr
    .sort((a, b) => b.anomalyScore - a.anomalyScore)
    .slice(0, 6);

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="section-eyebrow" style={{ marginBottom: "4px" }}>
          Fleet Intelligence
        </div>
        <h1 className="page-title">Analytics</h1>
      </div>

      {/* Summary KPI row */}
      <div className="metrics-grid" style={{ marginBottom: "20px" }}>
        {[
          { icon: Activity, label: "Total Tracked", value: vessels.size, color: "#6366f1" },
          { icon: Zap, label: "Anomalies", value: anomalies.size, color: "#b87333" },
          { icon: TrendingUp, label: "Avg Speed", value: `${avgSpeed} kts`, color: "#22c55e" },
          { icon: BarChart3, label: "Avg Threat Score", value: `${avgScore}`, color: "#ef4444" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="intel-panel" style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <Icon size={16} color={color} />
              <span className="section-eyebrow">{label}</span>
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em" }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="content-grid-2">
        {/* Severity Distribution */}
        <div className="intel-panel" style={{ padding: "20px" }}>
          <div className="section-eyebrow" style={{ marginBottom: "16px" }}>
            Severity Distribution
          </div>
          <div className="stack">
            <StatBar label="Critical" value={critical} max={total} color="#ef4444" />
            <StatBar label="High" value={high} max={total} color="#b87333" />
            <StatBar label="Medium" value={medium} max={total} color="#d97706" />
            <StatBar label="Low" value={low} max={total} color="#22c55e" />
          </div>
        </div>

        {/* Top Threats */}
        <div className="intel-panel" style={{ padding: "20px" }}>
          <div className="section-eyebrow" style={{ marginBottom: "14px" }}>
            Highest Threat Scores
          </div>
          {topThreats.length === 0 ? (
            <div style={{ color: "#475569", fontSize: "0.875rem", textAlign: "center", padding: "24px 0" }}>
              No vessel data yet
            </div>
          ) : (
            <div className="stack-sm">
              {topThreats.map((v) => (
                <div
                  key={v.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    background: "rgba(15,23,42,0.5)",
                    border: "1px solid rgba(148,163,184,0.08)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#e2e8f0" }}>
                      {v.name}
                    </div>
                    <div style={{ fontSize: "0.6875rem", color: "#475569" }}>{v.id}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "60px",
                        height: "4px",
                        background: "rgba(148,163,184,0.1)",
                        borderRadius: "2px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${v.anomalyScore}%`,
                          height: "100%",
                          background:
                            v.anomalyScore >= 75
                              ? "#ef4444"
                              : v.anomalyScore >= 50
                              ? "#b87333"
                              : "#22c55e",
                          borderRadius: "2px",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: 700,
                        color:
                          v.anomalyScore >= 75
                            ? "#ef4444"
                            : v.anomalyScore >= 50
                            ? "#b87333"
                            : "#22c55e",
                        minWidth: "28px",
                        textAlign: "right",
                      }}
                    >
                      {v.anomalyScore}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
