import { lazy, Suspense, type MutableRefObject } from 'react';
import { AlertTriangle, Loader2, Newspaper, ShieldAlert, Ship } from 'lucide-react';
import { IntelligenceConsole } from '@/components/intelligence/IntelligenceConsole';
import { ThreatsPanel, type ThreatItem } from '@/components/intelligence/ThreatsPanel';
import type { BlockadeIndicators, TransitSummary } from '@/lib/api';
import { cn } from '@/utils/cn';

const LeafletMap = lazy(() =>
  import('@/components/maps/LeafletMap').then((m) => ({ default: m.LeafletMap }))
);

export interface HomeMapLayoutProps {
  leftPanelW: number;
  rightPanelW: number;
  onDragStart: (handle: 'left' | 'right', startX: number, startW: number) => void;
  highlightZoneRef: MutableRefObject<((id: string | null) => void) | null>;
  tracks?: any[];
  newsItems: any[];
  topThreats: ThreatItem[];
  totalThreats: number;
  criticalCount: number;
  highCount: number;
  selectedThreat: ThreatItem | null;
  onSelectThreat: (threat: ThreatItem | null) => void;
  onHoverThreat: (threat: ThreatItem | null) => void;

  // Map state
  showHeatmap: boolean;
  onHeatmapChange: (val: boolean) => void;
  showVessels: boolean;
  showAircraft: boolean;
  showConflicts: boolean;
  onShowConflictsChange: (val: boolean) => void;
  showAreas?: boolean;
  onShowAreasChange?: (val: boolean) => void;
  showMetrics: boolean;
  onShowMetricsChange: (val: boolean) => void;
  recenterTrigger: number;
  timeline: '1hr' | '3hr' | '6hr' | '12hr' | '24hr' | 'all';
  severityFilter: string;
  regionFilter: string;
  onRegionFilterChange?: (region: string) => void;
}

export function HomeMapLayout({
  leftPanelW,
  rightPanelW,
  onDragStart,
  highlightZoneRef,
  tracks,
  newsItems,
  topThreats,
  totalThreats,
  criticalCount,
  highCount,
  selectedThreat,
  onSelectThreat,
  onHoverThreat,
  showHeatmap,
  onHeatmapChange,
  showVessels,
  showAircraft,
  showConflicts,
  onShowConflictsChange,
  showAreas = true,
  onShowAreasChange: _onShowAreasChange,
  showMetrics,
  onShowMetricsChange,
  recenterTrigger,
  timeline,
  severityFilter,
  regionFilter,
  onRegionFilterChange,
}: HomeMapLayoutProps) {
  return (
    <div className="h-full w-full flex overflow-hidden">
      {/* Left Console */}
      <div style={{ width: leftPanelW }} className="flex-shrink-0 overflow-hidden h-full">
        <IntelligenceConsole
          highlightZone={(id) => highlightZoneRef.current?.(id)}
          newsItems={newsItems}
          selectedRegion={regionFilter}
          onSelectRegion={onRegionFilterChange}
        />
      </div>

      {/* Resize handle: console | map */}
      <div
        className="w-1 hover:w-1.5 bg-[var(--color-border)] hover:bg-[var(--color-primary-600)] cursor-col-resize transition-[width,background-color] duration-100 shrink-0"
        onMouseDown={(e) => onDragStart('left', e.clientX, leftPanelW)}
      />

      {/* Center — Map */}
      <main className="flex-1 min-w-0 flex flex-col h-full">
        <div className="flex-1 px-1.5 py-1 h-full">
          <div className="relative h-full w-full overflow-hidden border border-[var(--color-border)]">
            <Suspense
              fallback={
                <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] font-ui text-sm">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-[var(--color-primary)]" />
                  Loading interactive tactical map...
                </div>
              }
            >
              <LeafletMap
                className="z-0"
                tracks={tracks}
                heatmap={showHeatmap}
                onHeatmapChange={onHeatmapChange}
                showVessels={showVessels}
                showAircraft={showAircraft}
                showConflicts={showConflicts}
                onShowConflictsChange={onShowConflictsChange}
                showAreas={showAreas}
                showMetrics={showMetrics}
                onShowMetricsChange={onShowMetricsChange}
                recenterTrigger={recenterTrigger}
                onHighlightReady={(fn) => {
                  highlightZoneRef.current = fn;
                }}
                timeline={timeline}
                severityFilter={severityFilter}
                regionFilter={regionFilter}
              />
            </Suspense>
          </div>
        </div>
      </main>

      {/* Resize handle: map | threats */}
      <div
        className="w-1 hover:w-1.5 bg-[var(--color-border)] hover:bg-[var(--color-primary-600)] cursor-col-resize transition-[width,background-color] duration-100 shrink-0"
        onMouseDown={(e) => onDragStart('right', e.clientX, rightPanelW)}
      />

      {/* Right Threat Panel */}
      <div style={{ width: rightPanelW }} className="flex-shrink-0 overflow-hidden h-full">
        <ThreatsPanel
          topThreats={topThreats}
          totalThreats={totalThreats}
          criticalCount={criticalCount}
          highCount={highCount}
          selectedThreat={selectedThreat}
          setSelectedThreat={onSelectThreat}
          onHoverThreat={onHoverThreat}
        />
      </div>
    </div>
  );
}

export interface HomeFeedViewProps {
  topThreats: ThreatItem[];
  newsItems: any[];
  blockade?: BlockadeIndicators | null;
  transits?: TransitSummary | null;
}

export function HomeFeedView({ topThreats, newsItems, blockade, transits }: HomeFeedViewProps) {
  return (
    <div className="w-full max-w-[1650px] mx-auto px-3 py-2 h-[calc(100vh-3.2rem)] overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Left: Alerts + News Feed (2/3 width) */}
      <div className="lg:col-span-2 h-full flex flex-col gap-3 overflow-hidden">
        {/* Real-time Alerts List */}
        <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 rounded-none flex-1 min-h-0 flex flex-col overflow-hidden shadow-[0_0_10px_rgba(220,38,38,0.12)]">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--color-danger)]" />
              <span className="text-xs font-semibold text-[var(--color-fg)] uppercase tracking-wide">
                Live Anomaly & Threat Dispatches
              </span>
              <span className="w-1.5 h-1.5 bg-red-500 animate-ping rounded-none" />
            </div>
            <span className="text-[10px] font-mono text-[var(--color-fg-muted)]">
              {topThreats.length} live threats
            </span>
          </div>
          <div className="space-y-0 overflow-y-auto flex-1 divide-y divide-[var(--color-border)] pr-1">
            {topThreats.slice(0, 30).map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2.5 py-2 first:pt-0 hover:bg-[var(--color-bg-elevated)]/40 transition-colors cursor-pointer px-1"
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-none shrink-0',
                    t.severity === 'critical'
                      ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]'
                      : t.severity === 'high'
                      ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]'
                      : 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]'
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-xs text-[var(--color-fg)]">{t.title}</span>
                    {t.score > 0 && (
                      <span className={cn(
                        'font-mono text-[10px] font-bold shrink-0',
                        t.score > 80 ? 'text-red-400' : 'text-amber-400'
                      )}>
                        SCORE {t.score.toFixed(0)}/100
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--color-fg-muted)] truncate mt-0.5">
                    {t.description}
                  </div>
                </div>
                <span className="text-[var(--color-fg-muted)] shrink-0 text-[10px] font-mono">{t.time}</span>
              </div>
            ))}
            {topThreats.length === 0 && (
              <div className="text-center text-xs text-[var(--color-fg-muted)] py-6">
                All maritime & air corridors nominal — no active critical anomalies
              </div>
            )}
          </div>
        </div>

        {/* Live Intelligence News Feed */}
        <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 rounded-none flex-1 min-h-0 flex flex-col overflow-hidden shadow-[0_0_8px_rgba(99,102,241,0.12)]">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div className="flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-[var(--color-primary-600)]" />
              <span className="text-xs font-semibold text-[var(--color-fg)] uppercase tracking-wide">
                Regional Intelligence & News Wire
              </span>
            </div>
            <span className="text-[10px] font-mono text-[var(--color-fg-muted)]">
              {newsItems.length} dispatches
            </span>
          </div>
          <div className="space-y-0 overflow-y-auto flex-1 divide-y divide-[var(--color-border)] pr-1">
            {newsItems.slice(0, 25).map((a: any, i: number) => (
              <div
                key={a.id || i}
                className="py-2.5 first:pt-0 last:pb-0 hover:bg-[var(--color-bg-elevated)]/30 transition-colors px-1"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-[var(--color-primary-600)] uppercase px-1.5 py-0.5 bg-[var(--color-primary-600)]/10 border border-[var(--color-primary-600)]/20">
                    {a.source_name || a.source || a.metadata?.source || 'Intel Feed'}
                  </span>
                  {a.category && (
                    <span className="text-[10px] text-[var(--color-fg-muted)] font-mono uppercase">
                      [{a.category}]
                    </span>
                  )}
                  <span className="w-1 h-1 bg-[var(--color-fg-muted)] rounded-none" />
                  <span className="text-[10px] text-[var(--color-fg-muted)] font-mono">
                    {a.published_at ? new Date(a.published_at).toLocaleString() : ''}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[var(--color-fg)] leading-snug">{a.title}</div>
                <div className="text-[11px] text-[var(--color-fg-muted)] line-clamp-2 mt-1 leading-relaxed">
                  {a.summary || a.description || a.body?.substring(0, 250) || ''}
                </div>
              </div>
            ))}
            {newsItems.length === 0 && (
              <div className="text-center text-xs text-[var(--color-fg-muted)] py-6">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" /> Ingesting real-time intelligence feeds...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Strait Status + Sector Transits */}
      <div className="h-full flex flex-col gap-3 overflow-hidden">
        {/* Strait Status */}
        {blockade && (
          <div
            className={cn(
              'border p-3.5 rounded-none shrink-0 transition-all',
              blockade.strait_status === 'NO_TRANSIT'
                ? 'border-red-500/50 bg-red-950/20 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                : 'border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[0_0_8px_rgba(0,0,0,0.2)]'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[var(--color-primary-600)]" />
                <span className="text-xs font-semibold text-[var(--color-fg)] uppercase tracking-wide">
                  Strait Tactical Posture
                </span>
              </div>
              <span
                className={cn(
                  'px-2.5 py-0.5 text-[10px] font-bold border rounded-none',
                  blockade.strait_status === 'ACTIVE' &&
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_6px_rgba(16,185,129,0.2)]',
                  blockade.strait_status === 'LIMITED' &&
                    'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_6px_rgba(245,158,11,0.2)]',
                  blockade.strait_status === 'NO_TRANSIT' &&
                    'bg-red-500/10 text-red-400 border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                )}
              >
                {blockade.strait_status === 'NO_TRANSIT' ? 'NO TRANSIT' : blockade.strait_status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[
                { l: 'Waiting 6h', v: blockade.waiting_fleet_6h ?? 0 },
                { l: 'Waiting 24h', v: blockade.waiting_fleet_24h ?? 0 },
                { l: 'Anchored Fleet', v: `${blockade.anchored_vessels ?? 0} (${blockade.anchored_ratio_pct?.toFixed(0) ?? 0}%)` },
                { l: 'Active Fleet', v: blockade.active_vessels ?? 0 },
              ].map((r) => (
                <div
                  key={r.l}
                  className="p-2 border border-[var(--color-border)] bg-[var(--color-bg)] text-center rounded-none"
                >
                  <div className="text-[9px] text-[var(--color-fg-muted)] uppercase tracking-wider">{r.l}</div>
                  <div className="font-mono text-xs font-bold text-[var(--color-fg)] mt-0.5">{r.v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sector Transits Throughput */}
        {transits && (
          <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 rounded-none flex-1 min-h-0 flex flex-col overflow-hidden shadow-[0_0_8px_rgba(0,0,0,0.15)]">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <Ship className="h-4 w-4 text-[var(--color-primary-600)]" />
                <span className="text-xs font-semibold text-[var(--color-fg)] uppercase tracking-wide">
                  24h Sector Transits
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="text-emerald-400 font-bold">{transits.inbound ?? 0} IN</span>
                <span className="text-blue-400 font-bold">{transits.outbound ?? 0} OUT</span>
              </div>
            </div>
            <div className="space-y-0 overflow-y-auto flex-1 divide-y divide-[var(--color-border)] pr-1">
              {(transits.recent_events ?? []).slice(0, 20).map((evt, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] py-2 first:pt-0 last:pb-0 hover:bg-[var(--color-bg-elevated)]/30 transition-colors px-1">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 text-[9px] font-bold border rounded-none shrink-0 font-mono',
                      evt.direction === 'INBOUND'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    )}
                  >
                    {evt.direction === 'INBOUND' ? 'INBOUND' : 'OUTBOUND'}
                  </span>
                  <span className="truncate flex-1 text-[var(--color-fg)] font-medium">
                    {evt.ship_name || `MMSI ${evt.mmsi}`}
                  </span>
                  {evt.flag && (
                    <span className="text-[var(--color-fg-muted)] text-[10px] font-mono shrink-0">
                      {evt.flag}
                    </span>
                  )}
                </div>
              ))}
              {(!transits.recent_events || transits.recent_events.length === 0) && (
                <div className="text-center text-xs text-[var(--color-fg-muted)] py-6">
                  No transits logged in current time window
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
