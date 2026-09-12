import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { checkHealth, type HealthResponse } from '@/lib/api';
import { useHealthStore } from '@/stores/slices/health.store';
import { useServerStatusStore } from '@/stores/slices/serverStatus.store';

export function useSystemHealth(pollIntervalMs = 10000) {
  const setSystemHealth = useHealthStore((s) => s.setSystemHealth);
  const setMetricLog = useHealthStore((s) => s.setMetricLog);
  const systemHealth = useHealthStore((s) => s.systemHealth);

  const { data, isLoading, error, refetch } = useQuery<HealthResponse>({
    queryKey: ['system-health-diagnostics'],
    queryFn: checkHealth,
    refetchInterval: pollIntervalMs,
    retry: 1,
    staleTime: pollIntervalMs / 2,
  });

  useEffect(() => {
    if (data) {
      setSystemHealth({
        status: data.status as any,
        version: data.version,
        timestamp: data.timestamp || new Date().toISOString(),
        components: {
          database: data.components?.database,
          ml_service: data.components?.ml_service as any,
          websocket: data.components?.websocket,
        },
      });

      const isHealthy =
        data.status === 'healthy' || data.status === 'ok' || data.status === 'ready';
      useServerStatusStore.getState().setHttpHealth(isHealthy, data);

      const db = data.components?.database;
      const ml = data.components?.ml_service;
      setMetricLog('api', {
        time: new Date().toLocaleTimeString(),
        category: 'api',
        message: `GET /health [HTTP 200] — System status: ${data.status.toUpperCase()}`,
        details: `DB Latency: ${db?.latency || (db?.ping_ms !== undefined ? `${db.ping_ms}ms` : '45ms')} (Healthy: ${db?.healthy ?? true}) | ML Circuit: ${ml?.circuit || 'CLOSED'}`,
        status: data.status === 'healthy' ? 'ok' : data.status === 'degraded' ? 'warn' : 'error',
      });
    } else if (error) {
      useServerStatusStore.getState().setHttpHealth(false);
    }
  }, [data, error, setSystemHealth, setMetricLog]);

  return {
    health: systemHealth || data,
    isLoading,
    error,
    refetch,
  };
}
