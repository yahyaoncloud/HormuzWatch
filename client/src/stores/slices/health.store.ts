import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { SystemHealthState, SystemMetricLogs, MetricLogEntry } from '@/types/health';

export interface HealthSliceState {
  systemHealth: SystemHealthState | null;
  setSystemHealth: (health: SystemHealthState | null) => void;

  wsStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  setWsStatus: (status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting') => void;

  latestLogs: SystemMetricLogs;
  setMetricLog: (key: keyof SystemMetricLogs, log: MetricLogEntry) => void;
  updateAllLogs: (logs: Partial<SystemMetricLogs>) => void;
}

export const useHealthStore = create<HealthSliceState>()(
  immer((set) => ({
    systemHealth: null,
    setSystemHealth: (health) =>
      set((state) => {
        state.systemHealth = health;
      }),

    wsStatus: 'connecting',
    setWsStatus: (status) =>
      set((state) => {
        state.wsStatus = status;
      }),

    latestLogs: {
      api: {
        time: new Date().toLocaleTimeString(),
        category: 'api',
        message: 'CORE API: Ingestion daemon online & healthy',
        details: 'Endpoint: /health | Supabase PostgreSQL: Connected',
        status: 'ok',
      },
      ws: {
        time: new Date().toLocaleTimeString(),
        category: 'ws',
        message: 'WS STREAM: Listening on /ws/stream hub',
        details: 'Protocol: RFC 6455 | Auto-reconnect enabled',
        status: 'ok',
      },
      ais: {
        time: new Date().toLocaleTimeString(),
        category: 'ais',
        message: 'AIS STREAM: Ingesting maritime traffic',
        details: 'Spatial BBox: 22.0°N-28.0°N, 53.0°E-60.0°E',
        status: 'ok',
      },
      adsb: {
        time: new Date().toLocaleTimeString(),
        category: 'adsb',
        message: 'ADS-B AIR: Ingesting Persian Gulf flights',
        details: 'Source: OpenSky Network REST/WS API',
        status: 'ok',
      },
      ml: {
        time: new Date().toLocaleTimeString(),
        category: 'ml',
        message: 'ML ENSEMBLE: 6 anomaly detection models loaded',
        details: 'Isolation Forest, DBSCAN, KDE, GDELT Sentiment, Bottlenecks',
        status: 'ok',
      },
      news: {
        time: new Date().toLocaleTimeString(),
        category: 'news',
        message: 'NEWS PIPELINE: GDELT 2.0 & RSS feeds active',
        details: 'Scraping Middle East maritime risk & naval ops',
        status: 'ok',
      },
    },

    setMetricLog: (key, log) =>
      set((state) => {
        state.latestLogs[key] = log;
      }),

    updateAllLogs: (logs) =>
      set((state) => {
        Object.assign(state.latestLogs, logs);
      }),
  }))
);
