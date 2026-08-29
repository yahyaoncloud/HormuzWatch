import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWebSocket } from '@/providers';
import { useHealthStore } from '@/stores/slices/health.store';
import type { BaseTrack } from '@/types/telemetry';

export function useLiveTelemetry(initialTraces: any[] = []) {
  const { subscribe, status: wsStatus, lastMessage } = useWebSocket();
  const setWsStatus = useHealthStore((s) => s.setWsStatus);
  const setMetricLog = useHealthStore((s) => s.setMetricLog);
  const [realtimeTracesMap, setRealtimeTracesMap] = useState<Map<string, any>>(new Map());

  // Keep health store WS status synchronized
  useEffect(() => {
    setWsStatus(wsStatus);
  }, [wsStatus, setWsStatus]);

  // Update WS HUD log whenever message arrives
  useEffect(() => {
    setMetricLog('ws', {
      time: new Date().toLocaleTimeString(),
      category: 'ws',
      message: `WebSocket ${wsStatus.toUpperCase()}: frame received [type="${lastMessage?.type || 'telemetry'}"]`,
      details: `Payload: ${lastMessage?.payload ? JSON.stringify(lastMessage.payload).slice(0, 120) : 'Active stream heartbeat'}`,
      status: wsStatus === 'connected' ? 'ok' : wsStatus === 'connecting' ? 'warn' : 'error',
    });
  }, [lastMessage, wsStatus, setMetricLog]);

  // Subscribe to raw WebSocket streams
  useEffect(() => {
    const unsubTelemetry = subscribe('telemetry', (payload: any) => {
      if (!payload) return;
      const items = Array.isArray(payload) ? payload : [payload];
      const now = new Date().toLocaleTimeString();

      if (items.length > 0) {
        const lastItem = items[items.length - 1];
        const isAir = String(lastItem.trackId || '').startsWith('FLIGHT') || lastItem.altitude !== undefined;

        if (isAir) {
          setMetricLog('adsb', {
            time: now,
            category: 'adsb',
            message: `ADS-B FLIGHT [${lastItem.trackId || 'AIR'}] — Alt: ${lastItem.altitude || 31000}ft Spd: ${lastItem.speed || 450}kt`,
            details: `Coords: ${Number(lastItem.lat).toFixed(3)}°N, ${Number(lastItem.lon).toFixed(3)}°E | Squawk: ${lastItem.squawk || '2104'} | Severity: ${lastItem.severity || 'low'}`,
            status: lastItem.severity === 'critical' ? 'error' : lastItem.severity === 'high' ? 'warn' : 'ok',
          });
        } else {
          setMetricLog('ais', {
            time: now,
            category: 'ais',
            message: `AIS VESSEL [${lastItem.assetName || lastItem.trackId || 'MMSI'}] — SOG: ${lastItem.speed || 0}kt COG: ${lastItem.heading || 0}°`,
            details: `Coords: ${Number(lastItem.lat).toFixed(3)}°N, ${Number(lastItem.lon).toFixed(3)}°E | Score: ${lastItem.anomalyScore || 0}/100 | Severity: ${lastItem.severity || 'low'}`,
            status: lastItem.severity === 'critical' ? 'error' : lastItem.severity === 'high' ? 'warn' : 'ok',
          });
        }
      }

      setRealtimeTracesMap((prev) => {
        const next = new Map(prev);
        for (const t of items) {
          const id = String(t.trackId || t.id || '');
          if (!id) continue;
          const existing = next.get(id) || {};
          next.set(id, {
            ...existing,
            trackId: id,
            assetName: t.assetName || id,
            timestamp: t.timestamp || new Date().toISOString(),
            lat: t.lat,
            lon: t.lon,
            speed: t.speed,
            heading: t.heading || 0,
            score: t.anomalyScore ?? existing.score ?? 0,
            severity: t.severity || existing.severity || 'low',
            reasons: t.reasons ? JSON.stringify(t.reasons) : existing.reasons || '[]',
            updatedAt: new Date().toISOString(),
          });
        }
        return next;
      });
    });

    const unsubAnomaly = subscribe('anomaly', (payload: any) => {
      if (!payload) return;
      const items = Array.isArray(payload) ? payload : [payload];
      if (items.length > 0) {
        const lastA = items[items.length - 1];
        setMetricLog('ml', {
          time: new Date().toLocaleTimeString(),
          category: 'ml',
          message: `ML ANOMALY EVAL [Track: ${lastA.trackId}] — Score: ${lastA.score || lastA.final_score || 0}/100 (${(lastA.severity || 'medium').toUpperCase()})`,
          details: `Ensemble Inference: gRPC (:8091) | Reason: ${Array.isArray(lastA.reasons) ? lastA.reasons.join('; ') : lastA.reasons || 'Kinematic deviation'}`,
          status: lastA.severity === 'critical' ? 'error' : lastA.severity === 'high' ? 'warn' : 'ok',
        });
      }

      setRealtimeTracesMap((prev) => {
        const next = new Map(prev);
        for (const a of items) {
          const id = String(a.trackId || a.id || '');
          if (!id) continue;
          const existing = next.get(id) || {};
          next.set(id, {
            ...existing,
            trackId: id,
            score: a.score ?? a.final_score ?? existing.score ?? 0,
            severity: a.severity || existing.severity || 'medium',
            reasons: Array.isArray(a.reasons) ? JSON.stringify(a.reasons) : a.reasons || existing.reasons || '[]',
            updatedAt: new Date().toISOString(),
          });
        }
        return next;
      });
    });

    return () => {
      unsubTelemetry();
      unsubAnomaly();
    };
  }, [subscribe, setMetricLog]);

  // Merged live tracks (initial REST + live WebSocket map)
  const mergedTracks: BaseTrack[] = useMemo(() => {
    const map = new Map<string, any>();
    for (const t of initialTraces) {
      if (t.trackId) map.set(t.trackId, t);
    }
    for (const [id, t] of realtimeTracesMap.entries()) {
      map.set(id, t);
    }
    return Array.from(map.values());
  }, [initialTraces, realtimeTracesMap]);

  return {
    tracks: mergedTracks,
    wsStatus,
  };
}
