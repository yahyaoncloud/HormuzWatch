// WebSocket message protocol for real-time data streams
// Matches server/internal/api/handlers.go and server/internal/api/public.go

export type WSMessageType =
  | 'telemetry' // Real-time vessel/aircraft position updates
  | 'anomaly' // Anomaly detection results
  | 'traces' // Public top traces (SSE)
  | 'metric' // Platform metrics
  | 'status' // System status
  | 'incident' // Incident notifications
  | 'alert' // Alert notifications
  | 'ping'
  | 'pong';

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  timestamp: number;
  id?: string;
  payload: T;
}

// Telemetry payload from server (matches server/internal/api/handlers.go WebSocketStream)
export interface TelemetryPayload {
  trackId: string;
  assetName: string;
  timestamp: string; // ISO8601
  lat: number;
  lon: number;
  speed: number;
  previousSpeed?: number;
  heading: number;
  courseDelta?: number;
  aisAgeMinutes?: number;
  hotZoneDistanceNm?: number;
}

// Anomaly detection result
export interface AnomalyPayload {
  trackId: string;
  score: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  reasons: string[];
  actions: string[];
  timestamp: string;
}

// Public traces from SSE stream (matches server/internal/api/public.go)
export interface TracesPayload {
  traces: TopTrace[];
  count: number;
  timestamp: string;
}

export interface TopTrace {
  trackId: string;
  assetName: string;
  timestamp: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  score: number;
  severity: string;
  reasons: string;
  updatedAt: string;
}

// Heatmap data
export interface HeatmapPayload {
  type: string;
  source: string;
  data: number[][];
}

// Intelligence news
export interface NewsPayload {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  source: string;
  summary: string;
}

// Platform metrics
export interface MetricPayload {
  totalTracks: number;
  maritimeCount: number;
  aviationCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  avgScore: number;
  activeRegions: number;
  timestamp: string;
}

// System status
export interface StatusPayload {
  status: 'operational' | 'degraded' | 'major_outage' | 'maintenance';
  message?: string;
  uptime?: number;
}

// Client -> Server messages
export type WSClientMessage =
  | { type: 'subscribe'; channels: WSMessageType[] }
  | { type: 'unsubscribe'; channels: WSMessageType[] }
  | { type: 'ping' };

// ── Conflict Intelligence ────────────────────────────────────────────────────

export interface ConflictEvent {
  id: string;
  title: string;
  description: string;
  lat: number;
  lon: number;
  conflictType:
    | 'naval'
    | 'air'
    | 'ground'
    | 'cyber'
    | 'infrastructure'
    | 'piracy'
    | 'diplomatic'
    | 'hybrid';
  severity: 'critical' | 'high' | 'medium' | 'low';
  region: string;
  affectedAssets: string;
  casualties: string;
  source: string;
  sourceType: 'osint' | 'military' | 'maritime' | 'aviation' | 'diplomatic';
  timestamp: string;
  verified: boolean;
}

export interface ConflictFeedResponse {
  conflicts: ConflictEvent[];
  generated_at: string;
  source: string;
  count: number;
  message: string;
}
