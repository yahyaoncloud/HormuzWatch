import { useState } from 'react';
import { cn } from '@/utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentType = 'anomaly' | 'alert' | 'weather' | 'security' | 'traffic' | 'incident';

export interface Incident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  title: string;
  description?: string;
  region: string;
  coordinates?: [number, number];
  timestamp: number;
  status?: 'open' | 'investigating' | 'resolved';
  tags?: string[];
}

export interface IncidentFeedProps {
  incidents: Incident[];
  maxItems?: number;
  showFilters?: boolean;
  onSelectIncident?: (incident: Incident) => void;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<IncidentSeverity, string> = {
  critical: 'bg-danger/20 text-danger border-danger/30',
  high: 'bg-warning/20 text-warning border-warning/30',
  medium: 'bg-info/20 text-info border-info/30',
  low: 'bg-success/20 text-success border-success/30',
};

const DOT_STYLES: Record<IncidentSeverity, string> = {
  critical: 'bg-danger animate-ping-slow',
  high: 'bg-warning',
  medium: 'bg-info',
  low: 'bg-success',
};

const TYPE_ICONS: Record<IncidentType, string> = {
  anomaly: '🔺',
  alert: '🚨',
  weather: '🌊',
  security: '🔒',
  traffic: '🚢',
  incident: '⚠️',
};

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (s < 60) return `${s}s ago`;
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IncidentFeed({
  incidents,
  maxItems = 10,
  showFilters = true,
  onSelectIncident,
  className,
}: IncidentFeedProps) {
  const [filterSeverity, setFilterSeverity] = useState<IncidentSeverity | 'all'>('all');
  const [filterType, setFilterType] = useState<IncidentType | 'all'>('all');

  const filtered = incidents
    .filter((inc) => filterSeverity === 'all' || inc.severity === filterSeverity)
    .filter((inc) => filterType === 'all' || inc.type === filterType)
    .slice(0, maxItems);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2">
          {/* Type filters */}
          <div className="flex items-center gap-1">
            {(
              ['all', 'anomaly', 'alert', 'weather', 'security', 'traffic', 'incident'] as const
            ).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-caption font-medium transition-colors border',
                  filterType === t
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background-elevated border-border/50 text-fg-muted hover:text-fg'
                )}
              >
                {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          {/* Severity filters */}
          <div className="flex items-center gap-1">
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterSeverity(s)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-caption font-medium transition-colors border',
                  filterSeverity === s
                    ? s === 'all'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : cn(SEVERITY_STYLES[s as IncidentSeverity], 'border-current')
                    : 'bg-background-elevated border-border/50 text-fg-muted hover:text-fg'
                )}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Incident List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="glass-card rounded-xl p-8 border border-border/50 text-center">
            <p className="font-ui text-body-sm text-fg-muted">
              No incidents match the current filter.
            </p>
          </div>
        ) : (
          filtered.map((incident) => (
            <button
              key={incident.id}
              onClick={() => onSelectIncident?.(incident)}
              className={cn(
                'w-full flex items-start gap-4 p-4 glass-card rounded-xl border border-border/50 text-left transition-all group',
                'hover:border-primary/30 hover:border-[var(--color-primary-300)]',
                incident.severity === 'critical' && 'border-danger/20 bg-danger/5',
                incident.severity === 'high' && 'border-warning/10 bg-warning/5'
              )}
            >
              {/* Severity dot */}
              <div className="relative mt-1.5 shrink-0">
                <span
                  className={cn('block w-2.5 h-2.5 rounded-full', DOT_STYLES[incident.severity])}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span aria-hidden className="text-sm">
                    {TYPE_ICONS[incident.type]}
                  </span>
                  <span className="font-display font-semibold text-body text-fg group-hover:text-primary transition-colors truncate">
                    {incident.title}
                  </span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-caption font-medium border',
                      SEVERITY_STYLES[incident.severity]
                    )}
                  >
                    {incident.severity.toUpperCase()}
                  </span>
                  {incident.status && (
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-caption',
                        incident.status === 'open' && 'text-danger',
                        incident.status === 'investigating' && 'text-warning',
                        incident.status === 'resolved' && 'text-success'
                      )}
                    >
                      {incident.status}
                    </span>
                  )}
                </div>
                {incident.description && (
                  <p className="font-ui text-body-sm text-fg-muted truncate">
                    {incident.description}
                  </p>
                )}
                <p className="font-ui text-caption text-fg-subtle mt-0.5">{incident.region}</p>
              </div>

              {/* Time */}
              <span className="font-data text-caption text-fg-subtle shrink-0 mt-0.5">
                {formatRelativeTime(incident.timestamp)}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2 px-1">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
        </span>
        <span className="font-ui text-caption text-fg-muted">
          Live — {filtered.length} of {incidents.length} incidents shown
        </span>
      </div>
    </div>
  );
}
