import {
  Activity,
  AlertTriangle,
  Cpu,
  Eye,
  EyeOff,
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
import type { BlockadeIndicators, TransitSummary } from '@/lib/api';
import { cn } from '@/utils/cn';

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
}: HomeTopBarProps) {
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

          {/* Region Filter */}
          <select
            value={regionFilter}
            onChange={(e) => onRegionFilterChange(e.target.value)}
            className="px-3 py-1.5 border border-[var(--color-border)] bg-[var(--color-bg)] font-ui text-xs text-[var(--color-fg)] cursor-pointer hover:border-[var(--color-primary-400)] transition-colors"
            aria-label="Region filter"
          >
            <option value="all">All Regions</option>
            <option value="hormuz">Strait of Hormuz</option>
            <option value="pgulf">Persian Gulf</option>
            <option value="goman">Gulf of Oman</option>
            <option value="redsea">Red Sea</option>
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

          {/* Live Pipeline Processing Status HUD Strip */}
          <div className="w-full pt-2 mt-1 border-t border-[var(--color-border)]/50 flex items-center justify-between gap-2 text-[11px] font-mono overflow-x-auto flex-nowrap">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-fg)]">
                <Ship className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[var(--color-fg-subtle)] font-medium">AIS STREAM:</span>
                <span className="font-bold text-emerald-400">{vesselCount > 0 ? `${vesselCount} VESSELS` : 'RECEIVING'}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-fg)]">
                <Plane className="h-3.5 w-3.5 text-sky-400" />
                <span className="text-[var(--color-fg-subtle)] font-medium">ADS-B AIR:</span>
                <span className="font-bold text-sky-400">{aircraftCount > 0 ? `${aircraftCount} TRACKING` : 'STREAMING'}</span>
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-fg)]">
                <Rss className="h-3.5 w-3.5 text-indigo-400" />
                <span className="text-[var(--color-fg-subtle)] font-medium">NEWS PIPELINE:</span>
                <span className="font-bold text-indigo-400">{newsCount > 0 ? `${newsCount} ARTICLES` : 'SCRAPING'}</span>
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-fg)]">
                <Cpu className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[var(--color-fg-subtle)] font-medium">ANOMALY ML ENGINE:</span>
                <span className="font-bold text-amber-400">{totalTracks !== undefined ? `${totalTracks} TRACKS` : 'ONLINE'}</span>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-fg)]">
                <Radio className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-[var(--color-fg-subtle)] font-medium">FIRMS / GDELT:</span>
                <span className="font-bold text-purple-400">INGESTION OK</span>
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
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
