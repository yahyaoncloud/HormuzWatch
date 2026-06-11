import * as React from "react";
import {
  Anchor,
  Plane,
  MapPin,
  Activity,
  Clock,
  Target,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Radio,
  Crosshair,
  Eye,
  Zap,
  Shield,
  Compass,
  Navigation,
  Cpu,
  GitBranch,
  Gauge,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface TrackData {
  id: string;
  name: string;
  lat: number;
  lon: number;
  speed: number;
  heading?: number;
  severity: string;
  anomalyScore: number;
  lastSeen?: string;
}

interface AnomalyData {
  id: string;
  score: number;
  severity: string;
  reasons: string[];
  actions: string[];
}

function classifyObject(id: string | undefined): "asset" | "aircraft" {
  if (!id) return "asset";
  if (id.startsWith("FLIGHT-") || id.startsWith("ADS-") || id.startsWith("ICAO-")) return "aircraft";
  return "asset";
}

const SEV = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", label: "CRITICAL" },
  high:     { color: "#c47a3a", bg: "rgba(196,122,58,0.12)", border: "rgba(196,122,58,0.3)", label: "HIGH" },
  medium:   { color: "#d97706", bg: "rgba(217,119,6,0.12)",  border: "rgba(217,119,6,0.3)",  label: "MEDIUM" },
  low:      { color: "#22c55e", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.25)", label: "LOW" },
} as const;

function getSev(severity: string) {
  return SEV[severity as keyof typeof SEV] ?? SEV.low;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, title, color = "#64748b" }: { icon: React.ElementType; title: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "10px", paddingBottom: "7px", borderBottom: "1px solid rgba(148,163,184,0.08)" }}>
      <Icon size={12} color={color} />
      <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>{title}</span>
    </div>
  );
}

function DataCell({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div style={{ padding: "6px 0" }}>
      <div style={{ fontSize: "0.5875rem", fontWeight: 700, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: highlight ?? "#e2e8f0", fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
    </div>
  );
}

function ThreatGauge({ score, severity }: { score: number; severity: string }) {
  const sev = getSev(severity);
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const radius = 38;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - pct);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width="90" height="52" viewBox="0 0 90 52">
        <path d="M 7 48 A 38 38 0 0 1 83 48" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="6" strokeLinecap="round" />
        <path d="M 7 48 A 38 38 0 0 1 83 48" fill="none" stroke={sev.color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease" }} />
        <text x="45" y="44" textAnchor="middle" fill="#f8fafc" fontSize="20" fontWeight="800" fontFamily="'JetBrains Mono', monospace">{score}</text>
        <text x="45" y="16" textAnchor="middle" fill="#475569" fontSize="7" fontWeight="700" fontFamily="'JetBrains Mono', monospace" letterSpacing="0.1em">THREAT</text>
      </svg>
      <span style={{ fontSize: "0.5625rem", fontWeight: 800, color: sev.color, letterSpacing: "0.12em", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>{sev.label}</span>
    </div>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: "9px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
        <span style={{ fontSize: "0.5875rem", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.06em", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: "0.5875rem", fontWeight: 700, color: value > 70 ? "#ef4444" : value > 40 ? "#c47a3a" : "#22c55e", fontFamily: "'JetBrains Mono', monospace" }}>{value.toFixed(0)}</span>
      </div>
      <div style={{ width: "100%", height: "3px", background: "rgba(148,163,184,0.1)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: value > 70 ? "#ef4444" : value > 40 ? color : "#22c55e", borderRadius: "2px", transition: "width 1s ease-out" }} />
      </div>
    </div>
  );
}

function DetectionCard({ reason, index, severity, accentColor }: { reason: string; index: number; severity: string; accentColor: string }) {
  const sev = getSev(severity);
  const confidence = Math.max(60, 95 - index * 10);
  const isHighConf = confidence >= 80;
  return (
    <div style={{ background: "rgba(15,23,42,0.5)", border: `1px solid ${isHighConf ? sev.border : "rgba(148,163,184,0.08)"}`, borderLeft: `3px solid ${accentColor}`, borderRadius: "4px", padding: "9px 10px", display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "5px" }}>
      <div style={{ width: "24px", height: "24px", borderRadius: "3px", background: sev.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <AlertTriangle size={11} color={sev.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#e2e8f0", marginBottom: "3px", lineHeight: 1.4 }}>{reason}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "0.625rem", fontWeight: 700, color: isHighConf ? sev.color : "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>{confidence}% CONF</span>
          <span style={{ fontSize: "0.5625rem", fontWeight: 700, color: sev.color, background: sev.bg, padding: "1px 5px", borderRadius: "2px", fontFamily: "'JetBrains Mono', monospace" }}>{sev.label}</span>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ action, index, accentColor }: { action: string; index: number; accentColor: string }) {
  const priorities = ["IMMEDIATE", "HIGH", "STANDARD", "ADVISORY"];
  const teams = ["INTEL OPS", "WATCH TEAM", "FLEET CMD", "SIGINT"];
  const urgencies = ["< 5 MIN", "< 15 MIN", "< 30 MIN", "< 1 HR"];
  const priority = priorities[Math.min(index, priorities.length - 1)];
  const team = teams[Math.min(index, teams.length - 1)];
  const urgency = urgencies[Math.min(index, urgencies.length - 1)];
  const isImmediate = index === 0;
  return (
    <div style={{ background: isImmediate ? "rgba(239,68,68,0.05)" : "rgba(15,23,42,0.5)", border: `1px solid ${isImmediate ? "rgba(239,68,68,0.18)" : "rgba(148,163,184,0.08)"}`, borderRadius: "4px", padding: "8px 10px", marginBottom: "5px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "7px", marginBottom: "5px" }}>
        <Zap size={12} color={isImmediate ? "#ef4444" : accentColor} style={{ marginTop: "2px", flexShrink: 0 }} />
        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#e2e8f0", lineHeight: 1.4 }}>{action}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.08em", padding: "1px 6px", borderRadius: "2px", background: isImmediate ? "rgba(239,68,68,0.15)" : "rgba(148,163,184,0.08)", color: isImmediate ? "#ef4444" : "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{priority}</span>
        <span style={{ fontSize: "0.5625rem", fontWeight: 600, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>{team}</span>
        <span style={{ fontSize: "0.5625rem", fontWeight: 600, color: accentColor, fontFamily: "'JetBrains Mono', monospace", marginLeft: "auto" }}>{urgency}</span>
      </div>
    </div>
  );
}

function TimelineEvent({ text, time, accentColor, isLast }: { text: string; time: string; accentColor: string; isLast?: boolean }) {
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "10px", flexShrink: 0 }}>
        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: accentColor, border: `2px solid ${accentColor}44`, marginTop: "3px" }} />
        {!isLast && <div style={{ width: "1px", flex: 1, minHeight: "14px", background: "rgba(148,163,184,0.12)" }} />}
      </div>
      <div style={{ flex: 1, paddingBottom: "8px" }}>
        <div style={{ fontSize: "0.75rem", color: "#cbd5e1", lineHeight: 1.35 }}>{text}</div>
        <div style={{ fontSize: "0.5625rem", color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginTop: "1px" }}>{time}</div>
      </div>
    </div>
  );
}

function generateTimelineEvents(track: TrackData, anomaly: AnomalyData | null) {
  const events: { text: string; time: string }[] = [];
  const now = new Date();
  if (anomaly) {
    anomaly.reasons.forEach((reason, i) => {
      const t = new Date(now.getTime() - (i + 1) * 120000);
      events.push({ text: reason, time: t.toLocaleTimeString("en-US", { hour12: false }) });
    });
  }
  events.push({ text: `${classifyObject(track.id) === "aircraft" ? "ADS-B" : "AIS"} signal acquired`, time: new Date(now.getTime() - 600000).toLocaleTimeString("en-US", { hour12: false }) });
  if (track.speed < 3) events.push({ text: "Speed anomaly: near-stationary", time: new Date(now.getTime() - 180000).toLocaleTimeString("en-US", { hour12: false }) });
  return events.slice(0, 6);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function IntelligencePanel({ track, anomaly }: { track: TrackData | null; anomaly: AnomalyData | null }) {
  const [activeTab, setActiveTab] = React.useState<"profile" | "analysis" | "actions">("profile");

  React.useEffect(() => {
    setActiveTab("profile");
  }, [track?.id]);

  if (!track) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(11,18,32,0.95)", padding: "40px 24px", textAlign: "center" }}>
        <Crosshair size={32} color="#1e293b" style={{ margin: "0 auto 10px" }} />
        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#334155", fontFamily: "'Space Grotesk', sans-serif" }}>Select a target to view its intelligence profile</div>
        <div style={{ fontSize: "0.75rem", color: "#1e293b", marginTop: "4px", fontFamily: "'JetBrains Mono', monospace" }}>Click any marker on the map or select from the navigation panel</div>
      </div>
    );
  }

  const objType = classifyObject(track.id);
  const isAircraft = objType === "aircraft";
  const accentColor = isAircraft ? "#38bdf8" : "#c47a3a";
  const accentBg = isAircraft ? "rgba(56,189,248,0.07)" : "rgba(196,122,58,0.07)";
  const accentBorder = isAircraft ? "rgba(56,189,248,0.18)" : "rgba(196,122,58,0.18)";
  const sev = getSev(track.severity);
  const timeline = generateTimelineEvents(track, anomaly);
  const TypeIcon = isAircraft ? Plane : Anchor;
  const confidence = Math.min(98, 70 + track.anomalyScore * 0.28);

  // ML feature weights (deterministic from score)
  const getW = (seed: number) => Math.max(10, Math.min(100, (track.anomalyScore * seed) % 100));
  const mlFeatures = [
    { label: "Kinematic Variance", value: getW(1.7) },
    { label: "AIS Integrity", value: getW(3.1) },
    { label: "Spatial Threat", value: getW(0.9) },
    { label: "Temporal Gap", value: getW(2.4) },
    { label: "Contextual Risk", value: getW(1.2) },
  ];

  const cardStyle: React.CSSProperties = {
    background: "rgba(11,18,32,0.7)",
    border: "1px solid rgba(148,163,184,0.09)",
    borderRadius: "5px",
    padding: "12px 14px",
  };

  return (
    <div
      id="intelligence-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────────── */}
      <div style={{ padding: "16px 18px", background: `linear-gradient(90deg, ${accentBg} 0%, rgba(11,18,32,0.95) 100%)`, borderBottom: `1px solid ${accentBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: "1 1 auto", minWidth: "200px" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "8px", background: `linear-gradient(135deg, ${accentColor}15 0%, transparent 100%)`, border: `1px solid ${accentColor}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 0 12px ${accentColor}10` }}>
            <TypeIcon size={20} color={accentColor} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.01em", lineHeight: 1.2 }}>{track.name}</div>
            <div style={{ fontSize: "0.625rem", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", marginTop: "3px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: accentColor, fontWeight: 700 }}>{isAircraft ? "AIRCRAFT" : "MARITIME ASSET"}</span>
              <span style={{ color: "#334155" }}>·</span>
              <span>{track.id}</span>
            </div>
          </div>
        </div>
        {/* Right side of header: badge + live indicator */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
          <div style={{ padding: "3px 10px", borderRadius: "4px", background: sev.bg, border: `1px solid ${sev.border}`, fontSize: "0.5625rem", fontWeight: 800, color: sev.color, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", boxShadow: `0 0 10px ${sev.bg}` }}>{sev.label} RISK</div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.5rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "heatmap-breathe 2s ease-in-out infinite" }} />
            LIVE <Clock size={8} style={{ marginLeft: "2px" }} /> {new Date().toLocaleTimeString("en-US", { hour12: false })}
          </div>
        </div>
      </div>

      {/* ── THREAT STRIP ───────────────────────────────────────────────────────── */}
      <div style={{ padding: "10px 18px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "16px", borderBottom: "1px solid rgba(148,163,184,0.08)", background: `linear-gradient(90deg, ${sev.bg} 0%, transparent 60%)` }}>
        <ThreatGauge score={track.anomalyScore} severity={track.severity} />
        {/* Quick stat row */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: "8px" }}>
          {[
            { label: "RISK TREND", value: track.anomalyScore >= 55 ? "ESCALATING" : track.anomalyScore >= 30 ? "STABLE" : "NOMINAL", color: track.anomalyScore >= 55 ? "#ef4444" : track.anomalyScore >= 30 ? "#d97706" : "#22c55e" },
            { label: "CONFIDENCE", value: `${confidence.toFixed(0)}%`, color: "#e2e8f0" },
            { label: "SCORE", value: `${track.anomalyScore}/100`, color: sev.color },
            { label: "VECTOR", value: `${(track.heading ?? 0).toFixed(0)}° @ ${(track.speed || 0).toFixed(1)}kts`, color: "#94a3b8" },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: "0.5rem", fontWeight: 700, color: "#475569", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace", marginBottom: "2px" }}>{s.label}</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TABS HEADER ────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(148,163,184,0.1)", background: "rgba(11,18,32,0.4)" }}>
        <button
          onClick={() => setActiveTab("profile")}
          style={{ flex: 1, padding: "10px 0", background: activeTab === "profile" ? "rgba(255,255,255,0.03)" : "transparent", border: "none", borderBottom: `2px solid ${activeTab === "profile" ? accentColor : "transparent"}`, cursor: "pointer", color: activeTab === "profile" ? "#f8fafc" : "#64748b", fontSize: "0.625rem", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em", transition: "all 0.2s ease" }}
        >
          PROFILE
        </button>
        <button
          onClick={() => setActiveTab("analysis")}
          style={{ flex: 1, padding: "10px 0", background: activeTab === "analysis" ? "rgba(255,255,255,0.03)" : "transparent", border: "none", borderBottom: `2px solid ${activeTab === "analysis" ? accentColor : "transparent"}`, cursor: "pointer", color: activeTab === "analysis" ? "#f8fafc" : "#64748b", fontSize: "0.625rem", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em", transition: "all 0.2s ease" }}
        >
          ANALYSIS
        </button>
        <button
          onClick={() => setActiveTab("actions")}
          style={{ flex: 1, padding: "10px 0", background: activeTab === "actions" ? "rgba(255,255,255,0.03)" : "transparent", border: "none", borderBottom: `2px solid ${activeTab === "actions" ? accentColor : "transparent"}`, cursor: "pointer", color: activeTab === "actions" ? "#f8fafc" : "#64748b", fontSize: "0.625rem", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em", transition: "all 0.2s ease" }}
        >
          ACTIONS
        </button>
      </div>

      {/* ── SCROLLABLE CONTENT ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px 16px", display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* ── TAB 1: PROFILE ─────────────────────────────────────────────────── */}
        {activeTab === "profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Live Telemetry */}
          <div style={cardStyle}>
            <SectionLabel icon={Radio} title="Live Telemetry" color={accentColor} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
              <DataCell label="Speed" value={`${(track.speed || 0).toFixed(1)} kts`} />
              <DataCell label="Heading" value={`${(track.heading ?? 0).toFixed(0)}° TRUE`} />
              <DataCell label="Latitude" value={`${(track.lat || 0).toFixed(4)}° N`} />
              <DataCell label="Longitude" value={`${(track.lon || 0).toFixed(4)}° E`} />
              <DataCell label="Status" value={track.speed < 1 ? "STATIONARY" : "UNDERWAY"} highlight={track.speed < 1 ? "#d97706" : "#22c55e"} />
              <DataCell label="Last Fix" value={new Date().toLocaleTimeString("en-US", { hour12: false })} />
              {isAircraft && <DataCell label="Altitude" value="FL350" />}
              {isAircraft && <DataCell label="Squawk" value="7700" />}
            </div>
          </div>

          {/* Object Profile */}
          <div style={cardStyle}>
            <SectionLabel icon={Eye} title="Object Profile" color={accentColor} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
              <DataCell label="ID" value={track.id.length > 14 ? track.id.slice(0, 14) + "…" : track.id} />
              <DataCell label="Class" value={isAircraft ? "CIVIL AVIATION" : "MERCHANT"} />
              <DataCell label={isAircraft ? "ICAO" : "MMSI"} value={track.id.split("-").pop() ?? "—"} />
              <DataCell label="Type" value={isAircraft ? "FIXED WING" : "CARGO/TANKER"} />
              <DataCell label="Flag" value="—" />
              <DataCell label="Operator" value="—" />
            </div>
          </div>

          {/* Position snapshot */}
          <div style={{ ...cardStyle, background: "rgba(8,13,24,0.9)" }}>
            <SectionLabel icon={MapPin} title="Position Report" color={accentColor} />
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6875rem", color: "#94a3b8", lineHeight: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#475569" }}>LAT</span>
                <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{(track.lat || 0).toFixed(5)}° N</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#475569" }}>LON</span>
                <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{(track.lon || 0).toFixed(5)}° E</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#475569" }}>COG</span>
                <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{(track.heading ?? 0).toFixed(1)}°</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#475569" }}>SOG</span>
                <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{(track.speed || 0).toFixed(1)} kts</span>
              </div>
            </div>
          </div>
            </div>
        )}

        {/* ── TAB 2: ANALYSIS ─────────────────────────────────────────────────── */}
        {activeTab === "analysis" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Detection Analysis */}
          <div style={cardStyle}>
            <SectionLabel icon={Target} title="Detection Analysis" color={sev.color} />
            {anomaly && anomaly.reasons.length > 0 ? (
              anomaly.reasons.map((reason, i) => (
                <DetectionCard key={i} reason={reason} index={i} severity={anomaly.severity} accentColor={accentColor} />
              ))
            ) : (
              <div style={{ fontSize: "0.75rem", color: "#475569", textAlign: "center", padding: "12px 0", fontFamily: "'JetBrains Mono', monospace" }}>No anomalous signals detected</div>
            )}
          </div>

          {/* ML Signature Analysis */}
          <div style={cardStyle}>
            <SectionLabel icon={Cpu} title="ML Signature Analysis" color={accentColor} />
            {mlFeatures.map((feat, i) => (
              <ScoreBar key={i} label={feat.label} value={feat.value} color={accentColor} />
            ))}
            <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(148,163,184,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.5rem", color: "#475569", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>Model Confidence</span>
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: accentColor, fontFamily: "'JetBrains Mono', monospace" }}>{confidence.toFixed(0)}%</span>
            </div>
          </div>

          {/* Threat Breakdown mini-card */}
          <div style={cardStyle}>
            <SectionLabel icon={Gauge} title="Threat Breakdown" color={sev.color} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {[
                { label: "Kinematic", val: Math.min(100, track.anomalyScore * 0.9 + 5) },
                { label: "Geospatial", val: Math.min(100, track.anomalyScore * 0.7 + 10) },
                { label: "Temporal", val: Math.min(100, track.anomalyScore * 0.5 + 8) },
                { label: "Contextual", val: Math.min(100, track.anomalyScore * 0.6 + 12) },
              ].map((item) => (
                <div key={item.label} style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.07)", borderRadius: "3px", padding: "7px 8px" }}>
                  <div style={{ fontSize: "0.5rem", color: "#475569", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "3px" }}>{item.label}</div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: item.val > 65 ? "#ef4444" : item.val > 35 ? "#c47a3a" : "#22c55e", fontFamily: "'JetBrains Mono', monospace" }}>{item.val.toFixed(0)}</div>
                  <div style={{ width: "100%", height: "2px", background: "rgba(148,163,184,0.08)", borderRadius: "1px", marginTop: "4px" }}>
                    <div style={{ width: `${item.val}%`, height: "100%", background: item.val > 65 ? "#ef4444" : item.val > 35 ? "#c47a3a" : "#22c55e", borderRadius: "1px", transition: "width 0.8s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
            </div>
        )}

        {/* ── TAB 3: ACTIONS ──────────────────────────────────────────────────── */}
        {activeTab === "actions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Recommended Actions */}
          <div style={cardStyle}>
            <SectionLabel icon={Shield} title="Recommended Actions" color={accentColor} />
            {anomaly && anomaly.actions.length > 0 ? (
              anomaly.actions.map((action, i) => (
                <ActionCard key={i} action={action} index={i} accentColor={accentColor} />
              ))
            ) : (
              <div style={{ fontSize: "0.75rem", color: "#475569", textAlign: "center", padding: "12px 0", fontFamily: "'JetBrains Mono', monospace" }}>No actions required</div>
            )}
          </div>

          {/* Activity Timeline */}
          <div style={cardStyle}>
            <SectionLabel icon={GitBranch} title="Activity Timeline" color={accentColor} />
            <div style={{ paddingLeft: "2px" }}>
              {timeline.map((evt, i) => (
                <TimelineEvent key={i} text={evt.text} time={evt.time} accentColor={i === 0 ? sev.color : accentColor} isLast={i === timeline.length - 1} />
              ))}
            </div>
          </div>

          {/* Intelligence Notes */}
          <div style={{ ...cardStyle, background: "rgba(8,13,24,0.9)" }}>
            <SectionLabel icon={ShieldAlert} title="Intel Assessment" color={sev.color} />
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", lineHeight: 1.6 }}>
              <span style={{ color: sev.color, fontWeight: 700 }}>[{sev.label}] </span>
              {track.anomalyScore >= 75
                ? `Object ${track.name} is exhibiting high-priority threat indicators. Immediate classification review recommended. Coordinate with FLEET CMD for intercept protocols.`
                : track.anomalyScore >= 45
                ? `Object ${track.name} is demonstrating elevated risk patterns. Continuous monitoring active. Flag for secondary analysis within 15 minutes.`
                : `Object ${track.name} is within nominal operating parameters. Standard watch posture maintained. No immediate action required.`}
            </div>
            <div style={{ marginTop: "10px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {["ML-SCORED", isAircraft ? "ADS-B" : "AIS", `${sev.label}`].map((tag) => (
                <span key={tag} style={{ fontSize: "0.5rem", fontWeight: 700, color: "#475569", background: "rgba(148,163,184,0.07)", border: "1px solid rgba(148,163,184,0.1)", padding: "2px 7px", borderRadius: "2px", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>{tag}</span>
              ))}
            </div>
          </div>
            </div>
        )}
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────────────────── */}
      <div style={{ padding: "7px 18px", borderTop: "1px solid rgba(148,163,184,0.07)", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.5rem", color: "#334155", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em", flexShrink: 0 }}>
        <Compass size={9} />
        <span>{(track.lat || 0).toFixed(3)}°N {(track.lon || 0).toFixed(3)}°E</span>
        <span style={{ marginLeft: "auto" }}>HORMUZWATCH v2.0 · INTEL MODULE</span>
      </div>
    </div>
  );
}
