import {
  Activity,
  AlertTriangle,
  Cpu,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Layers,
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

export interface MetricLog {
  time: string;
  message: string;
  details?: string;
  status?: 'ok' | 'warn' | 'error';
}

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
  latestLogs?: {
    api?: MetricLog;
    ais?: MetricLog;
    adsb?: MetricLog;
    ml?: MetricLog;
    ws?: MetricLog;
    news?: MetricLog;
  };
}

export function HomeTopBar({
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
}: HomeTopBarProps) {
  const isHealthy = systemHealth?.status === 'healthy';
  const isDegraded = systemHealth?.status === 'degraded';
  const dbHealth = systemHealth?.components?.database;
  const mlHealth = systemHealth?.components?.ml_service;
  const isWsConnected = wsStatus === 'connected';

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

          {/* Layer Visibility Toggles */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[var(--color-fg-muted)] uppercase tracking-wider mr-0.5">Show:</span>
            <button
              type="button"
              onClick={onToggleVessels}
              className={cn(
                'px-2.5 py-1 text-[11px] font-semibold transition-all border flex items-center gap-1',
                showVessels
                  ? 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)]'
                  : 'bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-primary-400)]'
              )}
            >
              <Ship className="h-3.5 w-3.5" />
              Vessels
            </button>
            <button
              type="button"
              onClick={onToggleAircraft}
              className={cn(
                'px-2.5 py-1 text-[11px] font-semibold transition-all border flex items-center gap-1',
                showAircraft
                  ? 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)]'
                  : 'bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-primary-400)]'
              )}
            >
              <Plane className="h-3.5 w-3.5" />
              Aircraft
            </button>
            <button
              type="button"
              onClick={onToggleConflicts}
              className={cn(
                'px-2.5 py-1 text-[11px] font-semibold transition-all border flex items-center gap-1',
                showConflicts
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-primary-400)]'
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Conflicts
            </button>
            <button
              type="button"
              onClick={onToggleAreas}
              className={cn(
                'px-2.5 py-1 text-[11px] font-semibold transition-all border flex items-center gap-1',
                showAreas
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-primary-400)]'
              )}
              title="Toggle Strategic Watch Zones & Chokepoints"
            >
              <Layers className="h-3.5 w-3.5" />
              Areas
            </button>
          </div>

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

          {/* Heatmap Toggle */}
          <button
            type="button"
            onClick={onToggleHeatmap}
            className={cn(
              'px-3 py-1.5 font-ui text-xs font-semibold transition-all border flex items-center gap-1.5',
              showHeatmap
                ? 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)]'
                : 'bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-primary-400)]'
            )}
          >
            {showHeatmap ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {showHeatmap ? 'Heatmap On' : 'Heatmap'}
          </button>

          {/* Metrics HUD Toggle */}
          <button
            type="button"
            onClick={onToggleMetrics}
            className={cn(
              'px-3 py-1.5 font-ui text-xs font-semibold transition-all border flex items-center gap-1.5',
              showMetrics
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-primary-400)]'
            )}
          >
            <Activity className="h-3.5 w-3.5" />
            {showMetrics ? 'Metrics On' : 'Metrics'}
          </button>

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

          {/* Real Live Systems Health & Pipeline HUD Strip with Hover Logs */}
          <div className="w-full pt-2 mt-1 border-t border-[var(--color-border)]/50 flex items-center justify-between gap-2 text-[11px] font-mono overflow-x-auto flex-nowrap">
            <div className="flex items-center gap-2">
              {/* Go Core API Health */}
              <div className="relative group flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-fg)] hover:border-[var(--color-primary-400)] transition-colors cursor-pointer">
                <Activity className={cn("h-3.5 w-3.5", isHealthy ? "text-emerald-400" : isDegraded ? "text-amber-400" : "text-rose-400")} />
                <span className="text-[var(--color-fg-subtle)] font-medium">CORE API:</span>
                <span className={cn("font-bold", isHealthy ? "text-emerald-400" : isDegraded ? "text-amber-400" : "text-rose-400")}>
                  {systemHealth?.status ? systemHealth.status.toUpperCase() : 'CONNECTING'}
                </span>
                {dbHealth && (
                  <span className="text-[10px] text-[var(--color-fg-muted)]">
                    (DB: {dbHealth.healthy ? `${dbHealth.ping_ms}ms` : 'ERR'})
                  </span>
                )}
                <span className={cn("w-2 h-2 rounded-full", isHealthy ? "bg-emerald-500 animate-pulse" : isDegraded ? "bg-amber-500" : "bg-rose-500 animate-ping")}></span>

                {/* Hover Log Card */}
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:flex flex-col z-50 w-80 p-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] shadow-2xl backdrop-blur-md text-left pointer-events-none transition-all">
                  <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--color-primary-400)]">
                      <Activity className="h-3 w-3" />
                      <span>CORE API & DATABASE LOG</span>
                    </div>
                    <span className="text-[9px] font-mono text-[var(--color-fg-muted)]">
                      {latestLogs?.api?.time || 'LIVE'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--color-fg)] font-medium leading-tight">
                    {latestLogs?.api?.message || 'GET /health -> 200 OK'}
                  </div>
                  {latestLogs?.api?.details && (
                    <div className="mt-1.5 pt-1.5 border-t border-[var(--color-border)]/50 text-[10px] font-mono text-[var(--color-fg-muted)] leading-normal break-words">
                      {latestLogs.api.details}
                    </div>
                  )}
                </div>
              </div>

              {/* AIS Maritime Telemetry */}
              <div className="relative group flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-fg)] hover:border-emerald-500 transition-colors cursor-pointer">
                <Ship className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[var(--color-fg-subtle)] font-medium">AIS MARITIME:</span>
                <span className="font-bold text-emerald-400">{vesselCount > 0 ? `${vesselCount} VESSELS` : 'INGESTING'}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>

                {/* Hover Log Card */}
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:flex flex-col z-50 w-80 p-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] shadow-2xl backdrop-blur-md text-left pointer-events-none transition-all">
                  <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                      <Ship className="h-3 w-3" />
                      <span>AIS TELEMETRY LOG</span>
                    </div>
                    <span className="text-[9px] font-mono text-[var(--color-fg-muted)]">
                      {latestLogs?.ais?.time || 'LIVE'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--color-fg)] font-medium leading-tight">
                    {latestLogs?.ais?.message || 'AISStream feed active'}
                  </div>
                  {latestLogs?.ais?.details && (
                    <div className="mt-1.5 pt-1.5 border-t border-[var(--color-border)]/50 text-[10px] font-mono text-[var(--color-fg-muted)] leading-normal break-words">
                      {latestLogs.ais.details}
                    </div>
                  )}
                </div>
              </div>

              {/* ADS-B Air Telemetry */}
              <div className="relative group flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-fg)] hover:border-sky-500 transition-colors cursor-pointer">
                <Plane className="h-3.5 w-3.5 text-sky-400" />
                <span className="text-[var(--color-fg-subtle)] font-medium">ADS-B AIR:</span>
                <span className="font-bold text-sky-400">{aircraftCount > 0 ? `${aircraftCount} TRACKING` : 'STREAMING'}</span>
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>

                {/* Hover Log Card */}
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:flex flex-col z-50 w-80 p-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] shadow-2xl backdrop-blur-md text-left pointer-events-none transition-all">
                  <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-400">
                      <Plane className="h-3 w-3" />
                      <span>ADS-B AIR CORRIDOR LOG</span>
                    </div>
                    <span className="text-[9px] font-mono text-[var(--color-fg-muted)]">
                      {latestLogs?.adsb?.time || 'LIVE'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--color-fg)] font-medium leading-tight">
                    {latestLogs?.adsb?.message || 'OpenSky stream active'}
                  </div>
                  {latestLogs?.adsb?.details && (
                    <div className="mt-1.5 pt-1.5 border-t border-[var(--color-border)]/50 text-[10px] font-mono text-[var(--color-fg-muted)] leading-normal break-words">
                      {latestLogs.adsb.details}
                    </div>
                  )}
                </div>
              </div>

              {/* ML Anomaly Ensemble Engine */}
              <div className="relative group flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-fg)] hover:border-amber-500 transition-colors cursor-pointer">
                <Cpu className={cn("h-3.5 w-3.5", mlHealth?.healthy ? "text-emerald-400" : "text-amber-400")} />
                <span className="text-[var(--color-fg-subtle)] font-medium">ML ENSEMBLE:</span>
                <span className={cn("font-bold", mlHealth?.healthy ? "text-emerald-400" : "text-amber-400")}>
                  {mlHealth?.healthy
                    ? (totalTracks !== undefined ? `${totalTracks} TRACKS` : 'ONLINE (6/6)')
                    : `CIRCUIT ${mlHealth?.circuit || 'FALLBACK'}`}
                </span>
                <span className={cn("w-2 h-2 rounded-full", mlHealth?.healthy ? "bg-emerald-500 animate-pulse" : "bg-amber-500")}></span>

                {/* Hover Log Card */}
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:flex flex-col z-50 w-80 p-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] shadow-2xl backdrop-blur-md text-left pointer-events-none transition-all">
                  <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400">
                      <Cpu className="h-3 w-3" />
                      <span>ML INFERENCE ENSEMBLE LOG</span>
                    </div>
                    <span className="text-[9px] font-mono text-[var(--color-fg-muted)]">
                      {latestLogs?.ml?.time || 'LIVE'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--color-fg)] font-medium leading-tight">
                    {latestLogs?.ml?.message || 'Isolation Forest & DBSCAN active'}
                  </div>
                  {latestLogs?.ml?.details && (
                    <div className="mt-1.5 pt-1.5 border-t border-[var(--color-border)]/50 text-[10px] font-mono text-[var(--color-fg-muted)] leading-normal break-words">
                      {latestLogs.ml.details}
                    </div>
                  )}
                </div>
              </div>

              {/* WebSocket Real-time Stream */}
              <div className="relative group flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-fg)] hover:border-purple-500 transition-colors cursor-pointer">
                <Radio className={cn("h-3.5 w-3.5", isWsConnected ? "text-purple-400" : "text-amber-400")} />
                <span className="text-[var(--color-fg-subtle)] font-medium">WS STREAM:</span>
                <span className={cn("font-bold", isWsConnected ? "text-purple-400" : "text-amber-400")}>
                  {isWsConnected ? 'CONNECTED' : wsStatus?.toUpperCase() || 'OFFLINE'}
                </span>
                <span className={cn("w-2 h-2 rounded-full", isWsConnected ? "bg-purple-500 animate-pulse" : "bg-amber-500 animate-ping")}></span>

                {/* Hover Log Card */}
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:flex flex-col z-50 w-84 p-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] shadow-2xl backdrop-blur-md text-left pointer-events-none transition-all">
                  <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-400">
                      <Radio className="h-3 w-3" />
                      <span>WEBSOCKET TELEMETRY LOG</span>
                    </div>
                    <span className="text-[9px] font-mono text-[var(--color-fg-muted)]">
                      {latestLogs?.ws?.time || 'LIVE'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--color-fg)] font-medium leading-tight">
                    {latestLogs?.ws?.message || 'WS Stream active'}
                  </div>
                  {latestLogs?.ws?.details && (
                    <div className="mt-1.5 pt-1.5 border-t border-[var(--color-border)]/50 text-[10px] font-mono text-[var(--color-fg-muted)] leading-normal break-words">
                      {latestLogs.ws.details}
                    </div>
                  )}
                </div>
              </div>

              {/* News Articles Pipeline */}
              <div className="relative group flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-fg)] hover:border-indigo-500 transition-colors cursor-pointer">
                <Rss className="h-3.5 w-3.5 text-indigo-400" />
                <span className="text-[var(--color-fg-subtle)] font-medium">NEWS PIPELINE:</span>
                <span className="font-bold text-indigo-400">{newsCount > 0 ? `${newsCount} ARTICLES` : 'POLLING'}</span>
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>

                {/* Hover Log Card */}
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:flex flex-col z-50 w-80 p-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] shadow-2xl backdrop-blur-md text-left pointer-events-none transition-all">
                  <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400">
                      <Rss className="h-3 w-3" />
                      <span>GDELT NEWS PIPELINE LOG</span>
                    </div>
                    <span className="text-[9px] font-mono text-[var(--color-fg-muted)]">
                      {latestLogs?.news?.time || 'LIVE'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--color-fg)] font-medium leading-tight">
                    {latestLogs?.news?.message || 'GDELT 2.0 scraper active'}
                  </div>
                  {latestLogs?.news?.details && (
                    <div className="mt-1.5 pt-1.5 border-t border-[var(--color-border)]/50 text-[10px] font-mono text-[var(--color-fg-muted)] leading-normal break-words">
                      {latestLogs.news.details}
                    </div>
                  )}
                </div>
              </div>
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
                  {' · '}
                  {transits.recent_events[0].direction === 'INBOUND' ? '→ IN' : '← OUT'}
                  {' · '}
                  {transits.recent_events[0].gate}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
