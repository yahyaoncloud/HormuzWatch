import {
  Activity,
  ChevronsDownUp,
  ChevronsUpDown,
  Compass,
  Database,
  FileText,
  Layers,
  Plane,
  Ship,
  ShieldAlert,
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
      <div className="glass-card rounded-xl border border-[var(--color-border)]/50 flex flex-col max-h-[calc(100vh-8rem)] ">
        {/* Header */}
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-[var(--color-border)] flex items-center justify-between">
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
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 text-sm font-ui text-[var(--color-fg-muted)]">
          {/* Watch Zones */}
          <details className="group cursor-pointer" open={sidebarExpanded}>
            <summary className="font-medium text-[var(--color-fg)] flex items-center justify-between list-none pb-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
                <Compass className="h-3.5 w-3.5 text-[var(--color-primary-600)]" />
                Strategic Watch Zones
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
                { id: 'AREA-HORMUZ', name: 'Strait of Hormuz', color: '#FF0055' },
                { id: 'AREA-PGULF', name: 'Persian Gulf (North)', color: '#FF9900' },
                { id: 'AREA-GOMAN', name: 'Gulf of Oman & Fujairah', color: '#00E5FF' },
                { id: 'AREA-RS-SOUTH', name: 'Red Sea — Bab-el-Mandeb', color: '#DC2626' },
                { id: 'AREA-RS-NORTH', name: 'Red Sea (North & Suez)', color: '#8B5CF6' },
                { id: 'AREA-RASTANURA', name: 'Ras Tanura Energy Hub', color: '#F59E0B' },
                { id: 'AREA-JEBELALI', name: 'Jebel Ali Port Corridor', color: '#10B981' },
              ].map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => highlightZone(z.id)}
                  onMouseEnter={() => highlightZone(z.id)}
                  onMouseLeave={() => highlightZone(null)}
                  className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 cursor-pointer text-left transition-all hover:bg-[var(--color-bg-elevated)] group/item border border-transparent hover:border-[var(--color-border)]"
                  title={`Click to focus & highlight ${z.name}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0  transition-transform group-hover/item:scale-125"
                      style={{ backgroundColor: z.color, boxShadow: `0 0 6px ${z.color}` }}
                    />
                    <span className="font-medium text-xs text-[var(--color-fg)] group-hover/item:text-[var(--color-primary-600)] transition-colors truncate">
                      {z.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-data text-[var(--color-fg-subtle)] opacity-0 group-hover/item:opacity-100 transition-opacity">
                    FOCUS
                  </span>
                </button>
              ))}
            </div>
          </details>

          {/* Vessel Markers UI */}
          <details className="group cursor-pointer" open={sidebarExpanded}>
            <summary className="font-medium text-[var(--color-fg)] flex items-center justify-between list-none pb-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
                <Ship className="h-3.5 w-3.5 text-[#00E5FF]" />
                Vessel Markers (AIS)
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
            <div className="mt-2 space-y-2 p-2 rounded-lg bg-[var(--color-bg-elevated)]/60 border border-[var(--color-border)]/60">
              {/* Nominal Vessel */}
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-[#091322] border border-[#00E676] flex items-center justify-center shrink-0 shadow-[0_0_6px_rgba(0,230,118,0.3)]">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1 L11 11 L7 8 L3 11 Z" fill="#00E676" opacity="0.95" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--color-fg)]">Nominal Transit</div>
                  <div className="text-[10px] text-[var(--color-fg-muted)]">Commercial standard course</div>
                </div>
              </div>

              {/* Medium Anomaly */}
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-[#091322] border border-[#FFC800] flex items-center justify-center shrink-0 shadow-[0_0_6px_rgba(255,200,0,0.3)]">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1 L11 11 L7 8 L3 11 Z" fill="#FFC800" opacity="0.95" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#FFC800]">Medium Posture</div>
                  <div className="text-[10px] text-[var(--color-fg-muted)]">Course or speed variance</div>
                </div>
              </div>

              {/* High Anomaly */}
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-[#091322] border border-[#FF9900] flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(255,153,0,0.4)]">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1 L11 11 L7 8 L3 11 Z" fill="#FF9900" opacity="0.95" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#FF9900]">High Anomaly</div>
                  <div className="text-[10px] text-[var(--color-fg-muted)]">AIS gap / dark activity</div>
                </div>
              </div>

              {/* Critical Threat */}
              <div className="flex items-center gap-2.5">
                <div className="relative w-6 h-6 rounded-md bg-[#1a0812] border border-[#FF0055] flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(255,0,85,0.5)]">
                  <div className="absolute inset-0 rounded-md border border-[#FF0055] animate-ping opacity-30" />
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5" stroke="#FF0055" strokeWidth="1" />
                    <line x1="7" y1="1" x2="7" y2="13" stroke="#FF0055" strokeWidth="1" />
                    <line x1="1" y1="7" x2="13" y2="7" stroke="#FF0055" strokeWidth="1" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#FF0055]">Critical Target</div>
                  <div className="text-[10px] text-[var(--color-fg-muted)]">Immediate tactical alert</div>
                </div>
              </div>
            </div>
          </details>

          {/* Aircraft Markers UI */}
          <details className="group cursor-pointer" open={sidebarExpanded}>
            <summary className="font-medium text-[var(--color-fg)] flex items-center justify-between list-none pb-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
                <Plane className="h-3.5 w-3.5 text-[#00E5FF]" />
                Aircraft Markers (ADS-B)
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
            <div className="mt-2 space-y-2 p-2 rounded-lg bg-[var(--color-bg-elevated)]/60 border border-[var(--color-border)]/60">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-[#040e1e] border border-[#00E5FF] flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(0,229,255,0.4)]">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1 L10 5 L7 13 L4 5 Z" fill="#00E5FF" opacity="0.9" />
                    <line x1="2" y1="6" x2="12" y2="6" stroke="#00E5FF" strokeWidth="1.5" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#00E5FF]">Airborne Flight Track</div>
                  <div className="text-[10px] text-[var(--color-fg-muted)]">Altitude FL & Squawk code</div>
                </div>
              </div>
            </div>
          </details>

          {/* Conflict & Anomaly Radar Reticle */}
          <details className="group cursor-pointer" open={sidebarExpanded}>
            <summary className="font-medium text-[var(--color-fg)] flex items-center justify-between list-none pb-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
                <ShieldAlert className="h-3.5 w-3.5 text-[#FF0055]" />
                Radar Conflict Reticles
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
            <div className="mt-2 space-y-2 p-2 rounded-lg bg-[var(--color-bg-elevated)]/60 border border-[var(--color-border)]/60">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-[#1a0812] border border-[#FF0055] flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(255,0,85,0.4)]">
                  <span className="text-xs font-bold text-[#FF0055]">⊕</span>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#FF0055]">Verified Incident / Advisory</div>
                  <div className="text-[10px] text-[var(--color-fg-muted)]">UKMTO / OSINT / Naval Alerts</div>
                </div>
              </div>
            </div>
          </details>

          {/* Heatmap Layer Info */}
          <details className="group cursor-pointer" open={sidebarExpanded}>
            <summary className="font-medium text-[var(--color-fg)] flex items-center justify-between list-none pb-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
                <Layers className="h-3.5 w-3.5 text-[var(--color-primary-600)]" />
                Heatmap Density Scale
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
            <div className="mt-2 p-2 rounded-lg bg-[var(--color-bg-elevated)]/60 border border-[var(--color-border)]/60 space-y-1.5">
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#070b14] via-[#0284c7] via-[#00E5FF] via-[#FF9900] to-[#FF0055]" />
              <div className="flex justify-between text-[10px] text-[var(--color-fg-subtle)] font-data">
                <span>LOW DENSITY</span>
                <span>CHOKEPOINT HIGH</span>
              </div>
            </div>
          </details>

          {/* Data Sources */}
          <details className="group cursor-pointer" open={sidebarExpanded}>
            <summary className="font-medium text-[var(--color-fg)] flex items-center justify-between list-none pb-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
                <Database className="h-3.5 w-3.5 text-[var(--color-primary-600)]" />
                Live Feed Integrations
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
            <ul className="mt-2 space-y-1 pl-4 list-disc text-xs text-[var(--color-fg-muted)]">
              <li>AISStream WebSocket — Live Gulf transponders</li>
              <li>OpenSky Network API — ADS-B flight state vectors</li>
              <li>GDELT & USNI — Geopolitical intelligence</li>
              <li>Open-Meteo — Sea state & marine weather</li>
            </ul>
          </details>

          {/* Live Intelligence News Advisories */}
          <details className="group cursor-pointer" open={sidebarExpanded}>
            <summary className="font-medium text-[var(--color-fg)] flex items-center justify-between list-none pb-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
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
                  Loading intelligence feeds...
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

          {/* Live Telemetry Summary */}
          <details className="group cursor-pointer" open={sidebarExpanded}>
            <summary className="font-medium text-[var(--color-fg)] flex items-center justify-between list-none pb-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
                <Activity className="h-3.5 w-3.5 text-[#00E676]" />
                Live Telemetry Summary
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
              <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)]/60 rounded-md p-2 text-center">
                <div className="font-data text-lg font-bold text-[#00E676]">
                  {metrics?.maritimeCount ?? '—'}
                </div>
                <div className="text-[10px] text-[var(--color-fg-muted)]">Vessels</div>
              </div>
              <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)]/60 rounded-md p-2 text-center">
                <div className="font-data text-lg font-bold text-[#00E5FF]">
                  {metrics?.aviationCount ?? '—'}
                </div>
                <div className="text-[10px] text-[var(--color-fg-muted)]">Aircraft</div>
              </div>
              <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)]/60 rounded-md p-2 text-center col-span-2">
                <div className="font-data text-lg font-bold text-[#FF0055]">
                  {metrics
                    ? metrics.criticalCount + metrics.highCount + metrics.mediumCount
                    : '—'}
                </div>
                <div className="text-[10px] text-[var(--color-fg-muted)]">Active Anomaly Tracks</div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </aside>
  );
}
