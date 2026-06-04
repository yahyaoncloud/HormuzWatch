import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import HormuzMap from "../components/HormuzMap";
import IntelligencePanel from "../components/IntelligencePanel";
import IntelMetric from "../components/IntelMetric";
import { useWebSocket } from "../context/WebSocketContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { Badge, SeverityBadge } from "../components/ui/badge";
import { Tooltip } from "../components/ui/tooltip";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Activity,
  ShieldAlert,
  Plane,
  Anchor,
  TrendingUp,
  MapPin,
  Clock,
  ChevronRight,
  Zap,
  Landmark,
  ChevronDown,
  ChevronUp,
  Radar
} from "lucide-react";

// ── Object detection helpers ──────────────────────────────────────────────────
function classifyObject(id: string | undefined): "asset" | "aircraft" {
  if (!id) return "asset";
  if (id.startsWith("FLIGHT-") || id.startsWith("ADS-") || id.startsWith("ICAO-")) {
    return "aircraft";
  }
  return "asset";
}

const STATIC_AREAS = [
  { id: "AREA-HORMUZ", name: "Strait of Hormuz", status: "Critical Chokepoint", severity: "high" },
  { id: "AREA-PGULF", name: "Persian Gulf", status: "Active Patrolling", severity: "medium" },
  { id: "AREA-GOMAN", name: "Gulf of Oman", status: "Standard Monitoring", severity: "low" },
];

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { tracks, anomalies, isConnected } = useWebSocket();
  const selectedTrackId = searchParams.get("trackId");

  const selectedTrack = selectedTrackId ? tracks.get(selectedTrackId) : null;
  const selectedAnomaly = selectedTrack ? anomalies.get(selectedTrack.id) : null;

  const trackArray = Array.from(tracks.values());
  const assets = trackArray.filter((v) => classifyObject(v.id) === "asset");
  const aircraft = trackArray.filter((v) => classifyObject(v.id) === "aircraft");

  const criticalCount = trackArray.filter((v) => v.severity === "critical").length;
  const avgScore = trackArray.length > 0
    ? Math.round(trackArray.reduce((a, v) => a + v.anomalyScore, 0) / trackArray.length)
    : 0;

  // Accordion state for nav panel
  const [openSections, setOpenSections] = useState({ assets: true, aircraft: true, areas: false });
  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="page-container fade-up">
      {/* Page Header */}
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div className="section-eyebrow" style={{ marginBottom: "6px" }}>Strait of Hormuz — Operational Theatre</div>
          <h1 className="page-title">Threat Dashboard</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
            <Clock size={13} /> Live feed
          </span>
          <Badge variant={isConnected ? "connected" : "disconnected"}>
            <span className={`status-dot ${isConnected ? "status-dot-live" : "status-dot-offline"}`} />
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid" style={{ marginBottom: "24px", display: "flex", gap: "16px" }}>
        <IntelMetric 
          icon={Anchor} 
          label="Geospatial Assets" 
          value={assets.length} 
          sub="Active telemetry tracks" 
          isThreat={false} 
        />
        <IntelMetric 
          icon={Plane} 
          label="Air Traffic" 
          value={aircraft.length} 
          sub="Active ADS-B tracks" 
          isThreat={false} 
        />
        <IntelMetric 
          icon={ShieldAlert} 
          label="Critical Alerts" 
          value={criticalCount} 
          sub="High priority threats" 
          isThreat={criticalCount > 0} 
        />
        <IntelMetric 
          icon={TrendingUp} 
          label="Avg Threat Score" 
          value={`${avgScore}/100`} 
          sub="Fleet average" 
          isThreat={avgScore > 30} 
        />
      </div>

      {/* Map & Target List */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
          {/* Main Map */}
          <div className="map-container" style={{ flex: "1 1 700px", minWidth: 0, height: "520px" }}>
            <HormuzMap />
          </div>

          {/* ── Tactical Navigation Panel ────────────────────────────────── */}
          <div
            style={{
              flex: "1 1 340px",
              maxWidth: "100%",
              height: "520px",
              display: "flex",
              flexDirection: "column",
              background: "linear-gradient(180deg, rgba(11,18,32,0.98) 0%, rgba(8,13,24,0.98) 100%)",
              border: "1px solid rgba(99,102,241,0.15)",
              borderTop: "2px solid #6366f1",
              borderRadius: "6px",
              overflow: "hidden",
              fontFamily: "'Space Grotesk', 'Inter', sans-serif",
            }}
          >
            {/* Panel Header */}
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid rgba(148,163,184,0.08)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(99,102,241,0.04)",
              }}
            >
              <Radar size={14} color="#6366f1" />
              <span
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  color: "#94a3b8",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontFamily: "'JetBrains Mono', monospace",
                  flex: 1,
                }}
              >
                Track List
              </span>
              <span
                style={{
                  fontSize: "0.625rem",
                  fontWeight: 700,
                  color: "#475569",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {trackArray.length} ACTIVE
              </span>
            </div>

            {/* Scrollable Track List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>

              {/* ── ASSETS SECTION ──────────────────────────────────────────── */}
              <div style={{ padding: "0 12px" }}>
                <button
                  onClick={() => toggleSection("assets")}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 4px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    borderBottom: "1px solid rgba(148,163,184,0.06)",
                  }}
                >
                  {openSections.assets ? <ChevronDown size={12} color="#6366f1" /> : <ChevronRight size={12} color="#6366f1" />}
                  <Anchor size={11} color="#6366f1" />
                  <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "#818cf8", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace", flex: 1, textAlign: "left" }}>
                    MARITIME
                  </span>
                  <span
                    style={{
                      fontSize: "0.5625rem",
                      fontWeight: 700,
                      color: "#6366f1",
                      background: "rgba(99,102,241,0.1)",
                      padding: "1px 6px",
                      borderRadius: "2px",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {assets.length}
                  </span>
                </button>

                {openSections.assets && (
                  <div style={{ paddingTop: "4px" }}>
                    {assets.slice(0, 20).map((v, idx) => {
                      const isSelected = selectedTrackId === v.id;
                      const sevColor = v.severity === "critical" ? "#ef4444" : v.severity === "high" ? "#c47a3a" : v.severity === "medium" ? "#d97706" : "#22c55e";
                      return (
                        <button
                          key={v.id || `asset-${idx}`}
                          onClick={() => setSearchParams({ trackId: v.id })}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "7px 8px",
                            background: isSelected ? "rgba(99,102,241,0.08)" : "transparent",
                            border: "none",
                            borderLeft: `2px solid ${isSelected ? "#6366f1" : sevColor}`,
                            borderRadius: "0 3px 3px 0",
                            cursor: "pointer",
                            marginBottom: "2px",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(148,163,184,0.04)"; }}
                          onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          {/* Severity dot */}
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: sevColor, flexShrink: 0 }} />
                          {/* Name + speed */}
                          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: isSelected ? "#f8fafc" : "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {v.name}
                            </div>
                            <div style={{ fontSize: "0.5625rem", color: "#475569", fontFamily: "'JetBrains Mono', monospace", display: "flex", gap: "6px" }}>
                              <span>{(v.speed || 0).toFixed(1)} kts</span>
                              <span style={{ color: "#334155" }}>·</span>
                              <span>{(v.lat || 0).toFixed(2)}°N</span>
                            </div>
                          </div>
                          {/* Score */}
                          <span
                            style={{
                              fontSize: "0.625rem",
                              fontWeight: 700,
                              color: sevColor,
                              fontFamily: "'JetBrains Mono', monospace",
                              flexShrink: 0,
                            }}
                          >
                            {v.anomalyScore}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── AIRCRAFT SECTION ────────────────────────────────────────── */}
              <div style={{ padding: "0 12px", marginTop: "4px" }}>
                <button
                  onClick={() => toggleSection("aircraft")}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 4px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    borderBottom: "1px solid rgba(148,163,184,0.06)",
                  }}
                >
                  {openSections.aircraft ? <ChevronDown size={12} color="#38bdf8" /> : <ChevronRight size={12} color="#38bdf8" />}
                  <Plane size={11} color="#38bdf8" />
                  <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "#7dd3fc", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace", flex: 1, textAlign: "left" }}>
                    AVIATION
                  </span>
                  <span
                    style={{
                      fontSize: "0.5625rem",
                      fontWeight: 700,
                      color: "#38bdf8",
                      background: "rgba(56,189,248,0.1)",
                      padding: "1px 6px",
                      borderRadius: "2px",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {aircraft.length}
                  </span>
                </button>

                {openSections.aircraft && (
                  <div style={{ paddingTop: "4px" }}>
                    {aircraft.slice(0, 20).map((v, idx) => {
                      const isSelected = selectedTrackId === v.id;
                      const sevColor = v.severity === "critical" ? "#ef4444" : v.severity === "high" ? "#c47a3a" : v.severity === "medium" ? "#d97706" : "#38bdf8";
                      return (
                        <button
                          key={v.id || `aircraft-${idx}`}
                          onClick={() => setSearchParams({ trackId: v.id })}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "7px 8px",
                            background: isSelected ? "rgba(56,189,248,0.08)" : "transparent",
                            border: "none",
                            borderLeft: `2px solid ${isSelected ? "#38bdf8" : sevColor}`,
                            borderRadius: "0 3px 3px 0",
                            cursor: "pointer",
                            marginBottom: "2px",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(148,163,184,0.04)"; }}
                          onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: sevColor, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: isSelected ? "#f8fafc" : "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {v.name}
                            </div>
                            <div style={{ fontSize: "0.5625rem", color: "#475569", fontFamily: "'JetBrains Mono', monospace", display: "flex", gap: "6px" }}>
                              <span>{(v.speed || 0).toFixed(1)} kts</span>
                              <span style={{ color: "#334155" }}>·</span>
                              <span>FL350</span>
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: "0.625rem",
                              fontWeight: 700,
                              color: sevColor,
                              fontFamily: "'JetBrains Mono', monospace",
                              flexShrink: 0,
                            }}
                          >
                            {v.anomalyScore}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── WATCH AREAS SECTION ─────────────────────────────────────── */}
              <div style={{ padding: "0 12px", marginTop: "4px" }}>
                <button
                  onClick={() => toggleSection("areas")}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 4px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    borderBottom: "1px solid rgba(148,163,184,0.06)",
                  }}
                >
                  {openSections.areas ? <ChevronDown size={12} color="#c47a3a" /> : <ChevronRight size={12} color="#c47a3a" />}
                  <Landmark size={11} color="#c47a3a" />
                  <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "#c47a3a", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace", flex: 1, textAlign: "left" }}>
                    WATCH AREAS
                  </span>
                  <span
                    style={{
                      fontSize: "0.5625rem",
                      fontWeight: 700,
                      color: "#c47a3a",
                      background: "rgba(196,122,58,0.1)",
                      padding: "1px 6px",
                      borderRadius: "2px",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {STATIC_AREAS.length}
                  </span>
                </button>

                {openSections.areas && (
                  <div style={{ paddingTop: "4px" }}>
                    {STATIC_AREAS.map(a => {
                      const isSelected = selectedTrackId === a.id;
                      const areaColor = a.severity === "high" ? "#c47a3a" : a.severity === "medium" ? "#d97706" : "#22c55e";
                      return (
                        <button
                          key={a.id}
                          onClick={() => setSearchParams({ trackId: a.id })}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "7px 8px",
                            background: isSelected ? "rgba(196,122,58,0.08)" : "transparent",
                            border: "none",
                            borderLeft: `2px solid ${isSelected ? "#c47a3a" : areaColor}`,
                            borderRadius: "0 3px 3px 0",
                            cursor: "pointer",
                            marginBottom: "2px",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(148,163,184,0.04)"; }}
                          onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: areaColor, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: isSelected ? "#f8fafc" : "#cbd5e1" }}>
                              {a.name}
                            </div>
                            <div style={{ fontSize: "0.5625rem", color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
                              {a.status}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: "0.5625rem",
                              fontWeight: 700,
                              color: areaColor,
                              background: `${areaColor}15`,
                              border: `1px solid ${areaColor}33`,
                              padding: "1px 5px",
                              borderRadius: "2px",
                              fontFamily: "'JetBrains Mono', monospace",
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              flexShrink: 0,
                            }}
                          >
                            {a.severity}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Panel Footer */}
            <div
              style={{
                padding: "8px 16px",
                borderTop: "1px solid rgba(148,163,184,0.08)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.5625rem",
                color: "#334155",
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.05em",
              }}
            >
              <Activity size={10} />
              <span>{criticalCount} CRITICAL</span>
              <span style={{ marginLeft: "auto" }}>SORTED BY THREAT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Intelligence Panel */}
      <IntelligencePanel track={selectedTrack} anomaly={selectedAnomaly} />
    </div>
  );
}
