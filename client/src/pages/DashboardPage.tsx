import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import HormuzMap from "../components/HormuzMap";
import IntelligencePanel from "../components/IntelligencePanel";
import IntelMetric from "../components/IntelMetric";
import { useWebSocket } from "../context/WebSocketContext";
import { Badge } from "../components/ui/badge";
import {
  ShieldAlert,
  Plane,
  Anchor,
  TrendingUp,
  Clock,
  Radar,
  Landmark,
} from "lucide-react";

// ── Object detection helpers ───────────────────────────────────────────────────
function classifyObject(id: string | undefined): "asset" | "aircraft" {
  if (!id) return "asset";
  if (id.startsWith("FLIGHT-") || id.startsWith("ADS-") || id.startsWith("ICAO-")) {
    return "aircraft";
  }
  return "asset";
}

const STATIC_AREAS = [
  { id: "AREA-HORMUZ", name: "Strait of Hormuz", status: "Critical Chokepoint", severity: "high" },
  { id: "AREA-PGULF",  name: "Persian Gulf",      status: "Active Patrolling",   severity: "medium" },
  { id: "AREA-GOMAN",  name: "Gulf of Oman",       status: "Standard Monitoring", severity: "low" },
];

// ── Reusable track row button ─────────────────────────────────────────────────
function TrackRow({
  name, sub, score, sevColor, isSelected, onClick,
}: {
  id: string; name: string; sub: string; score: number;
  sevColor: string; isSelected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "7px 8px",
        background: isSelected ? `${sevColor}12` : "transparent",
        border: "none",
        borderLeft: `2px solid ${isSelected ? sevColor : "rgba(148,163,184,0.15)"}`,
        borderRadius: "0 3px 3px 0",
        cursor: "pointer",
        marginBottom: "2px",
        transition: "background 0.15s ease",
        textAlign: "left",
      }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(148,163,184,0.05)"; }}
      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: sevColor, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: isSelected ? "#f8fafc" : "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </div>
        <div style={{ fontSize: "0.5625rem", color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
          {sub}
        </div>
      </div>
      <span style={{ fontSize: "0.625rem", fontWeight: 700, color: sevColor, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
        {score}
      </span>
    </button>
  );
}

// ── Left panel tab button ──────────────────────────────────────────────────────
function TabBtn({
  active, onClick, icon: Icon, label, accent,
}: {
  active: boolean; onClick: () => void;
  icon: React.ComponentType<any>; label: string; accent: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "9px 4px",
        background: active ? `${accent}18` : "transparent",
        border: "none",
        borderBottom: `2px solid ${active ? accent : "transparent"}`,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "3px",
        transition: "all 0.18s ease",
      }}
    >
      <Icon size={13} color={active ? accent : "#64748b"} />
      <span style={{ fontSize: "0.5rem", fontWeight: 700, color: active ? "#f8fafc" : "#64748b", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}>
        {label}
      </span>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { tracks, anomalies, isConnected } = useWebSocket();
  const selectedTrackId = searchParams.get("trackId");

  const selectedTrack  = selectedTrackId ? tracks.get(selectedTrackId)  ?? null : null;
  const selectedAnomaly = selectedTrack   ? anomalies.get(selectedTrack.id) ?? null : null;

  const trackArray   = Array.from(tracks.values());
  const assets       = trackArray.filter(v => classifyObject(v.id) === "asset");
  const aircraft     = trackArray.filter(v => classifyObject(v.id) === "aircraft");
  const criticalCount = trackArray.filter(v => v.severity === "critical").length;
  const avgScore     = trackArray.length > 0
    ? Math.round(trackArray.reduce((a, v) => a + v.anomalyScore, 0) / trackArray.length)
    : 0;

  const [activeTab, setActiveTab] = useState<"maritime" | "aviation" | "areas">("maritime");

  const sevColor = (sev: string, defaultColor = "#22c55e") =>
    sev === "critical" ? "#ef4444" : sev === "high" ? "#c47a3a" : sev === "medium" ? "#d97706" : defaultColor;

  // ── Left track list panel ─────────────────────────────────────────────────
  const TrackListPanel = (
    <div className="hud-panel hud-panel-left">
      {/* Header */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(148,163,184,0.08)", display: "flex", alignItems: "center", gap: "8px", background: "rgba(99,102,241,0.04)", flexShrink: 0 }}>
        <Radar size={13} color="#6366f1" />
        <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", flex: 1 }}>
          Track List
        </span>
        <span style={{ fontSize: "0.5625rem", fontWeight: 700, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
          {trackArray.length} ACTIVE
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(148,163,184,0.08)", flexShrink: 0 }}>
        <TabBtn active={activeTab === "maritime"} onClick={() => setActiveTab("maritime")} icon={Anchor}   label={`MARITIME (${assets.length})`}    accent="#6366f1" />
        <TabBtn active={activeTab === "aviation"} onClick={() => setActiveTab("aviation")} icon={Plane}    label={`AVIATION (${aircraft.length})`}   accent="#38bdf8" />
        <TabBtn active={activeTab === "areas"}    onClick={() => setActiveTab("areas")}    icon={Landmark} label={`AREAS (${STATIC_AREAS.length})`} accent="#c47a3a" />
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 10px 10px" }}>
        {activeTab === "maritime" && assets.slice(0, 20).map((v, i) => (
          <TrackRow
            key={v.id || `asset-${i}`}
            id={v.id} name={v.name}
            sub={`${(v.speed || 0).toFixed(1)} kts · ${(v.lat || 0).toFixed(2)}°N`}
            score={v.anomalyScore}
            sevColor={sevColor(v.severity)}
            isSelected={selectedTrackId === v.id}
            onClick={() => setSearchParams({ trackId: v.id })}
          />
        ))}
        {activeTab === "aviation" && aircraft.slice(0, 20).map((v, i) => (
          <TrackRow
            key={v.id || `air-${i}`}
            id={v.id} name={v.name}
            sub={`${(v.speed || 0).toFixed(1)} kts · FL350`}
            score={v.anomalyScore}
            sevColor={sevColor(v.severity, "#38bdf8")}
            isSelected={selectedTrackId === v.id}
            onClick={() => setSearchParams({ trackId: v.id })}
          />
        ))}
        {activeTab === "areas" && STATIC_AREAS.map(a => {
          const ac = a.severity === "high" ? "#c47a3a" : a.severity === "medium" ? "#d97706" : "#22c55e";
          const isSelected = selectedTrackId === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setSearchParams({ trackId: a.id })}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "8px 8px", background: isSelected ? `${ac}12` : "transparent", border: "none", borderLeft: `2px solid ${isSelected ? ac : "rgba(148,163,184,0.15)"}`, borderRadius: "0 3px 3px 0", cursor: "pointer", marginBottom: "3px", transition: "background 0.15s" }}
              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(148,163,184,0.05)"; }}
              onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: ac, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: isSelected ? "#f8fafc" : "#cbd5e1" }}>{a.name}</div>
                <div style={{ fontSize: "0.5625rem", color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>{a.status}</div>
              </div>
              <span style={{ fontSize: "0.5rem", fontWeight: 700, color: ac, background: `${ac}18`, border: `1px solid ${ac}33`, padding: "1px 5px", borderRadius: "2px", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", flexShrink: 0 }}>
                {a.severity}
              </span>
            </button>
          );
        })}

        {/* Empty states */}
        {activeTab === "maritime" && assets.length === 0 && (
          <div style={{ color: "#334155", fontSize: "0.75rem", textAlign: "center", padding: "32px 0", fontFamily: "'JetBrains Mono', monospace" }}>
            No maritime tracks
          </div>
        )}
        {activeTab === "aviation" && aircraft.length === 0 && (
          <div style={{ color: "#334155", fontSize: "0.75rem", textAlign: "center", padding: "32px 0", fontFamily: "'JetBrains Mono', monospace" }}>
            No aviation tracks
          </div>
        )}
      </div>
    </div>
  );

  // ── Right intel panel ─────────────────────────────────────────────────────
  const IntelPanel = (
    <div className="hud-panel hud-panel-right">
      <IntelligencePanel track={selectedTrack} anomaly={selectedAnomaly} />
    </div>
  );

  // ── Center map pane ───────────────────────────────────────────────────────
  const MapPane = (
    <div className="hud-center hud-panel" style={{ border: "1px solid rgba(148,163,184,0.15)" }}>
      {/* HUD overlay — pointer-events: none so map stays interactive */}
      <div style={{ position: "absolute", top: 12, left: 12, right: 12, zIndex: 1000, pointerEvents: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Top bar */}
        <div className="hud-map-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ background: "rgba(8,13,24,0.88)", padding: "8px 14px", borderRadius: "7px", border: "1px solid rgba(148,163,184,0.14)", backdropFilter: "blur(10px)", pointerEvents: "auto" }}>
            <div className="section-eyebrow" style={{ marginBottom: "2px", fontSize: "0.5625rem" }}>Strait of Hormuz — Operational Theatre</div>
            <h1 className="page-title" style={{ fontSize: "1.1rem", margin: 0 }}>Threat Dashboard</h1>
          </div>
          <div style={{ background: "rgba(8,13,24,0.88)", padding: "8px 14px", borderRadius: "7px", border: "1px solid rgba(148,163,184,0.14)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", gap: "10px", pointerEvents: "auto" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.6875rem", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
              <Clock size={11} /> Live
            </span>
            <Badge variant={isConnected ? "connected" : "disconnected"}>
              <span className={`status-dot ${isConnected ? "status-dot-live" : "status-dot-offline"}`} />
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </div>

        {/* Metrics strip */}
        <div className="hud-overlay-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", pointerEvents: "auto" }}>
          <IntelMetric icon={Anchor}     label="Maritime"       value={assets.length}        sub="Active tracks"  isThreat={false} />
          <IntelMetric icon={Plane}      label="Aviation"       value={aircraft.length}      sub="ADS-B tracks"   isThreat={false} />
          <IntelMetric icon={ShieldAlert} label="Critical"      value={criticalCount}        sub="High priority"  isThreat={criticalCount > 0} />
          <IntelMetric icon={TrendingUp} label="Avg Score"      value={`${avgScore}/100`}    sub="Fleet average"  isThreat={avgScore > 30} />
        </div>
      </div>

      <HormuzMap />
    </div>
  );

  return (
    <div className="hud-container fade-up">
      <div className="hud-main-grid">
        {/* Map is rendered first so on mobile it fills the whole viewport */}
        {MapPane}

        {/* Both side panels are in hud-panels-row.
            - Desktop: hud-panels-row is a flex row that sits inline in hud-main-grid
            - Tablet:  hud-panels-row is below the map, side-by-side
            - Mobile:  hud-panels-row is an absolute bottom-sheet */}
        <div className="hud-panels-row">
          {TrackListPanel}
          {IntelPanel}
        </div>
      </div>
    </div>
  );
}
