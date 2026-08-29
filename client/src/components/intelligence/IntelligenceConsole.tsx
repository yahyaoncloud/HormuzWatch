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
}

type ConsoleTab = 'zones' | 'notations' | 'legend';

export function IntelligenceConsole({
  highlightZone,
  newsItems,
  selectedRegion = 'all',
  onSelectRegion,
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
    { id: 'AREA-HORMUZ', name: 'Strait of Hormuz', color: '#FF0055', desc: 'Critical Maritime Chokepoint & TSS' },
    { id: 'AREA-PGULF', name: 'Persian Gulf (North)', color: '#FF9900', desc: 'Northern Energy & Tanker Basin' },
    { id: 'AREA-GOMAN', name: 'Gulf of Oman', color: '#00E5FF', desc: 'Deep-Water Ingress & Egress' },
    { id: 'AREA-FUJAIRAH', name: 'Fujairah Anchorage Hub', color: '#00E676', desc: 'Global Bunkering & STS Anchorage' },
    { id: 'AREA-JEBELALI', name: 'Jebel Ali Corridor', color: '#10B981', desc: 'Container Terminal Approach' },
    { id: 'AREA-RASTANURA', name: 'Ras Tanura Terminal', color: '#F59E0B', desc: 'Major Offshore Crude Loading Port' },
    { id: 'AREA-QATAR-LNG', name: 'Ras Laffan / North Field', color: '#3B82F6', desc: 'LNG Export & Offshore Gas Basin' },
    { id: 'AREA-KHARG', name: 'Kharg Island Terminal', color: '#EC4899', desc: 'Heavy Crude Deepwater Terminal' },
    { id: 'AREA-BANDARABBAS', name: 'Bandar Abbas / Qeshm', color: '#E11D48', desc: 'Naval Station & Ingress Pass' },
    { id: 'AREA-RS-SOUTH', name: 'Bab-el-Mandeb', color: '#DC2626', desc: 'Southern Red Sea Chokepoint' },
    { id: 'AREA-RS-NORTH', name: 'Red Sea & Suez Approach', color: '#8B5CF6', desc: 'Suez Canal Maritime Approach' },
    { id: 'AREA-ADEN-IRTC', name: 'Gulf of Aden IRTC Corridor', color: '#06B6D4', desc: 'Maritime Security Transit Corridor' },
  ];

  return (
    <aside className="hidden lg:block w-full h-full flex-shrink-0">
      <div className="border-r border-[var(--color-border)] bg-[var(--color-bg-elevated)]/60 flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 px-3 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="font-display text-[13px] font-semibold text-[var(--color-fg)] flex items-center gap-2">
            <Compass className="h-4 w-4 text-[var(--color-primary-600)]" />
            Intel Console
          </h3>
          <span className="text-[10px] font-mono text-[var(--color-fg-muted)] uppercase tracking-wider">
            Live
          </span>
        </div>

        {/* Tab Navigation to eliminate vertical conflict */}
        <div className="shrink-0 flex items-center border-b border-[var(--color-border)] bg-[var(--color-bg)]/50 p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('zones')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1 px-2 text-[11px] font-medium transition-colors border',
              activeTab === 'zones'
                ? 'bg-[var(--color-bg-elevated)] text-[var(--color-fg)] border-[var(--color-border)] shadow-xs'
                : 'text-[var(--color-fg-muted)] border-transparent hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)]/40'
            )}
          >
            <Compass className="h-3 w-3 text-[var(--color-primary-600)]" />
            <span>Zones</span>
            <span className="text-[9px] font-mono opacity-70">({watchZones.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notations')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1 px-2 text-[11px] font-medium transition-colors border',
              activeTab === 'notations'
                ? 'bg-[var(--color-bg-elevated)] text-[var(--color-fg)] border-[var(--color-border)] shadow-xs'
                : 'text-[var(--color-fg-muted)] border-transparent hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)]/40'
            )}
          >
            <FileText className="h-3 w-3 text-[#00E5FF]" />
            <span>Notations</span>
            <span className="text-[9px] font-mono opacity-70">({notations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('legend')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1 px-2 text-[11px] font-medium transition-colors border',
              activeTab === 'legend'
                ? 'bg-[var(--color-bg-elevated)] text-[var(--color-fg)] border-[var(--color-border)] shadow-xs'
                : 'text-[var(--color-fg-muted)] border-transparent hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)]/40'
            )}
          >
            <Layers className="h-3 w-3 text-[#FF9900]" />
            <span>Legend</span>
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
          {/* Tab 3: Tactical Symbology & Legend */}
          {/* ================================================ */}
          {activeTab === 'legend' && (
            <div className="space-y-3">
              {/* Vessel Markers */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] mb-1.5 flex items-center gap-1.5">
                  <Ship className="h-3 w-3 text-[#00E5FF]" />
                  Vessel Anomaly Postures
                </div>
                <div className="space-y-1.5 p-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xs">
                  {[
                    { color: '#00E676', label: 'Nominal Transit', desc: 'Commercial course & speed within standard corridor' },
                    { color: '#FFC800', label: 'Medium Posture', desc: 'Minor course delta or speed variance detected' },
                    { color: '#FF9900', label: 'High Anomaly', desc: 'AIS gap or abnormal behavior pattern' },
                    { color: '#FF0055', label: 'Critical Target', desc: 'Severe threat anomaly requiring immediate review', pulse: true },
                  ].map((m) => (
                    <div key={m.label} className="flex items-center gap-2.5">
                      <div
                        className="relative w-5 h-5 bg-[var(--color-bg-elevated)] border flex items-center justify-center shrink-0"
                        style={{ borderColor: m.color, boxShadow: `0 0 6px ${m.color}30` }}
                      >
                        {m.pulse && (
                          <div
                            className="absolute inset-0 border animate-ping opacity-30"
                            style={{ borderColor: m.color }}
                          />
                        )}
                        <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                          {m.pulse ? (
                            <>
                              <circle cx="7" cy="7" r="5" stroke={m.color} strokeWidth="1" />
                              <line x1="7" y1="1" x2="7" y2="13" stroke={m.color} strokeWidth="1" />
                              <line x1="1" y1="7" x2="13" y2="7" stroke={m.color} strokeWidth="1" />
                            </>
                          ) : (
                            <path d="M7 1 L11 11 L7 8 L3 11 Z" fill={m.color} opacity="0.9" />
                          )}
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-[var(--color-fg)]">{m.label}</div>
                        <div className="text-[10px] text-[var(--color-fg-muted)] leading-tight">{m.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aircraft Markers */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] mb-1.5 flex items-center gap-1.5">
                  <Plane className="h-3 w-3 text-[#00E5FF]" />
                  Aviation ADS-B Vectors
                </div>
                <div className="space-y-1.5 p-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xs">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-5 h-5 bg-[var(--color-bg-elevated)] border border-[#00E5FF] flex items-center justify-center shrink-0"
                      style={{ boxShadow: '0 0 6px rgba(0,229,255,0.3)' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1 L10 5 L7 13 L4 5 Z" fill="#00E5FF" opacity="0.9" />
                        <line x1="2" y1="6" x2="12" y2="6" stroke="#00E5FF" strokeWidth="1.5" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-[var(--color-fg)]">Commercial & Cargo Flights</div>
                      <div className="text-[10px] text-[var(--color-fg-muted)] leading-tight">ADS-B state vectors with heading and altitude telemetry</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conflict Reticles */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] mb-1.5 flex items-center gap-1.5">
                  <ShieldAlert className="h-3 w-3 text-[#FF0055]" />
                  Verified Incidents & Hotspots
                </div>
                <div className="space-y-1.5 p-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xs">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-5 h-5 bg-[var(--color-bg-elevated)] border border-[#FF0055] flex items-center justify-center shrink-0"
                      style={{ boxShadow: '0 0 6px rgba(255,0,85,0.3)' }}
                    >
                      <span className="text-[11px] font-bold text-[#FF0055]">⊕</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-[var(--color-fg)]">Verified Incident Marker</div>
                      <div className="text-[10px] text-[var(--color-fg-muted)] leading-tight">UKMTO, NASA FIRMS, and georeferenced OSINT alert coordinates</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
