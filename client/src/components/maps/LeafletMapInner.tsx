import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { useSearchParams } from 'react-router';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster/dist/leaflet.markercluster.js';
import 'leaflet.heat';
import { useQuery } from '@tanstack/react-query';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { env } from '@/environments/environment';
import * as apiMethods from '@/lib/api';
import { getConflictFeed } from '@/lib/api';
import { useWebSocket } from '@/providers';
import { useSettingsStore, useRealtimeStore } from '@/stores';
import type { ConflictEvent } from '@/types/websocket';

const CENTER: [number, number] = [26.20, 56.10];
const ZOOM = 7;
const DEFAULT_MIN_ZOOM = 5.5;
const DEFAULT_MAX_ZOOM = 16;

function getTileLayerConfig(isDarkMode: boolean, useFallback = false) {
  let rawUrl = useFallback
    ? env.map.tileUrlFallback
    : isDarkMode
      ? env.map.tileUrlDark
      : env.map.tileUrlLight;

  if (env.map.apiKey) {
    if (rawUrl.includes('{key}')) {
      rawUrl = rawUrl.replace('{key}', env.map.apiKey);
    } else if (rawUrl.includes('{apikey}')) {
      rawUrl = rawUrl.replace('{apikey}', env.map.apiKey);
    } else if (rawUrl.includes('?')) {
      rawUrl = `${rawUrl}&api_key=${env.map.apiKey}`;
    } else {
      rawUrl = `${rawUrl}?api_key=${env.map.apiKey}`;
    }
  } else {
    rawUrl = rawUrl.replace('{key}', '').replace('{apikey}', '').replace('{r}', '');
  }

  const className = useFallback
    ? 'tactical-osm-fallback'
    : isDarkMode
      ? 'tactical-esri-dark'
      : 'tactical-esri-light';

  return {
    url: rawUrl,
    attribution: env.map.attribution,
    subdomains: env.map.subdomains,
    className,
  };
}

export const DEFAULT_GULF_BOUNDS: L.LatLngBoundsExpression = [
  [21.5, 47.0],   // SW: UAE / Oman / Southern Gulf
  [31.5, 61.5],   // NE: Northern Gulf / Shatt al-Arab / Gulf of Oman
];

export const LOCKED_BOUNDS: L.LatLngBoundsExpression = [
  [21.5, 47.0],
  [31.5, 61.5],
];

const LOCKED_MIN_ZOOM = 6.0;
const LOCKED_MAX_ZOOM = 14.0;

function parseCoord(val: any): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val === 'string') {
    const num = parseFloat(val);
    if (!isNaN(num)) return num;
  }
  return null;
}

function classifyTrackObject(track: any): 'vessel' | 'aircraft' {
  if (!track) return 'vessel';
  if (typeof track === 'string') {
    const s = track.toUpperCase();
    if (s.startsWith('FLIGHT') || s.startsWith('ADS-') || s.startsWith('ICAO-')) return 'aircraft';
    if (/^[0-9A-F]{6}$/i.test(s)) return 'aircraft';
    return 'vessel';
  }
  if (track.objectType === 'aircraft' || track.domain === 'aviation') return 'aircraft';
  if (track.objectType === 'vessel' || track.domain === 'maritime') return 'vessel';

  const idStr = String(track.trackId || track.id || '').toUpperCase();
  if (idStr.startsWith('FLIGHT') || idStr.startsWith('ADS-') || idStr.startsWith('ICAO-')) {
    return 'aircraft';
  }
  if (/^[0-9A-F]{6}$/i.test(idStr)) {
    return 'aircraft';
  }

  const assetName = String(track.assetName || track.name || track.callsign || '').toUpperCase();
  if (/^(FDB|ETD|SVA|UAE|QTR|GFA|OMA|BOX|FAD|CHZ|KNE|THY|BAW|DLH|AFR|MSR|RJA|JZR|ABY|KAC)[0-9A-Z]+/i.test(assetName)) {
    return 'aircraft';
  }
  if (assetName.startsWith('ICAO-') || assetName.startsWith('FLIGHT-') || assetName.startsWith('ADS-')) {
    return 'aircraft';
  }

  if (track.altitude !== undefined && track.altitude !== null && Number(track.altitude) > 0) {
    return 'aircraft';
  }
  if (track.speed !== undefined && track.speed !== null && Number(track.speed) > 80) {
    return 'aircraft';
  }
  return 'vessel';
}

function getRegionNameByCoords(lat: number, lon: number): string {
  // Strait of Hormuz TSS
  if (lat >= 25.8 && lat <= 27.3 && lon >= 55.5 && lon <= 57.1) return 'Strait of Hormuz';
  // Fujairah Anchorage
  if (lat >= 24.8 && lat <= 25.6 && lon >= 56.2 && lon <= 56.8) return 'Fujairah Anchorage';
  // Persian Gulf Basin
  if (lat >= 24.0 && lat <= 30.5 && lon >= 48.0 && lon <= 56.0) return 'Persian Gulf';
  // Gulf of Oman
  if (lat >= 22.5 && lat <= 26.5 && lon >= 56.5 && lon <= 61.5) return 'Gulf of Oman';
  // Arabian Sea Entrance
  if (lat >= 20.5 && lat <= 24.0 && lon >= 57.5 && lon <= 62.0) return 'Arabian Sea Ingress';

  return 'Gulf Waters';
}

export function isInsideGulf(lat: number, lon: number): boolean {
  return lat >= 21.0 && lat <= 32.5 && lon >= 46.5 && lon <= 62.5;
}

import { createTacticalLeafletIcon } from '@/icons';

function buildTrackPopupHTML(track: any): string {
  if (!track) return '';
  const isAircraft = classifyTrackObject(track) === 'aircraft';
  const severityColor: Record<string, string> = {
    critical: '#b91c1c',
    high: '#b45309',
    medium: '#d97706',
    low: '#15803d',
  };
  const color = severityColor[track.severity || 'low'] || 'var(--color-primary-600)';

  const altVal = (track as any).altitude;
  const squawkVal = (track as any).squawk;
  const onGroundVal = (track as any).onGround;

  const altPill =
    isAircraft && altVal !== undefined && altVal !== null
      ? `<div style="background:var(--color-bg-elevated, rgba(255,255,255,0.04));border:1px solid var(--color-border);border-radius:6px;padding:5px 8px">
          <div style="font-size:9px;font-weight:600;color:var(--color-fg-subtle);text-transform:uppercase;letter-spacing:0.05em">ALTITUDE</div>
          <div style="font-size:11px;font-weight:700;color:var(--color-fg);font-family:var(--font-mono, monospace);margin-top:1px">${Number(altVal).toLocaleString()} ft</div>
        </div>`
      : '';
  const squawkPill =
    isAircraft && squawkVal
      ? `<div style="background:var(--color-bg-elevated, rgba(255,255,255,0.04));border:1px solid var(--color-border);border-radius:6px;padding:5px 8px">
          <div style="font-size:9px;font-weight:600;color:var(--color-fg-subtle);text-transform:uppercase;letter-spacing:0.05em">SQUAWK</div>
          <div style="font-size:11px;font-weight:700;color:var(--color-primary-400, #38bdf8);font-family:var(--font-mono, monospace);margin-top:1px">${squawkVal}</div>
        </div>`
      : '';
  const onGroundPill =
    isAircraft && onGroundVal !== undefined
      ? `<div style="background:var(--color-bg-elevated, rgba(255,255,255,0.04));border:1px solid var(--color-border);border-radius:6px;padding:5px 8px">
          <div style="font-size:9px;font-weight:600;color:var(--color-fg-subtle);text-transform:uppercase;letter-spacing:0.05em">STATUS</div>
          <div style="font-size:11px;font-weight:700;color:${onGroundVal ? 'var(--color-warning, #facc15)' : 'var(--color-success, #22c55e)'};font-family:var(--font-mono, monospace);margin-top:1px">${onGroundVal ? 'ON GROUND' : 'AIRBORNE'}</div>
        </div>`
      : '';
  const aisAgePill =
    !isAircraft && track.aisAgeMinutes !== undefined
      ? `<div style="background:var(--color-bg-elevated, rgba(255,255,255,0.04));border:1px solid var(--color-border);border-radius:6px;padding:5px 8px">
          <div style="font-size:9px;font-weight:600;color:var(--color-fg-subtle);text-transform:uppercase;letter-spacing:0.05em">AIS AGE</div>
          <div style="font-size:11px;font-weight:700;color:var(--color-fg);font-family:var(--font-mono, monospace);margin-top:1px">${track.aisAgeMinutes} min</div>
        </div>`
      : '';

  const lat = Number(track.lat || 0);
  const lon = Number(track.lon || 0);

  return `
    <div style="font-family:var(--font-mono, monospace);color:var(--color-fg);padding:10px;border-radius:0;background:#0d1422;border:1px solid #1f2c40;box-shadow:inset 1px 1px 0 rgba(255,255,255,0.08), inset -1px -1px 0 rgba(0,0,0,0.6)">
      <!-- Tactical Dossier Header -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px;border-bottom:1px solid #1f2c40;padding-bottom:6px">
        <div style="display:flex;align-items:center;gap:8px;min-width:0">
          <div style="width:26px;height:26px;background:${color}20;border:1px solid ${color}80;display:flex;align-items:center;justify-content:center;font-size:13px;color:${color};flex-shrink:0">
            ${isAircraft ? '✈' : '▲'}
          </div>
          <div style="min-width:0">
            <h4 style="margin:0;font-size:12px;font-weight:700;color:#f8fafc;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase">${track.assetName || track.name || track.id}</h4>
            <div style="display:flex;align-items:center;gap:4px;margin-top:2px">
              <span style="width:5px;height:5px;background:#22c55e;display:inline-block"></span>
              <span style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em">${isAircraft ? 'ADS-B AIR CONTACT' : 'AIS MARITIME CONTACT'}</span>
            </div>
          </div>
        </div>
        <span style="padding:2px 6px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#fff;background:${color};border:1px solid ${color}90;flex-shrink:0">
          ${track.severity || 'NOMINAL'}
        </span>
      </div>

      <!-- Telemetry Grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px">
        <div style="background:#080c14;border:1px solid #1a2536;padding:4px 6px">
          <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase">TRACK ID</div>
          <div style="font-size:10px;font-weight:700;color:#e2e8f0;margin-top:1px">${track.id}</div>
        </div>
        <div style="background:#080c14;border:1px solid #1a2536;padding:4px 6px">
          <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase">SPEED</div>
          <div style="font-size:10px;font-weight:700;color:#e2e8f0;margin-top:1px">${(track.speed || 0).toFixed(1)} kts</div>
        </div>
        <div style="background:#080c14;border:1px solid #1a2536;padding:4px 6px">
          <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase">HEADING</div>
          <div style="font-size:10px;font-weight:700;color:#e2e8f0;margin-top:1px">${(track.heading || 0).toFixed(0)}° TRUE</div>
        </div>
        <div style="background:#080c14;border:1px solid #1a2536;padding:4px 6px">
          <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase">SECTOR</div>
          <div style="font-size:10px;font-weight:700;color:#e2e8f0;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${getRegionNameByCoords(lat, lon)}</div>
        </div>
        ${altPill}
        ${squawkPill}
        ${onGroundPill}
        ${aisAgePill}
        <div style="background:#080c14;border:1px solid #1a2536;padding:4px 6px">
          <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase">POSITION N</div>
          <div style="font-size:10px;font-weight:700;color:#e2e8f0;margin-top:1px">${lat.toFixed(4)}°N</div>
        </div>
        <div style="background:#080c14;border:1px solid #1a2536;padding:4px 6px">
          <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase">POSITION E</div>
          <div style="font-size:10px;font-weight:700;color:#e2e8f0;margin-top:1px">${lon.toFixed(4)}°E</div>
        </div>
      </div>

      <!-- Provenance & Source Metadata -->
      <div style="display:flex;align-items:center;justify-content:space-between;background:#080c14;border:1px solid #1a2536;padding:3px 6px;margin-bottom:6px;font-size:8px;color:#64748b">
        <span>SRC: <strong style="color:#94a3b8">${((track as any).provider || track.source || 'AIS STREAM / OPEN WATERS').toUpperCase()}</strong></span>
        ${(track as any).station ? `<span>STN: <strong style="color:#38bdf8">${(track as any).station}</strong></span>` : '<span>VERIFIED FEED</span>'}
      </div>

      <!-- Footer -->
      <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid #1f2c40;padding-top:6px;font-size:9px;color:#64748b">
        <span style="display:flex;align-items:center;gap:3px">
          <span style="width:4px;height:4px;background:#22c55e;display:inline-block"></span>
          LIVE TELEMETRY
        </span>
        <span style="color:#94a3b8">${new Date(track.timestamp || Date.now()).toLocaleTimeString()} UTC</span>
      </div>
    </div>`;
}

function makeIcon(track: any, severity: string, heading: number, selected: boolean) {
  const type = classifyTrackObject(track);
  const category = type === 'aircraft' ? 'aircraft' : 'maritime';
  const iconId = type === 'aircraft' ? 'aircraft-commercial' : 'vessel-cargo';

  return createTacticalLeafletIcon({
    iconId,
    category,
    severity: severity as any,
    heading,
    selected,
  });
}

export const WATCH_ZONES = [
  {
    id: 'AREA-HORMUZ',
    name: 'Strait of Hormuz (TSS)',
    coords: [
      [27.15, 55.95],
      [27.20, 56.35],
      [27.05, 56.75],
      [26.75, 57.00],
      [26.40, 56.90],
      [26.15, 56.60],
      [26.05, 56.15],
      [26.30, 55.70],
      [26.70, 55.65],
    ] as [number, number][],
    color: '#FF0055',
    label: 'HORMUZ TSS CHOKEPOINT',
  },
  {
    id: 'AREA-PGULF',
    name: 'Persian Gulf Maritime Basin',
    coords: [
      [29.90, 48.60],
      [29.80, 50.20],
      [28.60, 51.50],
      [27.30, 52.80],
      [26.30, 54.80],
      [25.60, 55.00],
      [24.70, 53.50],
      [24.40, 52.00],
      [25.40, 50.80],
      [26.80, 50.10],
      [28.20, 49.20],
      [29.40, 48.40],
    ] as [number, number][],
    color: '#FF9900',
    label: 'PERSIAN GULF BASIN',
  },
  {
    id: 'AREA-GOMAN',
    name: 'Gulf of Oman Approach',
    coords: [
      [26.20, 56.80],
      [26.40, 57.50],
      [25.80, 58.60],
      [25.20, 60.00],
      [24.60, 61.20],
      [23.40, 59.80],
      [23.80, 58.40],
      [24.40, 57.20],
      [25.20, 56.60],
    ] as [number, number][],
    color: '#00E5FF',
    label: 'GULF OF OMAN APPROACH',
  },
  {
    id: 'AREA-FUJAIRAH',
    name: 'Fujairah Offshore Anchorage (FOA)',
    coords: [
      [25.40, 56.38],
      [25.40, 56.70],
      [24.95, 56.70],
      [24.95, 56.38],
    ] as [number, number][],
    color: '#00E676',
    label: 'FUJAIRAH ANCHORAGE',
  },
];

export interface LeafletMapProps {
  className?: string;
  tracks?: any[];
  heatmap?: boolean;
  onHeatmapChange?: (v: boolean) => void;
  showVessels?: boolean;
  showAircraft?: boolean;
  showConflicts?: boolean;
  onShowConflictsChange?: (v: boolean) => void;
  showAreas?: boolean;
  onShowAreasChange?: (v: boolean) => void;
  showMetrics?: boolean;
  onShowMetricsChange?: (v: boolean) => void;
  recenterTrigger?: number;
  locked?: boolean;
  minZoom?: number;
  maxZoom?: number;
  gulfBounds?: L.LatLngBoundsExpression;
  onHighlightReady?: (fn: (zoneId: string | null) => void) => void;
  timeline?: '1hr' | '3hr' | '6hr' | '12hr' | '24hr' | 'all';
  severityFilter?: string;
  regionFilter?: string;
}

export default function LeafletMapInner({
  className,
  tracks: tracksProp,
  heatmap,
  onHeatmapChange: _onHeatmapChange,
  showVessels = true,
  showAircraft = true,
  showConflicts: showConflictsProp,
  onShowConflictsChange: _onShowConflictsChange,
  showAreas = true,
  onShowAreasChange: _onShowAreasChange,
  showMetrics: _showMetrics,
  onShowMetricsChange: _onShowMetricsChange,
  recenterTrigger,
  locked = false,
  minZoom: minZoomProp,
  maxZoom: maxZoomProp,
  gulfBounds: _gulfBoundsProp,
  onHighlightReady,
  timeline = 'all',
  severityFilter = 'all',
  regionFilter = 'all',
}: LeafletMapProps) {
  const minZoom = minZoomProp ?? (locked ? LOCKED_MIN_ZOOM : DEFAULT_MIN_ZOOM);
  const maxZoom = maxZoomProp ?? (locked ? LOCKED_MAX_ZOOM : DEFAULT_MAX_ZOOM);
  const boundsViscosity = 1.0;
  const [map, setMap] = useState<L.Map | null>(null);
  const [tileFailed, setTileFailed] = useState(false);
  const tileErrorCountRef = useRef(0);

  const handleTileError = useCallback((_e: L.TileErrorEvent) => {
    tileErrorCountRef.current += 1;
    if (tileErrorCountRef.current >= 8 && !tileFailed) {
      console.warn(
        '[LeafletMap] Primary basemap tile provider encountered repeated errors. Switching to fallback basemap.'
      );
      setTileFailed(true);
    }
  }, [tileFailed]);

  const clusterRef = useRef<any>(null);
  const heatRef = useRef<any>(null);
  const zoneLayersRef = useRef<Map<string, L.Polygon>>(new Map());
  const highlightedZoneRef = useRef<string | null>(null);
  const lastFlownTrackIdRef = useRef<string | null>(null);

  const highlightZone = useCallback((zoneId: string | null) => {
    if (highlightedZoneRef.current && zoneLayersRef.current.has(highlightedZoneRef.current)) {
      zoneLayersRef.current.get(highlightedZoneRef.current)!.setStyle({
        opacity: 0.75,
        fillOpacity: 0.08,
        weight: 1.5,
      });
      if (typeof document !== 'undefined') {
        const prevLabel = document.querySelector(
          `.zone-label-${highlightedZoneRef.current}`
        ) as HTMLElement;
        if (prevLabel) prevLabel.style.opacity = '0.75';
      }
    }
    highlightedZoneRef.current = zoneId;
    if (zoneId && zoneLayersRef.current.has(zoneId)) {
      zoneLayersRef.current.get(zoneId)!.setStyle({
        opacity: 1.0,
        fillOpacity: 0.25,
        weight: 3,
      });
      if (typeof document !== 'undefined') {
        const label = document.querySelector(`.zone-label-${zoneId}`) as HTMLElement;
        if (label) label.style.opacity = '1.0';
      }
    }
  }, []);

  useEffect(() => {
    onHighlightReady?.(highlightZone);
  }, [highlightZone, onHighlightReady]);

  // Focus and highlight active area when regionFilter changes
  useEffect(() => {
    if (!map || zoneLayersRef.current.size === 0) return;

    if (!regionFilter || regionFilter === 'all') {
      zoneLayersRef.current.forEach((layer, id) => {
        layer.setStyle({
          opacity: 0.75,
          fillOpacity: 0.08,
          weight: 1.5,
        });
        if (typeof document !== 'undefined') {
          const label = document.querySelector(`.zone-label-${id}`) as HTMLElement;
          if (label) label.style.opacity = '0.85';
        }
      });
      return;
    }

    const activeZone = WATCH_ZONES.find(
      (z) => z.id.toLowerCase() === regionFilter.toLowerCase() || z.id === regionFilter
    );

    if (activeZone && zoneLayersRef.current.has(activeZone.id)) {
      const activeLayer = zoneLayersRef.current.get(activeZone.id)!;
      zoneLayersRef.current.forEach((layer, id) => {
        if (id === activeZone.id) {
          layer.setStyle({
            opacity: 1.0,
            fillOpacity: 0.28,
            weight: 3.0,
          });
          if (typeof document !== 'undefined') {
            const label = document.querySelector(`.zone-label-${id}`) as HTMLElement;
            if (label) label.style.opacity = '1.0';
          }
        } else {
          layer.setStyle({
            opacity: 0.2,
            fillOpacity: 0.02,
            weight: 1.0,
          });
          if (typeof document !== 'undefined') {
            const label = document.querySelector(`.zone-label-${id}`) as HTMLElement;
            if (label) label.style.opacity = '0.2';
          }
        }
      });

      map.flyToBounds(activeLayer.getBounds(), {
        padding: [60, 60],
        maxZoom: 11,
        duration: 1.2,
      });
    }
  }, [map, regionFilter]);

  const [internalHeatmap] = useState(false);
  const storeTheme = useSettingsStore((s) => s.theme);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return true;
    const darkClass = document.documentElement.classList.contains('dark');
    return darkClass || storeTheme === 'dark' || (storeTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const tileConfig = getTileLayerConfig(isDarkMode, tileFailed);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkDark = () => {
      const darkClass = document.documentElement.classList.contains('dark');
      const isSystemDark = storeTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(darkClass || storeTheme === 'dark' || isSystemDark);
    };
    checkDark();

    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDark);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkDark);
    };
  }, [storeTheme]);

  useEffect(() => {
    if (!map) return;
    const scaleControl = L.control.scale({ position: 'bottomleft', metric: true, imperial: true }).addTo(map);
    return () => {
      scaleControl.remove();
    };
  }, [map]);

  const showHeatmap = heatmap ?? internalHeatmap;
  const showConflicts = showConflictsProp ?? true;
  const [searchParams, setSearchParams] = useSearchParams();
  const [tracks, setTracks] = useState<any[]>(tracksProp || []);
  const tracksRef = useRef<any[]>([]);
  tracksRef.current = tracks; // always latest for heatmap fallback
  const trackMarkersRef = useRef<Map<string, { marker: L.Marker; track: any; lat: number; lon: number; heading: number; severity: string; selected: boolean }>>(new Map());
  const { subscribe } = useWebSocket();
  const wsConflicts = useRealtimeStore((s) => s.conflicts);

  // Sync tracks from parent props whenever passed
  useEffect(() => {
    if (tracksProp && tracksProp.length > 0) {
      setTracks((prev) => {
        const trackMap = new Map(prev.map((t) => [t.id, t]));
        for (const t of tracksProp) {
          const id = String(t.trackId || t.id || t.mmsi || '');
          if (!id) continue;
          const lat = parseCoord(t.lat) ?? parseCoord((t as any).latitude);
          const lon = parseCoord(t.lon) ?? parseCoord((t as any).longitude);
          if (lat === null || lon === null) continue;
          const existing = trackMap.get(id) || {};
          trackMap.set(id, {
            ...existing,
            ...t,
            id,
            lat,
            lon,
            assetName: t.assetName || (t as any).vessel_name || id,
            severity: t.severity || existing.severity || 'low',
          });
        }
        return Array.from(trackMap.values());
      });
    }
  }, [tracksProp]);

  // Real-time conflict intelligence feed query
  const { data: conflictData } = useQuery({
    queryKey: ['conflict-feed'],
    queryFn: getConflictFeed,
    refetchInterval: 15000,
    staleTime: 8000,
  });

  const { data: initialTracesData } = useQuery({
    queryKey: ['active-traces-map'],
    queryFn: async () => {
      try {
        // First try the full public tracks endpoint (all active vessels/aircraft)
        const res = await apiMethods.getPublicTracks();
        if (res?.data && res.data.length > 0) {
          return res.data.map((t: any) => ({
            ...t,
            id: t.trackId || t.id,
            lat: t.lat,
            lon: t.lon,
            assetName: t.assetName || t.trackId,
            severity: t.severity || 'low',
          }));
        }
      } catch {
        // Fall back to public vessels
      }
      try {
        const res = await apiMethods.getPublicVessels();
        if (res?.data && res.data.length > 0) {
          return res.data.map((t: any) => ({
            ...t,
            id: t.trackId || t.id,
            lat: t.lat,
            lon: t.lon,
            assetName: t.assetName || t.trackId,
            severity: t.severity || 'low',
          }));
        }
      } catch {
        // Fall back to top-traces if the public tracks endpoint is unavailable
      }
      try {
        const res = await apiMethods.getTopTraces();
        if (res?.traces && res.traces.length > 0) return res.traces;
      } catch {
        // ignore
      }
      return [];
    },
    refetchInterval: 25000,
    staleTime: 15000,
  });

  useEffect(() => {
    if (initialTracesData && initialTracesData.length > 0) {
      setTracks((prev) => {
        const trackMap = new Map(prev.map((t) => [t.id, t]));
        for (const t of initialTracesData) {
          const id = String(t.trackId || (t as any).id || (t as any).mmsi || '');
          if (!id) continue;
          const lat = parseCoord(t.lat) ?? parseCoord((t as any).latitude) ?? parseCoord((t as any).lat_deg);
          const lon = parseCoord(t.lon) ?? parseCoord((t as any).longitude) ?? parseCoord((t as any).lon_deg);
          if (lat === null || lon === null) continue;
          const existing = trackMap.get(id) || {};
          const severity = t.severity || existing.severity || 'low';
          trackMap.set(id, {
            ...existing,
            ...t,
            severity,
            id,
            lat,
            lon,
            assetName: t.assetName || (t as any).vessel_name || id,
          });
        }
        return Array.from(trackMap.values());
      });
    }
  }, [initialTracesData]);

  useEffect(() => {
    const unsubTelemetry = subscribe('telemetry', (payload: any) => {
      if (!payload) return;
      const arr = Array.isArray(payload) ? payload : [payload];
      setTracks((prev) => {
        const trackMap = new Map(prev.map((t) => [t.id, t]));
        for (const t of arr) {
          const id = String(t.id || t.trackId || t.mmsi || '');
          if (!id) continue;
          const lat = parseCoord(t.lat) ?? parseCoord(t.latitude) ?? parseCoord(t.lat_deg);
          const lon = parseCoord(t.lon) ?? parseCoord(t.longitude) ?? parseCoord(t.lon_deg);
          if (lat === null || lon === null) continue;
          const existing = trackMap.get(id) || {};
          const severity = t.severity || existing.severity || 'low';
          trackMap.set(id, {
            ...existing,
            ...t,
            severity,
            id,
            lat,
            lon,
            assetName: t.assetName || t.vessel_name || id,
          });
        }
        return Array.from(trackMap.values());
      });
    });

    const unsubAnomaly = subscribe('anomaly', (payload: any) => {
      if (!payload) return;
      const arr = Array.isArray(payload) ? payload : [payload];
      setTracks((prev) => {
        const trackMap = new Map(prev.map((t) => [t.id, t]));
        for (const a of arr) {
          const id = String(a.id || a.trackId || a.mmsi || '');
          if (!id) continue;
          const lat = parseCoord(a.lat) ?? parseCoord(a.latitude) ?? parseCoord(a.lat_deg);
          const lon = parseCoord(a.lon) ?? parseCoord(a.longitude) ?? parseCoord(a.lon_deg);
          if (lat === null || lon === null) continue;
          const existing = trackMap.get(id) || {};
          const severity = a.severity || existing.severity || 'low';
          trackMap.set(id, {
            ...existing,
            ...a,
            severity,
            id,
            lat,
            lon,
            assetName: a.assetName || a.vessel_name || id,
          });
        }
        return Array.from(trackMap.values());
      });
    });

    return () => {
      unsubTelemetry();
      unsubAnomaly();
    };
  }, [subscribe]);

  const prevPointsRef = useRef<number[][]>([]);
  const interpRafRef = useRef<number | null>(null);

  const selectedTrackId = searchParams.get('trackId');

  const handleTrackSelect = (trackId: string) => {
    setSearchParams({ trackId });
  };

  useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('heatmap-pulse-style')) return;
    const style = document.createElement('style');
    style.id = 'heatmap-pulse-style';
    style.textContent = `
      @keyframes heatmap-breathe {
        0%, 100% { opacity: 0.82; }
        50% { opacity: 0.95; }
      }
      .leaflet-overlay-pane canvas {
        transition: opacity 0.5s ease;
      }
      .track-div-icon { background: none; border: none; }
    `;
    document.head.appendChild(style);
  }, []);

  const zoneMarkersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!map) return;

    if (zoneLayersRef.current.size === 0) {
      WATCH_ZONES.forEach((zone) => {
        const polygon = L.polygon(zone.coords, {
          color: zone.color,
          weight: 1.5,
          opacity: 0.8,
          fillColor: zone.color,
          fillOpacity: 0.08,
          dashArray: '5 5',
        });

        if (showAreas) {
          polygon.addTo(map);
        }

        polygon.bindTooltip(
          `<div style="font-family: monospace; font-size: 11px;">
            <div style="font-weight: bold; color: ${zone.color};">${zone.name}</div>
            <div style="color: #94a3b8; font-size: 10px;">ID: ${zone.id}</div>
          </div>`,
          { sticky: true, opacity: 0.95 }
        );

        polygon.on('mouseover', () => {
          polygon.setStyle({ opacity: 1.0, fillOpacity: 0.22, weight: 2.5 });
        });
        polygon.on('mouseout', () => {
          if (highlightedZoneRef.current !== zone.id) {
            polygon.setStyle({ opacity: 0.8, fillOpacity: 0.08, weight: 1.5 });
          }
        });

        const center = polygon.getBounds().getCenter();
        const marker = L.marker(center, {
          icon: L.divIcon({
            html: `<div style="
              color: ${zone.color};
              font-size: 9px;
              font-weight: 700;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              font-family: 'JetBrains Mono', monospace;
              white-space: nowrap;
              text-shadow: 0 0 8px rgba(0,0,0,0.95), 0 0 4px ${zone.color};
              pointer-events: none;
              opacity: 0.85;
              transition: opacity 0.2s, transform 0.2s;
            " class="zone-label zone-label-${zone.id}">${zone.label}</div>`,
            className: '',
            iconSize: [80, 14],
            iconAnchor: [40, 7],
          }),
          interactive: false,
        });

        if (showAreas) {
          marker.addTo(map);
        }

        zoneMarkersRef.current.push(marker);
        zoneLayersRef.current.set(zone.id, polygon);
      });
    } else {
      zoneLayersRef.current.forEach((polygon) => {
        if (showAreas) {
          if (!map.hasLayer(polygon)) polygon.addTo(map);
        } else {
          if (map.hasLayer(polygon)) polygon.remove();
        }
      });
      zoneMarkersRef.current.forEach((marker) => {
        if (showAreas) {
          if (!map.hasLayer(marker)) marker.addTo(map);
        } else {
          if (map.hasLayer(marker)) marker.remove();
        }
      });
    }

    if (!clusterRef.current) {
      clusterRef.current = (L as any).markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 80,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          const size = count < 10 ? 36 : count < 100 ? 42 : 48;
          const anchor = Math.round(size / 2);
          return L.divIcon({
            html: `<div style="
              position: relative;
              width: ${size}px; height: ${size}px;
              display: flex; align-items: center; justify-content: center;
            ">
              <div class="cluster-circle-outer" style="
                position: absolute; inset: 0;
                border-radius: 50%;
              "></div>
              <div class="cluster-circle-inner" style="
                position: relative;
                width: ${size - 8}px; height: ${size - 8}px;
                border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                font-size: ${count < 100 ? '11px' : '10px'};
              ">${count}</div>
            </div>`,
            className: 'leaflet-cluster-custom',
            iconSize: [size, size],
            iconAnchor: [anchor, anchor],
          });
        },
      });
      map.addLayer(clusterRef.current);
    }

    if (!heatRef.current) {
      heatRef.current = (L as any).heatLayer([], {
        radius: 38,
        blur: 25,
        maxZoom: 13,
        gradient: {
          0.0: '#0f172a',
          0.15: '#312e81',
          0.35: '#1d4ed8',
          0.55: '#d97706',
          0.75: '#b87333',
          0.9: '#ef4444',
          1.0: '#fca5a5',
        },
      });
    }
  }, [map, showAreas]);

  const animatePointTransition = (from: number[][], to: number[][], durationMs: number) => {
    if (interpRafRef.current) cancelAnimationFrame(interpRafRef.current);

    const matched = to.map(([lat, lon, intensity]) => {
      const prev = from.find(
        ([plat, plon]) => Math.abs(plat - lat) < 0.05 && Math.abs(plon - lon) < 0.05
      );
      return { lat, lon, fromI: prev ? prev[2] : 0, toI: intensity };
    });

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const ease = 1 - (1 - t) ** 3;
      const pts = matched.map(({ lat, lon, fromI, toI }) => [
        lat,
        lon,
        fromI + (toI - fromI) * ease,
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

  const applyPulse = () => {
    setTimeout(() => {
      const canvas = heatRef.current?._canvas as HTMLCanvasElement | undefined;
      if (canvas) {
        canvas.style.animation = 'heatmap-breathe 3.5s ease-in-out infinite';
      }
    }, 100);
  };

  useEffect(() => {
    if (!map || !heatRef.current) return;
    let intervalId: any;

    const fetchHeatmap = async (isFirstFetch = false) => {
      try {
        const res = await apiMethods.getHeatmap('all');
        let newPoints: [number, number, number][] = [];
        if (res?.type === 'heatmap' && Array.isArray(res.data) && res.data.length > 0) {
          // Backend returns objects {lat, lon, intensity, source}, not arrays
          newPoints = res.data.map((cell: any) => [
            cell.lat ?? cell[0],
            cell.lon ?? cell[1],
            Math.min(1, ((cell.intensity ?? cell[2]) || 1) / 30),
          ]);
        } else if (tracksRef.current && tracksRef.current.length > 0) {
          newPoints = tracksRef.current.map((t) => [
            t.lat,
            t.lon,
            Math.min(1, ((t.score || 20) + 10) / 100),
          ]);
        }

        if (newPoints.length > 0) {
          if (!map.hasLayer(heatRef.current)) {
            map.addLayer(heatRef.current);
            heatRef.current.setLatLngs(newPoints);
            applyPulse();
          } else if (isFirstFetch || prevPointsRef.current.length === 0) {
            heatRef.current.setLatLngs(newPoints);
          } else {
            animatePointTransition(prevPointsRef.current, newPoints, 800);
          }
          prevPointsRef.current = newPoints;
        }
      } catch (err) {
        console.error('Heatmap fetch error:', err);
      }
    };

    if (showHeatmap) {
      fetchHeatmap(true);
      intervalId = setInterval(() => fetchHeatmap(false), 10000);
    } else {
      if (map.hasLayer(heatRef.current)) {
        map.removeLayer(heatRef.current);
      }
      prevPointsRef.current = [];
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (interpRafRef.current) cancelAnimationFrame(interpRafRef.current);
    };
  }, [map, showHeatmap]);

  const displayTracks = useMemo(() => {
    const map = new Map<string, any>();
    if (tracks && tracks.length > 0) {
      for (const t of tracks) {
        const id = String(t.trackId || t.id || t.mmsi || '');
        if (id) map.set(id, t);
      }
    }
    if (tracksProp && tracksProp.length > 0) {
      for (const t of tracksProp) {
        const id = String(t.trackId || t.id || t.mmsi || '');
        if (id) map.set(id, t);
      }
    }
    return Array.from(map.values());
  }, [tracksProp, tracks]);

  useEffect(() => {
    if (!map) return;
    if (!clusterRef.current) {
      clusterRef.current = (L as any).markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 45,
        spiderfyOnMaxZoom: false,
        spiderfyDistanceMultiplier: 1,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 12,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          const size = count < 10 ? 36 : count < 100 ? 42 : 48;
          const anchor = Math.round(size / 2);
          return L.divIcon({
            html: `<div style="
              position: relative;
              width: ${size}px; height: ${size}px;
              display: flex; align-items: center; justify-content: center;
            ">
              <div class="cluster-circle-outer" style="
                position: absolute; inset: 0;
                border-radius: 50%;
              "></div>
              <div class="cluster-circle-inner" style="
                position: relative;
                width: ${size - 8}px; height: ${size - 8}px;
                border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                font-size: ${count < 100 ? '11px' : '10px'};
              ">${count}</div>
            </div>`,
            className: 'leaflet-cluster-custom',
            iconSize: [size, size],
            iconAnchor: [anchor, anchor],
          });
        },
      });
      map.addLayer(clusterRef.current);
    }
    const activeIds = new Set<string>();
    const toAdd: any[] = [];
    const toRemove: any[] = [];

    const filteredTracks = displayTracks.filter((track: any) => {
      const lat = parseCoord(track.lat) ?? parseCoord(track.latitude);
      const lon = parseCoord(track.lon) ?? parseCoord(track.longitude);
      if (lat === null || lon === null) return false;
      if (!isInsideGulf(lat, lon)) return false;

      if (severityFilter && severityFilter !== 'all' && track.severity !== severityFilter) {
        return false;
      }
      if (regionFilter && regionFilter !== 'all') {
        const regionName = getRegionNameByCoords(lat, lon);
        if ((regionFilter === 'hormuz' || regionFilter === 'AREA-HORMUZ') && regionName !== 'Strait of Hormuz') return false;
        if ((regionFilter === 'pgulf' || regionFilter === 'AREA-PGULF') && regionName !== 'Persian Gulf') return false;
        if ((regionFilter === 'goman' || regionFilter === 'AREA-GOMAN') && regionName !== 'Gulf of Oman') return false;
        if ((regionFilter === 'fujairah' || regionFilter === 'AREA-FUJAIRAH') && regionName !== 'Fujairah Anchorage') return false;
        if (regionFilter === 'redsea' && !regionName.includes('Red Sea')) return false;
      }
      if (timeline && timeline !== 'all' && track.timestamp) {
        const trackTime = new Date(track.timestamp).getTime();
        if (!isNaN(trackTime)) {
          const diffHours = (Date.now() - trackTime) / (1000 * 60 * 60);
          if (timeline === '1hr' && diffHours > 1) return false;
          if (timeline === '3hr' && diffHours > 3) return false;
          if (timeline === '6hr' && diffHours > 6) return false;
          if (timeline === '12hr' && diffHours > 12) return false;
          if (timeline === '24hr' && diffHours > 24) return false;
        }
      }
      return true;
    });

    filteredTracks.forEach((track: any) => {
      const lat = parseCoord(track.lat) ?? parseCoord(track.latitude);
      const lon = parseCoord(track.lon) ?? parseCoord(track.longitude);
      if (lat === null || lon === null) return;

      // Layer visibility filter
      const isAircraft = classifyTrackObject(track) === 'aircraft';
      if (isAircraft && !showAircraft) return;
      if (!isAircraft && !showVessels) return;

      const trackId = String(track.id || track.trackId || '');
      if (!trackId) return;
      activeIds.add(trackId);

      const selected = trackId === String(selectedTrackId);
      const heading = Number(track.heading || 0);
      const severity = track.severity || 'low';
      const existing = trackMarkersRef.current.get(trackId);

      if (existing) {
        // In-place updates: avoids recreating DOM elements and re-rendering cluster
        if (existing.lat !== lat || existing.lon !== lon) {
          existing.marker.setLatLng([lat, lon]);
          existing.lat = lat;
          existing.lon = lon;
        }
        if (existing.heading !== heading || existing.severity !== severity || existing.selected !== selected) {
          existing.marker.setIcon(makeIcon(track, severity, heading, selected));
          existing.heading = heading;
          existing.severity = severity;
          existing.selected = selected;
        }
        existing.track = track;

        if (selected && lastFlownTrackIdRef.current !== selectedTrackId) {
          lastFlownTrackIdRef.current = selectedTrackId;
          map.flyTo([lat, lon], 11, { duration: 1.5, animate: true });
          existing.marker.openPopup();
        }
      } else {
        // Create new marker with lazy popup builder function
        const marker = L.marker([lat, lon], {
          icon: makeIcon(track, severity, heading, selected),
        });

        marker.bindPopup(
          () => buildTrackPopupHTML(trackMarkersRef.current.get(trackId)?.track || track),
          { maxWidth: 320, className: 'track-popup' }
        );

        marker.on('click', () => {
          handleTrackSelect(track.id || trackId);
          marker.openPopup();
        });

        trackMarkersRef.current.set(trackId, {
          marker,
          track,
          lat,
          lon,
          heading,
          severity,
          selected,
        });

        toAdd.push(marker);

        if (selected && lastFlownTrackIdRef.current !== selectedTrackId) {
          lastFlownTrackIdRef.current = selectedTrackId;
          map.flyTo([lat, lon], 11, { duration: 1.5, animate: true });
          marker.openPopup();
        }
      }
    });

    // Remove stale markers not in activeIds
    for (const [id, item] of trackMarkersRef.current.entries()) {
      if (!activeIds.has(id)) {
        toRemove.push(item.marker);
        trackMarkersRef.current.delete(id);
      }
    }

    // High-performance batch clustering operations
    if (toRemove.length > 0) {
      clusterRef.current.removeLayers(toRemove);
    }
    if (toAdd.length > 0) {
      clusterRef.current.addLayers(toAdd);
    }

    zoneLayersRef.current.forEach((polygon, id) => {
      const isSelected = id === selectedTrackId;
      polygon.setStyle({
        fillOpacity: isSelected ? 0.2 : 0.04,
        weight: isSelected ? 3 : 1.5,
      });
      if (isSelected && lastFlownTrackIdRef.current !== selectedTrackId) {
        lastFlownTrackIdRef.current = selectedTrackId;
        map.flyToBounds(polygon.getBounds(), { duration: 1.5, animate: true });
      }
    });

    // Merge WS conflicts with REST fallback (WS preferred)
    const allConflicts = wsConflicts.length > 0 ? wsConflicts : (conflictData?.conflicts || []);
    if (showConflicts && allConflicts.length > 0) {
      const severityColor: Record<string, string> = {
        critical: '#ef4444',
        high: '#f97316',
        medium: '#f59e0b',
        low: '#10b981',
      };
      const conflictSVG = (color: string) => `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <!-- Outward Beacon Pulse Waves -->
          <div style="position: absolute; width: 42px; height: 42px; border-radius: 9999px; background: ${color}40; border: 1.5px solid ${color}99; animation: ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 28px; height: 28px; border-radius: 9999px; background: ${color}55; animation: ping 2.2s cubic-bezier(0, 0, 0.2, 1) 0.6s infinite;"></div>
          <!-- Center Solid Red Dot -->
          <div style="position: relative; z-index: 10; width: 12px; height: 12px; border-radius: 9999px; background: #ef4444; border: 2px solid #ffffff; box-shadow: 0 0 8px 2px rgba(239, 68, 68, 0.85);"></div>
        </div>`;

      const filteredConflicts = allConflicts.filter((c: ConflictEvent) => {
        if (severityFilter && severityFilter !== 'all' && c.severity !== severityFilter) {
          return false;
        }
        if (regionFilter && regionFilter !== 'all') {
          const reg = c.region?.toLowerCase() || '';
          if (regionFilter === 'hormuz' && !reg.includes('hormuz')) return false;
          if (regionFilter === 'pgulf' && !reg.includes('persian') && !reg.includes('gulf'))
            return false;
          if (regionFilter === 'goman' && !reg.includes('oman')) return false;
          if (regionFilter === 'redsea' && !reg.includes('red') && !reg.includes('yemen'))
            return false;
        }
        if (timeline && timeline !== 'all') {
          const diffHours = (Date.now() - new Date(c.timestamp).getTime()) / (1000 * 60 * 60);
          if (timeline === '1hr' && diffHours > 1) return false;
          if (timeline === '3hr' && diffHours > 3) return false;
          if (timeline === '6hr' && diffHours > 6) return false;
          if (timeline === '12hr' && diffHours > 12) return false;
          if (timeline === '24hr' && diffHours > 24) return false;
        }
        return true;
      });

      filteredConflicts.forEach((c: ConflictEvent) => {
        const color = severityColor[c.severity] || '#71717a';
        const icon = L.divIcon({
          html: conflictSVG(color),
          className: '',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
        const marker = L.marker([c.lat, c.lon], { icon });

        // Spatial-temporal AIS vessel correlation within 15 Nautical Miles
        const nearbyVessels = filteredTracks
          .filter((t: any) => {
            const isAir = classifyTrackObject(t) === 'aircraft';
            if (isAir) return false;
            const tLat = parseCoord(t.lat) ?? parseCoord(t.latitude);
            const tLon = parseCoord(t.lon) ?? parseCoord(t.longitude);
            if (tLat === null || tLon === null) return false;
            // Haversine distance in NM
            const dLat = ((tLat - c.lat) * Math.PI) / 180;
            const dLon = ((tLon - c.lon) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((c.lat * Math.PI) / 180) *
                Math.cos((tLat * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            const distNm = 3440.065 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return distNm <= 15.0;
          })
          .map((t: any) => {
            const tLat = parseCoord(t.lat) ?? parseCoord(t.latitude)!;
            const tLon = parseCoord(t.lon) ?? parseCoord(t.longitude)!;
            const dLat = ((tLat - c.lat) * Math.PI) / 180;
            const dLon = ((tLon - c.lon) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((c.lat * Math.PI) / 180) *
                Math.cos((tLat * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            const distNm = 3440.065 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return {
              name: t.assetName || t.trackId || 'Vessel',
              mmsi: t.trackId || t.id,
              dist: Math.round(distNm * 10) / 10,
              speed: t.speed ? Math.round(Number(t.speed) * 10) / 10 : 0,
              heading: t.heading ? Math.round(Number(t.heading)) : null,
            };
          })
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 4);

        const nearbyListHtml =
          nearbyVessels.length > 0
            ? nearbyVessels
                .map(
                  (v) =>
                    `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:10px">
                      <span style="font-weight:700;color:var(--color-fg);font-family:var(--font-mono, monospace)">${v.name}</span>
                      <span style="color:var(--color-primary-600);font-weight:600">${v.dist} NM (${v.speed} kn)</span>
                    </div>`
                )
                .join('')
            : '<div style="font-size:10px;color:var(--color-fg-muted);font-style:italic">No active AIS vessels within 15 NM</div>';

        const verifiedIcon = c.verified ? '✓ Verified' : '⚠ Unverified';
        const verifiedColor = c.verified ? '#15803d' : '#b45309';

        marker.bindPopup(
          `<div style="font-family:var(--font-ui, 'Inter', system-ui, sans-serif);color:var(--color-fg);padding:14px;border-radius:14px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px">
              <div style="min-width:0">
                <h4 style="margin:0;font-size:14px;font-weight:700;color:var(--color-fg);line-height:1.2">${c.title}</h4>
                <div style="font-size:10px;font-weight:600;color:${verifiedColor};margin-top:2px;font-family:var(--font-mono, monospace)">${verifiedIcon}</div>
              </div>
              <span style="padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;text-transform:uppercase;color:#fff;background:${color};flex-shrink:0">
                ${c.severity}
              </span>
            </div>
            <p style="font-size:12px;color:var(--color-fg-muted);margin:0 0 10px 0;line-height:1.4">${c.description}</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
              <div style="background:var(--color-bg-elevated, rgba(255,255,255,0.04));border:1px solid var(--color-border);border-radius:6px;padding:5px 8px">
                <div style="font-size:9px;font-weight:600;color:var(--color-fg-subtle);text-transform:uppercase">REGION</div>
                <div style="font-size:11px;font-weight:700;color:var(--color-fg);font-family:var(--font-mono, monospace);margin-top:1px">${c.region}</div>
              </div>
              <div style="background:var(--color-bg-elevated, rgba(255,255,255,0.04));border:1px solid var(--color-border);border-radius:6px;padding:5px 8px">
                <div style="font-size:9px;font-weight:600;color:var(--color-fg-subtle);text-transform:uppercase">TYPE</div>
                <div style="font-size:11px;font-weight:700;color:var(--color-fg);font-family:var(--font-mono, monospace);margin-top:1px">${c.conflictType}</div>
              </div>
            </div>

            <!-- Spatial-Temporal AIS Traffic Correlation -->
            <div style="background:var(--color-bg-input, rgba(0,0,0,0.25));border:1px solid var(--color-border);padding:8px 10px;border-radius:8px;margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;font-weight:700;color:var(--color-primary-600);margin-bottom:6px">
                <span>NEARBY AIS MARITIME TRAFFIC (15 NM)</span>
                <span style="font-size:9px;background:var(--color-primary-600);color:#fff;padding:1px 6px;border-radius:4px">${nearbyVessels.length} VESSELS</span>
              </div>
              ${nearbyListHtml}
              <div style="font-size:9px;color:var(--color-fg-muted);margin-top:6px;line-height:1.3;font-style:italic">
                Observed AIS proximity indicates spatial co-location in international waterways, not involvement or causality.
              </div>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:var(--color-fg-subtle);border-top:1px solid var(--color-border);padding-top:8px">
              <span>Source: ${c.source} (${c.sourceType})</span>
              <span style="font-family:var(--font-mono, monospace)">${new Date(c.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>`,
          { maxWidth: 360, className: 'conflict-popup' }
        );

        marker.on('click', () => {
          handleTrackSelect(c.id);
        });
        clusterRef.current.addLayer(marker);
      });
    }
  }, [
    map,
    tracks,
    tracksProp,
    displayTracks,
    wsConflicts,
    selectedTrackId,
    showAircraft,
    showVessels,
    showConflicts,
    conflictData,
    timeline,
    severityFilter,
    regionFilter,
  ]);

  useEffect(() => {
    if (!map) return;
    const onMapClick = () => {
      lastFlownTrackIdRef.current = null;
      setSearchParams(new URLSearchParams());
    };
    map.on('click', onMapClick);
    return () => {
      map.off('click', onMapClick);
    };
  }, [map, setSearchParams]);

  useEffect(() => {
    if (recenterTrigger && map) {
      setSearchParams(new URLSearchParams());
      map.flyTo(CENTER, ZOOM, { duration: 1.5, animate: true });
    }
  }, [recenterTrigger, map, setSearchParams]);

  const GULF_SECTORS = [
    { label: 'Hormuz TSS', center: [26.45, 56.40] as [number, number], zoom: 8.5 },
    { label: 'Persian Gulf', center: [26.60, 52.80] as [number, number], zoom: 7.2 },
    { label: 'Gulf of Oman', center: [24.50, 58.20] as [number, number], zoom: 7.5 },
    { label: 'Fujairah (FOA)', center: [25.18, 56.55] as [number, number], zoom: 9.0 },
  ];

  return (
    <div
      className={className}
      style={{ position: 'absolute', inset: 0, background: 'var(--color-bg)' }}
    >
      {/* Quick Gulf Sector Navigation Bar */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 500,
          display: 'flex',
          gap: '4px',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '4px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px', fontSize: '10px', fontWeight: 'bold', color: 'var(--color-primary-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Gulf Sectors:
        </div>
        {GULF_SECTORS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => map?.flyTo(s.center, s.zoom, { duration: 1.2, animate: true })}
            title={`Pan directly to ${s.label}`}
            style={{
              padding: '4px 8px',
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-fg)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary-500)';
              e.currentTarget.style.color = 'var(--color-primary-400)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.color = 'var(--color-fg)';
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Map Zoom Controls */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 500,
          display: 'flex',
          gap: '2px',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '2px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        }}
      >
        <button
          type="button"
          onClick={() => map?.zoomIn()}
          title="Zoom In"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 10px',
            background: 'transparent',
            border: 'none',
            borderRadius: '5px',
            color: 'var(--color-fg)',
            cursor: 'pointer',
          }}
        >
          <ZoomIn size={14} />
        </button>
        <div style={{ width: '1px', background: 'var(--color-border)', margin: '4px 0' }} />
        <button
          type="button"
          onClick={() => map?.zoomOut()}
          title="Zoom Out"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 10px',
            background: 'transparent',
            border: 'none',
            borderRadius: '5px',
            color: 'var(--color-fg)',
            cursor: 'pointer',
          }}
        >
          <ZoomOut size={14} />
        </button>
      </div>

      <MapContainer
        center={CENTER}
        zoom={ZOOM}
        style={{ height: '100%', width: '100%' }}
        minZoom={minZoom}
        maxZoom={maxZoom}
        maxBounds={DEFAULT_GULF_BOUNDS}
        maxBoundsViscosity={boundsViscosity}
        zoomControl={false}
        ref={setMap as any}
      >
        <TileLayer
          key={`${isDarkMode ? 'dark-tiles' : 'light-tiles'}-${tileFailed ? 'fallback' : 'primary'}`}
          attribution={tileConfig.attribution}
          url={tileConfig.url}
          subdomains={tileConfig.subdomains}
          maxZoom={maxZoom}
          className={tileConfig.className}
          eventHandlers={{
            tileerror: handleTileError,
          }}
        />
      </MapContainer>
    </div>
  );
}
