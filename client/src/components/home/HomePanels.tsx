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
                heatmap={showHeatmap}
                onHeatmapChange={onHeatmapChange}
                showVessels={showVessels}
                showAircraft={showAircraft}
                showConflicts={showConflicts}
                onShowConflictsChange={onShowConflictsChange}
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
    <div className="w-full max-w-[1550px] mx-auto px-3 py-2 h-[calc(100vh-3.2rem)] overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Left: Alerts + News */}
      <div className="lg:col-span-2 h-full flex flex-col gap-3 overflow-hidden">
        {/* Threats/Alerts list */}
        <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 rounded-none flex-1 min-h-0 flex flex-col overflow-hidden shadow-[0_0_10px_rgba(220,38,38,0.15)]">
          <div className="flex items-center gap-2 mb-2 shrink-0">
            <AlertTriangle className="h-4 w-4 text-[var(--color-primary-600)]" />
            <span className="text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide">
              Recent Telemetry & Anomaly Alerts
            </span>
            <span className="ml-auto text-[10px] font-mono text-[var(--color-fg-muted)]">
              {topThreats.length} items
            </span>
          </div>
          <div className="space-y-0 overflow-y-auto flex-1 divide-y divide-[var(--color-border)] pr-1">
            {topThreats.slice(0, 30).map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 py-1.5 text-[11px] first:pt-0 hover:bg-[var(--color-bg-elevated)]/40 transition-colors"
              >
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-none shrink-0',
                    t.severity === 'critical'
                      ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]'
                      : t.severity === 'high'
                      ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]'
                      : 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.4)]'
                  )}
                />
                <span className="flex-1 truncate font-medium text-[var(--color-fg)]">{t.title}</span>
                <span className="text-[var(--color-fg-muted)] shrink-0 text-[10px] font-mono">{t.time}</span>
              </div>
            ))}
            {topThreats.length === 0 && (
              <div className="text-center text-xs text-[var(--color-fg-muted)] py-4">No active alerts</div>
            )}
          </div>
        </div>

        {/* News Articles */}
        <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 rounded-none flex-1 min-h-0 flex flex-col overflow-hidden shadow-[0_0_8px_rgba(99,102,241,0.12)]">
          <div className="flex items-center gap-2 mb-2 shrink-0">
            <Newspaper className="h-4 w-4 text-[var(--color-primary-600)]" />
            <span className="text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide">
              Live Intelligence News Feed
            </span>
            <span className="ml-auto text-[10px] font-mono text-[var(--color-fg-muted)]">
              {newsItems.length} articles
            </span>
          </div>
          <div className="space-y-0 overflow-y-auto flex-1 divide-y divide-[var(--color-border)] pr-1">
            {newsItems.slice(0, 20).map((a: any, i: number) => (
              <div
                key={a.id || i}
                className="py-2 first:pt-0 last:pb-0 hover:bg-[var(--color-bg-elevated)]/30 transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-semibold text-[var(--color-fg-muted)] uppercase">
                    {a.source_name || a.metadata?.source || 'Source'}
                  </span>
                  <span className="w-1 h-1 bg-[var(--color-fg-muted)] rounded-none" />
                  <span className="text-[10px] text-[var(--color-fg-muted)]">
                    {a.published_at ? new Date(a.published_at).toLocaleDateString() : ''}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[var(--color-fg)]">{a.title}</div>
                <div className="text-[11px] text-[var(--color-fg-muted)] line-clamp-2 mt-0.5">
                  {a.summary || a.body?.substring(0, 200) || ''}
                </div>
              </div>
            ))}
            {newsItems.length === 0 && (
              <div className="text-center text-xs text-[var(--color-fg-muted)] py-4">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" /> Loading articles...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Strait Status + Transits */}
      <div className="h-full flex flex-col gap-3 overflow-hidden">
        {blockade && (
          <div
            className={cn(
              'border p-3 rounded-none shrink-0 transition-all',
              blockade.strait_status === 'NO_TRANSIT'
                ? 'border-red-500/50 bg-red-950/20 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                : 'border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[0_0_8px_rgba(0,0,0,0.2)]'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4 text-[var(--color-primary-600)]" />
              <span className="text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide">
                Strait Status
              </span>
            </div>
            <span
              className={cn(
                'inline-block px-2.5 py-1 text-[10px] font-bold border rounded-none',
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
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { l: 'Waiting 6h', v: blockade.waiting_fleet_6h },
                { l: 'Waiting 24h', v: blockade.waiting_fleet_24h },
                { l: 'Anchored', v: `${blockade.anchored_vessels} (${blockade.anchored_ratio_pct?.toFixed(0)}%)` },
                { l: 'Active', v: blockade.active_vessels },
              ].map((r) => (
                <div
                  key={r.l}
                  className="p-1.5 border border-[var(--color-border)] bg-[var(--color-bg)] text-center rounded-none"
                >
                  <div className="text-[9px] text-[var(--color-fg-muted)] uppercase">{r.l}</div>
                  <div className="font-mono text-xs font-bold text-[var(--color-fg)] mt-0.5">{r.v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Transits */}
        {transits && (
          <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 rounded-none flex-1 min-h-0 flex flex-col overflow-hidden shadow-[0_0_8px_rgba(0,0,0,0.15)]">
            <div className="flex items-center gap-2 mb-2 shrink-0">
              <Ship className="h-4 w-4 text-[var(--color-primary-600)]" />
              <span className="text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide">
                Recent Sector Transits
              </span>
            </div>
            <div className="space-y-0 overflow-y-auto flex-1 divide-y divide-[var(--color-border)] pr-1">
              {(transits.recent_events ?? []).slice(0, 15).map((evt, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] py-1.5 first:pt-0 last:pb-0">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 text-[10px] font-bold border rounded-none shrink-0',
                      evt.direction === 'INBOUND'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    )}
                  >
                    {evt.direction === 'INBOUND' ? 'IN' : 'OUT'}
                  </span>
                  <span className="truncate flex-1 text-[var(--color-fg)] font-medium">
                    {evt.ship_name || `MMSI ${evt.mmsi}`}
                  </span>
                  <span className="text-[var(--color-fg-muted)] text-[10px]">{evt.flag}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
