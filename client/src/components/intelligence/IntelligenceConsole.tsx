import { useState } from 'react';
import {
  Compass,
  FileText,
  Layers,
  Plane,
  Ship,
  ShieldAlert,
} from 'lucide-react';
import type { NewsItem } from '@/lib/api';
import { cn } from '@/utils/cn';

export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 60) return `${seconds}s`;
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

interface IntelligenceConsoleProps {
  highlightZone: (id: string | null) => void;
  newsItems: NewsItem[];
  selectedRegion?: string;
  onSelectRegion?: (regionId: string) => void;
  metrics?: any;
  isMetricsLoading?: boolean;
  onMetricClick?: (key: any) => void;
}

type ConsoleTab = 'zones' | 'notations' | 'legend';

export function IntelligenceConsole({
  highlightZone,
  newsItems,
  selectedRegion = 'all',
  onSelectRegion,
  metrics,
  isMetricsLoading = false,
  onMetricClick,
}: IntelligenceConsoleProps) {
  const [activeTab, setActiveTab] = useState<ConsoleTab>('zones');

  // Latest notations — compact activity log from news + metrics
  const notations = newsItems.slice(0, 15).map((item) => ({
    id: item.id || '',
    type: 'news' as const,
    tag: item.source || 'Intel',
    text: item.title,
    time: item.pubDate
      ? formatTimeAgo(new Date(item.pubDate).getTime())
      : (item as any).pub_date
      ? formatTimeAgo(new Date((item as any).pub_date).getTime())
      : '',
  }));

  const watchZones = [
    { id: 'AREA-HORMUZ', name: 'Strait of Hormuz (TSS)', color: '#FF0055', desc: 'Critical Maritime Chokepoint & TSS' },
    { id: 'AREA-PGULF', name: 'Persian Gulf Basin', color: '#FF9900', desc: 'Central & Northern Tanker Basin' },
    { id: 'AREA-GOMAN', name: 'Gulf of Oman', color: '#00E5FF', desc: 'Deep-Water Ingress & Egress' },
    { id: 'AREA-FUJAIRAH', name: 'Fujairah Anchorage (FOA)', color: '#00E676', desc: 'Global Bunkering & STS Anchorage' },
  ];

  return (
    <aside className="hidden lg:block w-full h-full flex-shrink-0">
      <div className="border-r border-[var(--color-border)] bg-[var(--color-bg-elevated)]/60 flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-card)] flex items-center justify-between">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-fg)] flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-[var(--color-primary-600)] dark:text-[#38bdf8]" />
            INTEL CONSOLE
          </h3>
          <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            ● LIVE
          </span>
        </div>

        {/* Tab Navigation to eliminate vertical conflict */}
        <div className="shrink-0 flex items-center border-b border-[var(--color-border)] bg-[var(--color-bg-input)] p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('zones')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 py-1 px-1 text-[10px] font-mono font-bold uppercase transition-colors border truncate',
              activeTab === 'zones'
                ? 'bg-[var(--color-bg-card)] text-[var(--color-primary-600)] dark:text-[#38bdf8] border-[var(--color-border-strong)] dark:border-[#38bdf8]/60 shadow-[inset_0_2px_0_var(--color-primary-600)]'
                : 'text-[var(--color-fg-muted)] border-transparent hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-hover)]'
            )}
          >
            <Compass className="h-3 w-3 shrink-0" />
            <span>ZONES</span>
            <span className="text-[9px] opacity-70">({watchZones.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notations')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 py-1 px-1 text-[10px] font-mono font-bold uppercase transition-colors border truncate',
              activeTab === 'notations'
                ? 'bg-[var(--color-bg-card)] text-[var(--color-primary-600)] dark:text-[#38bdf8] border-[var(--color-border-strong)] dark:border-[#38bdf8]/60 shadow-[inset_0_2px_0_var(--color-primary-600)]'
                : 'text-[var(--color-fg-muted)] border-transparent hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-hover)]'
            )}
          >
            <FileText className="h-3 w-3 shrink-0 text-cyan-500 dark:text-[#00E5FF]" />
            <span>NOTES</span>
            <span className="text-[9px] opacity-70">({notations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('legend')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 py-1 px-1 text-[10px] font-mono font-bold uppercase transition-colors border truncate',
              activeTab === 'legend'
                ? 'bg-[var(--color-bg-card)] text-[var(--color-primary-600)] dark:text-[#38bdf8] border-[var(--color-border-strong)] dark:border-[#38bdf8]/60 shadow-[inset_0_2px_0_var(--color-primary-600)]'
                : 'text-[var(--color-fg-muted)] border-transparent hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-hover)]'
            )}
          >
            <Layers className="h-3 w-3 shrink-0 text-amber-500 dark:text-[#FF9900]" />
            <span>LEGEND</span>
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
          {/* ================================================ */}
          {/* Tab 1: Strategic Watch Zones */}
          {/* ================================================ */}
          {activeTab === 'zones' && (
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] flex items-center justify-between">
                <span>Active Geofence Corridors</span>
                <span className="font-mono text-[9px] text-[var(--color-primary-600)]">Hover to Highlight</span>
              </div>
              <div className="space-y-1">
                {watchZones.map((z) => {
                  const isSelected = selectedRegion === z.id;
                  return (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => {
                        highlightZone(z.id);
                        if (onSelectRegion) {
                          onSelectRegion(isSelected ? 'all' : z.id);
                        }
                      }}
                      onMouseEnter={() => highlightZone(z.id)}
                      onMouseLeave={() => highlightZone(selectedRegion !== 'all' ? selectedRegion : null)}
                      className={cn(
                        'w-full flex items-center justify-between px-2.5 py-2 cursor-pointer text-left transition-all group rounded-xs border',
                        isSelected
                          ? 'bg-[var(--color-primary-600)]/15 border-[var(--color-primary-600)] shadow-xs'
                          : 'bg-[var(--color-bg)]/60 hover:bg-[var(--color-bg-elevated)] border-[var(--color-border)]/60 hover:border-[var(--color-primary-600)]/50'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full shrink-0 transition-transform group-hover:scale-125',
                            isSelected && 'scale-125 ring-2 ring-[var(--color-primary-600)]/40'
                          )}
                          style={{ backgroundColor: z.color, boxShadow: `0 0 6px ${z.color}` }}
                        />
                        <div className="min-w-0">
                          <div
                            className={cn(
                              'font-semibold text-[11px] transition-colors truncate',
                              isSelected
                                ? 'text-[var(--color-primary-600)] font-bold'
                                : 'text-[var(--color-fg)] group-hover:text-[var(--color-primary-600)]'
                            )}
                          >
                            {z.name}
                          </div>
                          <div className="text-[10px] text-[var(--color-fg-muted)] truncate">
                            {z.desc}
                          </div>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'text-[9px] font-mono shrink-0 ml-2',
                          isSelected
                            ? 'text-[var(--color-primary-600)] font-bold'
                            : 'text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg)]'
                        )}
                      >
                        {z.id.replace('AREA-', '')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================ */}
          {/* Tab 2: Latest Notations & Intel Feed */}
          {/* ================================================ */}
          {activeTab === 'notations' && (
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] flex items-center justify-between">
                <span>Real-Time Intelligence Log</span>
                <span className="font-mono text-[9px] text-[var(--color-primary-600)]">Live Updates</span>
              </div>
              <div className="space-y-1.5">
                {notations.length === 0 ? (
                  <div className="p-4 text-center text-[11px] text-[var(--color-fg-muted)] italic bg-[var(--color-bg)] border border-[var(--color-border)]">
                    Awaiting live intelligence feed data...
                  </div>
                ) : (
                  notations.map((n, i) => (
                    <div
                      key={n.id || i}
                      className="p-2 bg-[var(--color-bg)]/80 border border-[var(--color-border)]/70 hover:border-[var(--color-primary-600)]/40 transition-colors space-y-1 rounded-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-mono font-semibold text-[var(--color-primary-600)] uppercase px-1 py-0.5 bg-[var(--color-primary-600)]/10 border border-[var(--color-primary-600)]/20 rounded-xs">
                          {n.tag}
                        </span>
                        <span className="text-[10px] text-[var(--color-fg-muted)] font-mono">
                          {n.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--color-fg)] leading-snug line-clamp-2">
                        {n.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ================================================ */}
          {/* Tab 3: Tactical Symbology & Map Legend */}
          {/* ================================================ */}
          {activeTab === 'legend' && (
            <div className="space-y-3">
              {/* Maritime AIS Contacts */}
              <div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-fg-muted)] mb-1.5 flex items-center gap-1.5">
                  <Ship className="h-3 w-3 text-[var(--color-primary-600)] dark:text-[#38bdf8]" />
                  <span>MARITIME AIS CONTACTS</span>
                </div>
                <div className="space-y-1.5 p-2 bg-[var(--color-bg-input)] border border-[var(--color-border)] tactical-beveled">
                  {[
                    { color: '#22c55e', label: 'NOMINAL TRANSIT', desc: 'Standard SOG & course within shipping corridor' },
                    { color: '#eab308', label: 'MEDIUM VARIANCE', desc: 'Minor course delta, deceleration or anchored' },
                    { color: '#f97316', label: 'HIGH ANOMALY', desc: 'AIS dark period, erratic maneuvers or hot zone approach' },
                    { color: '#ef4444', label: 'CRITICAL THREAT', desc: 'ML ensemble anomaly score ≥80 or kinetic proximity', pulse: true },
                  ].map((m) => (
                    <div key={m.label} className="flex items-center gap-2">
                      <div
                        className="relative w-5 h-5 bg-[var(--color-bg-card)] border flex items-center justify-center shrink-0"
                        style={{ borderColor: m.color, boxShadow: `0 0 6px ${m.color}30` }}
                      >
                        {m.pulse && (
                          <div
                            className="absolute inset-0 border animate-ping opacity-30"
                            style={{ borderColor: m.color }}
                          />
                        )}
                        <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                          <path d="M7 1 L11 11 L7 8 L3 11 Z" fill={m.color} />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono text-[10px] font-bold text-[var(--color-fg)] uppercase">{m.label}</div>
                        <div className="font-mono text-[9px] text-[var(--color-fg-muted)] leading-tight">{m.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aviation ADS-B Contacts */}
              <div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-fg-muted)] mb-1.5 flex items-center gap-1.5">
                  <Plane className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
                  <span>AVIATION ADS-B CONTACTS</span>
                </div>
                <div className="space-y-1.5 p-2 bg-[var(--color-bg-input)] border border-[var(--color-border)] tactical-beveled">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-[var(--color-bg-card)] border border-cyan-500 flex items-center justify-center shrink-0">
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1 L10 5 L7 13 L4 5 Z" fill="#06b6d4" />
                        <line x1="2" y1="6" x2="12" y2="6" stroke="#06b6d4" strokeWidth="1.5" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] font-bold text-[var(--color-fg)] uppercase">AIR CORRIDOR FLIGHTS</div>
                      <div className="font-mono text-[9px] text-[var(--color-fg-muted)] leading-tight">ADS-B transponder vectors, squawk & altitude</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conflict & Kinetic Incidents */}
              <div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-fg-muted)] mb-1.5 flex items-center gap-1.5">
                  <ShieldAlert className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                  <span>INCIDENTS & CONFLICT ZONES</span>
                </div>
                <div className="space-y-1.5 p-2 bg-[var(--color-bg-input)] border border-[var(--color-border)] tactical-beveled">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-[var(--color-bg-card)] border border-rose-500 flex items-center justify-center shrink-0">
                      <span className="font-mono text-[11px] font-bold text-rose-500">⊕</span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] font-bold text-[var(--color-fg)] uppercase">VERIFIED INCIDENT RETICLE</div>
                      <div className="font-mono text-[9px] text-[var(--color-fg-muted)] leading-tight">UKMTO, NASA FIRMS, naval events & OSINT strikes</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strategic Geofence Corridors */}
              <div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-fg-muted)] mb-1.5 flex items-center gap-1.5">
                  <Compass className="h-3 w-3 text-[var(--color-primary-600)] dark:text-[#38bdf8]" />
                  <span>WATCH ZONES & GEOFENCES</span>
                </div>
                <div className="space-y-1.5 p-2 bg-[var(--color-bg-input)] border border-[var(--color-border)] tactical-beveled font-mono text-[9px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 border border-[#FF0055] bg-[#FF0055]/20 inline-block" />
                    <span className="font-bold text-[var(--color-fg)]">HORMUZ TSS / CHOKEPOINT</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 border border-[#FF9900] bg-[#FF9900]/20 inline-block" />
                    <span className="font-bold text-[var(--color-fg)]">PERSIAN GULF TANKER BASIN</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 border border-[#00E5FF] bg-[#00E5FF]/20 inline-block" />
                    <span className="font-bold text-[var(--color-fg)]">GULF OF OMAN INGRESS/EGRESS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 border border-[#00E676] bg-[#00E676]/20 inline-block" />
                    <span className="font-bold text-[var(--color-fg)]">FUJAIRAH ANCHORAGE (FOA)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Tactical Metrics Stack */}
        <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-bg-card)] p-2">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-fg-muted)] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary-600)] dark:bg-[#38bdf8] animate-pulse inline-block" />
              LIVE METRICS
            </span>
            {isMetricsLoading && (
              <span className="text-[9px] font-mono text-[var(--color-primary-600)] dark:text-[#38bdf8] animate-pulse">
                SYNCING...
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {/* Vessels */}
            <button
              type="button"
              onClick={() => onMetricClick?.('vessels')}
              className="p-1.5 text-left border border-[var(--color-border)] bg-[var(--color-bg-input)] hover:border-[var(--color-info)] hover:bg-[var(--color-bg-hover)] transition-all cursor-pointer group rounded-none"
            >
              <div className="flex items-center justify-between text-[9px] font-mono text-[var(--color-fg-muted)] uppercase">
                <span>VESSELS</span>
                <Ship className="h-3 w-3 text-cyan-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-sm font-mono font-bold text-[var(--color-fg)] mt-0.5">
                {metrics?.maritimeCount ?? 0}
              </div>
            </button>

            {/* Aircraft */}
            <button
              type="button"
              onClick={() => onMetricClick?.('aircraft')}
              className="p-1.5 text-left border border-[var(--color-border)] bg-[var(--color-bg-input)] hover:border-[var(--color-warning)] hover:bg-[var(--color-bg-hover)] transition-all cursor-pointer group rounded-none"
            >
              <div className="flex items-center justify-between text-[9px] font-mono text-[var(--color-fg-muted)] uppercase">
                <span>AIRCRAFT</span>
                <Plane className="h-3 w-3 text-amber-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-sm font-mono font-bold text-[var(--color-fg)] mt-0.5">
                {metrics?.aviationCount ?? 0}
              </div>
            </button>

            {/* Active Regions */}
            <button
              type="button"
              onClick={() => onMetricClick?.('regions')}
              className="p-1.5 text-left border border-[var(--color-border)] bg-[var(--color-bg-input)] hover:border-[var(--color-primary-600)] hover:bg-[var(--color-bg-hover)] transition-all cursor-pointer group rounded-none"
            >
              <div className="flex items-center justify-between text-[9px] font-mono text-[var(--color-fg-muted)] uppercase">
                <span>REGIONS</span>
                <Compass className="h-3 w-3 text-[var(--color-primary-600)] dark:text-[#38bdf8] group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-sm font-mono font-bold text-[var(--color-fg)] mt-0.5">
                {metrics?.activeRegions ?? 4}
              </div>
            </button>

            {/* Risk Index */}
            <button
              type="button"
              onClick={() => onMetricClick?.('risk')}
              className="p-1.5 text-left border border-[var(--color-border)] bg-[var(--color-bg-input)] hover:border-[var(--color-danger)] hover:bg-[var(--color-bg-hover)] transition-all cursor-pointer group rounded-none"
            >
              <div className="flex items-center justify-between text-[9px] font-mono text-[var(--color-fg-muted)] uppercase">
                <span>RISK</span>
                <ShieldAlert className="h-3 w-3 text-rose-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-sm font-mono font-bold text-[var(--color-danger)] mt-0.5">
                {metrics?.avgScore ?? 0}
                <span className="text-[10px] text-[var(--color-fg-muted)] font-normal">/100</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
