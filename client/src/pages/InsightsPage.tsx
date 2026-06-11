import { useState, useEffect } from "react";
import { Brain, ChevronRight, AlertTriangle, Info } from "lucide-react";
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
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  const threatenedTracks = Array.from(tracks.values())
    .filter((v) => v.severity !== "low")
    .sort((a, b) => b.anomalyScore - a.anomalyScore);

  // Auto-select first track
  useEffect(() => {
    if (!selectedTrackId && threatenedTracks.length > 0) {
      setSelectedTrackId(threatenedTracks[0].id);
    }
  }, [threatenedTracks, selectedTrackId]);

  const selectedTrack = threatenedTracks.find(t => t.id === selectedTrackId) || threatenedTracks[0];
  const selectedAnomaly = selectedTrack ? anomalies.get(selectedTrack.id) : null;

  return (
    <div className="fade-up page-container" style={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>
      <div className="page-header" style={{ flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div>
          <div className="section-eyebrow" style={{ marginBottom: "4px" }}>
            AI-Powered Analysis
          </div>
          <h1 className="page-title">Intelligence Insights</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", borderRadius: "8px", background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.1)" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
          <span style={{ fontSize: "0.6875rem", color: "#94a3b8", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>
            ML Engine Active
          </span>
        </div>
      </div>

      {threatenedTracks.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,0.3)", borderRadius: "12px", border: "1px dashed rgba(148,163,184,0.1)" }}>
          <Brain size={40} style={{ marginBottom: "16px", color: "#64748b", opacity: 0.3 }} />
          <div style={{ fontWeight: 600, color: "#94a3b8", fontSize: "1rem", marginBottom: "4px" }}>No Anomalies Detected</div>
          <div style={{ fontSize: "0.8125rem", color: "#475569" }}>All assets are operating within normal parameters.</div>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 360px", gap: "20px" }}>
          {/* Left: Master List */}
          <div className="custom-scrollbar" style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", paddingRight: "8px" }}>
            {threatenedTracks.map((track) => {
              const isSelected = selectedTrackId === track.id;
              const isCritical = track.severity === "critical";
              const isHigh = track.severity === "high";

              const scoreColor = isCritical ? "#ef4444" : isHigh ? "#f59e0b" : "#b87333";
              const borderColor = isSelected 
                  ? (isCritical ? "rgba(239,68,68,0.5)" : isHigh ? "rgba(245,158,11,0.5)" : "rgba(148,163,184,0.4)")
                  : (isCritical ? "rgba(239,68,68,0.2)" : isHigh ? "rgba(245,158,11,0.2)" : "rgba(148,163,184,0.1)");

              return (
                <div
                  key={track.id}
                  onClick={() => setSelectedTrackId(track.id)}
                  className="intel-panel"
                  style={{
                    padding: "16px",
                    cursor: "pointer",
                    border: `1px solid ${borderColor}`,
                    borderLeft: `3px solid ${scoreColor}`,
                    background: isSelected ? "rgba(15,23,42,0.8)" : "rgba(15,23,42,0.4)",
                    transform: isSelected ? "translateX(4px)" : "none",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#f8fafc" }}>{track.name}</div>
                      <div style={{ fontSize: "0.6875rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>{track.id}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                        <strong style={{ color: scoreColor }}>{track.anomalyScore}</strong>/100
                      </span>
                      <SeverityBadge severity={track.severity} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Details Pane */}
          <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.1)", borderRadius: "12px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {selectedTrack ? (
              <>
                <div style={{ padding: "20px", borderBottom: "1px solid rgba(148,163,184,0.1)", background: "rgba(0,0,0,0.2)" }}>
                   <div style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", marginBottom: "4px", fontWeight: 600 }}>Asset Details</div>
                   <div style={{ fontWeight: 700, color: "#f8fafc", fontSize: "1.125rem" }}>{selectedTrack.name}</div>
                   <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", marginTop: "4px" }}>{selectedTrack.id}</div>
                </div>
                <div className="custom-scrollbar" style={{ padding: "20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "24px" }}>
                   {selectedAnomaly ? (
                     <>
                        <div>
                          <div style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", marginBottom: "12px", fontWeight: 600 }}>
                            Primary Indicators
                          </div>
                          <ul style={{ display: "flex", flexDirection: "column", gap: "10px", margin: 0, padding: 0, listStyle: "none" }}>
                            {selectedAnomaly.reasons.map((r, i) => (
                              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.875rem", color: "#cbd5e1", lineHeight: 1.6 }}>
                                <span style={{ color: selectedTrack.severity === 'critical' ? '#ef4444' : selectedTrack.severity === 'high' ? '#f59e0b' : '#b87333', marginTop: "2px" }}>•</span>
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", marginBottom: "12px", fontWeight: 600 }}>
                            Tactical Response
                          </div>
                          <ul style={{ display: "flex", flexDirection: "column", gap: "8px", margin: 0, padding: 0, listStyle: "none" }}>
                            {selectedAnomaly.actions.map((a, i) => (
                              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.8125rem", color: "#94a3b8", lineHeight: 1.5 }}>
                                <ChevronRight size={14} color="#64748b" style={{ flexShrink: 0, marginTop: "2px" }} />
                                {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                     </>
                   ) : (
                     <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.5 }}>
                        <Info size={32} style={{ marginBottom: "12px", color: "#64748b" }} />
                        <div style={{ fontSize: "0.875rem", color: "#94a3b8" }}>No detailed analysis available.</div>
                     </div>
                   )}
                </div>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "#64748b", fontSize: "0.875rem" }}>
                Select an asset to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
