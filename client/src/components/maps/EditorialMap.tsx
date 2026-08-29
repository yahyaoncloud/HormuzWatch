import maplibregl, { type LngLatBoundsLike, type Map, type MapMouseEvent } from 'maplibre-gl';
import { useCallback, useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LiveMetricsRibbon } from '@/components/data/MetricGrid';
import { useMapStore } from '@/stores';
import { cn } from '@/utils/cn';

// ============================================================
// Map Style - HormuzWatch Dark Intelligence Theme
// ============================================================

export const HORMUZ_DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'HormuzWatch Dark',
  metadata: {
    'maputnik:renderer': 'mbgljs',
  },
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
      attribution: '&copy; OpenStreetMap contributors',
      minzoom: 0,
      maxzoom: 19,
    },
    'cartodb-dark': {
      type: 'raster',
      tiles: ['https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png'],
      minzoom: 0,
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#0a0f1a',
      },
    },
    {
      id: 'cartodb-dark-layer',
      type: 'raster',
      source: 'cartodb-dark',
      paint: {
        'raster-opacity': 0.8,
        'raster-fade-duration': 150,
      },
    },
  ],
};

// ============================================================
// Regional Configurations
// ============================================================

export const REGIONS = {
  world: {
    center: [0, 20] as [number, number],
    zoom: 2,
    bounds: [-180, -85, 180, 85] as LngLatBoundsLike,
  },
  hormuz: {
    center: [56.2, 26.1] as [number, number],
    zoom: 9,
    bounds: [52, 24, 60, 29] as LngLatBoundsLike,
  },
  redSea: {
    center: [42, 20] as [number, number],
    zoom: 6,
    bounds: [32, 12, 48, 28] as LngLatBoundsLike,
  },
  suez: {
    center: [32.5, 30.5] as [number, number],
    zoom: 9,
    bounds: [31, 29.5, 34, 32] as LngLatBoundsLike,
  },
  persianGulf: {
    center: [51, 26] as [number, number],
    zoom: 6,
    bounds: [47, 23, 57, 30] as LngLatBoundsLike,
  },
  babElMandeb: {
    center: [43.5, 12.8] as [number, number],
    zoom: 8,
    bounds: [41, 11, 46, 15] as LngLatBoundsLike,
  },
  shipping: {
    center: [80, 15] as [number, number],
    zoom: 4,
    bounds: [20, -10, 150, 50] as LngLatBoundsLike,
  },
  aviation: {
    center: [50, 30] as [number, number],
    zoom: 4,
    bounds: [20, 10, 120, 60] as LngLatBoundsLike,
  },
} as const;

export type RegionKey = keyof typeof REGIONS;

// ============================================================
// Intelligence Layer Definitions
// ============================================================

export interface IntelligenceLayer {
  id: string;
  name: string;
  group: 'base' | 'intelligence' | 'infrastructure' | 'environmental' | 'overlays';
  type: 'fill' | 'line' | 'circle' | 'symbol' | 'heatmap' | 'raster';
  source: string;
  'source-layer'?: string;
  filter?: unknown[];
  paint: Record<string, unknown>;
  layout?: Record<string, unknown>;
  minzoom?: number;
  maxzoom?: number;
  visible: boolean;
  opacity: number;
}

export const INTELLIGENCE_LAYERS: IntelligenceLayer[] = [
  // Base layers
  {
    id: 'eez-boundaries',
    name: 'EEZ Boundaries',
    group: 'base',
    type: 'line',
    source: 'marine',
    paint: {
      'line-color': '#00d4aa',
      'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.5, 8, 1.5],
      'line-dasharray': [4, 4],
      'line-opacity': 0.6,
    },
    minzoom: 3,
    visible: true,
    opacity: 0.6,
  },
  {
    id: 'ports',
    name: 'Major Ports',
    group: 'base',
    type: 'circle',
    source: 'marine',
    filter: ['>=', ['get', 'size'], 3],
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'size'], 3, 4, 5, 8, 7, 12],
      'circle-color': '#3b82f6',
      'circle-stroke-width': 1,
      'circle-stroke-color': '#ffffff',
      'circle-opacity': 0.8,
    },
    minzoom: 4,
    visible: true,
    opacity: 0.8,
  },
  {
    id: 'port-labels',
    name: 'Port Labels',
    group: 'base',
    type: 'symbol',
    source: 'marine',
    filter: ['>=', ['get', 'size'], 4],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Inter Medium'],
      'text-size': 11,
      'text-anchor': 'top',
      'text-offset': [0, 1],
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': '#f1f5f9',
      'text-halo-color': '#0a0f1a',
      'text-halo-width': 1,
    },
    minzoom: 6,
    visible: true,
    opacity: 1,
  },

  // Intelligence layers
  {
    id: 'shipping-lanes',
    name: 'Shipping Lanes',
    group: 'intelligence',
    type: 'line',
    source: 'marine',
    paint: {
      'line-color': '#00d4aa',
      'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.5, 8, 2],
      'line-opacity': 0.4,
    },
    minzoom: 3,
    visible: true,
    opacity: 0.4,
  },
  {
    id: 'anomaly-heatmap',
    name: 'Anomaly Heatmap',
    group: 'intelligence',
    type: 'heatmap',
    source: 'anomalies',
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['get', 'score'], 0, 0, 100, 1],
      'heatmap-intensity': 0.8,
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,
        'rgba(0,17,34,0)',
        0.1,
        'rgb(0,68,68)',
        0.3,
        'rgb(0,136,102)',
        0.5,
        'rgb(0,212,170)',
        0.7,
        'rgb(245,230,0)',
        1,
        'rgb(239,68,68)',
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, 10, 10, 30],
      'heatmap-opacity': 0.7,
    },
    minzoom: 3,
    visible: true,
    opacity: 0.7,
  },
  {
    id: 'anomaly-points',
    name: 'Active Anomalies',
    group: 'intelligence',
    type: 'circle',
    source: 'anomalies',
    filter: ['>=', ['get', 'score'], 70],
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'score'], 70, 6, 100, 12],
      'circle-color': ['interpolate', ['linear'], ['get', 'score'], 70, '#f59e0b', 100, '#ef4444'],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-opacity': 0.9,
    },
    minzoom: 4,
    visible: true,
    opacity: 0.9,
  },

  // Environmental
  {
    id: 'viirs-fires',
    name: 'Satellite Fires (VIIRS)',
    group: 'environmental',
    type: 'circle',
    source: 'satellite',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'frp'], 0, 3, 100, 8],
      'circle-color': [
        'interpolate',
        ['linear'],
        ['get', 'confidence'],
        0,
        '#f59e0b',
        100,
        '#ef4444',
      ],
      'circle-stroke-width': 1,
      'circle-stroke-color': '#ffffff',
      'circle-opacity': 0.7,
    },
    minzoom: 4,
    visible: false,
    opacity: 0.7,
  },

  // Infrastructure
  {
    id: 'submarine-cables',
    name: 'Submarine Cables',
    group: 'infrastructure',
    type: 'line',
    source: 'infrastructure',
    paint: {
      'line-color': '#8b5cf6',
      'line-width': 1.5,
      'line-dasharray': [3, 3],
      'line-opacity': 0.5,
    },
    minzoom: 3,
    visible: false,
    opacity: 0.5,
  },
  {
    id: 'energy-infrastructure',
    name: 'Energy Infrastructure',
    group: 'infrastructure',
    type: 'circle',
    source: 'infrastructure',
    paint: {
      'circle-radius': 5,
      'circle-color': '#f59e0b',
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#ffffff',
    },
    minzoom: 5,
    visible: false,
    opacity: 1,
  },
];

// ============================================================
// EditorialMap Component - Main 2D Map
// ============================================================

interface EditorialMapProps {
  region?: RegionKey;
  center?: [number, number];
  zoom?: number;
  bounds?: LngLatBoundsLike;
  className?: string;
  style?: React.CSSProperties;
  layers?: IntelligenceLayer[];
  showLayerControls?: boolean;
  showMetricsRibbon?: boolean;
  onLoad?: (map: Map) => void;
  onEntityClick?: (feature: GeoJSON.Feature, event: MapMouseEvent) => void;
  entityLayerIds?: string[];
  height?: string;
}

export function EditorialMap({
  region = 'world',
  center,
  zoom,
  bounds,
  className,
  style,
  layers = INTELLIGENCE_LAYERS,
  showLayerControls = true,
  showMetricsRibbon = true,
  onLoad,
  onEntityClick,
  entityLayerIds = ['anomaly-points', 'ports', 'viirs-fires', 'energy-infrastructure'],
  height = '500px',
}: EditorialMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const initializedRef = useRef(false);
  const { setMapInstance, viewport, setViewport } = useMapStore();

  const [mapError, setMapError] = useState<Error | null>(null);
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>(
    layers.reduce((acc, l) => ({ ...acc, [l.id]: l.visible }), {})
  );
  const [layerOpacities, setLayerOpacities] = useState<Record<string, number>>(
    layers.reduce((acc, l) => ({ ...acc, [l.id]: l.opacity }), {})
  );
  const [containerReady, setContainerReady] = useState(false);

  const regionConfig = REGIONS[region];
  const mapCenter = center || regionConfig.center;
  const mapZoom = zoom || regionConfig.zoom;
  const mapBounds = bounds || regionConfig.bounds;

  // Initialize map
  useEffect(() => {
    if (initializedRef.current || !containerRef.current) return;

    // Ensure container has valid dimensions before initializing
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      // Container not ready yet - check again on next layout
      const resizeObserver = new ResizeObserver(() => {
        const newRect = container.getBoundingClientRect();
        if (newRect.width > 0 && newRect.height > 0) {
          setContainerReady(true);
          resizeObserver.disconnect();
        }
      });
      resizeObserver.observe(container);
      return () => resizeObserver.disconnect();
    }

    setContainerReady(true);

    if (!containerReady) return;

    let map: maplibregl.Map | null = null;
    try {
      const mapInstance = new maplibregl.Map({
        container: containerRef.current,
        style: HORMUZ_DARK_STYLE,
        center: mapCenter,
        zoom: mapZoom,
        maxBounds: mapBounds,
        minZoom: 2,
        maxZoom: 18,
        pitchWithRotate: true,
        dragRotate: true,
        touchPitch: true,
        touchZoomRotate: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        scrollZoom: true,
        dragPan: true,
        cooperativeGestures: false,
        maxTileCacheSize: 1000,
        fadeDuration: 150,
      });

      map = mapInstance;
      mapRef.current = mapInstance;
      setMapInstance(mapInstance);
      initializedRef.current = true;

      // Sync viewport
      const handleMove = () => {
        if (!mapRef.current) return;
        const centerObj = mapRef.current.getCenter();
        const zoomVal = mapRef.current.getZoom();
        const bearingVal = mapRef.current.getBearing();
        const pitchVal = mapRef.current.getPitch();
        setViewport({
          center: [centerObj.lng, centerObj.lat],
          zoom: zoomVal,
          bearing: bearingVal,
          pitch: pitchVal,
        });
      };

      mapInstance.on('load', () => {
        mapInstance.resize();
        // Add empty sources for intelligence layers
        const sources = ['marine', 'anomalies', 'satellite', 'infrastructure'];
        sources.forEach((sourceId) => {
          if (!mapInstance.getSource(sourceId)) {
            mapInstance.addSource(sourceId, {
              type: 'geojson',
              data: { type: 'FeatureCollection', features: [] },
            });
          }
        });

        // Add intelligence layers
        layers.forEach((layer) => {
          if (!mapInstance.getLayer(layer.id)) {
            try {
              mapInstance.addLayer(layer as maplibregl.LayerSpecification);
            } catch (e) {
              console.warn(`Failed to add layer ${layer.id}:`, e);
            }
          }

          // Set initial visibility
          mapInstance.setLayoutProperty(
            layer.id,
            'visibility',
            visibleLayers[layer.id] ? 'visible' : 'none'
          );

          // Set initial opacity
          const opacity = layerOpacities[layer.id] ?? layer.opacity;
          const type = layer.type;
          if (type === 'fill') mapInstance.setPaintProperty(layer.id, 'fill-opacity', opacity);
          else if (type === 'circle')
            mapInstance.setPaintProperty(layer.id, 'circle-opacity', opacity);
          else if (type === 'line') mapInstance.setPaintProperty(layer.id, 'line-opacity', opacity);
          else if (type === 'heatmap')
            mapInstance.setPaintProperty(layer.id, 'heatmap-opacity', opacity);
          else if (type === 'symbol')
            mapInstance.setPaintProperty(layer.id, 'text-opacity', opacity);
        });

        onLoad?.(mapInstance);
      });

      map.on('error', (e) => {
        const error = e.error instanceof Error ? e.error : new Error(String(e.error));
        setMapError(error);
      });

      map.on('move', handleMove);
      map.on('moveend', handleMove);

      // Entity click handling
      if (onEntityClick && entityLayerIds.length > 0) {
        const handleClick = (event: MapMouseEvent) => {
          if (!mapInstance) return;
          const features = mapInstance.queryRenderedFeatures(event.point, {
            layers: entityLayerIds,
          });
          if (features.length > 0) {
            onEntityClick(features[0], event);
          }
        };
        map.on('click', handleClick);
        return () => {
          if (mapInstance) {
            mapInstance.off('click', handleClick);
          }
        };
      }

      // Controls
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: true, showZoom: true }),
        'top-right'
      );
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
      map.addControl(new maplibregl.FullscreenControl(), 'top-right');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setMapError(err);
    }

    return () => {
      if (map) {
        try {
          map.remove();
        } catch {
          // Ignore cleanup errors
        }
        mapRef.current = null;
        setMapInstance(null);
        initializedRef.current = false;
      }
    };
  }, [containerReady]);

  // Sync viewport from store
  useEffect(() => {
    if (!mapRef.current || !initializedRef.current) return;
    const map = mapRef.current;
    const needsMove =
      Math.abs(map.getCenter().lng - viewport.center[0]) > 0.0001 ||
      Math.abs(map.getCenter().lat - viewport.center[1]) > 0.0001 ||
      Math.abs(map.getZoom() - viewport.zoom) > 0.01 ||
      Math.abs(map.getBearing() - viewport.bearing) > 0.01 ||
      Math.abs(map.getPitch() - viewport.pitch) > 0.01;

    if (needsMove) {
      map.jumpTo({
        center: viewport.center,
        zoom: viewport.zoom,
        bearing: viewport.bearing,
        pitch: viewport.pitch,
      });
    }
  }, [viewport.center, viewport.zoom, viewport.bearing, viewport.pitch]);

  // Layer visibility/opacity sync
  useEffect(() => {
    if (!mapRef.current || !initializedRef.current) return;
    const map = mapRef.current;

    layers.forEach((layer) => {
      if (!map.getLayer(layer.id)) return;

      // Visibility
      const visible = visibleLayers[layer.id] ?? layer.visible;
      map.setLayoutProperty(layer.id, 'visibility', visible ? 'visible' : 'none');

      // Opacity
      const opacity = layerOpacities[layer.id] ?? layer.opacity;
      const type = layer.type;
      if (type === 'fill') map.setPaintProperty(layer.id, 'fill-opacity', opacity);
      else if (type === 'circle') map.setPaintProperty(layer.id, 'circle-opacity', opacity);
      else if (type === 'line') map.setPaintProperty(layer.id, 'line-opacity', opacity);
      else if (type === 'heatmap') map.setPaintProperty(layer.id, 'heatmap-opacity', opacity);
      else if (type === 'symbol') map.setPaintProperty(layer.id, 'text-opacity', opacity);
    });
  }, [visibleLayers, layerOpacities, layers]);

  // Fit bounds on region change
  useEffect(() => {
    if (mapRef.current && mapBounds) {
      mapRef.current.fitBounds(mapBounds as LngLatBoundsLike, {
        padding: 50,
        maxZoom: mapZoom,
        duration: 0,
      });
    }
  }, [region, mapBounds, mapZoom]);

  const handleLayerToggle = useCallback((layerId: string, visible: boolean) => {
    setVisibleLayers((prev) => ({ ...prev, [layerId]: visible }));
  }, []);

  const handleOpacityChange = useCallback((layerId: string, opacity: number) => {
    setLayerOpacities((prev) => ({ ...prev, [layerId]: opacity }));
  }, []);

  // Group layers for controls
  const groupedLayers = layers.reduce(
    (acc, layer) => {
      if (!acc[layer.group]) acc[layer.group] = [];
      acc[layer.group].push(layer);
      return acc;
    },
    {} as Record<string, IntelligenceLayer[]>
  );

  return (
    <div
      className={cn('relative w-full', className)}
      style={{ height, ...style }}
      role="application"
      aria-label="Interactive intelligence map"
    >
      {/* Map Error State */}
      {mapError && (
        <div
          className={cn('relative w-full bg-background-card border border-border', className)}
          style={{ height, ...style }}
          role="alert"
        >
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="text-danger mb-4">
                <svg
                  className="w-12 h-12 mx-auto mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-body-lg font-medium">Failed to load map</p>
                <p className="text-fg-muted text-sm mt-1">{mapError.message}</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="absolute inset-0 rounded-md overflow-hidden"
        style={{ zIndex: 0 }}
      />

      {/* Layer Controls Overlay */}
      {showLayerControls && (
        <div className="absolute top-4 right-4 z-10 glass-card p-3 min-w-[220px] max-h-[60vh] overflow-y-auto border border-border/50 border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-heading-sm text-fg">Map Layers</h3>
            <span className="font-data text-data-xs text-fg-muted">
              {layers.filter((l) => visibleLayers[l.id]).length} / {layers.length} active
            </span>
          </div>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {Object.entries(groupedLayers).map(([groupName, groupLayers]) => (
              <div key={groupName} className="space-y-2">
                <div className="flex items-center justify-between text-caption font-medium text-fg-muted uppercase tracking-wider">
                  <span>{groupName}</span>
                  <span className="text-xs text-fg-subtle">{groupLayers.length} layers</span>
                </div>
                <div className="space-y-1.5 pl-2 border-l border-border/30">
                  {groupLayers.map((layer) => (
                    <div key={layer.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={visibleLayers[layer.id] ?? layer.visible}
                        onChange={(e) => handleLayerToggle(layer.id, e.target.checked)}
                        className="w-4 h-4 rounded border-border bg-background-elevated text-primary focus:ring-primary"
                        aria-label={layer.name}
                      />
                      <label className="flex-1 text-body-sm text-fg cursor-pointer truncate">
                        {layer.name}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={layerOpacities[layer.id] ?? layer.opacity}
                        onChange={(e) => handleOpacityChange(layer.id, parseFloat(e.target.value))}
                        className="w-20 h-1 accent-primary"
                        disabled={!(visibleLayers[layer.id] ?? layer.visible)}
                        aria-label={`${layer.name} opacity`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coordinates Display */}
      <div className="absolute bottom-4 left-4 z-10 glass-card px-3 py-2 text-xs font-data text-fg-muted border border-border/50">
        {viewport.center[1].toFixed(4)}°N, {viewport.center[0].toFixed(4)}°E • Zoom:{' '}
        {viewport.zoom.toFixed(1)}
      </div>

      {/* Live Metrics Ribbon */}
      {showMetricsRibbon && (
        <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pointer-events-none">
          <div className="max-w-7xl mx-auto pointer-events-auto">
            <LiveMetricsRibbon />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Hero Editorial Map - Full-screen landing map
// ============================================================

interface HeroEditorialMapProps {
  className?: string;
  style?: React.CSSProperties;
  initialView?: {
    center: [number, number];
    zoom: number;
  };
  layers?: IntelligenceLayer[];
  onEntitySelect?: (entity: { type: 'vessel' | 'aircraft' | 'anomaly'; data: unknown }) => void;
  showLayerControls?: boolean;
  showMetricsRibbon?: boolean;
  autoRotate?: boolean;
  height?: string;
}

export function HeroEditorialMap({
  className,
  style,
  initialView = { center: [54.5, 25.5], zoom: 3 },
  layers = INTELLIGENCE_LAYERS,
  showLayerControls = true,
  showMetricsRibbon = true,
  height = '100%',
}: HeroEditorialMapProps) {
  return (
    <div className={cn('relative w-full overflow-hidden', className)} style={{ height, ...style }}>
      <EditorialMap
        region="world"
        center={initialView.center}
        zoom={initialView.zoom}
        layers={layers}
        showLayerControls={showLayerControls}
        showMetricsRibbon={showMetricsRibbon}
        onLoad={() => {
          // Auto-rotate if enabled
        }}
        onEntityClick={(feature) => {
          // Handle entity selection for hero map
          console.log('Entity selected:', feature);
        }}
      />

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 p-6 md:p-8 pointer-events-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pointer-events-auto">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-border/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="font-data text-data-sm text-primary font-medium">
                LIVE INTELLIGENCE
              </span>
            </div>
            <h1 className="font-display text-display-xl md:text-display-2xl lg:text-display-3xl text-fg tracking-tight">
              HormuzWatch Intelligence Portal
            </h1>
            <p className="font-ui text-body-lg md:text-xl text-fg-muted max-w-2xl">
              Real-time strategic situational awareness across maritime, aviation, and geospatial
              domains. Documentation that lives with the data.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 glass-card px-4 py-3 shrink-0 border border-border/50">
            <div className="flex items-center gap-2 text-data text-data-sm">
              <span className="flex items-center gap-1 text-success">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse-slow"></span>
                LIVE
              </span>
            </div>
            <div className="w-px h-6 bg-border hidden sm:block"></div>
            <div className="flex items-center gap-4 text-body-sm text-fg-muted font-data">
              <span>{initialView.center[1].toFixed(2)}°N</span>
              <span>{initialView.center[0].toFixed(2)}°E</span>
              <span>Zoom: {initialView.zoom.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Layer Toggle Button */}
      {showLayerControls && (
        <button
          className="absolute top-4 right-4 z-20 glass-card p-2 rounded-lg hover:bg-background-elevated transition-colors border border-border/50"
          aria-label="Toggle layers"
        >
          <svg className="w-5 h-5 text-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

// ============================================================
// Regional Editorial Map - Pre-configured for specific regions
// ============================================================

interface RegionalEditorialMapProps {
  region: RegionKey;
  className?: string;
  layers?: IntelligenceLayer[];
  showLayerControls?: boolean;
  showMetricsRibbon?: boolean;
  height?: string;
  onEntityClick?: (feature: GeoJSON.Feature, event: MapMouseEvent) => void;
}

export function RegionalEditorialMap({
  region,
  className,
  layers = INTELLIGENCE_LAYERS,
  showLayerControls = true,
  showMetricsRibbon = true,
  height = '500px',
  onEntityClick,
}: RegionalEditorialMapProps) {
  const entityLayerIds = ['anomaly-points', 'ports', 'viirs-fires', 'energy-infrastructure'];

  return (
    <div className={cn('relative', className)}>
      <EditorialMap
        region={region}
        layers={layers}
        showLayerControls={showLayerControls}
        showMetricsRibbon={showMetricsRibbon}
        height={height}
        onEntityClick={onEntityClick}
        entityLayerIds={entityLayerIds}
      />
      {/* Region badge */}
      <div className="absolute top-4 left-4 z-10 glass-card px-3 py-1.5 rounded-lg border border-border/50">
        <span className="font-ui text-caption font-medium text-fg-muted uppercase tracking-wider">
          {region.charAt(0).toUpperCase() + region.slice(1).replace(/([A-Z])/g, ' $1')}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Minimal Embed Map - For inline documentation
// ============================================================

interface EmbedMapProps {
  center: [number, number];
  zoom?: number;
  height?: string;
  className?: string;
  marker?: [number, number];
  markerLabel?: string;
}

export function EmbedMap({
  center,
  zoom = 10,
  height = '300px',
  className,
  marker,
  markerLabel,
}: EmbedMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || !containerRef.current) return;

    // Ensure container has valid dimensions
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: HORMUZ_DARK_STYLE,
      center,
      zoom,
      minZoom: 2,
      maxZoom: 18,
      dragPan: true,
      scrollZoom: false,
      boxZoom: false,
      doubleClickZoom: false,
      dragRotate: false,
      touchPitch: false,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false, showZoom: true }),
      'top-right'
    );

    if (marker) {
      const el = document.createElement('div');
      el.className = 'marker-pin';
      el.innerHTML = `
        <div class="relative">
          <div class="w-3 h-3 bg-danger rounded-full border-2 border-white border-2 border-[var(--color-border)] animate-pulse"></div>
          ${markerLabel ? `<div class="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap text-xs font-ui bg-background-elevated/95 backdrop-blur px-1.5 py-0.5 rounded text-fg border border-border/50">${markerLabel}</div>` : ''}
        </div>
      `;
      new maplibregl.Marker(el).setLngLat(marker).addTo(map);
    }

    initializedRef.current = true;

    return () => {
      map.remove();
      initializedRef.current = false;
    };
  }, [center, zoom, marker, markerLabel]);

  return (
    <div
      ref={containerRef}
      className={cn('rounded-md overflow-hidden border border-border/50', className)}
      style={{ height }}
      role="img"
      aria-label={`Map centered at ${center[1].toFixed(2)}°N, ${center[0].toFixed(2)}°E`}
    />
  );
}

// ============================================================
// Export utilities
// ============================================================

export type { Map } from 'maplibre-gl';
export type { EditorialMapProps, EmbedMapProps, HeroEditorialMapProps, RegionalEditorialMapProps };
export { maplibregl };
