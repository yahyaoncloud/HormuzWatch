import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, ZoomControl } from "react-leaflet";
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
function classifyObject(id: string | undefined): "asset" | "aircraft" {
  if (!id) return "asset";
  if (id.startsWith("FLIGHT-") || id.startsWith("ADS-") || id.startsWith("ICAO-")) {
    return "aircraft";
  }
  return "asset";
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical": return "#ef4444";
    case "high": return "#b87333";
    case "medium": return "#d97706";
    default: return "#22c55e";
  }
}

// ── Asset icon (geospatial marker shape) ─────────────────────────────────────
function makeAssetIcon(severity: string, heading: number, selected: boolean) {
  const color = getSeverityColor(severity);
  const scale = selected ? "scale(1.4)" : "scale(1)";
  const glow = selected
    ? `drop-shadow(0 0 7px ${color}) drop-shadow(0 0 3px ${color})`
    : `drop-shadow(0 1px 4px rgba(0,0,0,0.7))`;
  const html = `
    <div style="transform: rotate(${heading}deg) ${scale}; color: ${color}; filter: ${glow}; transition: transform 0.25s ease, filter 0.25s ease;">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Asset marker -->
        <path d="M12 2 L20 17 L12 13 L4 17 Z" fill="currentColor" opacity="0.9"/>
        <!-- Center dot -->
        <circle cx="12" cy="10" r="2.2" fill="${selected ? '#ffffff' : 'rgba(255,255,255,0.6)'}"/>
        <!-- Trail lines -->
        <path d="M8 19 Q12 21 16 19" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.5"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: "track-div-icon",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function makeBeaconIcon(_id: string, severity: string, heading: number, selected: boolean) {
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

// ── Aircraft icon (plane shape) ───────────────────────────────────────────────
function makeAircraftIcon(severity: string, heading: number, selected: boolean) {
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
    className: "track-div-icon",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function makeIcon(id: string, severity: string, heading: number, selected: boolean) {
  const type = classifyObject(id);
  if (type === "aircraft") return makeAircraftIcon(severity, heading, selected);
  return makeAssetIcon(severity, heading, selected);
}

// ── Static Geospatial Watch Zones ──────────────────────────────────────────────
const WATCH_ZONES = [
  {
    id: "AREA-HORMUZ",
    name: "Strait of Hormuz",
    coords: [
      // Northern Boundary (Iran Coastline flowing West to East)
      [26.70, 55.40], // Western entry point (South of Qeshm)
      [26.75, 55.90], // South-central Qeshm Island
      [26.95, 56.30], // Hormuz Island southern waters
      [27.10, 56.50], // East of Hormuz Island / Iranian Coast
      [27.00, 56.80], // Coastline near Minab approach
      [26.70, 57.10], // Northeastern opening (Iran side)
      
      // Eastern Boundary / Outer Gate (Crossing South to Oman)
      [26.35, 57.15], // Eastern boundary mid-channel
      [25.95, 56.90], // Southeastern corner near Ras Limah
      
      // Southern Boundary (Oman Musandam Peninsula flowing East to West)
      [26.30, 56.50], // Kumzar / Northernmost tip of Musandam
      [26.20, 56.25], // Khasab offshore waters
      [26.15, 55.90], // Outer Western Musandam
      
      // Western Boundary / Inner Gate (Crossing North back to start)
      [26.30, 55.60], // Mid-gate western opening
    ] as [number, number][],
    color: "#ef4444",
    label: "HORMUZ",
  },
  {
    id: "AREA-PGULF",
    name: "Persian Gulf (N)",
    coords: [
      // Northern Boundary (Iraq / Iran Coast flowing Northwest to Southeast)
      [29.80, 48.75], // Mouth of Shatt al-Arab / Al-Faw
      [29.90, 49.30], // Offshore Bandar Imam Khomeini
      [29.10, 50.50], // Offshore Bandar Bushehr
      [27.70, 52.20], // Offshore Asaluyeh
      [26.50, 54.00], // Near Lavan Island
      [26.35, 54.80], // Near Kish Island
      [26.40, 55.20], // Western approach to Strait of Hormuz
      
      // Southern Boundary (UAE / Qatar / Saudi / Kuwait flowing Southeast to Northwest)
      [25.80, 55.30], // UAE Coast near Sharjah / Ajman
      [25.10, 54.20], // Offshore Abu Dhabi
      [24.50, 52.50], // Near Ghasha / Ruwais waters
      [24.80, 51.70], // Saudi / Qatar Southeastern maritime border
      [25.60, 51.50], // East of Doha, Qatar
      [26.50, 51.30], // North of Ras Rakan (Qatar northern tip)
      [27.00, 50.00], // Offshore Jubail, Saudi Arabia
      [28.00, 49.20], // Offshore Khafji (Saudi/Kuwait border zone)
      [29.20, 48.50], // Kuwait Bay approach
      [29.60, 48.40], // Bubiyan Island southern tip
    ] as [number, number][],
    color: "#b87333",
    label: "P.GULF",
  },
  {
    id: "AREA-GOMAN",
    name: "Gulf of Oman",
    coords: [
      // Northwest Boundary (Shared Gate with Strait of Hormuz)
      [25.95, 56.90], // Ras Limah (Oman Musandam)
      [26.35, 57.15], // Mid-channel line
      [26.70, 57.10], // Ras al Kuh area (Iran side)
      
      // Northern Boundary (Iranian/Pakistani Coast flowing West to East)
      [25.75, 57.80], // Jask offshore anchorage
      [25.35, 59.50], // Western approach to Chabahar
      [25.20, 60.70], // Pasabandar / Iran-Pakistan border waters
      [25.00, 61.80], // Gwadar offshore (Pakistan) - Eastern Boundary Anchor
      
      // Southern Boundary (Omani Coast flowing East to West/Northwest)
      [22.50, 59.80], // Ras al Hadd (Southeastern corner limit of Gulf)
      [23.20, 59.00], // Sur offshore waters
      [23.70, 58.50], // Muscat / Mutrah anchorage area
      [24.30, 57.40], // Offshore Suwayq (Al Batinah Coast)
      [24.55, 56.70], // Offshore Sohar
      [25.10, 56.50], // Offshore Fujairah (UAE East Coast)
      [25.60, 56.40], // Offshore Dibba
    ] as [number, number][],
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
  const { tracks } = useWebSocket();

  // Animation state for smooth data transitions
  const prevPointsRef = useRef<number[][]>([]);
  const interpRafRef = useRef<number | null>(null);

  const selectedTrackId = searchParams.get("trackId");

  const handleTrackSelect = (trackId: string) => {
    setSearchParams({ trackId });
  };

  // Inject heatmap CSS animation once
  useEffect(() => {
    if (document.getElementById("heatmap-pulse-style")) return;
    const style = document.createElement("style");
    style.id = "heatmap-pulse-style";
    style.textContent = `
      @keyframes heatmap-breathe {
        0%, 100% { opacity: 0.82; }
        50% { opacity: 0.95; }
      }
      .leaflet-overlay-pane canvas {
        transition: opacity 0.5s ease;
      }
    `;
    document.head.appendChild(style);
  }, []);

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

    // Initialize Heat Layer with enriched gradient
    if (!heatRef.current) {
      heatRef.current = (L as any).heatLayer([], {
        radius: 38,
        blur: 25,
        maxZoom: 13,
        gradient: {
          0.0:  "#0f172a",
          0.15: "#312e81",
          0.35: "#1d4ed8",
          0.55: "#d97706",
          0.75: "#b87333",
          0.9:  "#ef4444",
          1.0:  "#fca5a5",
        },
      });
    }
  }, [map]);

  // Smooth data interpolation between old and new heat points
  const animatePointTransition = (from: number[][], to: number[][], durationMs: number) => {
    if (interpRafRef.current) cancelAnimationFrame(interpRafRef.current);

    const matched = to.map(([lat, lon, intensity]) => {
      const prev = from.find(([plat, plon]) =>
        Math.abs(plat - lat) < 0.05 && Math.abs(plon - lon) < 0.05
      );
      return { lat, lon, fromI: prev ? prev[2] : 0, toI: intensity };
    });

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out
      const pts = matched.map(({ lat, lon, fromI, toI }) => [
        lat, lon, fromI + (toI - fromI) * ease,
      ]);
      if (map?.hasLayer(heatRef.current)) {
        heatRef.current.setLatLngs(pts);
      }
      if (t < 1) {
        interpRafRef.current = requestAnimationFrame(tick);
      } else {
        interpRafRef.current = null;
      }
    };
    interpRafRef.current = requestAnimationFrame(tick);
  };

  // Apply breathing pulse to the heat layer canvas once it exists
  const applyPulse = () => {
    // Wait briefly for leaflet.heat to create its canvas after addLayer
    setTimeout(() => {
      const canvas = heatRef.current?._canvas as HTMLCanvasElement | undefined;
      if (canvas) {
        canvas.style.animation = "heatmap-breathe 3.5s ease-in-out infinite";
      }
    }, 100);
  };

  // 2. Handle Heatmap Updates
  useEffect(() => {
    if (!map || !heatRef.current) return;

    let intervalId: any;

    const fetchHeatmap = async (isFirstFetch = false) => {
      try {
        const res = await fetch("/api/heatmap");
        if (!res.ok) throw new Error("Failed to fetch heatmap");
        const json = await res.json();

        if (json.type === "heatmap" && Array.isArray(json.data)) {
          const newPoints = json.data.map((cell: any) => [
            cell.lat,
            cell.lon,
            Math.min(1, cell.intensity / 50),
          ]);

          if (!map.hasLayer(heatRef.current)) {
            // First time: add layer to map, then set data
            map.addLayer(heatRef.current);
            heatRef.current.setLatLngs(newPoints);
            applyPulse();
          } else if (isFirstFetch || prevPointsRef.current.length === 0) {
            // First fetch after re-enable: snap to new data
            heatRef.current.setLatLngs(newPoints);
          } else {
            // Subsequent: smooth interpolation
            animatePointTransition(prevPointsRef.current, newPoints, 800);
          }

          prevPointsRef.current = newPoints;
        }
      } catch (err) {
        console.error("Heatmap fetch error:", err);
      }
    };

    if (showHeatmap) {
      fetchHeatmap(true);
      intervalId = setInterval(() => fetchHeatmap(false), 10000);
    } else {
      // Remove layer (CSS transition handles the fade via overlay pane rule)
      if (map.hasLayer(heatRef.current)) {
        map.removeLayer(heatRef.current);
      }
      prevPointsRef.current = [];
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (interpRafRef.current) cancelAnimationFrame(interpRafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, showHeatmap]);

  // 3. Handle Markers and Area Selection
  useEffect(() => {
    if (!map || !clusterRef.current) return;

    clusterRef.current.clearLayers();

    // Add track markers
    tracks.forEach((track) => {
      if (typeof track.lat !== "number" || typeof track.lon !== "number") return;
      const selected = track.id === selectedTrackId;
      const objectType = classifyObject(track.id);
      const marker = L.marker([track.lat, track.lon], {
        icon: makeBeaconIcon(track.id, track.severity, track.heading || 0, selected),
      });
      marker.on("click", () => handleTrackSelect(track.id));

      const severityColor = getSeverityColor(track.severity);
      const typeColor = objectType === "aircraft" ? "#38bdf8" : severityColor;
      const typeLabel = objectType === "aircraft" ? "AIRCRAFT" : "ASSET";
      const typeIcon = objectType === "aircraft"
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
              <div style="font-weight: 700; color: #f8fafc; font-size: 13px; letter-spacing: -0.01em;">${track.name}</div>
              <div style="color: #475569; font-size: 9px; font-family: 'JetBrains Mono', monospace; margin-top: 1px; letter-spacing: 0.08em;">${typeLabel} · ${track.id}</div>
            </div>
          </div>
          <div style="padding: 10px 12px; display: grid; gap: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #64748b; font-size: 11px;">Speed</span>
              <span style="color: #e2e8f0; font-weight: 600; font-family: 'JetBrains Mono', monospace;">${(track.speed || 0).toFixed(1)} kts</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #64748b; font-size: 11px;">Position</span>
              <span style="color: #e2e8f0; font-weight: 600; font-size: 11px; font-family: 'JetBrains Mono', monospace;">${(track.lat || 0).toFixed(3)}°, ${(track.lon || 0).toFixed(3)}°</span>
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
              ">${track.severity}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #64748b; font-size: 11px;">Score</span>
              <span style="color: ${severityColor}; font-weight: 700; font-family: 'JetBrains Mono', monospace;">${track.anomalyScore}/100</span>
            </div>
            <div style="margin-top: 6px; padding-top: 8px; border-top: 1px solid rgba(148,163,184,0.1);">
              <button id="watchlist-btn-${track.id}" style="
                background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3); border-radius: 4px; color: #818cf8; font-size: 10px; padding: 4px; cursor: pointer; width: 100%; font-weight: 600;
              ">Add to Watchlist</button>
            </div>
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml, {
        className: "intel-popup",
        maxWidth: 230,
      });

      marker.on("popupopen", () => {
        const btn = document.getElementById(`watchlist-btn-${track.id}`);
        if (btn) {
          btn.onclick = async () => {
            btn.innerHTML = "Saving...";
            try {
              const res = await fetch(`/api/watchlist/${track.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes: "" })
              });
              if (res.ok) {
                btn.innerHTML = "Saved to Watchlist ✓";
                btn.style.color = "#22c55e";
                btn.style.borderColor = "#22c55e";
                btn.style.background = "rgba(34,197,94,0.1)";
              } else {
                throw new Error("Failed");
              }
            } catch (err) {
              btn.innerHTML = "Error saving";
              btn.style.color = "#ef4444";
            }
          };
        }
      });

      clusterRef.current.addLayer(marker);

      if (selected) {
        map.flyTo([track.lat, track.lon], 11, {
          duration: 1.5,
          animate: true,
        });
        marker.openPopup();
      }
    });

    // Area selection logic
    zoneLayersRef.current.forEach((polygon, id) => {
      const isSelected = id === selectedTrackId;
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

  }, [map, tracks, selectedTrackId]);

  return (
    <section style={{ position: "relative", height: "100%", width: "100%" }} aria-label="Strait of Hormuz operational map">
      <div style={{ position: "relative", height: "100%", width: "100%", background: "black"
      }}>
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
          zoomControl={false}
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
          {/* <ZoomControl position="topleft"  /> */}
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
