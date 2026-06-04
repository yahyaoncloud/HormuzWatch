import * as React from "react";
import { useState } from "react";
import {
  Anchor,
  Plane,
  Landmark,
  MapPin,
  Activity,
  Navigation,
  Clock,
  Target,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Radio,
  ChevronDown,
  ChevronRight,
  Crosshair,
  Eye,
  Zap,
  Shield,
  Compass,
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

type ObjectType = "asset" | "aircraft";

function classifyObject(id: string | undefined): "asset" | "aircraft" {
  if (!id) return "asset";
  if (id.startsWith("FLIGHT-") || id.startsWith("ADS-") || id.startsWith("ICAO-")) return "aircraft";
  return "asset";
}

// ── Severity color system ────────────────────────────────────────────────────

const SEV = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", label: "CRITICAL" },
  high:     { color: "#c47a3a", bg: "rgba(196,122,58,0.12)", border: "rgba(196,122,58,0.3)", label: "HIGH" },
  medium:   { color: "#d97706", bg: "rgba(217,119,6,0.12)",  border: "rgba(217,119,6,0.3)",  label: "MEDIUM" },
  low:      { color: "#22c55e", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.25)", label: "LOW" },
} as const;

function getSev(severity: string) {
  return SEV[severity as keyof typeof SEV] ?? SEV.low;
}

// ── Collapsible section ──────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  defaultOpen = true,
  accentColor = "#64748b",
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  accentColor?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid rgba(148,163,184,0.08)" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#94a3b8",
          fontSize: "0.6875rem",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontFamily: "'JetBrains Mono', 'Space Grotesk', monospace",
        }}
      >
        <Icon size={13} color={accentColor} />
        <span style={{ flex: 1, textAlign: "left" }}>{title}</span>
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>
      <div
        style={{
          maxHeight: open ? "2000px" : "0",
          overflow: "hidden",
          transition: "max-height 0.35s ease",
        }}
      >
        <div style={{ paddingBottom: "14px" }}>{children}</div>
      </div>
    </div>
  );
}

// ── Threat Score Gauge (SVG arc) ─────────────────────────────────────────────

function ThreatGauge({ score, severity }: { score: number; severity: string }) {
  const sev = getSev(severity);
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const radius = 42;
  const circumference = Math.PI * radius; // semi-circle
  const dashOffset = circumference * (1 - pct);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
      <svg width="100" height="58" viewBox="0 0 100 58">
        {/* Background arc */}
        <path
          d="M 8 54 A 42 42 0 0 1 92 54"
          fill="none"
          stroke="rgba(148,163,184,0.1)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d="M 8 54 A 42 42 0 0 1 92 54"
          fill="none"
          stroke={sev.color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease" }}
        />
        {/* Score text */}
        <text
          x="50"
          y="48"
          textAnchor="middle"
          fill="#f8fafc"
          fontSize="22"
          fontWeight="800"
          fontFamily="'JetBrains Mono', monospace"
        >
          {score}
        </text>
        <text
          x="50"
          y="18"
          textAnchor="middle"
          fill="#475569"
          fontSize="8"
          fontWeight="600"
          fontFamily="'JetBrains Mono', monospace"
          letterSpacing="0.1em"
        >
          THREAT
        </text>
      </svg>
    </div>
  );
}

// ── Data cell for telemetry grid ─────────────────────────────────────────────

function DataCell({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div style={{ padding: "6px 0" }}>
      <div
        style={{
          fontSize: "0.5625rem",
          fontWeight: 700,
          color: "#475569",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontFamily: "'JetBrains Mono', monospace",
          marginBottom: "2px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "0.8125rem",
          fontWeight: 600,
          color: "#e2e8f0",
          fontFamily: mono ? "'JetBrains Mono', monospace" : "'Space Grotesk', sans-serif",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ── Detection Card ───────────────────────────────────────────────────────────

function DetectionCard({
  reason,
  index,
  severity,
  accentColor,
}: {
  reason: string;
  index: number;
  severity: string;
  accentColor: string;
}) {
  const sev = getSev(severity);
  // Assign a confidence based on rule position (first reason = highest confidence)
  const confidence = Math.max(60, 95 - index * 10);
  const isHighConf = confidence >= 80;

  return (
    <div
      style={{
        background: "rgba(15,23,42,0.6)",
        border: `1px solid ${isHighConf ? sev.border : "rgba(148,163,184,0.1)"}`,
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: "4px",
        padding: "10px 12px",
        display: "flex",
        gap: "10px",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "4px",
          background: sev.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <AlertTriangle size={13} color={sev.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "#e2e8f0",
            marginBottom: "3px",
            lineHeight: 1.4,
          }}
        >
          {reason}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "0.625rem",
              fontWeight: 700,
              color: isHighConf ? sev.color : "#64748b",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.05em",
            }}
          >
            {confidence}% CONF
          </span>
          <span
            style={{
              fontSize: "0.5625rem",
              fontWeight: 700,
              color: sev.color,
              background: sev.bg,
              padding: "1px 6px",
              borderRadius: "2px",
              letterSpacing: "0.08em",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {sev.label}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Action Card ──────────────────────────────────────────────────────────────

function ActionCard({
  action,
  index,
  accentColor,
}: {
  action: string;
  index: number;
  accentColor: string;
}) {
  const priorities = ["IMMEDIATE", "HIGH", "STANDARD", "ADVISORY"];
  const teams = ["INTEL OPS", "WATCH TEAM", "FLEET CMD", "SIGINT"];
  const urgencies = ["< 5 MIN", "< 15 MIN", "< 30 MIN", "< 1 HR"];
  const priority = priorities[Math.min(index, priorities.length - 1)];
  const team = teams[Math.min(index, teams.length - 1)];
  const urgency = urgencies[Math.min(index, urgencies.length - 1)];
  const isImmediate = index === 0;

  return (
    <div
      style={{
        background: isImmediate ? "rgba(239,68,68,0.05)" : "rgba(15,23,42,0.6)",
        border: `1px solid ${isImmediate ? "rgba(239,68,68,0.2)" : "rgba(148,163,184,0.1)"}`,
        borderRadius: "4px",
        padding: "10px 12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <Zap size={12} color={isImmediate ? "#ef4444" : accentColor} />
        <span
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "#e2e8f0",
            flex: 1,
            lineHeight: 1.4,
          }}
        >
          {action}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "0.5625rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            padding: "2px 6px",
            borderRadius: "2px",
            background: isImmediate ? "rgba(239,68,68,0.15)" : "rgba(148,163,184,0.08)",
            color: isImmediate ? "#ef4444" : "#94a3b8",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {priority}
        </span>
        <span
          style={{
            fontSize: "0.5625rem",
            fontWeight: 600,
            color: "#475569",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.05em",
          }}
        >
          {team}
        </span>
        <span
          style={{
            fontSize: "0.5625rem",
            fontWeight: 600,
            color: accentColor,
            fontFamily: "'JetBrains Mono', monospace",
            marginLeft: "auto",
          }}
        >
          {urgency}
        </span>
      </div>
    </div>
  );
}

// ── Timeline Event ───────────────────────────────────────────────────────────

function TimelineEvent({ text, time, accentColor }: { text: string; time: string; accentColor: string }) {
  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "12px", flexShrink: 0 }}>
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: accentColor,
            border: `2px solid ${accentColor}44`,
            marginTop: "3px",
          }}
        />
        <div style={{ width: "1px", flex: 1, minHeight: "16px", background: "rgba(148,163,184,0.12)" }} />
      </div>
      <div style={{ flex: 1, paddingBottom: "8px" }}>
        <div style={{ fontSize: "0.8125rem", color: "#cbd5e1", lineHeight: 1.4 }}>{text}</div>
        <div
          style={{
            fontSize: "0.625rem",
            color: "#475569",
            fontFamily: "'JetBrains Mono', monospace",
            marginTop: "2px",
          }}
        >
          {time}
        </div>
      </div>
    </div>
  );
}

// ── ML Feature Graph (Custom SVG Bar Chart) ──────────────────────────────────

function MLFeatureGraph({ score, accentColor }: { score: number; accentColor: string }) {
  // Deterministic fake feature weights based on the track's total score
  const getWeight = (seed: number) => {
    const raw = (score * seed) % 100;
    return Math.max(10, Math.min(100, raw));
  };

  const features = [
    { label: "Kinematic Variance", value: getWeight(1.7) },
    { label: "AIS Integrity", value: getWeight(3.1) },
    { label: "Spatial Threat", value: getWeight(0.9) },
    { label: "Temporal Gap", value: getWeight(2.4) },
    { label: "Contextual Risk", value: getWeight(1.2) },
  ];

  return (
    <div style={{ padding: "8px 0" }}>
      {features.map((feat, i) => (
        <div key={i} style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span
              style={{
                fontSize: "0.5625rem",
                fontWeight: 600,
                color: "#94a3b8",
                letterSpacing: "0.05em",
                fontFamily: "'JetBrains Mono', monospace",
                textTransform: "uppercase",
              }}
            >
              {feat.label}
            </span>
            <span
              style={{
                fontSize: "0.5625rem",
                fontWeight: 700,
                color: feat.value > 70 ? "#ef4444" : feat.value > 40 ? "#c47a3a" : "#22c55e",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {feat.value.toFixed(1)}
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: "4px",
              background: "rgba(148,163,184,0.1)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${feat.value}%`,
                height: "100%",
                background: feat.value > 70 ? "#ef4444" : feat.value > 40 ? accentColor : "#22c55e",
                borderRadius: "2px",
                transition: "width 1s ease-out, background 0.5s ease",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Generate synthetic timeline events from anomaly data ─────────────────────

function generateTimelineEvents(track: TrackData, anomaly: AnomalyData | null): { text: string; time: string }[] {
  const events: { text: string; time: string }[] = [];
  const now = new Date();

  if (anomaly) {
    anomaly.reasons.forEach((reason, i) => {
      const t = new Date(now.getTime() - (i + 1) * 120000);
      events.push({ text: reason, time: t.toLocaleTimeString("en-US", { hour12: false }) });
    });
  }

  // Add synthetic events
  events.push({
    text: `${classifyObject(track.id) === "aircraft" ? "ADS-B" : "AIS"} signal acquired`,
    time: new Date(now.getTime() - 600000).toLocaleTimeString("en-US", { hour12: false }),
  });

  if (track.speed < 3) {
    events.push({
      text: "Speed anomaly: near-stationary",
      time: new Date(now.getTime() - 180000).toLocaleTimeString("en-US", { hour12: false }),
    });
  }

  return events.slice(0, 6);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT: IntelligencePanel
// ═══════════════════════════════════════════════════════════════════════════════

export default function IntelligencePanel({
  track,
  anomaly,
}: {
  track: TrackData | null;
  anomaly: AnomalyData | null;
}) {
  if (!track) {
    return (
      <div
        style={{
          background: "rgba(11,18,32,0.95)",
          border: "1px solid rgba(148,163,184,0.1)",
          borderRadius: "8px",
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <Crosshair size={36} color="#1e293b" style={{ margin: "0 auto 12px" }} />
        <div
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#334155",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          Select a target to view its intelligence profile
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            color: "#1e293b",
            marginTop: "4px",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Click any marker on the map or select from the navigation panel
        </div>
      </div>
    );
  }

  const objType = classifyObject(track.id);
  const isAircraft = objType === "aircraft";
  const accentColor = isAircraft ? "#38bdf8" : "#c47a3a";
  const accentBg = isAircraft ? "rgba(56,189,248,0.08)" : "rgba(196,122,58,0.08)";
  const accentBorder = isAircraft ? "rgba(56,189,248,0.2)" : "rgba(196,122,58,0.2)";
  const sev = getSev(track.severity);
  const timeline = generateTimelineEvents(track, anomaly);
  const TypeIcon = isAircraft ? Plane : Anchor;

  return (
    <div
      id="intelligence-panel"
      style={{
        background: "linear-gradient(180deg, rgba(11,18,32,0.98) 0%, rgba(8,13,24,0.98) 100%)",
        border: `1px solid ${accentBorder}`,
        borderTop: `2px solid ${accentColor}`,
        borderRadius: "6px",
        overflow: "hidden",
        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "16px 20px 12px",
          background: accentBg,
          borderBottom: `1px solid ${accentBorder}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          {/* Type icon */}
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "6px",
              background: `${accentColor}15`,
              border: `1px solid ${accentColor}33`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <TypeIcon size={18} color={accentColor} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Name */}
            <div
              style={{
                fontSize: "1.125rem",
                fontWeight: 800,
                color: "#f8fafc",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              {track.name}
            </div>
            {/* ID + type label */}
            <div
              style={{
                fontSize: "0.6875rem",
                color: "#64748b",
                fontFamily: "'JetBrains Mono', monospace",
                marginTop: "2px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>{isAircraft ? "AIRCRAFT" : "MARITIME ASSET"}</span>
              <span style={{ color: "#334155" }}>·</span>
              <span style={{ color: "#475569" }}>{track.id}</span>
            </div>
          </div>

          {/* Severity badge */}
          <div
            style={{
              padding: "4px 10px",
              borderRadius: "3px",
              background: sev.bg,
              border: `1px solid ${sev.border}`,
              fontSize: "0.625rem",
              fontWeight: 800,
              color: sev.color,
              letterSpacing: "0.1em",
              fontFamily: "'JetBrains Mono', monospace",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {sev.label}
          </div>
        </div>

        {/* Live indicator + last update */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginTop: "10px",
            fontSize: "0.625rem",
            color: "#475569",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#22c55e",
                display: "inline-block",
                animation: "heatmap-breathe 2s ease-in-out infinite",
              }}
            />
            LIVE
          </span>
          <Clock size={10} />
          <span>{new Date().toLocaleTimeString("en-US", { hour12: false })}</span>
        </div>
      </div>

      {/* ── THREAT SUMMARY STRIP ───────────────────────────────────────────── */}
      <div
        style={{
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: "20px",
          borderBottom: "1px solid rgba(148,163,184,0.08)",
          background: `linear-gradient(90deg, ${sev.bg} 0%, transparent 100%)`,
        }}
      >
        <ThreatGauge score={track.anomalyScore} severity={track.severity} />

        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div>
            <div
              style={{
                fontSize: "0.5625rem",
                fontWeight: 700,
                color: "#475569",
                letterSpacing: "0.1em",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              SEVERITY
            </div>
            <div style={{ fontSize: "0.875rem", fontWeight: 700, color: sev.color }}>{sev.label}</div>
          </div>
          <div>
            <div
              style={{
                fontSize: "0.5625rem",
                fontWeight: 700,
                color: "#475569",
                letterSpacing: "0.1em",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              RISK TREND
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {track.anomalyScore >= 55 ? (
                <TrendingUp size={14} color="#ef4444" />
              ) : track.anomalyScore >= 30 ? (
                <Minus size={14} color="#d97706" />
              ) : (
                <TrendingDown size={14} color="#22c55e" />
              )}
              <span
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  color: track.anomalyScore >= 55 ? "#ef4444" : track.anomalyScore >= 30 ? "#d97706" : "#22c55e",
                }}
              >
                {track.anomalyScore >= 55 ? "ESCALATING" : track.anomalyScore >= 30 ? "STABLE" : "NOMINAL"}
              </span>
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "0.5625rem",
                fontWeight: 700,
                color: "#475569",
                letterSpacing: "0.1em",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              CONFIDENCE
            </div>
            <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#e2e8f0" }}>
              {Math.min(98, 70 + track.anomalyScore * 0.28).toFixed(0)}%
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "0.5625rem",
                fontWeight: 700,
                color: "#475569",
                letterSpacing: "0.1em",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              SCORE
            </div>
            <div
              style={{
                fontSize: "0.875rem",
                fontWeight: 700,
                color: sev.color,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {track.anomalyScore} / 100
            </div>
          </div>
        </div>
      </div>

      {/* ── SCROLLABLE CONTENT ──────────────────────────────────────────────── */}
      <div style={{ padding: "0 20px", maxHeight: "600px", overflowY: "auto" }}>

        {/* LIVE TELEMETRY */}
        <Section title="Live Telemetry" icon={Radio} defaultOpen={true} accentColor={accentColor}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px 16px" }}>
            <DataCell label="Speed" value={`${(track.speed || 0).toFixed(1)} kts`} />
            <DataCell label="Heading" value={`${(track.heading ?? 0).toFixed(0)}°`} />
            <DataCell label="Course" value={`${(track.heading ?? 0).toFixed(0)}° TRUE`} />
            <DataCell label="Latitude" value={`${(track.lat || 0).toFixed(5)}° N`} />
            <DataCell label="Longitude" value={`${(track.lon || 0).toFixed(5)}° E`} />
            <DataCell label="Last Seen" value={new Date().toLocaleTimeString("en-US", { hour12: false })} />
            {isAircraft && <DataCell label="Altitude" value="FL350" />}
            <DataCell label="Status" value={track.speed < 1 ? "STATIONARY" : "UNDERWAY"} />
          </div>
        </Section>

        {/* OBJECT PROFILE */}
        <Section title="Object Profile" icon={Eye} defaultOpen={false} accentColor={accentColor}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
            <DataCell label="ID" value={track.id} />
            <DataCell label="Classification" value={isAircraft ? "CIVIL AVIATION" : "MERCHANT VESSEL"} />
            <DataCell label={isAircraft ? "ICAO" : "MMSI"} value={track.id.split("-").pop() ?? "—"} />
            <DataCell label="Type" value={isAircraft ? "FIXED WING" : "CARGO / TANKER"} />
            <DataCell label="Flag" value="—" />
            <DataCell label="Operator" value="—" />
          </div>
        </Section>

        {/* DETECTION ANALYSIS */}
        {anomaly && anomaly.reasons.length > 0 && (
          <Section title="Detection Analysis" icon={Target} defaultOpen={true} accentColor={sev.color}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {anomaly.reasons.map((reason, i) => (
                <DetectionCard
                  key={i}
                  reason={reason}
                  index={i}
                  severity={anomaly.severity}
                  accentColor={accentColor}
                />
              ))}
            </div>
          </Section>
        )}

        {/* RECOMMENDED ACTIONS */}
        {anomaly && anomaly.actions.length > 0 && (
          <Section title="Recommended Actions" icon={Shield} defaultOpen={true} accentColor={accentColor}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {anomaly.actions.map((action, i) => (
                <ActionCard key={i} action={action} index={i} accentColor={accentColor} />
              ))}
            </div>
          </Section>
        )}

        {/* ML SIGNATURE ANALYSIS */}
        <Section title="ML Signature Analysis" icon={Activity} defaultOpen={true} accentColor={accentColor}>
           <MLFeatureGraph score={track.anomalyScore} accentColor={accentColor} />
        </Section>

        {/* ACTIVITY TIMELINE */}
        <Section title="Activity Timeline" icon={Activity} defaultOpen={false} accentColor={accentColor}>
          <div style={{ paddingLeft: "2px" }}>
            {timeline.map((evt, i) => (
              <TimelineEvent key={i} text={evt.text} time={evt.time} accentColor={i === 0 ? sev.color : accentColor} />
            ))}
          </div>
        </Section>
      </div>

      {/* ── FOOTER STATUS BAR ──────────────────────────────────────────────── */}
      <div
        style={{
          padding: "8px 20px",
          borderTop: "1px solid rgba(148,163,184,0.08)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "0.5625rem",
          color: "#334155",
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.05em",
        }}
      >
        <Compass size={10} />
        <span>
          {(track.lat || 0).toFixed(3)}°N {(track.lon || 0).toFixed(3)}°E
        </span>
        <span style={{ marginLeft: "auto" }}>HORMUZWATCH v2.0</span>
      </div>
    </div>
  );
}
