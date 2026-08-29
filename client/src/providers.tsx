import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { env } from "@/environments/environment";

// ============================================================
// Supabase Auth Provider (Session-based admin auth)
// ============================================================

import { getSupabase, isSupabaseAvailable } from '@/lib/supabase';
import { useAdminStore, useRealtimeStore } from '@/stores';

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const setSession = useAdminStore((s) => s.setSession);

  useEffect(() => {
    if (!isSupabaseAvailable()) return;

    const supabase = getSupabase();

    // Hydrate initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession]);

  return <>{children}</>;
}

// ============================================================
// WebSocket Provider (Real-time data)
// ============================================================

import type {
  AnomalyPayload,
  StatsPayload,
  TelemetryPayload,
  TracesPayload,
  WSMessage,
  WSMessageType,
} from '@/types/websocket';

interface WebSocketContextValue {
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  lastMessage: WSMessage | null;
  telemetry: TelemetryPayload | null;
  anomaly: AnomalyPayload | null;
  traces: TracesPayload | null;
  stats: StatsPayload | null;
  send: (message: unknown) => void;
  subscribe: (type: WSMessageType, callback: (payload: unknown) => void) => () => void;
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

// Server endpoints from environment
const RECONNECT_BASE_DELAY = 2000; // Increased from 1000
const RECONNECT_MAX_DELAY = 60000; // Increased from 30000
const RECONNECT_FACTOR = 2; // Increased from 1.5
const MAX_RECONNECT_ATTEMPTS = 10; // Max attempts before giving up

// Check if we should attempt WebSocket connections
const shouldConnectWS = () => {
  const wsUrl = env.ws.telemetryUrl;
  const sseUrl = env.sse.tracesUrl;
  // Connect whenever configured or in browser environment
  if (wsUrl || sseUrl) return true;
  return typeof window !== 'undefined';
};

/** Append supabase session token as query param for WebSocket auth */
async function buildWSUrl(base: string): Promise<string> {
  try {
    if (!isSupabaseAvailable()) return base;
    const { data: { session } } = await getSupabase().auth.getSession();
    const token = session?.access_token;
    if (!token) return base;
    const url = new URL(base);
    url.searchParams.set('token', token);
    return url.toString();
  } catch {
    return base;
  }
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  >('connecting');
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryPayload | null>(null);
  const [anomaly, setAnomaly] = useState<AnomalyPayload | null>(null);
  const [traces, setTraces] = useState<TracesPayload | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const subscriptionsRef = useRef(new Map<WSMessage['type'], Set<(payload: unknown) => void>>());
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Zustand realtime store — single source of truth
  const rtSetStats = useRealtimeStore((s) => s.setStats);
  const rtSetTelemetry = useRealtimeStore((s) => s.setTelemetry);
  const rtSetAnomaly = useRealtimeStore((s) => s.setAnomaly);
  const rtSetTraces = useRealtimeStore((s) => s.setTraces);
  const rtAddConflict = useRealtimeStore((s) => s.addConflict);
  const rtSetWsStatus = useRealtimeStore((s) => s.setWsStatus);
  const rtClearAll = useRealtimeStore((s) => s.clearAll);

  const connectWS = useCallback(async () => {
    // Don't attempt connection if not configured for local development
    if (!shouldConnectWS()) {
      setStatus('disconnected');
      if (env.isDev) {
        console.log(
          '[WS] Skipping connection - no local server configured (set VITE_WS_TELEMETRY_URL to your local WebSocket endpoint to enable)'
        );
      }
      return;
    }

    // Stop if max attempts reached
    if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      setStatus('disconnected');
      if (env.isDev) {
        console.log('[WS] Max reconnect attempts reached. Server may not be running.');
      }
      return;
    }

    // Avoid double connection attempts
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.CONNECTING ||
        wsRef.current.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    // Explicitly clean up any existing socket
    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onclose = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      } catch (err) {
        console.error('[WS] Error closing previous socket:', err);
      }
      wsRef.current = null;
    }

    setStatus('connecting');

    try {
      const baseUrl = env.ws.telemetryUrl;
      const wsUrl = await buildWSUrl(baseUrl);
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setStatus('connected');
        rtSetWsStatus('connected');
        setReconnectAttempt(0);
        if (env.isDev) {
          console.log('[WS] Telemetry WebSocket connected');
        }

        // Subscribe to telemetry and anomaly channels
        socket.send(JSON.stringify({ type: 'subscribe', channels: ['telemetry', 'anomaly', 'conflict'] }));
      };

      socket.onmessage = (event) => {
        try {
          const rawMessage = JSON.parse(event.data);
          const payload = rawMessage.payload !== undefined ? rawMessage.payload : rawMessage.data;
          const message = { ...rawMessage, payload } as WSMessage;
          setLastMessage(message);

          // Push to Zustand realtime store (single source of truth)
          switch (message.type) {
            case 'telemetry':
              setTelemetry(message.payload as TelemetryPayload);
              rtSetTelemetry(message.payload as TelemetryPayload);
              break;
            case 'anomaly':
              setAnomaly(message.payload as AnomalyPayload);
              rtSetAnomaly(message.payload as AnomalyPayload);
              break;
            case 'stats':
              rtSetStats(message.payload as StatsPayload);
              break;
            case 'conflict':
              rtAddConflict(message.payload as any);
              break;
          }

          // Route to subscribers (backwards compat)
          const subscribers = subscriptionsRef.current.get(message.type);
          if (subscribers) {
            subscribers.forEach((cb) => cb(message.payload));
          }
        } catch (error) {
          if (env.isDev) {
            console.error('[WS] Failed to parse message:', error);
          }
        }
      };

      socket.onclose = () => {
        setStatus('reconnecting');
        // Clear realtime data on disconnect — no stale metrics
        rtClearAll();
        rtSetWsStatus('disconnected');

        // Nullify handlers to prevent duplicate events on old sockets
        socket.onopen = null;
        socket.onclose = null;
        socket.onmessage = null;
        socket.onerror = null;
        if (wsRef.current === socket) {
          wsRef.current = null;
        }

        if (env.isDev) {
          console.log(
            '[WS] Disconnected, scheduling reconnect (attempt ' +
              (reconnectAttempt + 1) +
              '/' +
              MAX_RECONNECT_ATTEMPTS +
              ')'
          );
        }

        const delay = Math.min(
          RECONNECT_BASE_DELAY * RECONNECT_FACTOR ** reconnectAttempt,
          RECONNECT_MAX_DELAY
        );

        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
        }

        connectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempt((a) => a + 1);
          connectWS();
        }, delay);
      };

      socket.onerror = (_error) => {
        // Only log in dev, and only once per connection attempt
        if (env.isDev && reconnectAttempt === 0) {
          console.warn(`[WS] Connection failed - is the server running at ${baseUrl}?`);
        }
      };
    } catch (error) {
      if (env.isDev) {
        console.error('[WS] Connection failed:', error);
      }
      setStatus('disconnected');
    }
  }, [reconnectAttempt]);

  // SSE connection for public traces (no auth required)
  const connectSSE = useCallback(() => {
    if (!shouldConnectWS()) {
      return;
    }

    // Avoid duplicate EventSource connections
    if (
      eventSourceRef.current &&
      (eventSourceRef.current.readyState === EventSource.CONNECTING ||
        eventSourceRef.current.readyState === EventSource.OPEN)
    ) {
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.onopen = null;
      eventSourceRef.current.onerror = null;
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const es = new EventSource(
      env.sse.tracesUrl
    );
    eventSourceRef.current = es;

    es.onopen = () => {
      if (env.isDev) {
        console.log('[SSE] Traces stream connected');
      }
    };

    es.addEventListener('traces', (event) => {
      try {
        const payload = JSON.parse(event.data) as TracesPayload;
        setTraces(payload);
        rtSetTraces(payload);

        const subscribers = subscriptionsRef.current.get('traces');
        if (subscribers) {
          subscribers.forEach((cb) => cb(payload));
        }
      } catch (error) {
        if (env.isDev) {
          console.error('[SSE] Failed to parse traces:', error);
        }
      }
    });

    es.onerror = () => {
      if (env.isDev) {
        console.log('[SSE] Traces stream disconnected, reconnecting...');
      }
      es.close();
      if (eventSourceRef.current === es) {
        eventSourceRef.current = null;
      }

      if (sseTimeoutRef.current) {
        clearTimeout(sseTimeoutRef.current);
      }

      sseTimeoutRef.current = setTimeout(() => {
        connectSSE();
      }, 10000); // Longer delay for SSE
    };
  }, []);

  const connect = useCallback(async () => {
    connectWS();
    connectSSE();
  }, [connectWS, connectSSE]);

  const send = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      if (env.isDev) {
        console.warn('[WS] Cannot send, not connected');
      }
    }
  }, []);

  const subscribe = useCallback((type: WSMessageType, callback: (payload: unknown) => void) => {
    if (!subscriptionsRef.current.has(type)) {
      subscriptionsRef.current.set(type, new Set());
    }
    subscriptionsRef.current.get(type)!.add(callback);

    return () => {
      subscriptionsRef.current.get(type)?.delete(callback);
    };
  }, []);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
    }
    if (sseTimeoutRef.current) {
      clearTimeout(sseTimeoutRef.current);
    }
    setReconnectAttempt(0);
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
      }
      if (sseTimeoutRef.current) {
        clearTimeout(sseTimeoutRef.current);
      }
    };
  }, []);

  const value: WebSocketContextValue = {
    status,
    lastMessage,
    telemetry,
    anomaly,
    traces,
    stats: useRealtimeStore.getState().stats, // from Zustand
    send,
    subscribe,
    reconnect,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}

// ============================================================
// Map Provider (MapLibre state)
// ============================================================

import type { Map as MapLibreMap } from 'maplibre-gl';

interface MapContextValue {
  map: MapLibreMap | null;
  setMap: (map: MapLibreMap | null) => void;
  viewport: {
    center: [number, number];
    zoom: number;
    bearing: number;
    pitch: number;
  };
  setViewport: (viewport: Partial<MapContextValue['viewport']>) => void;
  layers: MapLayerConfig[];
  setLayers: (layers: MapLayerConfig[]) => void;
  toggleLayer: (layerId: string) => void;
  setLayerVisibility: (layerId: string, visible: boolean) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
}

export interface MapLayerConfig {
  id: string;
  name: string;
  group: 'base' | 'intelligence' | 'infrastructure' | 'environmental' | 'overlays';
  type: 'fill' | 'line' | 'circle' | 'symbol' | 'heatmap' | 'raster' | 'hillshade';
  source: string;
  sourceLayer?: string;
  filter?: unknown[];
  paint: Record<string, unknown>;
  layout?: Record<string, unknown>;
  minZoom?: number;
  maxZoom?: number;
  visible: boolean;
  opacity: number;
  metadata: {
    description: string;
    dataSource: string;
    updateFrequency: string;
    attribution: string;
  };
}

const MapContext = createContext<MapContextValue | null>(null);

export function MapProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [viewport, setViewportState] = useState({
    center: [54.5, 25.5] as [number, number], // Hormuz Strait center
    zoom: 6,
    bearing: 0,
    pitch: 0,
  });
  const [layers, setLayers] = useState<MapLayerConfig[]>([]);

  const setViewport = useCallback((updates: Partial<MapContextValue['viewport']>) => {
    setViewportState((prev) => ({ ...prev, ...updates }));
  }, []);

  const toggleLayer = useCallback(
    (layerId: string) => {
      setLayers((prev) =>
        prev.map((layer) => (layer.id === layerId ? { ...layer, visible: !layer.visible } : layer))
      );

      if (map) {
        const layer = layers.find((l) => l.id === layerId);
        if (layer) {
          map.setLayoutProperty(layerId, 'visibility', layer.visible ? 'none' : 'visible');
        }
      }
    },
    [map, layers]
  );

  const setLayerVisibility = useCallback(
    (layerId: string, visible: boolean) => {
      setLayers((prev) =>
        prev.map((layer) => (layer.id === layerId ? { ...layer, visible } : layer))
      );

      if (map) {
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      }
    },
    [map]
  );

  const setLayerOpacity = useCallback(
    (layerId: string, opacity: number) => {
      setLayers((prev) =>
        prev.map((layer) => (layer.id === layerId ? { ...layer, opacity } : layer))
      );

      if (map) {
        const layer = layers.find((l) => l.id === layerId);
        if (layer && layer.type === 'fill') {
          map.setPaintProperty(layerId, 'fill-opacity', opacity);
        } else if (layer && layer.type === 'circle') {
          map.setPaintProperty(layerId, 'circle-opacity', opacity);
        } else if (layer && layer.type === 'line') {
          map.setPaintProperty(layerId, 'line-opacity', opacity);
        } else if (layer && layer.type === 'heatmap') {
          map.setPaintProperty(layerId, 'heatmap-opacity', opacity);
        }
      }
    },
    [map, layers]
  );

  const value: MapContextValue = {
    map,
    setMap,
    viewport,
    setViewport,
    layers,
    setLayers,
    toggleLayer,
    setLayerVisibility,
    setLayerOpacity,
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMap() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMap must be used within MapProvider');
  }
  return context;
}

// ============================================================
// Time Provider (Global time sync)
// ============================================================

interface TimeContextValue {
  serverTime: number;
  timeOffset: number;
  timezone: string;
  setTimezone: (tz: string) => void;
  formatTime: (timestamp: number, options?: Intl.DateTimeFormatOptions) => string;
  formatRelative: (timestamp: number) => string;
}

const TimeContext = createContext<TimeContextValue | null>(null);

export function TimeProvider({ children }: { children: ReactNode }) {
  const [serverTime, setServerTime] = useState(Date.now());
  const [timeOffset, setTimeOffset] = useState(0);
  const [timezone, setTimezone] = useState('UTC');

  // Sync with server time periodically
  useEffect(() => {
    const syncTime = async () => {
      try {
        const start = Date.now();
        const response = await fetch('/api/v1/time');
        const end = Date.now();

        if (response.ok) {
          const data = await response.json();
          const latency = end - start;
          const serverTime = data.timestamp + latency / 2;
          setServerTime(serverTime);
          setTimeOffset(serverTime - Date.now());
        }
      } catch {
        // Ignore errors, use local time
      }
    };

    syncTime();
    const interval = setInterval(syncTime, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  // Update local time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setServerTime(Date.now() + timeOffset);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeOffset]);

  const formatTime = useCallback(
    (timestamp: number, options?: Intl.DateTimeFormatOptions) => {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: timezone,
        ...options,
      });
    },
    [timezone]
  );

  const formatRelative = useCallback(
    (timestamp: number) => {
      const diff = serverTime - timestamp;
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (seconds < 60) return `${seconds}s ago`;
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;

      return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: days > 365 ? 'numeric' : undefined,
      });
    },
    [serverTime]
  );

  const value: TimeContextValue = {
    serverTime,
    timeOffset,
    timezone,
    setTimezone,
    formatTime,
    formatRelative,
  };

  return <TimeContext.Provider value={value}>{children}</TimeContext.Provider>;
}

export function useTime() {
  const context = useContext(TimeContext);
  if (!context) {
    throw new Error('useTime must be used within TimeProvider');
  }
  return context;
}

// ============================================================
// Composed Providers
// ============================================================

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SupabaseAuthProvider>
      <TimeProvider>
        <MapProvider>
          <WebSocketProvider>{children}</WebSocketProvider>
        </MapProvider>
      </TimeProvider>
    </SupabaseAuthProvider>
  );
}
