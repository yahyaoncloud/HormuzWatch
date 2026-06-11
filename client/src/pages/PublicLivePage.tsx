import { useEffect, useState, useRef } from "react";
import {
  Radio,
  Wifi,
  WifiOff,
  Anchor,
  AlertTriangle,
  MapPin,
  Clock,
  Activity,
  ShieldAlert,
  Info,
} from "lucide-react";
import logo from "../assets/logo.png";

interface TopTrace {
  trackId: string;
  assetName: string;
  timestamp: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  score: number;
  severity: string;
  reasons: string;
  updatedAt: string;
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: "CRITICAL", color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)" },
  high: { label: "HIGH", color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.35)" },
  medium: { label: "MEDIUM", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)" },
  low: { label: "LOW", color: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.35)" },
  unknown: { label: "N/A", color: "#64748b", bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.35)" },
};

export default function PublicLivePage() {
  const [traces, setTraces] = useState<TopTrace[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("");
  const [error, setError] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connectSSE = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource("/api/public/stream");
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setError("");
    };

    es.addEventListener("traces", (event) => {
      try {
        const payload = JSON.parse(event.data);
        setTraces(payload.traces || []);
        setLastUpdate(payload.timestamp || new Date().toISOString());
      } catch {
        // ignore parse errors
      }
    });

    es.onerror = () => {
      setConnected(false);
      es.close();
      // Reconnect after 3 seconds
      reconnectTimerRef.current = setTimeout(() => {
        connectSSE();
      }, 3000);
    };
  };

  useEffect(() => {
    connectSSE();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  const parseReasons = (reasonsJson: string): string[] => {
    try {
      const parsed = JSON.parse(reasonsJson);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch {
      return [];
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0a0f1a 0%, #0f172a 50%, #0a0f1a 100%)",
      color: "#f8fafc",
      fontFamily: "'Space Grotesk', sans-serif",
    }}>
      {/* Header */}
      <header style={{
        padding: "16px 24px",
        borderBottom: "1px solid rgba(148,163,184,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(10,15,26,0.9)",
        backdropFilter: "blur(8px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "36px", height: "36px",
            background: "rgba(15,23,42,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}>
            <img src={logo} alt="HormuzWatch" style={{ width: "120%", height: "120%", objectFit: "cover" }} />
          </div>
          <div>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em" }}>
              HormuzWatch
            </div>
            <div style={{
              fontSize: "0.6rem", color: "#94a3b8", fontWeight: 700,
              letterSpacing: "0.12em", textTransform: "uppercase",
              fontFamily: "'JetBrains Mono', monospace", marginTop: "1px",
            }}>
              Live Maritime Intelligence
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Connection badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "5px 12px", borderRadius: "6px",
            fontSize: "0.6875rem", fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase",
            fontFamily: "'JetBrains Mono', monospace",
            background: connected ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${connected ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            color: connected ? "#86efac" : "#fca5a5",
          }}>
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {connected ? "LIVE" : "OFFLINE"}
          </div>
          <a
            href="/login"
            style={{
              padding: "6px 14px", borderRadius: "6px",
              fontSize: "0.75rem", fontWeight: 600,
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.3)",
              color: "#a5b4fc", textDecoration: "none",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Operator Login
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
        {/* Title Section */}
        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "8px" }}>
            <ShieldAlert size={24} color="#ef4444" />
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#f8fafc" }}>
              Top 10 Anomalous Vessel Traces
            </h1>
          </div>
          <p style={{
            margin: 0, fontSize: "0.8125rem", color: "#94a3b8",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            Real-time maritime anomaly monitoring — Strait of Hormuz region
          </p>
          {lastUpdate && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              marginTop: "8px", padding: "4px 12px", borderRadius: "4px",
              background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.1)",
              fontSize: "0.6875rem", color: "#64748b",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              <Clock size={11} /> Last update: {new Date(lastUpdate).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: "16px", background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px",
            color: "#ef4444", fontSize: "0.875rem", marginBottom: "20px",
          }}>
            {error}
          </div>
        )}

        {/* Traces Grid */}
        {traces.length === 0 ? (
          <div style={{
            padding: "60px 20px", textAlign: "center",
            background: "rgba(15,23,42,0.4)", borderRadius: "8px",
            border: "1px solid rgba(148,163,184,0.1)",
          }}>
            <Radio size={40} color="#64748b" style={{ marginBottom: "16px", opacity: 0.5 }} />
            <div style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "4px" }}>
              {connected ? "Monitoring active — no anomalous traces detected" : "Connecting to live feed..."}
            </div>
            <div style={{ color: "#475569", fontSize: "0.75rem", fontFamily: "'JetBrains Mono', monospace" }}>
              Traces appear here when vessels exhibit anomalous behavior
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {traces.map((trace, index) => {
              const sev = SEVERITY_CONFIG[trace.severity] || SEVERITY_CONFIG.unknown;
              const reasons = parseReasons(trace.reasons);
              return (
                <div
                  key={trace.trackId}
                  style={{
                    background: "rgba(15,23,42,0.6)",
                    border: `1px solid ${sev.border}`,
                    borderRadius: "8px",
                    padding: "16px 20px",
                    display: "grid",
                    gridTemplateColumns: "40px 1fr auto",
                    gap: "16px",
                    alignItems: "start",
                    transition: "border-color 0.2s",
                  }}
                >
                  {/* Rank */}
                  <div style={{
                    width: "36px", height: "36px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: sev.bg, border: `1px solid ${sev.border}`,
                    borderRadius: "6px", fontSize: "0.875rem", fontWeight: 800,
                    color: sev.color,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    #{index + 1}
                  </div>

                  {/* Details */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#f8fafc" }}>
                        {trace.assetName || trace.trackId}
                      </span>
                      <span style={{
                        fontSize: "0.625rem", padding: "2px 8px", borderRadius: "4px",
                        fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                        fontFamily: "'JetBrains Mono', monospace",
                        background: sev.bg, color: sev.color, border: `1px solid ${sev.border}`,
                      }}>
                        {sev.label}
                      </span>
                      <span style={{
                        fontSize: "0.625rem", padding: "2px 8px", borderRadius: "4px",
                        fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                        background: "rgba(99,102,241,0.1)", color: "#a5b4fc",
                        border: "1px solid rgba(99,102,241,0.2)",
                      }}>
                        SCORE: {trace.score.toFixed(1)}
                      </span>
                    </div>

                    {/* Position & telemetry row */}
                    <div style={{
                      display: "flex", gap: "16px", flexWrap: "wrap",
                      fontSize: "0.75rem", color: "#94a3b8",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <MapPin size={12} color="#64748b" />
                        {trace.lat.toFixed(4)}°, {trace.lon.toFixed(4)}°
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Activity size={12} color="#64748b" />
                        {trace.speed.toFixed(1)} kn
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Anchor size={12} color="#64748b" />
                        HDG {trace.heading.toFixed(0)}°
                      </span>
                      {trace.updatedAt && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#64748b" }}>
                          <Clock size={11} />
                          {new Date(trace.updatedAt).toLocaleTimeString()}
                        </span>
                      )}
                    </div>

                    {/* Reasons */}
                    {reasons.length > 0 && (
                      <div style={{
                        marginTop: "8px", display: "flex", gap: "6px", flexWrap: "wrap",
                      }}>
                        {reasons.map((reason, i) => (
                          <span key={i} style={{
                            fontSize: "0.625rem", padding: "2px 8px", borderRadius: "3px",
                            background: "rgba(148,163,184,0.08)", color: "#cbd5e1",
                            border: "1px solid rgba(148,163,184,0.12)",
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Score visualization */}
                  <div style={{
                    width: "60px", height: "60px", position: "relative",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <svg width="60" height="60" viewBox="0 0 60 60">
                      <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="4" />
                      <circle
                        cx="30" cy="30" r="24"
                        fill="none"
                        stroke={sev.color}
                        strokeWidth="4"
                        strokeDasharray={`${(trace.score / 100) * 150.8} 150.8`}
                        strokeLinecap="round"
                        transform="rotate(-90 30 30)"
                        style={{ transition: "stroke-dasharray 0.5s" }}
                      />
                    </svg>
                    <span style={{
                      position: "absolute", fontSize: "0.75rem", fontWeight: 800,
                      color: sev.color, fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {trace.score.toFixed(0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Info */}
        <div style={{
          marginTop: "32px", padding: "16px", textAlign: "center",
          borderTop: "1px solid rgba(148,163,184,0.08)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            fontSize: "0.6875rem", color: "#475569",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            <Info size={12} />
            Public feed — Data refreshes every 5 seconds — Top 10 by anomaly score
          </div>
        </div>
      </main>
    </div>
  );
}