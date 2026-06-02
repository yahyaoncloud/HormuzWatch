import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import HormuzMap from "../components/HormuzMap";
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
function classifyObject(id: string): "asset" | "aircraft" {
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

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "indigo",
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  accent?: "indigo" | "copper" | "red" | "green" | "sky";
}) {
  const accentColors: Record<string, string> = {
    indigo: "#6366f1", copper: "#c47a3a", red: "#ef4444", green: "#22c55e", sky: "#38bdf8"
  };
  const accentDim: Record<string, string> = {
    indigo: "rgba(79,70,229,0.12)", copper: "rgba(184,115,51,0.12)", red: "rgba(239,68,68,0.1)", green: "rgba(34,197,94,0.1)", sky: "rgba(56,189,248,0.12)"
  };
  const color = accentColors[accent];
  const dim = accentDim[accent];

  return (
    <Card className="hover:-translate-y-1 transition-transform">
      <CardContent style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
          <div
            style={{
              width: "42px", height: "42px", borderRadius: "10px",
              background: dim, border: `1px solid ${color}33`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <Icon size={20} color={color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="section-eyebrow" style={{ marginBottom: "4px" }}>{label}</div>
            <div className={accent === "copper" ? "metric-value-copper" : "metric-value"}>{value}</div>
            {sub && <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "6px" }}>{sub}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
      <div className="metrics-grid" style={{ marginBottom: "24px" }}>
        <MetricCard icon={Anchor} label="Geospatial Assets" value={assets.length} sub="Active telemetry tracks" accent="indigo" />
        <MetricCard icon={Plane} label="Air Traffic" value={aircraft.length} sub="Active ADS-B tracks" accent="sky" />
        <MetricCard icon={ShieldAlert} label="Critical Alerts" value={criticalCount} sub="High priority threats" accent={criticalCount > 0 ? "red" : "green"} />
        <MetricCard icon={TrendingUp} label="Avg Threat Score" value={`${avgScore}/100`} sub="Fleet average" accent="copper" />
      </div>

      {/* Map & Target List */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
          {/* Main Map */}
          <div className="map-container" style={{ flex: "1 1 700px", minWidth: 0 }}>
            <HormuzMap />
          </div>

          {/* Quick Navigation Panel */}
          <Card
            variant="default"
            style={{ flex: "1 1 320px", maxWidth: "100%", height: "520px", display: "flex", flexDirection: "column" }}
          >
            <CardHeader style={{ padding: "14px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Radar size={16} color="#6366f1" />
                <div className="section-eyebrow">Auto Navigation</div>
              </div>
            </CardHeader>

            <ScrollArea className="flex-1" style={{ padding: "12px" }}>

              {/* ASSETS */}
              <div style={{ marginBottom: "12px" }}>
                <div className="nav-category-header" onClick={() => toggleSection("assets")}>
                  {openSections.assets ? <ChevronDown size={14} color="#6366f1" /> : <ChevronRight size={14} color="#6366f1" />}
                  <span className="section-eyebrow" style={{ color: "#818cf8", flex: 1 }}>Geospatial Assets</span>
                  <span className="count-pill" style={{ background: "rgba(79,70,229,0.15)", color: "#a5b4fc" }}>{assets.length}</span>
                </div>
                {openSections.assets && (
                  <div className="stack-sm" style={{ marginTop: "6px", paddingLeft: "8px" }}>
                    {assets.slice(0, 15).map(v => (
                      <button
                        key={v.id}
                        onClick={() => setSearchParams({ trackId: v.id })}
                        className={`nav-item-btn ${selectedTrackId === v.id ? 'selected-asset' : ''} ${v.severity === 'critical' ? 'critical-item' : ''}`}
                      >
                        <div>
                          <div style={{ fontSize: "0.8125rem", fontWeight: 700 }}>{v.name}</div>
                          <div style={{ fontSize: "0.6875rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>{v.speed.toFixed(1)} kts</div>
                        </div>
                        {v.severity === 'critical' ? <ShieldAlert size={14} color="#ef4444" /> : <Anchor size={14} color="#64748b" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* AIRCRAFT */}
              <div style={{ marginBottom: "12px" }}>
                <div className="nav-category-header" onClick={() => toggleSection("aircraft")}>
                  {openSections.aircraft ? <ChevronDown size={14} color="#38bdf8" /> : <ChevronRight size={14} color="#38bdf8" />}
                  <span className="section-eyebrow" style={{ color: "#7dd3fc", flex: 1 }}>Air Traffic</span>
                  <span className="count-pill" style={{ background: "rgba(56,189,248,0.15)", color: "#7dd3fc" }}>{aircraft.length}</span>
                </div>
                {openSections.aircraft && (
                  <div className="stack-sm" style={{ marginTop: "6px", paddingLeft: "8px" }}>
                    {aircraft.slice(0, 15).map(v => (
                      <button
                        key={v.id}
                        onClick={() => setSearchParams({ trackId: v.id })}
                        className={`nav-item-btn ${selectedTrackId === v.id ? 'selected-aircraft' : ''} ${v.severity === 'critical' ? 'critical-item' : ''}`}
                      >
                        <div>
                          <div style={{ fontSize: "0.8125rem", fontWeight: 700 }}>{v.name}</div>
                          <div style={{ fontSize: "0.6875rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>{v.speed.toFixed(1)} kts</div>
                        </div>
                        {v.severity === 'critical' ? <ShieldAlert size={14} color="#ef4444" /> : <Plane size={14} color="#64748b" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* AREAS */}
              <div style={{ marginBottom: "12px" }}>
                <div className="nav-category-header" onClick={() => toggleSection("areas")}>
                  {openSections.areas ? <ChevronDown size={14} color="#f59e0b" /> : <ChevronRight size={14} color="#f59e0b" />}
                  <span className="section-eyebrow" style={{ color: "#fcd34d", flex: 1 }}>Watch Areas</span>
                  <span className="count-pill" style={{ background: "rgba(245,158,11,0.15)", color: "#fcd34d" }}>{STATIC_AREAS.length}</span>
                </div>
                {openSections.areas && (
                  <div className="stack-sm" style={{ marginTop: "6px", paddingLeft: "8px" }}>
                    {STATIC_AREAS.map(a => (
                      <button
                        key={a.id}
                        onClick={() => setSearchParams({ trackId: a.id })}
                        className={`nav-item-btn ${selectedTrackId === a.id ? 'selected-area' : ''}`}
                      >
                        <div>
                          <div style={{ fontSize: "0.8125rem", fontWeight: 700 }}>{a.name}</div>
                          <div style={{ fontSize: "0.6875rem", color: "#64748b" }}>{a.status}</div>
                        </div>
                        <Landmark size={14} color="#64748b" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </ScrollArea>
          </Card>
        </div>
      </div>

      {/* Selected Track Panel */}
      {selectedTrack ? (
        <Card variant={classifyObject(selectedTrack.id) === "aircraft" ? "flight" : "copper"} className="fade-up">
          <CardContent style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
              <div>
                <div className="section-eyebrow" style={{ marginBottom: "6px" }}>Selected Target</div>
                <h2 style={{ fontSize: "1.375rem", fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em" }}>
                  {selectedTrack.name}
                </h2>
              </div>
              <SeverityBadge severity={selectedTrack.severity} />
            </div>

            <div className="copper-bar" style={{ marginBottom: "20px", background: classifyObject(selectedTrack.id) === "aircraft" ? "linear-gradient(90deg, #38bdf8, transparent)" : undefined }} />

            {/* Facts Grid */}
            <div className="content-grid-2" style={{ marginBottom: "20px" }}>
              {[
                { label: "ID", value: selectedTrack.id, icon: classifyObject(selectedTrack.id) === "aircraft" ? Plane : Anchor },
                { label: "Position", value: `${selectedTrack.lat.toFixed(4)}°N, ${selectedTrack.lon.toFixed(4)}°E`, icon: MapPin },
                { label: "Speed", value: `${selectedTrack.speed.toFixed(1)} kts`, icon: Activity },
                { label: "Anomaly Score", value: `${selectedTrack.anomalyScore} / 100`, icon: TrendingUp },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  style={{
                    background: "rgba(15,23,42,0.5)",
                    border: "1px solid rgba(148,163,184,0.15)",
                    borderRadius: "8px", padding: "14px",
                    display: "flex", gap: "12px", alignItems: "center",
                  }}
                >
                  <div style={{ padding: "8px", background: "rgba(148,163,184,0.1)", borderRadius: "6px" }}>
                    <Icon size={16} color="#94a3b8" />
                  </div>
                  <div>
                    <div className="section-eyebrow" style={{ marginBottom: "2px" }}>{label}</div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Anomaly details */}
            {selectedAnomaly && (
              <>
                <Separator />
                <div className="content-grid-2">
                  <div>
                    <div className="section-eyebrow" style={{ marginBottom: "12px" }}>Detection Reasons</div>
                    <ul className="stack-sm">
                      {selectedAnomaly.reasons.map((r, i) => (
                        <li key={i} className={classifyObject(selectedTrack.id) === "aircraft" ? "sky-line-left" : "indigo-line-left"} style={{ fontSize: "0.8125rem", color: "#cbd5e1" }}>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="section-eyebrow" style={{ marginBottom: "12px" }}>Recommended Actions</div>
                    <ul className="stack-sm">
                      {selectedAnomaly.actions.map((a, i) => (
                        <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.8125rem", color: "#cbd5e1" }}>
                          <ChevronRight size={14} color={classifyObject(selectedTrack.id) === "aircraft" ? "#38bdf8" : "#b87333"} style={{ flexShrink: 0, marginTop: "2px" }} />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card variant="default">
          <CardContent style={{ padding: "36px", textAlign: "center", color: "#475569" }}>
            <MapPin size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>Select a target on the map to view its intelligence profile</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
