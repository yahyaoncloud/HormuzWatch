import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Activity, MapPin, AlertTriangle, Clock } from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../services/api";

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical": return "#ef4444";
    case "high": return "#b87333";
    case "medium": return "#d97706";
    default: return "#22c55e";
  }
}

export default function TrackDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getTrackHistory(id || "")
      .then((res) => {
        if (!res.ok) throw new Error("Track not found or server error");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div style={{ padding: "40px", color: "#94a3b8" }}>Loading track details...</div>;
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px" }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ color: "#ef4444", fontSize: "1.125rem" }}>{error || "No data found."}</div>
      </div>
    );
  }

  const { track, anomaly } = data;
  const sevColor = getSeverityColor(anomaly.severity);

  const markerIcon = L.divIcon({
    html: `<div style="
      background: ${sevColor};
      width: 14px; height: 14px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 10px ${sevColor};
    "></div>`,
    className: "",
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  return (
    <div className="page-container fade-up" style={{ paddingBottom: "40px" }}>
      <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px", fontFamily: "'Space Grotesk', sans-serif" }}>
        <ArrowLeft size={16} /> Back to Analysis
      </button>

      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div className="section-eyebrow" style={{ marginBottom: "6px" }}>Historical Track Record</div>
        <h1 className="page-title">{track.assetName} <span style={{ color: "#64748b", fontSize: "1.25rem", marginLeft: "12px" }}>{track.trackId}</span></h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Left Column: Map */}
        <div style={{ height: "400px", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(148,163,184,0.15)" }}>
          <MapContainer center={[track.lat, track.lon]} zoom={10} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <Marker position={[track.lat, track.lon]} icon={markerIcon} />
          </MapContainer>
        </div>

        {/* Right Column: Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Anomaly Card */}
          <div style={{ background: "linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(11,18,32,0.9) 100%)", border: `1px solid ${sevColor}44`, borderLeft: `4px solid ${sevColor}`, borderRadius: "6px", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>Threat Assessment</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: sevColor, textTransform: "uppercase" }}>{anomaly.severity}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>Final Score</div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#f8fafc", lineHeight: 1 }}>{Math.round(anomaly.score)}<span style={{ fontSize: "1rem", color: "#64748b" }}>/100</span></div>
              </div>
            </div>

            {anomaly.reasons && anomaly.reasons.length > 0 && (
              <div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Trigger Factors</div>
                <ul style={{ margin: 0, paddingLeft: "16px", color: "#cbd5e1", fontSize: "0.875rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {anomaly.reasons.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Telemetry Snapshot */}
          <div style={{ background: "rgba(11,18,32,0.6)", border: "1px solid rgba(148,163,184,0.1)", borderRadius: "6px", padding: "20px" }}>
            <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Activity size={16} /> Last Known Telemetry
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "0.6875rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace", marginBottom: "4px" }}>SPEED</div>
                <div style={{ fontSize: "1.125rem", color: "#f8fafc", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{track.speed.toFixed(1)} kts</div>
              </div>
              <div>
                <div style={{ fontSize: "0.6875rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace", marginBottom: "4px" }}>HEADING</div>
                <div style={{ fontSize: "1.125rem", color: "#f8fafc", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{track.heading.toFixed(1)}°</div>
              </div>
              <div>
                <div style={{ fontSize: "0.6875rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace", marginBottom: "4px" }}>COURSE DELTA</div>
                <div style={{ fontSize: "1.125rem", color: "#f8fafc", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{track.courseDelta.toFixed(1)}°</div>
              </div>
              <div>
                <div style={{ fontSize: "0.6875rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace", marginBottom: "4px" }}>LAST SEEN</div>
                <div style={{ fontSize: "0.875rem", color: "#f8fafc", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{new Date(track.lastUpdated).toLocaleString()}</div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
