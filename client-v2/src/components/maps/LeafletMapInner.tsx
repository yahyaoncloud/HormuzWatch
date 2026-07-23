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
import * as apiMethods from '@/lib/api';
import { getConflictFeed } from '@/lib/api';
import { useWebSocket } from '@/providers';
import { useSettingsStore } from '@/stores';
import type { ConflictEvent } from '@/types/websocket';

const CENTER: [number, number] = [26.06, 56.28];
const ZOOM = 6;
const DEFAULT_MIN_ZOOM = 3;
const DEFAULT_MAX_ZOOM = 16;

export const DEFAULT_GULF_BOUNDS: L.LatLngBoundsExpression = [
  [11.0, 34.0],
  [36.0, 65.0],
];

export const LOCKED_BOUNDS: L.LatLngBoundsExpression = [
  [21.0, 47.0],
  [31.0, 63.0],
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

function classifyObject(id: string | undefined): 'asset' | 'aircraft' {
  if (!id) return 'asset';
  if (id.startsWith('FLIGHT-') || id.startsWith('ADS-') || id.startsWith('ICAO-')) {
    return 'aircraft';
  }
  return 'asset';
}

function getRegionNameByCoords(_lat: number, lon: number): string {
  if (lon < 56.0) return 'Persian Gulf';
  if (lon >= 56.0 && lon <= 59.0) return 'Strait of Hormuz';
  return 'Gulf of Oman';
}

import { createTacticalLeafletIcon } from '@/icons';

function makeIcon(id: string, severity: string, heading: number, selected: boolean) {
  const type = classifyObject(id);
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

const WATCH_ZONES = [
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
    color: '#ef4444',
    label: 'HORMUZ',
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
    color: '#b87333',
    label: 'N.GULF',
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
    color: '#38bdf8',
    label: 'G.OMAN',
  },
  {
    id: 'AREA-RS-SOUTH',
    name: 'Red Sea — Bab-el-Mandeb',
    coords: [
      [16.4, 42.0],
      [16.6, 42.7],
      [16.3, 43.5],
      [15.8, 44.2],
      [15.0, 44.8],
      [13.8, 44.2],
      [12.8, 43.5],
      [12.3, 43.2],
      [12.5, 42.7],
      [13.2, 42.3],
      [14.0, 42.0],
      [15.0, 41.8],
      [16.0, 41.9],
    ] as [number, number][],
    color: '#dc2626',
    label: 'BAB-EL-MANDEB',
  },
  {
    id: 'AREA-RS-NORTH',
    name: 'Red Sea (North)',
    coords: [
      [28.8, 34.6],
      [28.4, 34.7],
      [27.8, 34.9],
      [27.0, 35.4],
      [25.8, 36.2],
      [24.5, 37.2],
      [23.2, 38.0],
      [22.0, 38.6],
      [20.8, 39.2],
      [19.5, 39.8],
      [18.2, 40.2],
      [17.0, 40.6],
      [16.8, 41.2],
      [17.4, 41.6],
      [18.4, 41.4],
      [20.0, 40.8],
      [21.5, 40.0],
      [23.0, 39.2],
      [24.5, 38.3],
      [26.0, 37.3],
      [27.2, 36.2],
      [28.2, 35.2],
      [28.8, 34.7],
    ] as [number, number][],
    color: '#7c3aed',
    label: 'N.RED SEA',
  },
];

export interface LeafletMapProps {
  className?: string;
  heatmap?: boolean;
  onHeatmapChange?: (v: boolean) => void;
  showConflicts?: boolean;
  onShowConflictsChange?: (v: boolean) => void;
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
  showConflicts: showConflictsProp,
  onShowConflictsChange: _onShowConflictsChange,
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
  const clusterRef = useRef<any>(null);
  const heatRef = useRef<any>(null);
  const zoneLayersRef = useRef<Map<string, L.Polygon>>(new Map());
  const highlightedZoneRef = useRef<string | null>(null);
  const lastFlownTrackIdRef = useRef<string | null>(null);

  const highlightZone = useCallback((zoneId: string | null) => {
    if (highlightedZoneRef.current && zoneLayersRef.current.has(highlightedZoneRef.current)) {
      zoneLayersRef.current.get(highlightedZoneRef.current)!.setStyle({
        opacity: 0,
        fillOpacity: 0,
        weight: 1.5,
      });
      if (typeof document !== 'undefined') {
        const prevLabel = document.querySelector(
          `.zone-label-${highlightedZoneRef.current}`
        ) as HTMLElement;
        if (prevLabel) prevLabel.style.opacity = '0';
      }
    }
    highlightedZoneRef.current = zoneId;
    if (zoneId && zoneLayersRef.current.has(zoneId)) {
      zoneLayersRef.current.get(zoneId)!.setStyle({
        opacity: 0.8,
        fillOpacity: 0.18,
        weight: 3,
      });
      if (typeof document !== 'undefined') {
        const label = document.querySelector(`.zone-label-${zoneId}`) as HTMLElement;
        if (label) label.style.opacity = '0.8';
      }
    }
  }, []);

  useEffect(() => {
    onHighlightReady?.(highlightZone);
  }, [highlightZone, onHighlightReady]);

  const [internalHeatmap] = useState(false);
  const storeTheme = useSettingsStore((s) => s.theme);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return true;
    const darkClass = document.documentElement.classList.contains('dark');
    return darkClass || storeTheme === 'dark' || (storeTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

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
  const { subscribe } = useWebSocket();

  const { data: conflictData } = useQuery({
    queryKey: ['conflict-feed'],
    queryFn: getConflictFeed,
    refetchInterval: 300000,
    staleTime: 120000,
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
    refetchInterval: 15000,
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

  useEffect(() => {
    if (!map) return;

    if (zoneLayersRef.current.size === 0) {
      WATCH_ZONES.forEach((zone) => {
        const polygon = L.polygon(zone.coords, {
          color: zone.color,
          weight: 1.5,
          opacity: 0,
          fillColor: zone.color,
          fillOpacity: 0,
          dashArray: '6 4',
        }).addTo(map);

        polygon.on('mouseover', () => {
          polygon.setStyle({ opacity: 0.6, fillOpacity: 0.12, weight: 3 });
        });
        polygon.on('mouseout', () => {
          if (highlightedZoneRef.current !== zone.id) {
            polygon.setStyle({ opacity: 0, fillOpacity: 0, weight: 1.5 });
          }
        });

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
              opacity: 0;
              transition: opacity 0.2s;
            " class="zone-label zone-label-${zone.id}">${zone.label}</div>`,
            className: '',
            iconSize: [60, 14],
            iconAnchor: [30, 7],
          }),
          interactive: false,
        }).addTo(map);

        zoneLayersRef.current.set(zone.id, polygon);
      });
    }

    if (!clusterRef.current) {
      clusterRef.current = (L as any).markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 80,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          return L.divIcon({
            html: `<div style="
              background: rgba(138,103,57,0.88);
              border: 1.5px solid rgba(138,103,57,0.7);
              border-radius: 50%;
              width: 34px; height: 34px;
              display: flex; align-items: center; justify-content: center;
              font-size: 11px; font-weight: 700; color: #fff;
              font-family: 'JetBrains Mono', monospace;
              backdrop-filter: blur(6px);
              border: 2px solid rgba(255,255,255,0.2);
            ">${count}</div>`,
            className: '',
            iconSize: [34, 34],
            iconAnchor: [17, 17],
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
          newPoints = res.data.map((cell: any) => [
            cell[0],
            cell[1],
            Math.min(1, (cell[2] || 1) / 30),
          ]);
        } else if (tracks && tracks.length > 0) {
          newPoints = tracks.map((t) => [
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
      const selected = String(track.id) === String(selectedTrackId);
      const marker = L.marker([lat, lon], {
        icon: makeIcon(track.id, track.severity, track.heading || 0, selected),
      });

      const isAircraft = classifyObject(track.id) === 'aircraft';
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

    if (showConflicts && conflictData?.conflicts) {
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

      const filteredConflicts = conflictData.conflicts.filter((c: ConflictEvent) => {
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
          key={isDarkMode ? 'dark-tiles' : 'light-tiles'}
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          url={
            isDarkMode
              ? 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png'
              : 'https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png'
          }
          subdomains="abcd"
          maxZoom={maxZoom}
        />
      </MapContainer>
    </div>
  );
}
