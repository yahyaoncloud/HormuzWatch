import maplibregl, {
  type LayerSpecification,
  type LngLatBoundsLike,
  type Map,
  type SourceSpecification,
} from 'maplibre-gl';
import { useCallback, useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { env } from "@/environments/environment";
import { useMapStore } from '@/stores';
import { cn } from '@/utils/cn';

// ============================================================
// Map Container - Core MapLibre wrapper
// ============================================================

interface MapContainerProps {
  mapStyle?: string | maplibregl.Style;
  center?: [number, number];
  zoom?: number;
  bearing?: number;
  pitch?: number;
  bounds?: LngLatBoundsLike;
  fitBoundsOptions?: maplibregl.FitBoundsOptions;
  maxBounds?: LngLatBoundsLike;
  minZoom?: number;
  maxZoom?: number;
  pitchWithRotate?: boolean;
  dragRotate?: boolean;
  touchPitch?: boolean;
  touchZoomRotate?: boolean;
  doubleClickZoom?: boolean;
  boxZoom?: boolean;
  keyboard?: boolean;
  scrollZoom?: boolean;
  dragPan?: boolean;
  cooperativeGestures?: boolean;
  preserveDrawingBuffer?: boolean;
  antialias?: boolean;
  failIfMajorPerformanceCaveat?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: (map: Map) => void;
  onError?: (error: Error) => void;
  onMove?: (map: Map) => void;
  onMoveEnd?: (map: Map) => void;
  onZoom?: (map: Map) => void;
  onClick?: (event: maplibregl.MapMouseEvent) => void;
  onContextMenu?: (event: maplibregl.MapMouseEvent) => void;
  children?: React.ReactNode;
}

export function MapContainer({
  mapStyle = env.map.styleUrl,
  center = env.map.defaultCenter,
  zoom = env.map.defaultZoom,
  bearing = 0,
  pitch = 0,
  maxBounds,
  minZoom = env.map.minZoom,
  maxZoom = env.map.maxZoom,
  pitchWithRotate = true,
  dragRotate = true,
  touchPitch = true,
  touchZoomRotate = true,
  doubleClickZoom = true,
  boxZoom = true,
  keyboard = true,
  scrollZoom = true,
  dragPan = true,
  cooperativeGestures = false,
  className,
  style: styleProp,
  onLoad,
  onError,
  onMove,
  onMoveEnd,
  onZoom,
  onClick,
  onContextMenu,
  children,
}: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const initializedRef = useRef(false);
  const { setMapInstance, viewport, setViewport } = useMapStore();

  const [mapError, setMapError] = useState<Error | null>(null);

  // Initialize map
  useEffect(() => {
    if (initializedRef.current || !containerRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: mapStyle as string | maplibregl.StyleSpecification,
        center,
        zoom,
        bearing,
        pitch,
        maxBounds,
        minZoom,
        maxZoom,
        pitchWithRotate,
        dragRotate,
        touchPitch,
        touchZoomRotate,
        doubleClickZoom,
        boxZoom,
        keyboard,
        scrollZoom,
        dragPan,
        cooperativeGestures,
        // Performance optimizations
        maxTileCacheSize: 1000,
        fadeDuration: 150,
      });

      mapRef.current = map;
      setMapInstance(map);
      initializedRef.current = true;

      // Sync viewport on move
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
        onMove?.(map);
      };

      const handleMoveEnd = () => {
        onMoveEnd?.(map);
      };

      const handleZoom = () => {
        onZoom?.(map);
      };

      map.on('load', () => {
        onLoad?.(map);
      });

      map.on('error', (e) => {
        const error = e.error instanceof Error ? e.error : new Error(String(e.error));
        setMapError(error);
        onError?.(error);
      });

      map.on('move', handleMove);
      map.on('moveend', handleMoveEnd);
      map.on('zoom', handleZoom);

      if (onClick) map.on('click', onClick);
      if (onContextMenu) map.on('contextmenu', onContextMenu);

      // Navigation controls
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: true, showZoom: true }),
        'top-right'
      );

      // Scale control
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

      // Fullscreen control
      map.addControl(new maplibregl.FullscreenControl(), 'top-right');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setMapError(err);
      onError?.(err);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapInstance(null);
        initializedRef.current = false;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync viewport from store to map
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

  // Expose map methods for children
  if (mapError) {
    return (
      <div
        className={cn('relative w-full h-full bg-background-card border border-border', className)}
        style={styleProp}
      >
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-danger mb-4" role="alert">
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
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full h-full', className)}
      style={styleProp}
      role="application"
      aria-label="Interactive map"
    >
      {children && mapRef.current && (
        <MapContextProvider map={mapRef.current}>{children}</MapContextProvider>
      )}
    </div>
  );
}

// Context for child components to access map instance
import { createContext, useContext } from 'react';

interface MapContextValue {
  map: Map;
}

const MapContext = createContext<MapContextValue | null>(null);

function MapContextProvider({ map, children }: { map: Map; children: React.ReactNode }) {
  return <MapContext.Provider value={{ map }}>{children}</MapContext.Provider>;
}

export function useMapLibre() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapLibre must be used within MapContainer');
  }
  return context.map;
}

// ============================================================
// Map Layer Management Hook
// ============================================================

export function useMapLayer(layerId: string) {
  const map = useMapLibre();

  const addLayer = useCallback(
    (layer: LayerSpecification, beforeId?: string) => {
      if (!map.getLayer(layerId)) {
        map.addLayer(layer, beforeId);
      }
    },
    [map, layerId]
  );

  const removeLayer = useCallback(() => {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  }, [map, layerId]);

  const setLayerVisibility = useCallback(
    (visible: boolean) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      }
    },
    [map, layerId]
  );

  const setPaintProperty = useCallback(
    (name: string, value: unknown) => {
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, name, value);
      }
    },
    [map, layerId]
  );

  const setLayoutProperty = useCallback(
    (name: string, value: unknown) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, name, value);
      }
    },
    [map, layerId]
  );

  const getPaintProperty = useCallback(
    (name: string) => {
      return map.getPaintProperty(layerId, name);
    },
    [map, layerId]
  );

  const getLayoutProperty = useCallback(
    (name: string) => {
      return map.getLayoutProperty(layerId, name);
    },
    [map, layerId]
  );

  return {
    addLayer,
    removeLayer,
    setLayerVisibility,
    setPaintProperty,
    setLayoutProperty,
    getPaintProperty,
    getLayoutProperty,
    layerExists: map.getLayer(layerId) !== undefined,
  };
}

// ============================================================
// Map Source Management Hook
// ============================================================

export function useMapSource(sourceId: string) {
  const map = useMapLibre();

  const addSource = useCallback(
    (source: SourceSpecification) => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, source);
      }
    },
    [map, sourceId]
  );

  const removeSource = useCallback(() => {
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  }, [map, sourceId]);

  const updateSourceData = useCallback(
    (data: GeoJSON.FeatureCollection | GeoJSON.Feature) => {
      const source = map.getSource(sourceId);
      if (source && 'setData' in source) {
        (source as maplibregl.GeoJSONSource).setData(data);
      }
    },
    [map, sourceId]
  );

  const setSourceData = useCallback(
    (data: GeoJSON.FeatureCollection | GeoJSON.Feature) => {
      updateSourceData(data);
    },
    [updateSourceData]
  );

  return {
    addSource,
    removeSource,
    updateSourceData,
    setSourceData,
    sourceExists: map.getSource(sourceId) !== undefined,
  };
}

// ============================================================
// Map Interaction Hooks
// ============================================================

export function useMapClick(
  layerIds: string | string[],
  callback: (feature: GeoJSON.Feature, event: maplibregl.MapMouseEvent) => void
) {
  const map = useMapLibre();
  const layerIdsArray = Array.isArray(layerIds) ? layerIds : [layerIds];

  useEffect(() => {
    const handler = (event: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(event.point, { layers: layerIdsArray });
      if (features.length > 0) {
        callback(features[0], event);
      }
    };

    map.on('click', handler);
    return () => {
      map.off('click', handler);
    };
  }, [map, layerIdsArray, callback]);
}

export function useMapHover(
  layerIds: string | string[],
  onEnter: (feature: GeoJSON.Feature) => void,
  onLeave: () => void
) {
  const map = useMapLibre();
  const layerIdsArray = Array.isArray(layerIds) ? layerIds : [layerIds];
  const hoveredRef = useRef<string | null>(null);

  useEffect(() => {
    const handleMouseMove = (event: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(event.point, { layers: layerIdsArray });

      if (features.length > 0) {
        const feature = features[0];
        const id = feature.id as string;

        if (hoveredRef.current !== id) {
          hoveredRef.current = id;
          onEnter(feature);
          map.getCanvas().style.cursor = 'pointer';
        }
      } else if (hoveredRef.current !== null) {
        hoveredRef.current = null;
        onLeave();
        map.getCanvas().style.cursor = '';
      }
    };

    map.on('mousemove', handleMouseMove);
    return () => {
      map.off('mousemove', handleMouseMove);
      map.getCanvas().style.cursor = '';
    };
  }, [map, layerIdsArray, onEnter, onLeave]);
}

// ============================================================
// Map Viewport Helpers
// ============================================================

export function useMapViewport() {
  const { viewport, setViewport, flyTo } = useMapStore();

  const fitBounds = useCallback(
    (bounds: LngLatBoundsLike, options?: maplibregl.FitBoundsOptions) => {
      const map = useMapLibre();
      if (map) {
        map.fitBounds(bounds, { padding: 50, maxZoom: 15, ...options });
      }
    },
    []
  );

  const jumpTo = useCallback((center: [number, number], zoom?: number) => {
    const map = useMapLibre();
    if (map) {
      map.jumpTo({ center, zoom: zoom ?? map.getZoom() });
    }
  }, []);

  const flyToLocation = useCallback(
    (center: [number, number], zoom: number, options?: { duration?: number }) => {
      const map = useMapLibre();
      if (map) {
        map.flyTo({ center, zoom, duration: options?.duration ?? 2000 });
      }
    },
    []
  );

  const rotateTo = useCallback((bearing: number, pitch?: number) => {
    const map = useMapLibre();
    if (map) {
      map.rotateTo(bearing, { duration: 1000 });
      if (pitch !== undefined) map.easeTo({ pitch, duration: 1000 });
    }
  }, []);

  return {
    viewport,
    setViewport,
    flyTo,
    fitBounds,
    jumpTo,
    flyToLocation,
    rotateTo,
  };
}
