import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type ServerConnectionState =
  | 'online'
  | 'streaming'
  | 'buffered_playback'
  | 'connecting'
  | 'reconnecting'
  | 'offline';

export type SignalQuality = 'strong' | 'nominal' | 'buffered' | 'weak' | 'lost';

export interface PipelineStageInfo {
  id: string;
  name: string;
  status: 'active' | 'ready' | 'buffered' | 'degraded' | 'offline';
  badge: string;
  details: string;
}

export interface ServerStatusState {
  // Connection & Signal
  serverState: ServerConnectionState;
  isOnline: boolean;
  isStreaming: boolean;
  signalQuality: SignalQuality;
  lastHeartbeat: number | null;
  playbackDelaySec: number;
  activeVesselCount: number;
  activeAircraftCount: number;

  // Pipeline Stages
  stages: {
    ingestion: PipelineStageInfo;
    mlEnsemble: PipelineStageInfo;
    playbackBuffer: PipelineStageInfo;
    storage: PipelineStageInfo;
  };

  // Actions
  recordHeartbeat: (source?: string) => void;
  setWsStatus: (status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting') => void;
  setHttpHealth: (isHealthy: boolean, details?: any) => void;
  setTrackCounts: (vessels: number, aircraft: number) => void;
  setPlaybackDelay: (delaySec: number) => void;
  evaluateSignal: () => void;
}

export const useServerStatusStore = create<ServerStatusState>()(
  subscribeWithSelector(
    immer((set) => ({
      serverState: 'online',
      isOnline: true,
      isStreaming: true,
      signalQuality: 'buffered',
      lastHeartbeat: Date.now(),
      playbackDelaySec: 90,
      activeVesselCount: 0,
      activeAircraftCount: 0,

      stages: {
        ingestion: {
          id: 'ingestion',
          name: 'STREAM INGESTION',
          status: 'active',
          badge: 'DUAL INGESTION',
          details: 'AISStream WebSocket + OpenSky Air Radar',
        },
        mlEnsemble: {
          id: 'ml_ensemble',
          name: 'ML ANOMALY ENSEMBLE',
          status: 'ready',
          badge: '6/6 MODELS',
          details: 'Isolation Forest + LOF (Isotonic Calibrated)',
        },
        playbackBuffer: {
          id: 'playback_buffer',
          name: 'PLAYBACK BUFFER',
          status: 'buffered',
          badge: '90s DELAY',
          details: 'Pre-gathered comfortable map visualization',
        },
        storage: {
          id: 'storage',
          name: 'MEMORY TSM LAYER',
          status: 'active',
          badge: 'ZERO-EGRESS',
          details: 'In-memory track state cache & Supabase Pool',
        },
      },

      recordHeartbeat: (_source) => {
        set((s) => {
          s.lastHeartbeat = Date.now();
          s.isOnline = true;
          s.isStreaming = true;
          s.serverState = 'streaming';
          s.signalQuality = 'buffered';
        });
      },

      setWsStatus: (status) => {
        set((s) => {
          if (status === 'connected') {
            s.isOnline = true;
            s.isStreaming = true;
            s.serverState = 'streaming';
            s.lastHeartbeat = Date.now();
            s.signalQuality = 'buffered';
            s.stages.playbackBuffer.status = 'buffered';
          } else if (status === 'connecting' || status === 'reconnecting') {
            // Keep online if recently received heartbeats (avoid flickering)
            const recent = s.lastHeartbeat && Date.now() - s.lastHeartbeat < 30000;
            s.serverState = recent ? 'streaming' : 'reconnecting';
            s.signalQuality = recent ? 'nominal' : 'weak';
          } else {
            const recent = s.lastHeartbeat && Date.now() - s.lastHeartbeat < 30000;
            if (!recent) {
              s.serverState = 'offline';
              s.isStreaming = false;
              s.signalQuality = 'lost';
            }
          }
        });
      },

      setHttpHealth: (isHealthy, details) => {
        set((s) => {
          if (isHealthy) {
            s.isOnline = true;
            s.lastHeartbeat = Date.now();
            if (s.serverState === 'offline') {
              s.serverState = 'online';
              s.signalQuality = 'nominal';
            }
            if (details?.components?.ml_service?.healthy) {
              s.stages.mlEnsemble.status = 'ready';
              s.stages.mlEnsemble.badge = '6/6 MODELS';
            }
            if (details?.components?.database?.healthy) {
              s.stages.storage.status = 'active';
            }
          } else {
            const recent = s.lastHeartbeat && Date.now() - s.lastHeartbeat < 30000;
            if (!recent) {
              s.serverState = 'offline';
              s.isOnline = false;
              s.signalQuality = 'lost';
            }
          }
        });
      },

      setTrackCounts: (vessels, aircraft) => {
        set((s) => {
          s.activeVesselCount = vessels;
          s.activeAircraftCount = aircraft;
          if (vessels > 0 || aircraft > 0) {
            s.isStreaming = true;
            s.lastHeartbeat = Date.now();
          }
        });
      },

      setPlaybackDelay: (delaySec) => {
        set((s) => {
          s.playbackDelaySec = delaySec;
          s.stages.playbackBuffer.badge = `${delaySec}s DELAY`;
        });
      },

      evaluateSignal: () => {
        set((s) => {
          if (!s.lastHeartbeat) {
            s.signalQuality = 'lost';
            s.serverState = 'offline';
            s.isStreaming = false;
            return;
          }
          const elapsedSec = (Date.now() - s.lastHeartbeat) / 1000;
          if (elapsedSec < 15) {
            s.signalQuality = 'buffered';
            s.serverState = 'streaming';
            s.isStreaming = true;
            s.isOnline = true;
          } else if (elapsedSec < 45) {
            s.signalQuality = 'nominal';
            s.serverState = 'buffered_playback';
            s.isStreaming = true;
            s.isOnline = true;
          } else if (elapsedSec < 120) {
            s.signalQuality = 'weak';
            s.serverState = 'buffered_playback';
          } else {
            s.signalQuality = 'lost';
            s.serverState = 'offline';
            s.isStreaming = false;
            s.isOnline = false;
          }
        });
      },
    }))
  )
);
