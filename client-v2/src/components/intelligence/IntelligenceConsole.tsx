import {
  Activity,
  AlertTriangle,
  ChevronsDownUp,
  ChevronsUpDown,
  Compass,
  Database,
  FileText,
  Layers,
  Plane,
  Ship,
} from 'lucide-react';
import type { NewsItem, PublicMetricsResponse } from '@/lib/api';

export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

interface IntelligenceConsoleProps {
  sidebarExpanded: boolean;
  toggleSidebarExpand: () => void;
  highlightZone: (id: string | null) => void;
  newsItems: NewsItem[];
  metrics: PublicMetricsResponse['metrics'] | undefined;
}

export function IntelligenceConsole({
  sidebarExpanded,
  toggleSidebarExpand,
  highlightZone,
  newsItems,
  metrics,
}: IntelligenceConsoleProps) {
  return (
    <aside className="hidden lg:block w-72 flex-shrink-0 p-4">
      <div className="glass-card rounded-xl border border-[var(--color-border)]/50 flex flex-col max-h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="shrink-0 px-4 pt-4 pb-2 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-[var(--color-fg)] flex items-center gap-2">
            <Compass className="h-4 w-4 text-[var(--color-primary-600)]" />
            Intelligence Console
          </h3>
          <button
            type="button"
            onClick={toggleSidebarExpand}
            className="text-[11px] font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] px-2 py-0.5 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] transition-colors flex items-center gap-1 shrink-0"
            title={sidebarExpanded ? 'Collapse all sections' : 'Expand all sections'}
          >
            {sidebarExpanded ? (
              <>
                <ChevronsDownUp className="h-3 w-3 text-[var(--color-primary-600)]" />
                Collapse
              </>
            ) : (
              <>
                <ChevronsUpDown className="h-3 w-3 text-[var(--color-primary-600)]" />
                Expand
              </>
            )}
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2 text-sm font-ui text-[var(--color-fg-muted)]">
          {/* Watch Zones */}
          <details className="group cursor-pointer" open={sidebarExpanded}>
            <summary className="font-medium text-[var(--color-fg)] flex items-center justify-between list-none">
              <span className="flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-[var(--color-primary-600)]" />
                Watch Zones
              </span>
              <svg
                className="w-4 h-4 text-[var(--color-fg-muted)] group-open:rotate-180 transition-transform shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <div className="mt-2 space-y-1">
              {[
                { id: 'AREA-HORMUZ', name: 'Strait of Hormuz', color: '#ef4444' },
                { id: 'AREA-PGULF', name: 'Persian Gulf (North)', color: '#b87333' },
                { id: 'AREA-GOMAN', name: 'Gulf of Oman', color: '#38bdf8' },
                { id: 'AREA-RS-SOUTH', name: 'Red Sea — Bab-el-Mandeb', color: '#dc2626' },
                { id: 'AREA-RS-NORTH', name: 'Red Sea (North)', color: '#7c3aed' },
              ].map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => highlightZone(z.id)}
                  onMouseEnter={() => highlightZone(z.id)}
                  onMouseLeave={() => highlightZone(null)}
                  className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 cursor-pointer text-left transition-all hover:bg-[var(--color-bg-elevated)] group/item"
                  title={`Click to zoom & highlight ${z.name}`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0 transition-transform group-hover/item:scale-125"
                    style={{ backgroundColor: z.color }}
                  />
                  <span className="font-medium text-xs text-[var(--color-fg)] hover:text-[var(--color-primary-600)] transition-colors">
                    {z.name}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--color-fg-subtle)] mt-1.5">
              Click any zone title to focus and highlight on the map.
            </p>
          </details>

          {/* Vessel Markers */}
          <details className="group cursor-pointer" open={sidebarExpanded}>
            <summary className="font-medium text-[var(--color-fg)] flex items-center justify-between list-none">
              <span className="flex items-center gap-1.5">
                <Ship className="h-3.5 w-3.5 text-[var(--color-primary-600)]" />
                Vessel Markers
              </span>
              <svg
                className="w-4 h-4 text-[var(--color-fg-muted)] group-open:rotate-180 transition-transform shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <div className="mt-2 space-y-1.5 pl-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border-2 border-[#22c55e] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#22c55e]">▲</span>
                </div>
                <span className="text-xs">Low risk — normal transit pattern</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border-2 border-[#d97706] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#d97706]">▲</span>
                </div>
                <span className="text-xs">Medium risk — behavioral deviation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border-2 border-[#b87333] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#b87333]">▲</span>
                </div>
                <span className="text-xs">High risk — significant anomaly</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border-2 border-[#ef4444] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#ef4444]">▲</span>
                </div>
                <span className="text-xs">Critical — immediate attention warranted</span>
              </div>
            </div>
          </details>

          {/* Aircraft Markers */}
          <details className="group cursor-pointer" open={sidebarExpanded}>
            <summary className="font-medium text-[var(--color-fg)] flex items-center justify-between list-none">
              <span className="flex items-center gap-1.5">
                <Plane className="h-3.5 w-3.5 text-[var(--color-primary-600)]" />
                Aircraft Markers
              </span>
              <svg
                className="w-4 h-4 text-[var(--color-fg-muted)] group-open:rotate-180 transition-transform shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <div className="mt-2 flex items-center gap-2 pl-1">
              <div className="w-6 h-6 rounded-full border-2 border-[#38bdf8] flex items-center justify-center">
                <span className="text-[10px] font-bold text-[#38bdf8]">◆</span>
              </div>
              <span className="text-xs">ADS-B tracked aircraft (diamond icon)</span>
            </div>
          </details>

          {/* Heatmap Layer */}
          <details className="group cursor-pointer" open={sidebarExpanded}>
            <summary className="font-medium text-[var(--color-fg)] flex items-center justify-between list-none">
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-[var(--color-primary-600)]" />
                Heatmap Layer
              </span>
              <svg
                className="w-4 h-4 text-[var(--color-fg-muted)] group-open:rotate-180 transition-transform shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <p className="mt-2 text-xs leading-relaxed">
              Toggle via Settings (gear icon) to show maritime traffic density. Colors:{' '}
              <span className="font-data text-[var(--color-info)]">blue</span> (low) →{' '}
              <span className="font-data text-[var(--color-warning)]">amber</span> →{' '}
              <span className="font-data text-[var(--color-danger)]">red</span> (high concentration).
            </p>
          </details>

          {/* Data Sources */}
          <details className="group cursor-pointer" open={sidebarExpanded}>
            <summary className="font-medium text-[var(--color-fg)] flex items-center justify-between list-none">
              <span className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-[var(--color-primary-600)]" />
                Data Sources
              </span>
              <svg
                className="w-4 h-4 text-[var(--color-fg-muted)] group-open:rotate-180 transition-transform shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <ul className="mt-2 space-y-1 pl-4 list-disc text-xs">
              <li>AIS (MarineTraffic / Spire) — vessel positions</li>
              <li>ADS-B (OpenSky / ADSB Exchange) — aircraft positions</li>
              <li>GDELT — geopolitical event monitoring</li>
              <li>NASA FIRMS — fire/thermal anomalies</li>
              <li>Open-Meteo — weather & sea state</li>
              <li>RSS Feeds (USNI, DefenseNews, Al Jazeera)</li>
            </ul>
          </details>

          {/* Live Intelligence News Feeds */}
          <details className="group cursor-pointer" open={sidebarExpanded}>
            <summary className="font-medium text-[var(--color-fg)] flex items-center justify-between list-none">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[var(--color-primary-600)]" />
                Live News & Advisories
              </span>
              <svg
                className="w-4 h-4 text-[var(--color-fg-muted)] group-open:rotate-180 transition-transform shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <div className="mt-2 space-y-2 max-h-72 overflow-y-auto pr-1">
              {newsItems.length === 0 ? (
                <p className="text-xs text-[var(--color-fg-muted)] italic">
                  Loading news feeds...
                </p>
              ) : (
                newsItems.slice(0, 10).map((item) => (
                  <a
                    key={item.id}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg p-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border)]/60 hover:border-[var(--color-primary-400)] transition-all group/news"
                  >
                    <div className="flex items-center justify-between gap-1 text-[10px] text-[var(--color-fg-muted)] mb-1">
                      <span className="font-semibold text-[var(--color-primary-600)]">
                        {item.source}
                      </span>
                      <span>
                        {item.pubDate
                          ? formatTimeAgo(new Date(item.pubDate).getTime())
                          : (item as any).pub_date
                          ? formatTimeAgo(new Date((item as any).pub_date).getTime())
                          : ''}
                      </span>
                    </div>
                    <h5 className="font-ui text-xs font-medium text-[var(--color-fg)] group-hover/news:text-[var(--color-primary-600)] line-clamp-2 leading-snug">
                      {item.title}
                    </h5>
                    {item.summary && (
                      <p className="font-ui text-[11px] text-[var(--color-fg-muted)] line-clamp-2 mt-1 leading-relaxed">
                        {item.summary.replace(/<[^>]*>?/gm, '')}
                      </p>
                    )}
                  </a>
                ))
              )}
            </div>
          </details>

          {/* Live Telemetry */}
          <details className="group cursor-pointer" open={sidebarExpanded}>
            <summary className="font-medium text-[var(--color-fg)] flex items-center justify-between list-none">
              <span className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-[var(--color-success)]" />
                Live Telemetry
              </span>
              <svg
                className="w-4 h-4 text-[var(--color-fg-muted)] group-open:rotate-180 transition-transform shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[var(--color-bg-elevated)] rounded-md p-2 text-center">
                <div className="font-data text-lg font-bold text-[var(--color-fg)]">
                  {metrics?.maritimeCount ?? '—'}
                </div>
                <div className="text-[var(--color-fg-muted)]">Vessels</div>
              </div>
              <div className="bg-[var(--color-bg-elevated)] rounded-md p-2 text-center">
                <div className="font-data text-lg font-bold text-[var(--color-fg)]">
                  {metrics?.aviationCount ?? '—'}
                </div>
                <div className="text-[var(--color-fg-muted)]">Aircraft</div>
              </div>
              <div className="bg-[var(--color-bg-elevated)] rounded-md p-2 text-center col-span-2">
                <div className="font-data text-lg font-bold text-[var(--color-danger)]">
                  {metrics
                    ? metrics.criticalCount + metrics.highCount + metrics.mediumCount
                    : '—'}
                </div>
                <div className="text-[var(--color-fg-muted)]">Active Anomalies</div>
              </div>
            </div>
          </details>

          {/* Conflict Intelligence */}
          <details className="group cursor-pointer" open>
            <summary className="font-medium text-[var(--color-fg)] flex items-center justify-between list-none">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-[var(--color-danger)]" />
                Conflict Intelligence
              </span>
              <svg
                className="w-4 h-4 text-[var(--color-fg-muted)] group-open:rotate-180 transition-transform shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <div className="mt-2 space-y-1.5 pl-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#b91c1c]" />
                <span className="text-xs">Critical — active engagement</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#b45309]" />
                <span className="text-xs">High — imminent threat</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#d97706]" />
                <span className="text-xs">Medium — elevated posture</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#15803d]" />
                <span className="text-xs">Low — routine activity</span>
              </div>
            </div>
            <p className="text-[10px] text-[var(--color-fg-subtle)] mt-2 leading-relaxed">
              Crosshair (⊕) markers sourced from OSINT, UKMTO, IMB, EU NAVFOR, and coalition
              naval advisories. Updated every 15 minutes.
            </p>
          </details>
        </div>
      </div>
    </aside>
  );
}
