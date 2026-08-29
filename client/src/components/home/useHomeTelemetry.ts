import { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getTopTraces,
  getPublicTracks,
  getNews,
  getBlockadeIndicators,
  getTransits,
  getPublicMetrics,
  type PublicMetricsResponse,
  type TracksResponse,
  type TopTracesResponse,
  type NewsResponse,
  type BlockadeIndicators,
  type TransitSummary,
} from '@/lib/api';
import { useRealtimeStore } from '@/stores';
import { useHealthStore } from '@/stores/slices/health.store';
import { useMapStateStore } from '@/stores/slices/map.store';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { useLiveTelemetry } from '@/hooks/useLiveTelemetry';
import type { ThreatItem } from '@/types/threats';

export interface UseHomeTelemetryProps {
  initialMetrics?: PublicMetricsResponse;
  initialTracks?: TracksResponse;
  initialTraces?: TopTracesResponse;
  initialNews?: NewsResponse;
  severityFilter?: string;
  regionFilter?: string;
  timeline?: string;
  showVessels?: boolean;
  showAircraft?: boolean;
  showConflicts?: boolean;
  showAreas?: boolean;
  showMetrics?: boolean;
}

export function useHomeTelemetry({
  initialMetrics,
  initialTracks,
  initialTraces,
  initialNews,
  severityFilter: severityFilterProp,
  regionFilter: _regionFilterProp,
  timeline: _timelineProp,
  showVessels: showVesselsProp,
  showAircraft: showAircraftProp,
  showConflicts: showConflictsProp,
}: UseHomeTelemetryProps = {}) {
  // Use map store for layer states and filters
  const storeLayers = useMapStateStore((s) => s.layers);
  const storeSeverity = useMapStateStore((s) => s.severityFilter);

  const showVessels = showVesselsProp ?? storeLayers.vessels;
  const showAircraft = showAircraftProp ?? storeLayers.aircraft;
  const showConflicts = showConflictsProp ?? storeLayers.conflicts;
  const severityFilter = severityFilterProp ?? storeSeverity;

  // Real-time backend system health & HUD logs
  const { health: systemHealth } = useSystemHealth(10000);
  const latestLogs = useHealthStore((s) => s.latestLogs);

  // Poll REST metrics every 10s as real-time baseline
  const { data: metricsData } = useQuery<PublicMetricsResponse>({
    queryKey: ['public-metrics-home'],
    queryFn: getPublicMetrics,
    initialData: initialMetrics ?? undefined,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  // Query for all active tracks (vessels + flights)
  const { data: publicTracksData } = useQuery<TracksResponse>({
    queryKey: ['public-tracks-home'],
    queryFn: getPublicTracks,
    initialData: initialTracks ?? undefined,
    refetchInterval: 20000,
    staleTime: 10000,
  });

  // Queries for background intelligence feeds
  const { data: tracesData } = useQuery({
    queryKey: ['public-traces-home'],
    queryFn: getTopTraces,
    initialData: initialTraces ?? undefined,
    refetchInterval: 30000,
    staleTime: 15000,
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

  // Merge initial REST tracks and traces to seed live telemetry
  const seedTracks = useMemo(() => {
    const map = new Map<string, any>();
    if (publicTracksData?.data) {
      for (const t of publicTracksData.data) {
        if (t.trackId) map.set(t.trackId, t);
      }
    }
    if (tracesData?.traces) {
      for (const t of tracesData.traces) {
        if (t.trackId) {
          const existing = map.get(t.trackId) || {};
          map.set(t.trackId, { ...existing, ...t });
        }
      }
    }
    return Array.from(map.values());
  }, [publicTracksData?.data, tracesData?.traces]);

  // Live WebSocket streams
  const { tracks: allLiveTraces, wsStatus } = useLiveTelemetry(seedTracks);
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

  // Dynamically filter active traces based on show toggles & region filters
  const activeVisibleTraces = useMemo(() => {
    return allLiveTraces.filter((t) => {
      const isAir = String(t.trackId || '').startsWith('FLIGHT') || (t as any).altitude !== undefined;
      if (isAir && !showAircraft) return false;
      if (!isAir && !showVessels) return false;
      if (!showConflicts && (t.severity === 'critical' || t.severity === 'high')) return false;
      return true;
    });
  }, [allLiveTraces, showVessels, showAircraft, showConflicts]);

  // Compute live dynamic metrics reflecting active toggles & real-time telemetry
  const displayMetrics = useMemo(() => {
    const rawMetrics = metricsData?.metrics;
    const baseVesselCount =
      liveStats?.maritimeCount ??
      rawMetrics?.maritimeCount ??
      allLiveTraces.filter((t) => !String(t.trackId || '').startsWith('FLIGHT')).length;
    const baseAircraftCount =
      liveStats?.aviationCount ??
      rawMetrics?.aviationCount ??
      allLiveTraces.filter((t) => String(t.trackId || '').startsWith('FLIGHT')).length;

    const effectiveVessels = showVessels ? baseVesselCount : 0;
    const effectiveAircraft = showAircraft ? baseAircraftCount : 0;
    const effectiveTotal = effectiveVessels + effectiveAircraft;

    const critical = showConflicts
      ? (rawMetrics?.criticalCount ??
        liveStats?.highAnomalyCount ??
        activeVisibleTraces.filter((t) => t.severity === 'critical').length)
      : 0;
    const high = showConflicts
      ? (rawMetrics?.highCount ??
        (liveStats?.totalAnomalies ? Math.max(0, liveStats.totalAnomalies - (liveStats.highAnomalyCount || 0)) : 0) ??
        activeVisibleTraces.filter((t) => t.severity === 'high').length)
      : 0;
    const medium = activeVisibleTraces.filter((t) => t.severity === 'medium').length;
    const low = activeVisibleTraces.filter((t) => t.severity === 'low' || !t.severity).length;

    const avgScore =
      activeVisibleTraces.length > 0
        ? Math.round(
            activeVisibleTraces.reduce((acc, t) => acc + (t.score || 0), 0) / activeVisibleTraces.length
          )
        : (rawMetrics?.avgScore ?? 0);

    return {
      maritimeCount: effectiveVessels,
      aviationCount: effectiveAircraft,
      totalTracks: effectiveTotal,
      criticalCount: critical,
      highCount: high,
      mediumCount: medium,
      lowCount: low,
      avgScore,
      activeRegions: rawMetrics?.activeRegions ?? 0,
      timestamp: new Date().toISOString(),
    };
  }, [metricsData, liveStats, allLiveTraces, activeVisibleTraces, showVessels, showAircraft, showConflicts]);

  // Derived counts
  const vesselCount = displayMetrics.maritimeCount;
  const aircraftCount = displayMetrics.aviationCount;
  const criticalCount = displayMetrics.criticalCount;
  const highCount = displayMetrics.highCount;
  const totalThreats = criticalCount + highCount;

  // Filtered top threats for right intelligence drawer
  const topThreats: ThreatItem[] = useMemo(() => {
    return activeVisibleTraces
      .filter((t) => {
        if (severityFilter !== 'all' && t.severity !== severityFilter) return false;
        return true;
      })
      .slice(0, 15)
      .map((t) => {
        const reasonsList: string[] =
          typeof t.reasons === 'string'
            ? JSON.parse(t.reasons || '[]')
            : Array.isArray(t.reasons)
            ? t.reasons
            : [];
        const isAir = String(t.trackId || '').startsWith('FLIGHT');
        const severityVal = (t.severity || 'low') as 'critical' | 'high' | 'medium' | 'low';
        const scoreVal = t.score || 0;

        return {
          id: t.trackId,
          trackId: t.trackId,
          assetName: t.assetName || t.trackId,
          title: `${isAir ? 'Air Corridor Anomaly' : 'Vessel Deviation'}: ${t.assetName || t.trackId}`,
          description: reasonsList.join('; ') || 'Elevated behavioral anomaly detected by ML ensemble',
          severity: severityVal,
          region: 'Strait of Hormuz',
          time: t.updatedAt ? new Date(t.updatedAt).toLocaleTimeString() : new Date().toLocaleTimeString(),
          score: scoreVal,
          anomalyScore: scoreVal,
          reasons: reasonsList,
          timestamp: t.updatedAt || t.timestamp || new Date().toISOString(),
          lat: t.lat,
          lon: t.lon,
          speed: t.speed,
          heading: t.heading,
          domain: isAir ? 'aviation' : 'maritime',
        };
      });
  }, [activeVisibleTraces, severityFilter]);

  return {
    metrics: displayMetrics,
    isMetricsLoading: !metricsData && allLiveTraces.length === 0,
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
    showVessels,
    showAircraft,
    showConflicts,
    tracks: allLiveTraces,
    visibleTracks: activeVisibleTraces,
  };
}
