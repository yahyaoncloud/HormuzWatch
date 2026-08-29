// ==============================================================================
// Canonical Health & System Diagnostics Types
// ==============================================================================

export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'offline' | 'connecting';
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF-OPEN' | 'FALLBACK';

export interface DatabaseHealth {
  healthy: boolean;
  latency?: string;
  ping_ms?: number;
  pool_open?: number;
  pool_in_use?: number;
  error?: string;
}

export interface MLServiceHealth {
  healthy: boolean;
  circuit?: CircuitState;
  models_loaded?: number;
  grpc_connected?: boolean;
  latency_ms?: number;
}

export interface WebSocketHubHealth {
  healthy: boolean;
  active_clients?: number;
  dropped_messages?: number;
}

export interface SystemHealthState {
  status: ServiceStatus;
  version?: string;
  timestamp: string;
  components: {
    database?: DatabaseHealth;
    ml_service?: MLServiceHealth;
    websocket?: WebSocketHubHealth;
  };
}

export interface MetricLogEntry {
  time: string;
  category?: string;
  message: string;
  details?: string;
  status?: 'ok' | 'warn' | 'error';
}

export interface SystemMetricLogs {
  api?: MetricLogEntry;
  ais?: MetricLogEntry;
  adsb?: MetricLogEntry;
  ml?: MetricLogEntry;
  ws?: MetricLogEntry;
  news?: MetricLogEntry;
}
