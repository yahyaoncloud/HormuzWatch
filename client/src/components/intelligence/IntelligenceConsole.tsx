import {
  Compass,
  FileText,
  Plane,
  Ship,
  ShieldAlert,
} from 'lucide-react';
import type { NewsItem } from '@/lib/api';

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
}

export function IntelligenceConsole({
  highlightZone,
  newsItems,
}: IntelligenceConsoleProps) {
  // Latest notations — compact activity log from news + metrics
  const notations = newsItems.slice(0, 8).map((item) => ({
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

  return (
    <aside className="hidden lg:block w-full flex-shrink-0">
      <div className="border-r border-[var(--color-border)] bg-[var(--color-bg-elevated)]/60 flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 px-3 py-2.5 border-b border-[var(--color-border)]">
          <h3 className="font-display text-[13px] font-semibold text-[var(--color-fg)] flex items-center gap-2">
            <Compass className="h-4 w-4 text-[var(--color-primary-600)]" />
            Intel Console
          </h3>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-3">

          {/* ================================================ */}
          {/* Strategic Watch Zones — always visible */}
          {/* ================================================ */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] mb-2 flex items-center gap-1.5">
              <Compass className="h-3 w-3 text-[var(--color-primary-600)]" />
              Watch Zones
            </div>
            <div className="space-y-0.5">
              {[
                { id: 'AREA-HORMUZ', name: 'Strait of Hormuz', color: '#FF0055' },
                { id: 'AREA-PGULF', name: 'Persian Gulf (North)', color: '#FF9900' },
                { id: 'AREA-GOMAN', name: 'Gulf of Oman', color: '#00E5FF' },
                { id: 'AREA-RS-SOUTH', name: 'Bab-el-Mandeb', color: '#DC2626' },
                { id: 'AREA-RS-NORTH', name: 'Red Sea & Suez', color: '#8B5CF6' },
                { id: 'AREA-RASTANURA', name: 'Ras Tanura Hub', color: '#F59E0B' },
                { id: 'AREA-JEBELALI', name: 'Jebel Ali Corridor', color: '#10B981' },
              ].map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => highlightZone(z.id)}
                  onMouseEnter={() => highlightZone(z.id)}
                  onMouseLeave={() => highlightZone(null)}
                  className="w-full flex items-center justify-between px-2 py-1 cursor-pointer text-left transition-all hover:bg-[var(--color-bg)] border border-transparent hover:border-[var(--color-border)]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: z.color, boxShadow: `0 0 4px ${z.color}` }}
                    />
                    <span className="font-medium text-[11px] text-[var(--color-fg-muted)] hover:text-[var(--color-primary-600)] transition-colors truncate">
                      {z.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ================================================ */}
          {/* Vessel Markers — static legend, always visible */}
          {/* ================================================ */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] mb-2 flex items-center gap-1.5">
              <Ship className="h-3 w-3 text-[#00E5FF]" />
              Vessel Markers
            </div>
            <div className="space-y-1.5 p-2 bg-[var(--color-bg)] border border-[var(--color-border)]">
              {[
                { color: '#00E676', label: 'Nominal Transit', desc: 'Commercial course', border: '#00E676' },
                { color: '#FFC800', label: 'Medium Posture', desc: 'Course/speed variance', border: '#FFC800' },
                { color: '#FF9900', label: 'High Anomaly', desc: 'AIS gap / dark activity', border: '#FF9900' },
                { color: '#FF0055', label: 'Critical Target', desc: 'Immediate alert', border: '#FF0055', pulse: true },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-2">
                  <div
                    className="relative w-5 h-5 bg-[var(--color-bg-elevated)] border flex items-center justify-center shrink-0"
                    style={{ borderColor: m.border, boxShadow: `0 0 4px ${m.color}40` }}
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
                    <div className="text-[10px] text-[var(--color-fg-muted)]">{m.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ================================================ */}
          {/* Aircraft Markers — static legend */}
          {/* ================================================ */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] mb-2 flex items-center gap-1.5">
              <Plane className="h-3 w-3 text-[#00E5FF]" />
              Aircraft Markers
            </div>
            <div className="space-y-1.5 p-2 bg-[var(--color-bg)] border border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 bg-[var(--color-bg-elevated)] border border-[#00E5FF] flex items-center justify-center shrink-0"
                  style={{ boxShadow: '0 0 4px rgba(0,229,255,0.3)' }}
                >
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1 L10 5 L7 13 L4 5 Z" fill="#00E5FF" opacity="0.9" />
                    <line x1="2" y1="6" x2="12" y2="6" stroke="#00E5FF" strokeWidth="1.5" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-[var(--color-fg)]">Flight Track</div>
                  <div className="text-[10px] text-[var(--color-fg-muted)]">ADS-B state vectors</div>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================ */}
          {/* Radar Conflict Reticles — static legend */}
          {/* ================================================ */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] mb-2 flex items-center gap-1.5">
              <ShieldAlert className="h-3 w-3 text-[#FF0055]" />
              Conflict Reticles
            </div>
            <div className="space-y-1.5 p-2 bg-[var(--color-bg)] border border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 bg-[var(--color-bg-elevated)] border border-[#FF0055] flex items-center justify-center shrink-0"
                  style={{ boxShadow: '0 0 4px rgba(255,0,85,0.3)' }}
                >
                  <span className="text-[11px] font-bold text-[#FF0055]">⊕</span>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-[var(--color-fg)]">Verified Incident</div>
                  <div className="text-[10px] text-[var(--color-fg-muted)]">UKMTO / OSINT alerts</div>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================ */}
          {/* Latest Notations — compact activity log */}
          {/* ================================================ */}
          <div className="pb-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] mb-2 flex items-center gap-1.5">
              <FileText className="h-3 w-3 text-[var(--color-primary-600)]" />
              Latest Notations
            </div>
            <div className="space-y-0.5">
              {notations.length === 0 ? (
                <p className="text-[11px] text-[var(--color-fg-muted)] italic py-2">
                  Awaiting intel feeds...
                </p>
              ) : (
                notations.map((n, i) => (
                  <div key={n.id || i} className="flex items-start gap-1.5 px-1.5 py-1 hover:bg-[var(--color-bg)]/50 transition-colors">
                    <span className="text-[10px] text-[var(--color-fg-muted)] font-mono shrink-0 mt-px">
                      {n.time}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-semibold text-[var(--color-primary-600)] uppercase">
                        {n.tag}
                      </span>
                      <span className="text-[10px] text-[var(--color-fg)] ml-1 line-clamp-1">
                        {n.text}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </aside>
  );
}
