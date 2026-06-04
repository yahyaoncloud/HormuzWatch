import { useMemo, useState, useEffect } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Activity, 
  Zap,
  Anchor,
  Plane,
  AlertTriangle,
  ShieldAlert,
  Target,
  Crosshair,
  Minus,
  Bookmark,
  BookmarkPlus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import IntelMetric from "../components/IntelMetric";

function classifyObject(id: string | undefined): "asset" | "aircraft" {
  if (!id) return "asset";
  if (id.startsWith("FLIGHT-") || id.startsWith("ADS-") || id.startsWith("ICAO-")) {
    return "aircraft";
  }
  return "asset";
}

// ── SVG Gauge for Top Threats ───────────────────────────────────────────────
function MiniThreatGauge({ score, size = 32 }: { score: number, size?: number }) {
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const radius = size / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);
  const color = score >= 75 ? "#ef4444" : score >= 50 ? "#c47a3a" : score >= 30 ? "#d97706" : "#22c55e";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={size/2} cy={size/2} r={radius}
        fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="3"
      />
      <circle
        cx={size/2} cy={size/2} r={radius}
        fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { tracks, anomalies } = useWebSocket();
  const navigate = useNavigate();

  const [watchlist, setWatchlist] = useState<any[]>([]);

  const fetchWatchlist = async () => {
    try {
      const res = await fetch("/api/watchlist");
      if (res.ok) {
        setWatchlist(await res.json());
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const addToWatchlist = async (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/watchlist/${trackId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "" })
    });
    fetchWatchlist();
  };

  const trackArr = Array.from(tracks.values());
  const total = trackArr.length || 1;
  
  const critical = trackArr.filter((v) => v.severity === "critical").length;
  const high = trackArr.filter((v) => v.severity === "high").length;
  const medium = trackArr.filter((v) => v.severity === "medium").length;
  const low = trackArr.filter((v) => v.severity === "low").length;

  const maritime = trackArr.filter((v) => classifyObject(v.id) === "asset").length;
  const aviation = trackArr.filter((v) => classifyObject(v.id) === "aircraft").length;

  const avgSpeed = trackArr.length > 0
    ? (trackArr.reduce((a, v) => a + (v.speed || 0), 0) / trackArr.length).toFixed(1)
    : "0.0";

  const avgScore = trackArr.length > 0
    ? Math.round(trackArr.reduce((a, v) => a + v.anomalyScore, 0) / trackArr.length)
    : 0;

  const topThreats = trackArr
    .sort((a, b) => b.anomalyScore - a.anomalyScore)
    .slice(0, 8);

  return (
    <div className="page-container fade-up" style={{ paddingBottom: "40px" }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div className="section-eyebrow" style={{ marginBottom: "6px" }}>Fleet Intelligence</div>
        <h1 className="page-title">Operational Analytics</h1>
      </div>

      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <IntelMetric 
          label="Total Tracked" 
          value={tracks.size} 
          trend={+4.2} 
          icon={Crosshair} 
          isThreat={false}
        />
        <IntelMetric 
          label="Active Anomalies" 
          value={anomalies.size} 
          trend={critical > 0 ? +12.5 : -2.1} 
          icon={Zap} 
          isThreat={false}
        />
        <IntelMetric 
          label="Fleet Avg Speed" 
          value={`${avgSpeed} kts`} 
          trend={0} 
          icon={Activity} 
          isThreat={false}
        />
        <IntelMetric 
          label="Avg Threat Score" 
          value={avgScore} 
          trend={avgScore > 30 ? +8.4 : -5.2} 
          icon={BarChart3} 
          color="#ef4444" 
          bg="rgba(239,68,68,0.1)" 
          isThreat={true}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
        
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Tactical Severity Readout */}
          <div style={{
            background: "rgba(11,18,32,0.6)",
            border: "1px solid rgba(148,163,184,0.1)",
            borderRadius: "6px",
            padding: "20px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <ShieldAlert size={16} color="#94a3b8" />
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>
                Threat Level Distribution
              </span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "CRITICAL", count: critical, color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
                { label: "HIGH", count: high, color: "#c47a3a", bg: "rgba(196,122,58,0.15)" },
                { label: "MEDIUM", count: medium, color: "#d97706", bg: "rgba(217,119,6,0.15)" },
                { label: "LOW", count: low, color: "#22c55e", bg: "rgba(34,197,94,0.15)" }
              ].map(s => (
                <div key={s.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: s.color, letterSpacing: "0.05em", fontFamily: "'JetBrains Mono', monospace" }}>{s.label}</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#f8fafc", fontFamily: "'JetBrains Mono', monospace" }}>{s.count}</span>
                  </div>
                  <div style={{ height: "6px", background: "rgba(148,163,184,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${(s.count / total) * 100}%`, height: "100%", background: s.color, borderRadius: "3px", transition: "width 0.4s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fleet Composition */}
          <div style={{
            background: "rgba(11,18,32,0.6)",
            border: "1px solid rgba(148,163,184,0.1)",
            borderRadius: "6px",
            padding: "20px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <Target size={16} color="#94a3b8" />
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>
                Active Fleet Composition
              </span>
            </div>
            
            <div style={{ display: "flex", gap: "16px" }}>
              <div style={{ flex: 1, background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "6px", padding: "16px", textAlign: "center" }}>
                <Anchor size={24} color="#6366f1" style={{ margin: "0 auto 8px" }} />
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f8fafc", fontFamily: "'JetBrains Mono', monospace" }}>{maritime}</div>
                <div style={{ fontSize: "0.625rem", color: "#818cf8", fontWeight: 700, letterSpacing: "0.1em", marginTop: "4px" }}>MARITIME ASSETS</div>
              </div>
              <div style={{ flex: 1, background: "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: "6px", padding: "16px", textAlign: "center" }}>
                <Plane size={24} color="#38bdf8" style={{ margin: "0 auto 8px" }} />
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f8fafc", fontFamily: "'JetBrains Mono', monospace" }}>{aviation}</div>
                <div style={{ fontSize: "0.625rem", color: "#7dd3fc", fontWeight: 700, letterSpacing: "0.1em", marginTop: "4px" }}>AVIATION TRACKS</div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Top Threats */}
        <div style={{
          background: "linear-gradient(180deg, rgba(11,18,32,0.8) 0%, rgba(8,13,24,0.9) 100%)",
          border: "1px solid rgba(148,163,184,0.15)",
          borderRadius: "6px",
          padding: "20px",
          height: "100%"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertTriangle size={16} color="#ef4444" />
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>
                Priority Intercepts (Top Threats)
              </span>
            </div>
          </div>

          {topThreats.length === 0 ? (
            <div style={{ color: "#475569", fontSize: "0.875rem", textAlign: "center", padding: "40px 0" }}>
              No tracking data acquired
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {topThreats.map((v) => {
                const isAircraft = classifyObject(v.id) === "aircraft";
                const TypeIcon = isAircraft ? Plane : Anchor;
                const accent = isAircraft ? "#38bdf8" : "#c47a3a";
                const sevColor = v.severity === "critical" ? "#ef4444" : v.severity === "high" ? "#c47a3a" : v.severity === "medium" ? "#d97706" : "#22c55e";

                return (
                  <div
                    key={v.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px",
                      background: "rgba(15,23,42,0.6)",
                      border: "1px solid rgba(148,163,184,0.1)",
                      borderLeft: `2px solid ${sevColor}`,
                      borderRadius: "4px"
                    }}
                  >
                    <div style={{ 
                      width: "32px", height: "32px", borderRadius: "4px", background: `${accent}15`, 
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                    }}>
                      <TypeIcon size={16} color={accent} />
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {v.name}
                      </div>
                      <div style={{ fontSize: "0.625rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace", marginTop: "2px", display: "flex", gap: "8px" }}>
                        <span>{v.id}</span>
                        <span style={{ color: "#334155" }}>|</span>
                        <span>{(v.speed || 0).toFixed(1)} KTS</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.5625rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>SCORE</div>
                        <div style={{ fontSize: "0.875rem", fontWeight: 800, color: sevColor, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
                          {v.anomalyScore}
                        </div>
                      </div>
                      <MiniThreatGauge score={v.anomalyScore} size={28} />
                      <button 
                        onClick={(e) => addToWatchlist(v.id, e)}
                        title="Add to Watchlist"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "4px" }}>
                        <BookmarkPlus size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {/* Watchlist Section */}
      <div style={{ marginTop: "24px" }}>
        <div style={{
          background: "rgba(11,18,32,0.6)",
          border: "1px solid rgba(148,163,184,0.1)",
          borderRadius: "6px",
          padding: "20px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <Bookmark size={16} color="#6366f1" />
            <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>
              Active Watchlist / Saved Objects
            </span>
          </div>

          {watchlist.length === 0 ? (
            <div style={{ color: "#475569", fontSize: "0.875rem", textAlign: "center", padding: "20px 0" }}>
              No objects in watchlist. Click the bookmark icon on any tracked object to save it.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(148,163,184,0.1)", color: "#64748b", fontSize: "0.6875rem", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>
                    <th style={{ padding: "12px 8px" }}>Asset</th>
                    <th style={{ padding: "12px 8px" }}>Track ID</th>
                    <th style={{ padding: "12px 8px" }}>Severity</th>
                    <th style={{ padding: "12px 8px" }}>Score</th>
                    <th style={{ padding: "12px 8px" }}>Added At</th>
                    <th style={{ padding: "12px 8px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {watchlist.map((w: any) => {
                    const sevColor = w.severity === "critical" ? "#ef4444" : w.severity === "high" ? "#c47a3a" : w.severity === "medium" ? "#d97706" : "#22c55e";
                    return (
                    <tr key={w.track_id} style={{ borderBottom: "1px solid rgba(148,163,184,0.05)" }}>
                      <td style={{ padding: "12px 8px", color: "#f8fafc", fontSize: "0.875rem", fontWeight: 600 }}>
                        {w.asset_name || "Unknown"}
                      </td>
                      <td style={{ padding: "12px 8px", color: "#94a3b8", fontSize: "0.8125rem", fontFamily: "'JetBrains Mono', monospace" }}>
                        {w.track_id}
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <span style={{ background: `${sevColor}1a`, border: `1px solid ${sevColor}44`, color: sevColor, padding: "2px 8px", borderRadius: "3px", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>{w.severity || "low"}</span>
                      </td>
                      <td style={{ padding: "12px 8px", color: sevColor, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: "0.875rem" }}>
                        {Math.round(w.score || 0)}
                      </td>
                      <td style={{ padding: "12px 8px", color: "#64748b", fontSize: "0.8125rem" }}>
                        {new Date(w.added_at).toLocaleString()}
                      </td>
                      <td style={{ padding: "12px 8px", display: "flex", gap: "6px" }}>
                        <button
                          onClick={() => navigate(`/analytics/track/${w.track_id}`)}
                          style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "4px", padding: "4px 12px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}
                        >
                          Details
                        </button>
                        <button
                          onClick={async () => { await fetch(`/api/watchlist/${w.track_id}`, { method: "DELETE" }); fetchWatchlist(); }}
                          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "4px", padding: "4px 10px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
