import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  checkHealth,
  getBlockadeIndicators,
  getNews,
  getPublicMetrics,
  getTopTraces,
  getTransits,
  type BlockadeIndicators,
  type HealthResponse,
  type TransitSummary,
} from '@/lib/api';
import { useRealtimeStore } from '@/stores';
import { useWebSocket } from '@/providers';
import { formatTimeAgo } from '@/components/intelligence/IntelligenceConsole';
import type { ThreatItem } from '@/components/intelligence/ThreatsPanel';

export function getRegionNameByCoords(_lat: number, lon: number): string {
  if (lon < 56.0) return 'Persian Gulf';
  if (lon >= 56.0 && lon <= 59.0) return 'Strait of Hormuz';
  return 'Gulf of Oman';
}

export interface UseHomeTelemetryOptions {
  initialMetrics?: any;
  initialTraces?: any;
  initialNews?: any;
  severityFilter: string;
  regionFilter: string;
  timeline: string;
}

export function useHomeTelemetry({
  initialMetrics,
  initialTraces,
  initialNews,
  severityFilter,
  regionFilter,
  timeline,
}: UseHomeTelemetryOptions) {
  // REST Initial Queries & Fallbacks
  const { data: metricsData, isLoading: isMetricsLoading } = useQuery({
    queryKey: ['public-metrics-home'],
    queryFn: getPublicMetrics,
    placeholderData: initialMetrics ?? undefined,
    refetchInterval: false,
    staleTime: Infinity,
  });

  const { data: tracesData } = useQuery({
    queryKey: ['public-traces-home'],
    queryFn: getTopTraces,
    initialData: initialTraces ?? undefined,
    refetchInterval: false,
    staleTime: Infinity,
  });

  const { data: newsData } = useQuery({
    queryKey: ['public-news-feed'],
    queryFn: getNews,
    initialData: initialNews ?? undefined,
    refetchInterval: 60000,
  });

  const { data: blockade } = useQuery<BlockadeIndicators>({
    queryKey: ['public-blockade'],
    queryFn: getBlockadeIndicators,
    refetchInterval: 60000,
  });

  const { data: transits } = useQuery<TransitSummary>({
    queryKey: ['public-transits'],
    queryFn: () => getTransits(24),
    refetchInterval: 60000,
  });

  // Real-time Backend & Subsystem Health Check
  const { data: systemHealth } = useQuery<HealthResponse>({
    queryKey: ['system-health-home'],
    queryFn: checkHealth,
    refetchInterval: 10000,
    retry: 1,
  });

  // Real-time WebSocket subscriptions
  const liveStats = useRealtimeStore((s) => s.stats);
  const { subscribe, status: wsStatus } = useWebSocket();
  const [realtimeTracesMap, setRealtimeTracesMap] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    const unsubTelemetry = subscribe('telemetry', (payload: any) => {
      if (!payload) return;
      const items = Array.isArray(payload) ? payload : [payload];
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
  }, [subscribe]);

  // Combine initial REST traces + real-time WebSocket traces
  const mergedTraces: any[] = Array.from(
    new Map([
      ...(tracesData?.traces ?? []).map((t: any) => [t.trackId, t] as const),
      ...Array.from(realtimeTracesMap.entries()),
    ]).values()
  );

  const rawMetrics = metricsData?.metrics;
  const liveTraces: any[] = mergedTraces.length > 0 ? mergedTraces : (tracesData?.traces ?? []);
  const newsItems = newsData?.news ?? [];

  // Merge: WebSocket stats take priority over REST metrics
  const displayMetrics = liveStats
    ? {
        maritimeCount: liveStats.maritimeCount,
        aviationCount: liveStats.aviationCount,
        totalTracks: liveStats.totalTracks,
        activeRegions: 3,
        avgScore: Math.round(liveStats.avgEWMA * 10),
        criticalCount: liveStats.highAnomalyCount,
        highCount: liveStats.totalAnomalies - liveStats.highAnomalyCount,
        mediumCount: 0,
        lowCount: 0,
        timestamp: liveStats.updatedAt,
      }
    : rawMetrics;

  // Filtered traces based on criteria
  const filteredTraces = liveTraces.filter((t: any) => {
    if (severityFilter !== 'all' && t.severity !== severityFilter) return false;
    if (regionFilter !== 'all') {
      const regionName = getRegionNameByCoords(t.lat, t.lon);
      if (regionFilter === 'hormuz' && regionName !== 'Strait of Hormuz') return false;
      if (regionFilter === 'pgulf' && regionName !== 'Persian Gulf') return false;
      if (regionFilter === 'goman' && regionName !== 'Gulf of Oman') return false;
      if (regionFilter === 'redsea' && !regionName.includes('Red Sea')) return false;
    }
    if (timeline !== 'all') {
      const diffHours = (Date.now() - new Date(t.timestamp).getTime()) / (1000 * 60 * 60);
      if (timeline === '1hr' && diffHours > 1) return false;
      if (timeline === '3hr' && diffHours > 3) return false;
      if (timeline === '6hr' && diffHours > 6) return false;
      if (timeline === '12hr' && diffHours > 12) return false;
      if (timeline === '24hr' && diffHours > 24) return false;
    }
    return true;
  });

  // Top threats list
  const topThreats: ThreatItem[] =
    filteredTraces.length > 0
      ? filteredTraces.map((t: any) => {
          let reasonsList: string[] = [];
          try {
            reasonsList = JSON.parse(t.reasons);
          } catch {
            if (t.reasons) reasonsList = t.reasons.split(',').map((r: string) => r.trim());
          }
          const primaryReason = reasonsList.length > 0 ? reasonsList[0] : 'Elevated Anomaly Score';
          const region = getRegionNameByCoords(t.lat, t.lon);
          return {
            id: t.trackId,
            title: `${primaryReason} — ${t.assetName || t.trackId}`,
            description: `Track ${t.trackId} detected in ${region}. Score: ${t.score?.toFixed(0) || 0}/100. ${reasonsList.slice(0, 2).join('; ')}`,
            severity: (t.severity || 'medium') as 'critical' | 'high' | 'medium' | 'low',
            region,
            time: formatTimeAgo(new Date(t.timestamp).getTime()),
            score: t.score || 0,
            trackId: t.trackId,
            assetName: t.assetName || t.trackId,
          };
        })
      : liveTraces.length > 0
        ? [
            {
              id: 'no-matches',
              title: 'No matching alerts',
              description: 'No telemetry alerts match your current timeline, severity, or watch zone filters.',
              severity: 'low',
              region: 'AOR',
              time: '—',
              score: 0,
              trackId: '',
              assetName: 'Filter',
            },
          ]
        : [
            {
              id: 't1',
              title: 'Awaiting telemetry data',
              description: 'Live vessel and aircraft tracking will appear here once the data pipeline is active.',
              severity: 'low',
              region: 'Strait of Hormuz',
              time: '—',
              score: 0,
              trackId: '',
              assetName: 'System',
            },
            {
              id: 't2',
              title: 'No alerts detected',
              description: 'The monitoring system is operational and processing AIS/ADS-B feeds for anomaly detection.',
              severity: 'low',
              region: 'Persian Gulf',
              time: '—',
              score: 0,
              trackId: '',
              assetName: 'System',
            },
          ];

  const criticalCount = topThreats.filter((t) => t.severity === 'critical').length;
  const highCount = topThreats.filter((t) => t.severity === 'high').length;
  const totalThreats = topThreats.length;

  const vesselCount =
    liveStats?.maritimeCount && liveStats.maritimeCount > 0
      ? liveStats.maritimeCount
      : rawMetrics?.maritimeCount && rawMetrics.maritimeCount > 0
      ? rawMetrics.maritimeCount
      : liveTraces.filter((t: any) => {
          const type = t.objectType;
          if (type) return type === 'vessel';
          return (
            !String(t.trackId).startsWith('FLIGHT') &&
            !String(t.trackId).startsWith('ADS-B') &&
            !String(t.trackId).startsWith('ICAO-')
          );
        }).length;

  const aircraftCount =
    liveStats?.aviationCount && liveStats.aviationCount > 0
      ? liveStats.aviationCount
      : rawMetrics?.aviationCount && rawMetrics.aviationCount > 0
      ? rawMetrics.aviationCount
      : liveTraces.filter((t: any) => {
          const type = t.objectType;
          if (type) return type === 'aircraft';
          return (
            String(t.trackId).startsWith('FLIGHT') ||
            String(t.trackId).startsWith('ADS-B') ||
            String(t.trackId).startsWith('ICAO-') ||
            t.altitude !== undefined
          );
        }).length;

  return {
    metrics: displayMetrics,
    rawMetrics,
    isMetricsLoading,
    liveTraces,
    filteredTraces,
    topThreats,
    newsItems,
    blockade,
    transits,
    criticalCount,
    highCount,
    totalThreats,
    vesselCount,
    aircraftCount,
    systemHealth,
    wsStatus,
  };
}
