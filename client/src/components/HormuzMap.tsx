import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster/dist/leaflet.markercluster.js";
import "leaflet.heat";
import { useWebSocket } from "../context/WebSocketContext";
import { Eye, EyeOff } from "lucide-react";

const CENTER: [number, number] = [26.06, 56.28];
const ZOOM = 9;
const MIN_ZOOM = 6;
const MAX_ZOOM = 13;
const GEO_RADIUS_KM = 1000;

// ── Object type detection ────────────────────────────────────────────────────
function classifyObject(id: string): "ship" | "flight" {
  if (id.startsWith("FLIGHT-") || id.startsWith("ADS-") || id.startsWith("ICAO-")) {
    return "flight";
  }
  return "ship";
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical": return "#ef4444";
    case "high": return "#b87333";
    case "medium": return "#d97706";
    default: return "#22c55e";
  }
}

// ── Ship icon (anchor/vessel shape) ─────────────────────────────────────────
function makeShipIcon(severity: string, heading: number, selected: boolean) {
  const color = getSeverityColor(severity);
  const scale = selected ? "scale(1.4)" : "scale(1)";
  const glow = selected
    ? `drop-shadow(0 0 7px ${color}) drop-shadow(0 0 3px ${color})`
    : `drop-shadow(0 1px 4px rgba(0,0,0,0.7))`;
  const html = `
    <div style="transform: rotate(${heading}deg) ${scale}; color: ${color}; filter: ${glow}; transition: transform 0.25s ease, filter 0.25s ease;">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Ship hull -->
        <path d="M12 2 L20 17 L12 13 L4 17 Z" fill="currentColor" opacity="0.9"/>
        <!-- Bridge dot -->
        <circle cx="12" cy="10" r="2.2" fill="${selected ? '#ffffff' : 'rgba(255,255,255,0.6)'}"/>
        <!-- Wake lines -->
        <path d="M8 19 Q12 21 16 19" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.5"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: "vessel-div-icon",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function makeBeaconIcon(id: string, severity: string, heading: number, selected: boolean) {
  const colors: Record<string, { ring: string; core: string; rim: string }> = {
    critical: { ring: "#ef4444", core: "#ef4444", rim: "#fca5a5" },
    high: { ring: "#b87333", core: "#b87333", rim: "#d4a574" },
    medium: { ring: "#d97706", core: "#d97706", rim: "#fbbf24" },
    low: { ring: "#22c55e", core: "#22c55e", rim: "#86efac" },
  };

  const c = colors[severity] ?? colors.low;
  const isCritical = severity === "critical";
  const isHigh = severity === "high";
  const pulseSpeed = isCritical ? "1.7s" : isHigh ? "2.2s" : "3s";
  const selColor = "#38bdf8";
  const ringColor = selected ? selColor : c.ring;

  // Heading vector (high/critical only, or selected)
  const headingRad = ((heading - 90) * Math.PI) / 180;
  const vx = (Math.cos(headingRad) * 7).toFixed(1);
  const vy = (Math.sin(headingRad) * 7).toFixed(1);
  const headingDot =
    isHigh || isCritical || selected
      ? `<line x1="0" y1="0" x2="${vx}" y2="${vy}" stroke="${ringColor}" stroke-width="1.2" stroke-linecap="round"/>
         <circle cx="${vx}" cy="${vy}" r="1.2" fill="${ringColor}" opacity="0.8"/>`
      : "";

  // Crosshair ticks for critical / selected
  const ticks =
    isCritical || selected
      ? `<line x1="-9" y1="0" x2="-6" y2="0" stroke="${ringColor}" stroke-width="0.8" opacity="0.7"/>
         <line x1="6"  y1="0" x2="9"  y2="0" stroke="${ringColor}" stroke-width="0.8" opacity="0.7"/>
         <line x1="0" y1="-9" x2="0" y2="-6" stroke="${ringColor}" stroke-width="0.8" opacity="0.7"/>
         <line x1="0" y1="6"  x2="0" y2="9"  stroke="${ringColor}" stroke-width="0.8" opacity="0.7"/>`
      : "";

  // Static dashed lock ring for selected
  const lockRing = selected
    ? `<circle cx="16" cy="16" r="14" fill="none" stroke="${selColor}"
         stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>`
    : "";

  // Animated outer ring (CSS @keyframes via style)
  const ringAnim = `
    @keyframes bo {
      0%   { r:8;  opacity:0.55; }
      100% { r:26; opacity:0; }
    }
    @keyframes bi {
      0%   { r:5;  opacity:0.6; }
      100% { r:16; opacity:0; }
    }
  `;

  const html = `
    <div style="width:32px;height:32px;position:relative;">
      <svg viewBox="0 0 32 32" width="32" height="32" overflow="visible"
           style="position:absolute;top:0;left:0;">
        <style>${ringAnim}</style>
        <g transform="translate(16,16)">
          ${lockRing.replace('cx="16" cy="16"', 'cx="0" cy="0"')}
          <circle cx="0" cy="0" r="8" fill="none" stroke="${ringColor}" stroke-width="0.9">
            <animate attributeName="r"       values="8;26"     dur="${pulseSpeed}" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.55;0"   dur="${pulseSpeed}" repeatCount="indefinite"/>
          </circle>
          ${isCritical || selected ? `
          <circle cx="0" cy="0" r="5" fill="none" stroke="${ringColor}" stroke-width="0.8">
            <animate attributeName="r"       values="5;17"      dur="${pulseSpeed}" begin="${parseFloat(pulseSpeed) / 2}s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.6;0"     dur="${pulseSpeed}" begin="${parseFloat(pulseSpeed) / 2}s" repeatCount="indefinite"/>
          </circle>` : ""}
          <circle cx="0" cy="0" r="4" fill="${selected ? selColor : c.core}"/>
          <circle cx="0" cy="0" r="4" fill="none" stroke="${c.rim}" stroke-width="0.7" opacity="0.6"/>
          ${selected ? `<circle cx="0" cy="0" r="2" fill="white" opacity="0.9"/>` : ""}
          ${ticks}
          ${headingDot}
        </g>
      </svg>
    </div>
  `;

  return L.divIcon({
    html,
    className: "beacon-div-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// ── Flight icon (plane shape) ────────────────────────────────────────────────
function makeFlightIcon(severity: string, heading: number, selected: boolean) {
  const color = selected ? "#38bdf8" : getSeverityColor(severity) === "#22c55e" ? "#38bdf8" : getSeverityColor(severity);
  const scale = selected ? "scale(1.4)" : "scale(1)";
  const glow = selected
    ? `drop-shadow(0 0 7px ${color}) drop-shadow(0 0 3px ${color})`
    : `drop-shadow(0 1px 4px rgba(0,0,0,0.7))`;
  const html = `
    <div style="transform: rotate(${heading}deg) ${scale}; color: ${color}; filter: ${glow}; transition: transform 0.25s ease, filter 0.25s ease;">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <!-- Fuselage -->
        <path d="M12 2 L15 9 L22 12 L15 15 L12 22 L9 15 L2 12 L9 9 Z" fill="currentColor" opacity="0.85"/>
        <!-- Center dot -->
        <circle cx="12" cy="12" r="2" fill="${selected ? '#ffffff' : 'rgba(255,255,255,0.5)'}"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: "vessel-div-icon",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function makeIcon(id: string, severity: string, heading: number, selected: boolean) {
  const type = classifyObject(id);
  if (type === "flight") return makeFlightIcon(severity, heading, selected);
  return makeShipIcon(severity, heading, selected);
}

// ── Static Geospatial Watch Zones ──────────────────────────────────────────────
const WATCH_ZONES = [
  {
    id: "AREA-HORMUZ",
    name: "Strait of Hormuz",
    coords: [[26.5, 56.0], [26.8, 56.5], [27.2, 57.5], [26.9, 57.8], [26.3, 57.0], [26.0, 56.2]] as [number, number][],
    color: "#ef4444",
    label: "HORMUZ",
  },
  {
    id: "AREA-PGULF",
    name: "Persian Gulf (N)",
    coords: [[27.5, 50.0], [29.5, 50.5], [30.0, 55.0], [28.5, 56.5], [27.0, 55.0], [27.0, 51.0]] as [number, number][],
    color: "#b87333",
    label: "P.GULF",
  },
  {
    id: "AREA-GOMAN",
    name: "Gulf of Oman",
    coords: [[23.0, 57.0], [24.0, 59.5], [22.5, 60.5], [21.5, 59.0], [22.0, 57.5]] as [number, number][],
    color: "#38bdf8",
    label: "G.OMAN",
  },
];

export default function HormuzMap() {
  const [map, setMap] = useState<L.Map | null>(null);
  const clusterRef = useRef<any>(null);
  const heatRef = useRef<any>(null);
  const zoneLayersRef = useRef<Map<string, L.Polygon>>(new Map());
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { vessels } = useWebSocket();

  const selectedVesselId = searchParams.get("vesselId");

  const handleVesselSelect = (vesselId: string) => {
    setSearchParams({ vesselId });
  };

  // 1. Initialize Watch Zone Overlays, Cluster Group, and Heat Layer
  useEffect(() => {
    if (!map) return;

    // Add Watch Zones
    if (zoneLayersRef.current.size === 0) {
      WATCH_ZONES.forEach((zone) => {
        const polygon = L.polygon(zone.coords, {
          color: zone.color,
          weight: 1.5,
          opacity: 0.6,
          fillColor: zone.color,
          fillOpacity: 0.04,
          dashArray: "6 4",
        }).addTo(map);

        // Zone label
        const center = polygon.getBounds().getCenter();
        L.marker(center, {
          icon: L.divIcon({
            html: `<div style="
              color: ${zone.color};
              font-size: 9px;
              font-weight: 700;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              font-family: 'JetBrains Mono', monospace;
              white-space: nowrap;
              text-shadow: 0 0 6px rgba(0,0,0,0.9);
              pointer-events: none;
              opacity: 0.7;
            ">${zone.label}</div>`,
            className: "",
            iconSize: [60, 14],
            iconAnchor: [30, 7],
          }),
          interactive: false,
        }).addTo(map);

        zoneLayersRef.current.set(zone.id, polygon);
      });
    }

    // Initialize Cluster Group
    if (!clusterRef.current) {
      clusterRef.current = (L as any).markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 80,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          return L.divIcon({
            html: `<div style="
              background: rgba(79,70,229,0.88);
              border: 1.5px solid rgba(99,102,241,0.7);
              border-radius: 50%;
              width: 34px; height: 34px;
              display: flex; align-items: center; justify-content: center;
              font-size: 11px; font-weight: 700; color: #fff;
              font-family: 'JetBrains Mono', monospace;
              backdrop-filter: blur(6px);
              box-shadow: 0 2px 12px rgba(79,70,229,0.4);
            ">${count}</div>`,
            className: "",
            iconSize: [34, 34],
            iconAnchor: [17, 17],
          });
        },
      });
      map.addLayer(clusterRef.current);
    }

    // Initialize Heat Layer
    if (!heatRef.current) {
      heatRef.current = (L as any).heatLayer([], {
        radius: 35,
        blur: 20,
        maxZoom: 13,
        gradient: {
          0.0: "#22c55e",
          0.35: "#d97706",
          0.6: "#b87333",
          0.85: "#ef4444",
          1.0: "#dc2626",
        },
      });
    }
  }, [map]);

  // 2. Handle Heatmap Updates
  useEffect(() => {
    if (!map || !heatRef.current) return;

    let intervalId: any;

    const fetchHeatmap = async () => {
      try {
        const res = await fetch("/api/heatmap");
        if (!res.ok) throw new Error("Failed to fetch heatmap");
        const json = await res.json();

        if (json.type === "heatmap" && Array.isArray(json.data)) {
          const heatPoints = json.data.map((cell: any) => [
            cell.lat,
            cell.lon,
            Math.min(1, cell.intensity / 50),
          ]);
          heatRef.current.setLatLngs(heatPoints);
          if (!map.hasLayer(heatRef.current)) {
            map.addLayer(heatRef.current);
          }
        }
      } catch (err) {
        console.error("Heatmap fetch error:", err);
      }
    };

    if (showHeatmap) {
      fetchHeatmap();
      intervalId = setInterval(fetchHeatmap, 10000); // refresh every 10s while active
    } else {
      if (map.hasLayer(heatRef.current)) {
        map.removeLayer(heatRef.current);
      }
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [map, showHeatmap]);

  // 3. Handle Markers and Area Selection
  useEffect(() => {
    if (!map || !clusterRef.current) return;

    clusterRef.current.clearLayers();

    // Add vessel markers
    vessels.forEach((vessel) => {
      if (typeof vessel.lat !== "number" || typeof vessel.lon !== "number") return;
      const selected = vessel.id === selectedVesselId;
      const objectType = classifyObject(vessel.id);
      const marker = L.marker([vessel.lat, vessel.lon], {
        icon: makeBeaconIcon(vessel.id, vessel.severity, vessel.heading || 0, selected),
      });
      marker.on("click", () => handleVesselSelect(vessel.id));

      const severityColor = getSeverityColor(vessel.severity);
      const typeColor = objectType === "flight" ? "#38bdf8" : severityColor;
      const typeLabel = objectType === "flight" ? "FLIGHT" : "VESSEL";
      const typeIcon = objectType === "flight"
        ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="${typeColor}"><path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z"/></svg>`
        : `<svg width="10" height="10" viewBox="0 0 24 24" fill="${typeColor}"><path d="M12 2L20 17L12 13L4 17Z"/></svg>`;

      const popupHtml = `
        <div style="
          font-family: 'Space Grotesk', 'Inter', sans-serif;
          font-size: 12px;
          min-width: 200px;
          background: linear-gradient(135deg, #0f172a 0%, #0a1020 100%);
          border: 1px solid rgba(148,163,184,0.15);
          border-radius: 8px;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 12px 32px rgba(0,0,0,0.65);
        ">
          <div style="background: rgba(79,70,229,0.1); border-bottom: 1px solid rgba(79,70,229,0.18); padding: 9px 12px; display: flex; align-items: center; gap: 7px;">
            ${typeIcon}
            <div>
              <div style="font-weight: 700; color: #f8fafc; font-size: 13px; letter-spacing: -0.01em;">${vessel.name}</div>
              <div style="color: #475569; font-size: 9px; font-family: 'JetBrains Mono', monospace; margin-top: 1px; letter-spacing: 0.08em;">${typeLabel} · ${vessel.id}</div>
            </div>
          </div>
          <div style="padding: 10px 12px; display: grid; gap: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #64748b; font-size: 11px;">Speed</span>
              <span style="color: #e2e8f0; font-weight: 600; font-family: 'JetBrains Mono', monospace;">${vessel.speed.toFixed(1)} ${objectType === "flight" ? "kts" : "kts"}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #64748b; font-size: 11px;">Position</span>
              <span style="color: #e2e8f0; font-weight: 600; font-size: 11px; font-family: 'JetBrains Mono', monospace;">${vessel.lat.toFixed(3)}°, ${vessel.lon.toFixed(3)}°</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #64748b; font-size: 11px;">Threat</span>
              <span style="
                background: ${severityColor}1a;
                border: 1px solid ${severityColor}44;
                color: ${severityColor};
                font-weight: 700;
                font-size: 9px;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                padding: 2px 8px;
                border-radius: 3px;
                font-family: 'JetBrains Mono', monospace;
              ">${vessel.severity}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #64748b; font-size: 11px;">Score</span>
              <span style="color: ${severityColor}; font-weight: 700; font-family: 'JetBrains Mono', monospace;">${vessel.anomalyScore}/100</span>
            </div>
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml, {
        className: "intel-popup",
        maxWidth: 230,
      });
      clusterRef.current.addLayer(marker);

      if (selected) {
        map.flyTo([vessel.lat, vessel.lon], 11, {
          duration: 1.5,
          animate: true,
        });
        marker.openPopup();
      }
    });

    // Area selection logic
    zoneLayersRef.current.forEach((polygon, id) => {
      const isSelected = id === selectedVesselId;
      polygon.setStyle({
        fillOpacity: isSelected ? 0.2 : 0.04,
        weight: isSelected ? 3 : 1.5,
      });
      if (isSelected) {
        map.flyToBounds(polygon.getBounds(), {
          duration: 1.5,
          animate: true,
        });
      }
    });

  }, [map, vessels, selectedVesselId]);

  return (
    <section style={{ position: "relative" }} aria-label="Strait of Hormuz operational map">
      <div style={{ position: "relative", height: "520px", width: "100%" }}>
        {/* Heatmap Toggle */}
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          style={{
            position: "absolute",
            top: "12px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 500,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            background: showHeatmap ? "rgba(79,70,229,0.9)" : "rgba(5,8,22,0.88)",
            border: showHeatmap
              ? "1px solid rgba(99,102,241,0.6)"
              : "1px solid rgba(148,163,184,0.2)",
            borderRadius: "7px",
            color: showHeatmap ? "#ffffff" : "#94a3b8",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
            backdropFilter: "blur(10px)",
            letterSpacing: "0.04em",
            fontFamily: "'Space Grotesk', sans-serif",
            boxShadow: showHeatmap ? "0 4px 16px rgba(79,70,229,0.35)" : "none",
            transition: "all 0.2s ease",
          }}
        >
          {showHeatmap ? <Eye size={13} /> : <EyeOff size={13} />}
          {showHeatmap ? "Hide Heatmap" : "Show Heatmap"}
        </button>

        <MapContainer
          center={CENTER}
          zoom={ZOOM}
          style={{ height: "100%", width: "100%" }}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          ref={setMap as any}
          whenReady={() => {
            if (!map) return;
            const lat = CENTER[0];
            const lon = CENTER[1];
            const deltaLat = GEO_RADIUS_KM / 110.574;
            const deltaLon = GEO_RADIUS_KM / (111.32 * Math.cos((lat * Math.PI) / 180));
            map.setMaxBounds(
              L.latLngBounds([lat - deltaLat, lon - deltaLon], [lat + deltaLat, lon + deltaLon])
            );
          }}
        >
          {/* CartoDB Dark Matter — dark mode map tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={MAX_ZOOM}
          />
        </MapContainer>
      </div>
    </section>
  );
}
