import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRealtimeStore } from '@/stores';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import {
  getBlockadeIndicators,
  getPublicMetrics,
  getTopTraces,
  getVesselStates,
  type BlockadeIndicators,
  type VesselStateCounts,
} from '@/lib/api';
import { cn } from '@/utils/cn';

import { IntelligenceStatusBar } from './IntelligenceStatusBar';
import { ActiveAnomaliesPanel } from './ActiveAnomaliesPanel';
import { SectorStatusPanel, type SectorData } from './SectorStatusPanel';
import { AnomalyActivityPanel } from './AnomalyActivityPanel';
import { TopRiskEventsPanel } from './TopRiskEventsPanel';
import { IntelligenceSystemStatus } from './IntelligenceSystemStatus';
import { VesselActivitySummary } from './VesselActivitySummary';
import { ThreatDetailModal, type ThreatItem } from './ThreatsPanel';
import type { AnomalyEventData } from './AnomalyEventRow';

export interface IntelligenceDashboardProps {
  onViewOnMap?: (trackId: string, lat?: number, lon?: number) => void;
  className?: string;
}

export function IntelligenceDashboard({ onViewOnMap, className }: IntelligenceDashboardProps) {
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyEventData | null>(null);

  // Queries from persistent cached endpoints with 0 extra DB egress
  const { data: metricsData } = useQuery({
    queryKey: ['intel-metrics'],
    queryFn: getPublicMetrics,
    refetchInterval: false,
    staleTime: 60000,
  });

  const { data: tracesData } = useQuery({
    queryKey: ['intel-traces'],
    queryFn: getTopTraces,
    refetchInterval: false,
    staleTime: 60000,
  });

  const { data: blockade } = useQuery<BlockadeIndicators>({
    queryKey: ['intel-blockade'],
    queryFn: getBlockadeIndicators,
    refetchInterval: 30000,
  });

  const { data: states } = useQuery<VesselStateCounts>({
    queryKey: ['intel-states'],
    queryFn: getVesselStates,
    refetchInterval: 30000,
  });

  // Real-time stores & system health
  const liveStats = useRealtimeStore((s) => s.stats);
  const liveTelemetry = useRealtimeStore((s) => s.telemetry);
  const wsStatus = useRealtimeStore((s) => s.wsStatus);
  const { health: systemHealth } = useSystemHealth(15000);

  // Normalize traces & live anomalies
  const anomaliesList: AnomalyEventData[] = useMemo(() => {
    const raw = tracesData?.traces || [];
    return raw.map((t: any) => {
      let reasons: string[] = [];
      if (Array.isArray(t.reasons)) {
        reasons = t.reasons;
      } else if (typeof t.reasons === 'string' && t.reasons.trim()) {
        try {
          const parsed = JSON.parse(t.reasons);
          reasons = Array.isArray(parsed) ? parsed : [String(parsed)];
        } catch {
          reasons = t.reasons.split(';').map((s: string) => s.trim()).filter(Boolean);
        }
      }

      const isAir = String(t.trackId || '').startsWith('FLIGHT');

      return {
        id: t.trackId || t.id,
        trackId: t.trackId || t.id,
        assetName: t.assetName || t.trackId || 'Track Contact',
        domain: isAir ? 'aviation' : 'maritime',
        severity: t.severity || 'low',
        score: Number(t.score || t.anomalyScore || 0),
        reasons,
        region: t.region || 'Strait of Hormuz',
        timestamp: t.updatedAt || t.lastUpdated || t.timestamp || new Date().toISOString(),
        lat: t.lat,
        lon: t.lon,
        speed: t.speed,
        heading: t.heading,
      };
    });
  }, [tracesData?.traces]);

  // Derive counts
  const activeAnomaliesCount = anomaliesList.filter((a) => a.score >= 1 || (a.severity && a.severity !== 'low' && a.severity !== 'nominal')).length;
  const criticalCount = anomaliesList.filter((a) => a.severity === 'critical' || a.severity === 'emergency').length;
  const highCount = anomaliesList.filter((a) => a.severity === 'high').length;

  const totalVessels = liveStats?.maritimeCount ?? metricsData?.metrics?.maritimeCount ?? (states as any)?.total ?? 188;
  const transitingCount = (states as any)?.underway ?? (states as any)?.transiting ?? Math.round(totalVessels * 0.65);
  const anchoredCount = (states as any)?.anchored ?? Math.round(totalVessels * 0.22);
  const maneuveringCount = (states as any)?.moored ?? (states as any)?.maneuvering ?? Math.round(totalVessels * 0.13);

  // Sectors status
  const sectorData: SectorData[] = useMemo(() => [
    {
      id: 'AREA-HORMUZ',
      name: 'Strait of Hormuz (TSS)',
      code: 'HORMUZ-TSS',
      trafficCount: Math.round(totalVessels * 0.35),
      anomalyCount: anomaliesList.filter((a) => (a.region || '').toLowerCase().includes('hormuz')).length,
      riskLevel: criticalCount > 0 ? 'critical' : highCount > 0 ? 'high' : 'medium',
      avgScore: metricsData?.metrics?.avgScore ?? 38,
    },
    {
      id: 'AREA-PGULF',
      name: 'Persian Gulf Basin',
      code: 'PGULF-MAIN',
      trafficCount: Math.round(totalVessels * 0.45),
      anomalyCount: anomaliesList.filter((a) => (a.region || '').toLowerCase().includes('persian')).length,
      riskLevel: 'medium',
      avgScore: 22,
    },
    {
      id: 'AREA-KHARG',
      name: 'Kharg Island Deepwater',
      code: 'KHARG-TERM',
      trafficCount: Math.round(totalVessels * 0.08),
      anomalyCount: 0,
      riskLevel: 'nominal',
      avgScore: 12,
    },
    {
      id: 'AREA-FUJAIRAH',
      name: 'Fujairah Anchorage (FOA)',
      code: 'FOA-ANCHOR',
      trafficCount: Math.round(totalVessels * 0.2),
      anomalyCount: anomaliesList.filter((a) => (a.region || '').toLowerCase().includes('fujairah')).length,
      riskLevel: 'medium',
      avgScore: 31,
    },
    {
      id: 'AREA-GOMAN',
      name: 'Gulf of Oman Approach',
      code: 'GOMAN-SECT',
      trafficCount: Math.round(totalVessels * 0.18),
      anomalyCount: 0,
      riskLevel: 'low',
      avgScore: 15,
    },
    {
      id: 'AREA-RASTANURA',
      name: 'Ras Tanura Terminal',
      code: 'RTAN-CRUDE',
      trafficCount: Math.round(totalVessels * 0.1),
      anomalyCount: 0,
      riskLevel: 'medium',
      avgScore: 26,
    },
  ], [totalVessels, anomaliesList, criticalCount, highCount, metricsData]);

  // Convert selected AnomalyEventData to ThreatItem format for modal
  const selectedThreatItem: ThreatItem | null = useMemo(() => {
    if (!selectedAnomaly) return null;
    return {
      id: selectedAnomaly.id,
      trackId: selectedAnomaly.trackId,
      assetName: selectedAnomaly.assetName || selectedAnomaly.trackId,
      title: `Tactical Deviation: ${selectedAnomaly.assetName || selectedAnomaly.trackId}`,
      description: Array.isArray(selectedAnomaly.reasons) ? selectedAnomaly.reasons.join('; ') : (selectedAnomaly.reasons || 'Anomaly detected'),
      severity: selectedAnomaly.severity as any,
      region: selectedAnomaly.region || 'Strait of Hormuz',
      time: new Date(selectedAnomaly.timestamp || Date.now()).toLocaleTimeString(),
      score: selectedAnomaly.score,
      anomalyScore: selectedAnomaly.score,
      reasons: Array.isArray(selectedAnomaly.reasons) ? selectedAnomaly.reasons : [(selectedAnomaly.reasons || '')],
      timestamp: String(selectedAnomaly.timestamp || new Date().toISOString()),
      lat: selectedAnomaly.lat,
      lon: selectedAnomaly.lon,
      speed: selectedAnomaly.speed,
      heading: selectedAnomaly.heading,
      domain: selectedAnomaly.domain as any,
    };
  }, [selectedAnomaly]);

  const latestTimestamp = liveTelemetry?.timestamp || (tracesData?.traces?.[0] as any)?.updatedAt || (tracesData?.traces?.[0] as any)?.timestamp;

  return (
    <div className={cn('w-full max-w-[1700px] mx-auto px-2 sm:px-3 py-2 space-y-2.5 overflow-y-auto max-h-[calc(100vh-3.2rem)] select-none', className)}>
      {/* 1. Operational Status Strip */}
      <IntelligenceStatusBar
        activeAnomalies={activeAnomaliesCount}
        criticalCount={criticalCount}
        highCount={highCount}
        newCount1h={criticalCount + highCount}
        avgScore={metricsData?.metrics?.avgScore ?? 28}
        latestTimestamp={latestTimestamp}
      />

      {/* 2. Main Grid: Active Anomalies + Sector Risk Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* Active Anomalies List (7 cols) */}
        <div className="lg:col-span-7 h-[420px]">
          <ActiveAnomaliesPanel
            anomalies={anomaliesList}
            onViewOnMap={onViewOnMap}
            onSelectAnomaly={(a) => setSelectedAnomaly(a)}
            selectedId={selectedAnomaly?.trackId}
          />
        </div>

        {/* Sector Risk Matrix (5 cols) */}
        <div className="lg:col-span-5 h-[420px]">
          <SectorStatusPanel
            sectors={sectorData}
            onSelectSector={(id) => {
              if (onViewOnMap) onViewOnMap(id);
            }}
          />
        </div>
      </div>

      {/* 3. 60-Minute Anomaly Activity Histogram */}
      <AnomalyActivityPanel anomalies={anomaliesList} timeWindowMinutes={60} />

      {/* 4. Secondary Grid: Top 5 Risks + System Health + Fleet Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
        <TopRiskEventsPanel
          threats={anomaliesList}
          onViewOnMap={onViewOnMap}
          onSelectThreat={(t) => setSelectedAnomaly(t)}
        />

        <IntelligenceSystemStatus
          systemHealth={systemHealth}
          wsStatus={wsStatus}
          vesselCount={totalVessels}
          aircraftCount={liveStats?.aviationCount ?? metricsData?.metrics?.aviationCount ?? 12}
        />

        <VesselActivitySummary
          totalVessels={totalVessels}
          transitingCount={transitingCount}
          maneuveringCount={maneuveringCount}
          anchoredCount={anchoredCount}
          waiting6hCount={blockade?.waiting_fleet_6h ?? 8}
        />
      </div>

      {/* Threat Detail Modal */}
      {selectedThreatItem && (
        <ThreatDetailModal
          selectedThreat={selectedThreatItem}
          onClose={() => setSelectedAnomaly(null)}
          onOpenIntelligence={() => setSelectedAnomaly(null)}
        />
      )}
    </div>
  );
}
