import React, { useMemo } from 'react';
import {
  Activity,
  Cpu,
  FileText,
  Globe,
  Loader2,
  LocateFixed,
  Plane,
  Radio,
  Rss,
  ShieldAlert,
  Ship,
} from 'lucide-react';
import type { BlockadeIndicators, HealthResponse, TransitSummary } from '@/lib/api';
import { cn } from '@/utils/cn';
import { HudMetricBadge, type HudMetricConfig } from './HudMetricBadge';
import { LayerToggleGroup } from './LayerToggleGroup';
import type { SystemMetricLogs } from '@/types/health';

export interface HomeTopBarProps {
  // Tab state
  tabs: Array<{ id: 'map' | 'intelligence' | 'feed'; label: string; icon: any }>;
  activeTab: 'map' | 'intelligence' | 'feed';
  onTabChange: (tab: 'map' | 'intelligence' | 'feed') => void;

  // Timeline & Filters
  timelineOptions: readonly string[];
  timeline: string;
  onTimelineChange: (val: any) => void;
  severityFilter: string;
  onSeverityFilterChange: (val: string) => void;
  regionFilter: string;
  onRegionFilterChange: (val: string) => void;

  // Layer Toggles
  showVessels: boolean;
  onToggleVessels: () => void;
  showAircraft: boolean;
  onToggleAircraft: () => void;
  showConflicts: boolean;
  onToggleConflicts: () => void;
  showAreas: boolean;
  onToggleAreas: () => void;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  showMetrics: boolean;
  onToggleMetrics: () => void;

  // Actions
  onRecenter: () => void;
  onGenerateReport: () => void;
  reportGenerating: boolean;

  // Status HUD Data
  vesselCount: number;
  aircraftCount: number;
  newsCount: number;
  totalTracks?: number;
  blockade?: BlockadeIndicators | null;
  transits?: TransitSummary | null;
  systemHealth?: HealthResponse | null;
  wsStatus?: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  latestLogs?: SystemMetricLogs;
}

export const HomeTopBar: React.FC<HomeTopBarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  timelineOptions,
  timeline,
  onTimelineChange,
  severityFilter,
  onSeverityFilterChange,
  regionFilter,
  onRegionFilterChange,
  showVessels,
  onToggleVessels,
  showAircraft,
  onToggleAircraft,
  showConflicts,
  onToggleConflicts,
  showAreas,
  onToggleAreas,
  showHeatmap,
  onToggleHeatmap,
  showMetrics,
  onToggleMetrics,
  onRecenter,
  onGenerateReport,
  reportGenerating,
  vesselCount,
  aircraftCount,
  newsCount,
  totalTracks,
  blockade,
  transits,
  systemHealth,
  wsStatus,
  latestLogs,
}) => {
  const isHealthy = systemHealth?.status === 'healthy';
  const isDegraded = systemHealth?.status === 'degraded';
  const dbHealth = systemHealth?.components?.database;
  const mlHealth = systemHealth?.components?.ml_service;
  const isWsConnected = wsStatus === 'connected';

  // Compose declarative HUD metrics array
  const hudMetrics: HudMetricConfig[] = useMemo(() => {
    return [
      {
        id: 'core-api',
        label: 'CORE API',
        value: systemHealth?.status ? systemHealth.status.toUpperCase() : 'CONNECTING',
        icon: Activity,
        iconColor: isHealthy ? 'text-emerald-400' : isDegraded ? 'text-amber-400' : 'text-rose-400',
        statusColor: isHealthy ? 'emerald' : isDegraded ? 'amber' : 'rose',
        ping: !isHealthy && !isDegraded,
        pulse: isHealthy,
        extraInfo: dbHealth && (
          <span className="text-[10px] text-[var(--color-fg-muted)]">
            (DB: {dbHealth.healthy ? `${dbHealth.ping_ms}ms` : 'ERR'})
          </span>
        ),
        hoverTitle: 'CORE API & DATABASE LOG',
        log: latestLogs?.api,
        defaultMessage: 'GET /health [HTTP 200] — System status: HEALTHY',
        defaultDetails: 'PostgreSQL connection pool active & responsive',
      },
      {
        id: 'ais-maritime',
        label: 'AIS MARITIME',
        value: vesselCount > 0 ? `${vesselCount} VESSELS` : 'INGESTING',
        icon: Ship,
        iconColor: 'text-emerald-400',
        statusColor: 'emerald',
        pulse: true,
        hoverTitle: 'AIS TELEMETRY LOG',
        log: latestLogs?.ais,
        defaultMessage: 'AISStream & AISHub packet reception active',
        defaultDetails: 'Strait of Hormuz & Persian Gulf bounding sector',
      },
      {
        id: 'adsb-air',
        label: 'ADS-B AIR',
        value: aircraftCount > 0 ? `${aircraftCount} TRACKING` : 'STREAMING',
        icon: Plane,
        iconColor: 'text-sky-400',
        statusColor: 'sky',
        pulse: true,
        hoverTitle: 'ADS-B AIR CORRIDOR LOG',
        log: latestLogs?.adsb,
        defaultMessage: 'OpenSky live transponder feed active',
        defaultDetails: 'Regional airspace flight tracking and squawk auditing',
      },
      {
        id: 'ml-ensemble',
        label: 'ML ENSEMBLE',
        value: mlHealth?.healthy
          ? totalTracks !== undefined
            ? `${totalTracks} TRACKS`
            : 'ONLINE (6/6)'
          : `CIRCUIT ${mlHealth?.circuit || 'FALLBACK'}`,
        icon: Cpu,
        iconColor: mlHealth?.healthy ? 'text-emerald-400' : 'text-amber-400',
        statusColor: mlHealth?.healthy ? 'emerald' : 'amber',
        pulse: mlHealth?.healthy,
        hoverTitle: 'ML INFERENCE ENSEMBLE LOG',
        log: latestLogs?.ml,
        defaultMessage: 'Isolation Forest & DBSCAN anomaly scorers online',
        defaultDetails: 'gRPC inference socket connected on port :8091',
      },
      {
        id: 'ws-stream',
        label: 'WS STREAM',
        value: isWsConnected ? 'CONNECTED' : wsStatus?.toUpperCase() || 'OFFLINE',
        icon: Radio,
        iconColor: isWsConnected ? 'text-purple-400' : 'text-amber-400',
        statusColor: isWsConnected ? 'purple' : 'amber',
        pulse: isWsConnected,
        ping: !isWsConnected,
        hoverTitle: 'WEBSOCKET TELEMETRY LOG',
        log: latestLogs?.ws,
        defaultMessage: 'WebSocket stream connection active',
        defaultDetails: 'Protocol: RFC 6455 | Auto-reconnect enabled',
      },
      {
        id: 'news-pipeline',
        label: 'NEWS PIPELINE',
        value: newsCount > 0 ? `${newsCount} ARTICLES` : 'POLLING',
        icon: Rss,
        iconColor: 'text-indigo-400',
        statusColor: 'indigo',
        pulse: true,
        hoverTitle: 'GDELT NEWS PIPELINE LOG',
        log: latestLogs?.news,
        defaultMessage: 'GDELT 2.0 & RSS geopolitical scraper active',
        defaultDetails: 'Scraping Middle East maritime risk & naval reports',
      },
    ];
  }, [
    systemHealth,
    isHealthy,
    isDegraded,
    dbHealth,
    mlHealth,
    isWsConnected,
    wsStatus,
    vesselCount,
    aircraftCount,
    totalTracks,
    newsCount,
    latestLogs,
  ]);

  return (
    <>
      {/* Top Tab Bar */}
      <div className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-md">
        <div className="flex px-4 py-2">
          {tabs.map((tab, idx) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold transition-all border border-[var(--color-border)]',
                idx > 0 && '-ml-px',
                activeTab === tab.id
                  ? 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)] z-10'
                  : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)]'
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Control Bar (shown for map tab) */}
      {activeTab === 'map' && (
        <div className="shrink-0 mx-3 my-2 px-4 py-2 flex items-center gap-3 flex-wrap border border-[var(--color-border)] bg-[var(--color-bg-card)]/80 backdrop-blur-md">
          {/* Timeline Segmented Buttons */}
          <div className="flex" role="group" aria-label="Time range filter">
            {timelineOptions.map((opt, idx) => (
              <button
                key={opt}
                onClick={() => onTimelineChange(opt)}
                className={cn(
                  'px-3 py-1.5 font-data text-xs font-medium transition-all border border-[var(--color-border)]',
                  timeline === opt
                    ? 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)] z-10'
                    : 'bg-transparent text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg)]',
                  idx > 0 && '-ml-px'
                )}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-[var(--color-border)] hidden sm:block" />

          {/* Molecular Layer Visibility Toggles */}
          <LayerToggleGroup
            showVessels={showVessels}
            onToggleVessels={onToggleVessels}
            showAircraft={showAircraft}
            onToggleAircraft={onToggleAircraft}
            showConflicts={showConflicts}
            onToggleConflicts={onToggleConflicts}
            showAreas={showAreas}
            onToggleAreas={onToggleAreas}
            showHeatmap={showHeatmap}
            onToggleHeatmap={onToggleHeatmap}
            showMetrics={showMetrics}
            onToggleMetrics={onToggleMetrics}
          />

          <div className="w-px h-5 bg-[var(--color-border)] hidden sm:block" />

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => onSeverityFilterChange(e.target.value)}
            className="px-3 py-1.5 border border-[var(--color-border)] bg-[var(--color-bg)] font-ui text-xs text-[var(--color-fg)] cursor-pointer hover:border-[var(--color-primary-400)] transition-colors"
            aria-label="Severity filter"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Region & Area Filter */}
          <select
            value={regionFilter}
            onChange={(e) => onRegionFilterChange(e.target.value)}
            className="px-3 py-1.5 border border-[var(--color-border)] bg-[var(--color-bg)] font-ui text-xs text-[var(--color-fg)] cursor-pointer hover:border-[var(--color-primary-400)] transition-colors"
            aria-label="Region and Zone filter"
          >
            <option value="all">All Sectors & Zones</option>
            <optgroup label="Strategic Chokepoints">
              <option value="AREA-HORMUZ">Strait of Hormuz</option>
              <option value="AREA-RS-SOUTH">Bab-el-Mandeb</option>
              <option value="AREA-RS-NORTH">Red Sea & Suez</option>
              <option value="AREA-ADEN-IRTC">Gulf of Aden IRTC</option>
            </optgroup>
            <optgroup label="Persian Gulf & Terminals">
              <option value="AREA-PGULF">Persian Gulf Basin</option>
              <option value="AREA-RASTANURA">Ras Tanura Terminal</option>
              <option value="AREA-QATAR-LNG">Ras Laffan LNG</option>
              <option value="AREA-KHARG">Kharg Island Terminal</option>
              <option value="AREA-BANDARABBAS">Bandar Abbas / Qeshm</option>
            </optgroup>
            <optgroup label="Gulf of Oman & Anchorage Hubs">
              <option value="AREA-GOMAN">Gulf of Oman</option>
              <option value="AREA-FUJAIRAH">Fujairah Anchorage</option>
              <option value="AREA-JEBELALI">Jebel Ali Corridor</option>
            </optgroup>
          </select>

          {/* Recenter Map Button */}
          <button
            type="button"
            onClick={onRecenter}
            className="px-3 py-1.5 font-ui text-xs font-semibold transition-all border bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-primary-400)] hover:text-[var(--color-fg)] flex items-center gap-1.5"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            Recenter
          </button>

          <div className="w-px h-5 bg-[var(--color-border)] hidden sm:block mx-1" />

          {/* Generate Report Button */}
          <button
            type="button"
            onClick={onGenerateReport}
            disabled={reportGenerating}
            className={cn(
              'px-4 py-1.5 font-ui text-xs font-semibold transition-all border flex items-center gap-2',
              reportGenerating
                ? 'bg-[var(--color-primary-600)]/10 text-[var(--color-primary-600)] border-[var(--color-primary-600)]/30 cursor-wait'
                : 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] hover:border-[var(--color-primary-700)]'
            )}
            aria-label="Generate Intelligence Report"
          >
            {reportGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-3.5 w-3.5" />
                Generate Report
              </>
            )}
          </button>

          {/* Molecular Systems Health & Pipeline HUD Strip */}
          <div className="w-full pt-2 mt-1 border-t border-[var(--color-border)]/50 flex items-center justify-between gap-2 text-[11px] font-mono overflow-x-auto flex-nowrap">
            <div className="flex items-center gap-2 flex-nowrap">
              {hudMetrics.map((metric) => (
                <HudMetricBadge key={metric.id} {...metric} />
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-fg-muted)] pl-2 border-l border-[var(--color-border)] shrink-0">
              <Globe className="h-3 w-3 text-[var(--color-primary-400)] animate-spin-slow" />
              <span>MIDDLE EAST SECTOR (8.0°N–32.0°N, 32.0°E–76.0°E)</span>
            </div>
          </div>

          {/* Transit & Blockade Status Strip */}
          {blockade && (
            <div className="w-full pt-2 mt-1 border-t border-[var(--color-border)]/50 flex items-center gap-2 text-[11px] font-mono overflow-x-auto flex-nowrap">
              <div
                className={cn(
                  'px-2.5 py-1 border font-semibold flex items-center gap-1.5',
                  blockade.strait_status === 'ACTIVE' && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                  blockade.strait_status === 'LIMITED' && 'bg-amber-500/10 border-amber-500/30 text-amber-400',
                  blockade.strait_status === 'NO_TRANSIT' && 'bg-red-500/10 border-red-500/30 text-red-400'
                )}
              >
                <ShieldAlert className="h-3 w-3" />
                {blockade.strait_status === 'NO_TRANSIT' ? 'NO TRANSIT' : blockade.strait_status}
              </div>
              <span className="text-[var(--color-fg-subtle)]">
                Transits: <span className="font-bold text-[var(--color-fg)]">{blockade.strait_transits_24h}</span>
              </span>
              <span className="text-[var(--color-fg-subtle)]">
                Anchored: <span className="font-bold text-[var(--color-fg)]">{blockade.anchored_ratio_pct?.toFixed(0)}%</span>
              </span>
              <span className="text-[var(--color-fg-subtle)]">
                Waiting 6h+: <span className={cn('font-bold', blockade.waiting_fleet_6h > 10 ? 'text-amber-400' : 'text-[var(--color-fg)]')}>{blockade.waiting_fleet_6h}</span>
              </span>
              {transits?.recent_events && transits.recent_events.length > 0 && (
                <span className="text-[var(--color-fg-muted)] ml-auto text-[10px]">
                  Latest: {transits.recent_events[0].ship_name || `MMSI ${transits.recent_events[0].mmsi}`}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};
