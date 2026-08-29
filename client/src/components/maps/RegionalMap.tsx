import type maplibregl from 'maplibre-gl';
import { useEffect, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { MapContainer, useMapLibre } from './MapContainer';

// ============================================================
// Regional Map Layer Definitions
// ============================================================

export const REGION_CONFIG = {
  world: { center: [0, 20], zoom: 2, bounds: [-180, -85, 180, 85] },
  hormuz: { center: [56.2, 26.1], zoom: 9, bounds: [52, 24, 60, 29] },
  redSea: { center: [42, 20], zoom: 6, bounds: [32, 12, 48, 28] },
  suez: { center: [32.5, 30.5], zoom: 9, bounds: [31, 29.5, 34, 32] },
  persianGulf: { center: [51, 26], zoom: 6, bounds: [47, 23, 57, 30] },
  babElMandeb: { center: [43.5, 12.8], zoom: 8, bounds: [41, 11, 46, 15] },
  shipping: { center: [80, 15], zoom: 4, bounds: [20, -10, 150, 50] },
  aviation: { center: [50, 30], zoom: 4, bounds: [20, 10, 120, 60] },
} as const;

export type RegionKey = keyof typeof REGION_CONFIG;

export interface RegionLayerConfig {
  id: string;
  source: string;
  'source-layer'?: string;
  type: 'fill' | 'line' | 'circle' | 'symbol' | 'heatmap';
  filter?: unknown[];
  paint: Record<string, unknown>;
  layout?: Record<string, unknown>;
  minzoom?: number;
  maxzoom?: number;
}

// Layer definitions for intelligence maps
export const INTELLIGENCE_LAYERS: RegionLayerConfig[] = [
  // Exclusive Economic Zones
  {
    id: 'eez-boundaries',
    source: 'marine',
    type: 'line',
    paint: {
      'line-color': '#00d4aa',
      'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.5, 8, 1.5],
      'line-dasharray': [4, 4],
      'line-opacity': 0.6,
    },
    minzoom: 3,
  },
  // Ports
  {
    id: 'ports',
    source: 'marine',
    type: 'circle',
    filter: ['>=', ['get', 'size'], 3],
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'size'], 3, 4, 5, 8, 7, 12],
      'circle-color': '#3b82f6',
      'circle-stroke-width': 1,
      'circle-stroke-color': '#ffffff',
      'circle-opacity': 0.8,
    },
    minzoom: 4,
  },
  // Port labels
  {
    id: 'port-labels',
    source: 'marine',
    type: 'symbol',
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
  },
  // Shipping lanes
  {
    id: 'shipping-lanes',
    source: 'marine',
    type: 'line',
    paint: {
      'line-color': '#00d4aa',
      'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.5, 8, 2],
      'line-opacity': 0.4,
    },
    minzoom: 3,
  },
  // Anomaly heatmap (dynamic)
  {
    id: 'anomaly-heatmap',
    source: 'anomalies',
    type: 'heatmap',
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
  },
  // Active anomalies as points
  {
    id: 'anomaly-points',
    source: 'anomalies',
    type: 'circle',
    filter: ['>=', ['get', 'score'], 70],
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'score'], 70, 6, 100, 12],
      'circle-color': ['interpolate', ['linear'], ['get', 'score'], 70, '#f59e0b', 100, '#ef4444'],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-opacity': 0.9,
    },
    minzoom: 4,
  },
  // Satellite fires (VIIRS)
  {
    id: 'viirs-fires',
    source: 'satellite',
    type: 'circle',
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
  },
  // Submarine cables
  {
    id: 'submarine-cables',
    source: 'infrastructure',
    type: 'line',
    paint: {
      'line-color': '#8b5cf6',
      'line-width': 1.5,
      'line-dasharray': [3, 3],
      'line-opacity': 0.5,
    },
    minzoom: 3,
  },
  // Oil/gas infrastructure
  {
    id: 'energy-infrastructure',
    source: 'infrastructure',
    type: 'circle',
    paint: {
      'circle-radius': 5,
      'circle-color': '#f59e0b',
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#ffffff',
    },
    minzoom: 5,
  },
];

// ============================================================
// Regional Map Component
// ============================================================

interface RegionalMapProps {
  region: RegionKey;
  className?: string;
  style?: string | maplibregl.Style;
  center?: [number, number];
  zoom?: number;
  layers?: RegionLayerConfig[];
  onLoad?: (map: maplibregl.Map) => void;
  children?: React.ReactNode;
}

export function RegionalMap({
  region = 'world',
  className,
  style,
  center,
  zoom,
  layers = INTELLIGENCE_LAYERS,
  onLoad,
  children,
}: RegionalMapProps) {
  const config = REGION_CONFIG[region];
  const mapCenter = center || config.center;
  const mapZoom = zoom || config.zoom;
  const mapBounds = config.bounds;

  const map = useMapLibre();

  // Add layers when map loads
  useEffect(() => {
    if (!map) return;

    // Add sources first
    const sources = ['marine', 'anomalies', 'satellite', 'infrastructure'];
    sources.forEach((sourceId) => {
      if (!map.getSource(sourceId)) {
        // In production, these would be real vector tile sources
        // For now, we'll add empty GeoJSON sources
        map.addSource(sourceId, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }
    });

    // Add layers
    layers.forEach((layer) => {
      if (!map.getLayer(layer.id)) {
        try {
          map.addLayer(layer as maplibregl.LayerSpecification);
        } catch (e) {
          console.warn(`Failed to add layer ${layer.id}:`, e);
        }
      }
    });

    onLoad?.(map);

    return () => {
      layers.forEach((layer) => {
        if (map.getLayer(layer.id)) {
          map.removeLayer(layer.id);
        }
      });
    };
  }, [map, layers, onLoad]);

  // Fit to region bounds on mount
  useEffect(() => {
    if (map && mapBounds) {
      map.fitBounds(mapBounds as maplibregl.LngLatBoundsLike, {
        padding: 50,
        maxZoom: mapZoom,
        duration: 0,
      });
    }
  }, [region, map, mapBounds, mapZoom]);

  return (
    <MapContainer
      className={cn('rounded-md overflow-hidden', className)}
      mapStyle={style}
      center={[mapCenter[0], mapCenter[1]]}
      zoom={mapZoom}
      maxBounds={mapBounds as maplibregl.LngLatBoundsLike}
    >
      {children}
    </MapContainer>
  );
}

// ============================================================
// Hook for Layer Controls
// ============================================================

export function useLayerControls() {
  const map = useMapLibre();

  const toggleLayer = (layerId: string) => {
    if (!map) return;
    const visibility = map.getLayoutProperty(layerId, 'visibility');
    map.setLayoutProperty(layerId, 'visibility', visibility === 'visible' ? 'none' : 'visible');
  };

  const setLayerOpacity = (layerId: string, opacity: number) => {
    if (!map) return;
    const layer = map.getLayer(layerId);
    if (!layer) return;

    const type = layer.type;
    if (type === 'fill') map.setPaintProperty(layerId, 'fill-opacity', opacity);
    else if (type === 'circle') map.setPaintProperty(layerId, 'circle-opacity', opacity);
    else if (type === 'line') map.setPaintProperty(layerId, 'line-opacity', opacity);
    else if (type === 'heatmap') map.setPaintProperty(layerId, 'heatmap-opacity', opacity);
    else if (type === 'symbol') map.setPaintProperty(layerId, 'text-opacity', opacity);
  };

  const isLayerVisible = (layerId: string) => {
    if (!map) return false;
    return map.getLayoutProperty(layerId, 'visibility') !== 'none';
  };

  const getLayerOpacity = (layerId: string) => {
    if (!map) return 1;
    const layer = map.getLayer(layerId);
    if (!layer) return 1;

    const type = layer.type;
    if (type === 'fill') return map.getPaintProperty(layerId, 'fill-opacity') as number;
    if (type === 'circle') return map.getPaintProperty(layerId, 'circle-opacity') as number;
    if (type === 'line') return map.getPaintProperty(layerId, 'line-opacity') as number;
    if (type === 'heatmap') return map.getPaintProperty(layerId, 'heatmap-opacity') as number;
    if (type === 'symbol') return map.getPaintProperty(layerId, 'text-opacity') as number;
    return 1;
  };

  return { toggleLayer, setLayerOpacity, isLayerVisible, getLayerOpacity };
}

// ============================================================
// GIS Layer Selector Component
// ============================================================

interface GISLayerSelectorProps {
  layers?: Array<{
    id: string;
    name: string;
    group: string;
    visible: boolean;
    opacity: number;
    onToggle?: (id: string, visible: boolean) => void;
    onOpacityChange?: (id: string, opacity: number) => void;
  }>;
  className?: string;
}

export function GISLayerSelector({ layers = [], className }: GISLayerSelectorProps) {
  const groups = useMemo(() => {
    const groups: Record<string, typeof layers> = {};
    layers.forEach((layer) => {
      if (!groups[layer.group]) groups[layer.group] = [];
      groups[layer.group].push(layer);
    });
    return groups;
  }, [layers]);

  return (
    <div className={cn('glass-card rounded-md p-4 border border-border/50', className)}>
      <h4 className="font-display text-heading-sm text-fg mb-4">Map Layers</h4>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {Object.entries(groups).map(([groupName, groupLayers]) => (
          <div key={groupName} className="space-y-2">
            <div className="flex items-center justify-between text-caption font-medium text-fg-muted uppercase tracking-wider">
              <span>{groupName}</span>
              <span className="text-xs text-fg-subtle">{groupLayers.length} layers</span>
            </div>
            <div className="space-y-2">
              {groupLayers.map((layer) => (
                <div key={layer.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={layer.visible}
                    onChange={(e) => layer.onToggle?.(layer.id, e.target.checked)}
                    className="w-4 h-4 rounded border-border bg-background-elevated text-primary focus:ring-primary"
                  />
                  <label className="flex-1 text-body-sm text-fg cursor-pointer truncate">
                    {layer.name}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={layer.opacity}
                    onChange={(e) => layer.onOpacityChange?.(layer.id, parseFloat(e.target.value))}
                    className="w-20 h-1 accent-primary"
                    disabled={!layer.visible}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
