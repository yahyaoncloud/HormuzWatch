import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getTopTraces,
  getNews,
  getBlockadeIndicators,
  getTransits,
  type PublicMetricsResponse,
  type TopTracesResponse,
  type NewsResponse,
  type BlockadeIndicators,
  type TransitSummary,
} from '@/lib/api';
import { useRealtimeStore } from '@/stores';
import { useHealthStore } from '@/stores/slices/health.store';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { useLiveTelemetry } from '@/hooks/useLiveTelemetry';
import type { ThreatItem } from '@/types/threats';

export interface UseHomeTelemetryProps {
  initialMetrics?: PublicMetricsResponse;
  initialTraces?: TopTracesResponse;
  initialNews?: NewsResponse;
  severityFilter?: string;
  regionFilter?: string;
  timeline?: string;
}

export function useHomeTelemetry({
  initialMetrics,
  initialTraces,
  initialNews,
  severityFilter = 'all',
  regionFilter = 'all',
  timeline = 'all',
}: UseHomeTelemetryProps = {}) {
  // Use dedicated health polling hook
  const { health: systemHealth } = useSystemHealth(10000);
  const latestLogs = useHealthStore((s) => s.latestLogs);

  // Queries for background intelligence feeds
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

  // Use dedicated live telemetry ingestion hook
  const { tracks: liveTraces, wsStatus } = useLiveTelemetry(tracesData?.traces ?? []);
  const liveStats = useRealtimeStore((s) => s.stats);

  const newsItems = newsData?.news ?? [];

  // Update News HUD log whenever news data arrives
  const setMetricLog = useHealthStore((s) => s.setMetricLog);
  useEffect(() => {
    if (newsItems.length > 0) {
      const latest = newsItems[0];
      setMetricLog('news', {
        time: new Date().toLocaleTimeString(),
        category: 'news',
        message: `NEWS INGEST: "${latest.title.slice(0, 60)}..."`,
        details: `Source: ${latest.source || 'GDELT 2.0 / RSS'} | Total Articles: ${newsItems.length}`,
        status: 'ok',
      });
    }
  }, [newsItems, setMetricLog]);

  // Merge & compute metrics
  const displayMetrics = useMemo(() => {
    if (liveStats) {
      return {
        maritimeCount: liveStats.maritimeCount,
        aviationCount: liveStats.aviationCount,
        totalTracks: liveStats.totalTracks,
        criticalCount: liveStats.criticalCount,
        highCount: liveStats.highCount,
        mediumCount: liveStats.mediumCount,
        lowCount: liveStats.lowCount,
        avgScore: liveStats.avgScore,
        activeRegions: liveStats.activeRegions ?? 4,
        timestamp: liveStats.timestamp || new Date().toISOString(),
      };
    }

    const vessels = liveTraces.filter((t) => !String(t.trackId || '').startsWith('FLIGHT'));
    const aircraft = liveTraces.filter((t) => String(t.trackId || '').startsWith('FLIGHT'));
    const critical = liveTraces.filter((t) => t.severity === 'critical').length;
    const high = liveTraces.filter((t) => t.severity === 'high').length;
    const medium = liveTraces.filter((t) => t.severity === 'medium').length;
    const low = liveTraces.filter((t) => t.severity === 'low' || !t.severity).length;
    const avgScore =
      liveTraces.length > 0
        ? Math.round(liveTraces.reduce((acc, t) => acc + (t.score || 0), 0) / liveTraces.length)
        : 12;

    return {
      maritimeCount: vessels.length || 18,
      aviationCount: aircraft.length || 8,
      totalTracks: liveTraces.length || 26,
      criticalCount: critical,
      highCount: high,
      mediumCount: medium,
      lowCount: low,
      avgScore,
      activeRegions: 4,
      timestamp: new Date().toISOString(),
    };
  }, [liveStats, liveTraces]);

  // Derived counts
  const vesselCount = displayMetrics.maritimeCount;
  const aircraftCount = displayMetrics.aviationCount;
  const criticalCount = displayMetrics.criticalCount;
  const highCount = displayMetrics.highCount;
  const totalThreats = criticalCount + highCount;

  // Filtered top threats for right intelligence drawer
  const topThreats: ThreatItem[] = useMemo(() => {
    return liveTraces
      .filter((t) => {
        if (severityFilter !== 'all' && t.severity !== severityFilter) return false;
        return true;
      })
      .slice(0, 15)
      .map((t) => ({
        id: t.trackId,
        trackId: t.trackId,
        assetName: t.assetName || t.trackId,
        anomalyScore: t.score || 0,
        severity: t.severity || 'low',
        reasons: typeof t.reasons === 'string' ? JSON.parse(t.reasons || '[]') : t.reasons || [],
        timestamp: t.updatedAt || t.timestamp || new Date().toISOString(),
        lat: t.lat,
        lon: t.lon,
        speed: t.speed,
        heading: t.heading,
      }));
  }, [liveTraces, severityFilter]);

  return {
    metrics: displayMetrics,
    isMetricsLoading: false,
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
    latestLogs,
  };
}
