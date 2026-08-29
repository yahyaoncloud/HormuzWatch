import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useCallback, useEffect, useRef, useState } from 'react';
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

const CENTER: [number, number] = [26.06, 56.28];
const ZOOM = 6;
const DEFAULT_MIN_ZOOM = 3;
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
  [5.0, 32.0],   // SW: Sri Lanka, Red Sea
  [36.0, 95.0],  // NE: Bay of Bengal, Myanmar
];

export const LOCKED_BOUNDS: L.LatLngBoundsExpression = [
  [5.0, 32.0],
  [36.0, 95.0],
];

const LOCKED_MIN_ZOOM = 6;
const LOCKED_MAX_ZOOM = 13;

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
    return 'vessel';
  }
  if (track.objectType === 'aircraft') return 'aircraft';
  if (track.objectType === 'vessel') return 'vessel';
  const idStr = String(track.trackId || track.id || '').toUpperCase();
  if (idStr.startsWith('FLIGHT') || idStr.startsWith('ADS-') || idStr.startsWith('ICAO-')) {
    return 'aircraft';
  }
  if (track.altitude !== undefined && track.altitude !== null && Number(track.altitude) > 0) {
    return 'aircraft';
  }
  return 'vessel';
}

function getRegionNameByCoords(lat: number, lon: number): string {
  // Red Sea & Suez Corridor
  if (lat >= 12 && lat <= 32 && lon >= 32 && lon <= 48) return 'Red Sea';
  // Persian Gulf
  if (lat >= 24 && lat <= 32 && lon >= 48 && lon <= 57) return 'Persian Gulf';
  // Strait of Hormuz
  if (lat >= 24 && lat <= 28 && lon >= 55 && lon <= 59) return 'Strait of Hormuz';
  // Gulf of Oman
  if (lat >= 22 && lat <= 27 && lon >= 57 && lon <= 63) return 'Gulf of Oman';
  // Pakistan Coast
  if (lat >= 22 && lat <= 27 && lon >= 60 && lon <= 72) return 'Pakistan Coast';
  // India West Coast
  if (lat >= 8 && lat <= 23 && lon >= 68 && lon <= 78) return 'India West';
  // Sri Lanka
  if (lat >= 5 && lat <= 10 && lon >= 78 && lon <= 82) return 'Sri Lanka';
  // Bay of Bengal / India East
  if (lat >= 5 && lat <= 23 && lon >= 78 && lon <= 95) return 'Bay of Bengal';
  // Arabian Sea
  if (lat >= 5 && lat <= 25 && lon >= 56 && lon <= 78) return 'Arabian Sea';
  // Gulf of Aden
  if (lat >= 10 && lat <= 17 && lon >= 42 && lon <= 54) return 'Gulf of Aden';

  return 'Regional Waters';
}

import { createTacticalLeafletIcon } from '@/icons';

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
    name: 'Strait of Hormuz',
    coords: [
      [27.05, 56.1],
      [27.05, 56.4],
      [27.0, 56.8],
      [26.85, 57.05],
      [26.65, 57.1],
      [26.3, 57.0],
      [26.0, 56.75],
      [25.85, 56.45],
      [25.95, 56.15],
      [26.15, 55.85],
      [26.4, 55.6],
      [26.75, 55.5],
    ] as [number, number][],
    color: '#FF0055',
    label: 'HORMUZ CHOKEPOINT',
  },
  {
    id: 'AREA-PGULF',
    name: 'Persian Gulf (North)',
    coords: [
      [30.0, 48.7],
      [29.95, 49.3],
      [29.6, 49.9],
      [29.1, 50.5],
      [28.5, 51.0],
      [27.8, 51.8],
      [27.2, 52.4],
      [26.7, 53.5],
      [26.4, 54.2],
      [26.35, 54.8],
      [26.2, 55.3],
      [25.8, 55.2],
      [25.3, 54.6],
      [24.8, 53.5],
      [24.4, 52.3],
      [24.8, 51.4],
      [25.5, 50.8],
      [26.3, 50.4],
      [27.2, 49.9],
      [28.1, 49.3],
      [29.2, 48.6],
      [29.7, 48.3],
    ] as [number, number][],
    color: '#FF9900',
    label: 'PERSIAN GULF',
  },
  {
    id: 'AREA-GOMAN',
    name: 'Gulf of Oman',
    coords: [
      [25.8, 56.85],
      [26.2, 57.0],
      [26.6, 57.1],
      [26.5, 57.5],
      [25.8, 58.2],
      [25.4, 59.2],
      [25.1, 60.5],
      [24.8, 61.7],
      [22.8, 60.5],
      [22.5, 59.2],
      [22.8, 58.3],
      [23.6, 57.5],
      [24.1, 56.9],
      [24.5, 56.55],
      [25.0, 56.3],
      [25.5, 56.4],
    ] as [number, number][],
    color: '#00E5FF',
    label: 'GULF OF OMAN',
  },
  {
    id: 'AREA-FUJAIRAH',
    name: 'Fujairah Anchorage Hub',
    coords: [
      [25.45, 56.35],
      [25.45, 56.75],
      [24.95, 56.75],
      [24.95, 56.35],
    ] as [number, number][],
    color: '#00E676',
    label: 'FUJAIRAH ANCHORAGE',
  },
  {
    id: 'AREA-JEBELALI',
    name: 'Jebel Ali Corridor',
    coords: [
      [25.25, 54.85],
      [25.25, 55.25],
      [24.85, 55.25],
      [24.85, 54.85],
    ] as [number, number][],
    color: '#10B981',
    label: 'JEBEL ALI CORRIDOR',
  },
  {
    id: 'AREA-RASTANURA',
    name: 'Ras Tanura Terminal',
    coords: [
      [27.15, 49.95],
      [27.15, 50.45],
      [26.60, 50.45],
      [26.60, 49.95],
    ] as [number, number][],
    color: '#F59E0B',
    label: 'RAS TANURA HUB',
  },
  {
    id: 'AREA-QATAR-LNG',
    name: 'Ras Laffan / North Field',
    coords: [
      [26.45, 51.35],
      [26.45, 52.35],
      [25.80, 52.35],
      [25.80, 51.35],
    ] as [number, number][],
    color: '#3B82F6',
    label: 'RAS LAFFAN LNG',
  },
  {
    id: 'AREA-KHARG',
    name: 'Kharg Island Terminal',
    coords: [
      [29.40, 50.15],
      [29.40, 50.55],
      [29.10, 50.55],
      [29.10, 50.15],
    ] as [number, number][],
    color: '#EC4899',
    label: 'KHARG TERMINAL',
  },
  {
    id: 'AREA-BANDARABBAS',
    name: 'Bandar Abbas / Qeshm',
    coords: [
      [27.25, 55.80],
      [27.25, 56.55],
      [26.70, 56.55],
      [26.70, 55.80],
    ] as [number, number][],
    color: '#E11D48',
    label: 'BANDAR ABBAS',
  },
  {
    id: 'AREA-RS-SOUTH',
    name: 'Bab-el-Mandeb',
    coords: [
      [13.5, 42.8],
      [13.5, 43.6],
      [12.3, 43.6],
      [12.3, 42.8],
    ] as [number, number][],
    color: '#DC2626',
    label: 'BAB-EL-MANDEB',
  },
  {
    id: 'AREA-RS-NORTH',
    name: 'Red Sea & Suez Approach',
    coords: [
      [28.8, 32.8],
      [28.8, 35.2],
      [26.5, 36.5],
      [26.5, 34.0],
    ] as [number, number][],
    color: '#8B5CF6',
    label: 'SUEZ APPROACH',
  },
  {
    id: 'AREA-ADEN-IRTC',
    name: 'Gulf of Aden IRTC Corridor',
    coords: [
      [13.2, 45.0],
      [13.2, 51.5],
      [11.8, 51.5],
      [11.8, 45.0],
    ] as [number, number][],
    color: '#06B6D4',
    label: 'GULF OF ADEN IRTC',
  },
];

export interface LeafletMapProps {
  className?: string;
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
  const boundsViscosity = 0;
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
  const [tracks, setTracks] = useState<any[]>([]);
  const tracksRef = useRef<any[]>([]);
  tracksRef.current = tracks; // always latest for heatmap fallback
  const { subscribe } = useWebSocket();
  const wsConflicts = useRealtimeStore((s) => s.conflicts);

  // REST fallback for initial load before WebSocket delivers conflicts
  const { data: conflictData } = useQuery({
    queryKey: ['conflict-feed'],
    queryFn: getConflictFeed,
    enabled: wsConflicts.length === 0, // only fetch if WS hasn't delivered yet
    refetchInterval: false,
    staleTime: Infinity,
  });

  const { data: initialTracesData } = useQuery({
    queryKey: ['active-traces-map'],
    queryFn: async () => {
      try {
        const res = await apiMethods.getTopTraces();
        if (res?.traces && res.traces.length > 0) return res.traces;
      } catch {
        // ignore fallback
      }
      return [];
    },
    // Real-time updates come via WebSocket — no need for polling
    refetchInterval: false,
    staleTime: 60000,
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
  }, [map]);

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

  useEffect(() => {
    if (!map || !clusterRef.current) return;
    clusterRef.current.clearLayers();

    const filteredTracks = tracks.filter((track) => {
      const lat = parseCoord(track.lat) ?? parseCoord(track.latitude);
      const lon = parseCoord(track.lon) ?? parseCoord(track.longitude);
      if (lat === null || lon === null) return false;

      if (severityFilter && severityFilter !== 'all' && track.severity !== severityFilter) {
        return false;
      }
      if (regionFilter && regionFilter !== 'all') {
        const regionName = getRegionNameByCoords(lat, lon);
        if (regionFilter === 'hormuz' && regionName !== 'Strait of Hormuz') return false;
        if (regionFilter === 'pgulf' && regionName !== 'Persian Gulf') return false;
        if (regionFilter === 'goman' && regionName !== 'Gulf of Oman') return false;
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

    filteredTracks.forEach((track) => {
      const lat = parseCoord(track.lat) ?? parseCoord(track.latitude);
      const lon = parseCoord(track.lon) ?? parseCoord(track.longitude);
      if (lat === null || lon === null) return;

      // Layer visibility filter
      const isAircraft = classifyTrackObject(track) === 'aircraft';
      if (isAircraft && !showAircraft) return;
      if (!isAircraft && !showVessels) return;

      const selected = String(track.id) === String(selectedTrackId);
      const marker = L.marker([lat, lon], {
        icon: makeIcon(track, track.severity, track.heading || 0, selected),
      });

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

      marker.bindPopup(
        `<div style="font-family:var(--font-ui, 'Inter', system-ui, sans-serif);color:var(--color-fg);padding:14px;border-radius:14px">
          <!-- Header -->
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:12px">
            <div style="display:flex;align-items:center;gap:10px;min-width:0">
              <div style="width:34px;height:34px;border-radius:8px;background:${color}18;border:1px solid ${color}40;display:flex;align-items:center;justify-content:center;font-size:16px;color:${color};flex-shrink:0">
                ${isAircraft ? '✈' : '🚢'}
              </div>
              <div style="min-width:0">
                <h4 style="margin:0;font-size:13px;font-weight:700;color:var(--color-fg);line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${track.assetName || track.name || track.id}</h4>
                <div style="display:flex;align-items:center;gap:5px;margin-top:3px">
                  <span style="width:6px;height:6px;border-radius:50%;background:#22c55e" class="tact-anim-pulse"></span>
                  <span style="font-size:10px;font-weight:600;color:var(--color-fg-muted);text-transform:uppercase;letter-spacing:0.04em;font-family:var(--font-mono, monospace)">${isAircraft ? 'ADS-B AIR' : 'AIS MARITIME'}</span>
                </div>
              </div>
            </div>
            <span style="padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#fff;background:${color};border:1px solid ${color}80;box-shadow:0 0 8px ${color}40;flex-shrink:0">
              ${track.severity || 'NOMINAL'}
            </span>
          </div>

          <!-- Telemetry Grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px">
            <div style="background:var(--color-bg-elevated, rgba(255,255,255,0.04));border:1px solid var(--color-border);border-radius:6px;padding:5px 8px">
              <div style="font-size:9px;font-weight:600;color:var(--color-fg-subtle);text-transform:uppercase;letter-spacing:0.05em">TRACK ID</div>
              <div style="font-size:11px;font-weight:700;color:var(--color-fg);font-family:var(--font-mono, monospace);margin-top:1px">${track.id}</div>
            </div>
            <div style="background:var(--color-bg-elevated, rgba(255,255,255,0.04));border:1px solid var(--color-border);border-radius:6px;padding:5px 8px">
              <div style="font-size:9px;font-weight:600;color:var(--color-fg-subtle);text-transform:uppercase;letter-spacing:0.05em">SPEED</div>
              <div style="font-size:11px;font-weight:700;color:var(--color-fg);font-family:var(--font-mono, monospace);margin-top:1px">${(track.speed || 0).toFixed(1)} kn</div>
            </div>
            <div style="background:var(--color-bg-elevated, rgba(255,255,255,0.04));border:1px solid var(--color-border);border-radius:6px;padding:5px 8px">
              <div style="font-size:9px;font-weight:600;color:var(--color-fg-subtle);text-transform:uppercase;letter-spacing:0.05em">HEADING</div>
              <div style="font-size:11px;font-weight:700;color:var(--color-fg);font-family:var(--font-mono, monospace);margin-top:1px">${(track.heading || 0).toFixed(0)}°</div>
            </div>
            <div style="background:var(--color-bg-elevated, rgba(255,255,255,0.04));border:1px solid var(--color-border);border-radius:6px;padding:5px 8px">
              <div style="font-size:9px;font-weight:600;color:var(--color-fg-subtle);text-transform:uppercase;letter-spacing:0.05em">REGION</div>
              <div style="font-size:11px;font-weight:700;color:var(--color-fg);font-family:var(--font-mono, monospace);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${getRegionNameByCoords(track.lat, track.lon)}</div>
            </div>
            ${altPill}
            ${squawkPill}
            ${onGroundPill}
            ${aisAgePill}
            <div style="background:var(--color-bg-elevated, rgba(255,255,255,0.04));border:1px solid var(--color-border);border-radius:6px;padding:5px 8px">
              <div style="font-size:9px;font-weight:600;color:var(--color-fg-subtle);text-transform:uppercase;letter-spacing:0.05em">LATITUDE</div>
              <div style="font-size:11px;font-weight:700;color:var(--color-fg);font-family:var(--font-mono, monospace);margin-top:1px">${track.lat.toFixed(4)}°N</div>
            </div>
            <div style="background:var(--color-bg-elevated, rgba(255,255,255,0.04));border:1px solid var(--color-border);border-radius:6px;padding:5px 8px">
              <div style="font-size:9px;font-weight:600;color:var(--color-fg-subtle);text-transform:uppercase;letter-spacing:0.05em">LONGITUDE</div>
              <div style="font-size:11px;font-weight:700;color:var(--color-fg);font-family:var(--font-mono, monospace);margin-top:1px">${track.lon.toFixed(4)}°E</div>
            </div>
          </div>

          <!-- Footer -->
          <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--color-border);padding-top:8px;font-size:10px;color:var(--color-fg-subtle)">
            <span style="display:flex;align-items:center;gap:4px">
              <span style="width:5px;height:5px;border-radius:50%;background:#22c55e"></span>
              REALTIME FEED
            </span>
            <span style="font-family:var(--font-mono, monospace);color:var(--color-fg-muted)">${new Date(track.timestamp || Date.now()).toLocaleTimeString()}</span>
          </div>
        </div>`,
        { maxWidth: 340, className: 'track-popup' }
      );

      marker.on('click', () => {
        handleTrackSelect(track.id);
        marker.openPopup();
      });

      clusterRef.current.addLayer(marker);

      if (selected && lastFlownTrackIdRef.current !== selectedTrackId) {
        lastFlownTrackIdRef.current = selectedTrackId;
        map.flyTo([lat, lon], 11, { duration: 1.5, animate: true });
        marker.openPopup();
      }
    });

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
        <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <div style="position: absolute; inset: 0; border-radius: 9999px; background-color: ${color}; opacity: 0.35; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; inset: 4px; border-radius: 9999px; border: 1.5px dashed ${color}; opacity: 0.6; animation: spin 8s linear infinite;"></div>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style="position: relative; z-index: 10; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
            <path d="M12 2L1 21H23L12 2Z" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2.2" stroke-linejoin="round"/>
            <line x1="12" y1="9" x2="12" y2="14" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="12" cy="17.5" r="1.3" fill="${color}"/>
          </svg>
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
              <div style="background:var(--color-bg-elevated, rgba(255,255,255,0.04));border:1px solid var(--color-border);border-radius:6px;padding:5px 8px">
                <div style="font-size:9px;font-weight:600;color:var(--color-fg-subtle);text-transform:uppercase">ASSETS</div>
                <div style="font-size:11px;font-weight:700;color:var(--color-fg);font-family:var(--font-mono, monospace);margin-top:1px">${c.affectedAssets || 'N/A'}</div>
              </div>
              <div style="background:var(--color-bg-elevated, rgba(255,255,255,0.04));border:1px solid var(--color-border);border-radius:6px;padding:5px 8px">
                <div style="font-size:9px;font-weight:600;color:var(--color-fg-subtle);text-transform:uppercase">CASUALTIES</div>
                <div style="font-size:11px;font-weight:700;color:var(--color-fg);font-family:var(--font-mono, monospace);margin-top:1px">${c.casualties || 'None'}</div>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:var(--color-fg-subtle);border-top:1px solid var(--color-border);padding-top:8px">
              <span>Source: ${c.source} (${c.sourceType})</span>
              <span style="font-family:var(--font-mono, monospace)">${new Date(c.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>`,
          { maxWidth: 340, className: 'conflict-popup' }
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

  return (
    <div
      className={className}
      style={{ position: 'absolute', inset: 0, background: 'var(--color-bg)' }}
    >
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
