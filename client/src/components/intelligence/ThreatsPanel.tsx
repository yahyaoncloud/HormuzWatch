import { AlertTriangle, Eye, LocateFixed, X } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/utils/cn';
import type { ThreatItem } from '@/types/threats';

export type { ThreatItem };

interface ThreatsPanelProps {
  topThreats: ThreatItem[];
  totalThreats: number;
  criticalCount: number;
  highCount: number;
  selectedThreat: ThreatItem | null;
  setSelectedThreat: (threat: ThreatItem | null) => void;
  onHoverThreat?: (threat: ThreatItem | null) => void;
}

export function ThreatsPanel({
  topThreats,
  totalThreats,
  criticalCount,
  highCount,
  setSelectedThreat,
  onHoverThreat,
}: ThreatsPanelProps) {
  return (
    <aside className="hidden lg:block w-full flex-shrink-0">
      <div className="border-l border-[var(--color-border)] bg-[var(--color-bg)]/70 flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 px-3 py-2.5 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-[13px] font-semibold text-[var(--color-fg)] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--color-danger)]" />
              Threat Intel
            </h3>
            <span className="font-mono text-[10px] font-medium text-[var(--color-fg-muted)] bg-[var(--color-bg-elevated)] px-1.5 py-0.5 border border-[var(--color-border)]">
              {totalThreats}
            </span>
          </div>

          {/* Severity strip */}
          <div className="mt-2 flex gap-1">
            <div className="flex-1 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 p-1.5 text-center">
              <div className="font-mono text-xs font-bold text-[var(--color-danger)]">{criticalCount}</div>
              <div className="text-[9px] text-[var(--color-fg-muted)] uppercase">Critical</div>
            </div>
            <div className="flex-1 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 p-1.5 text-center">
              <div className="font-mono text-xs font-bold text-[var(--color-warning)]">{highCount}</div>
              <div className="text-[9px] text-[var(--color-fg-muted)] uppercase">High</div>
            </div>
            <div className="flex-1 bg-[var(--color-info)]/10 border border-[var(--color-info)]/20 p-1.5 text-center">
              <div className="font-mono text-xs font-bold text-[var(--color-info)]">
                {totalThreats - criticalCount - highCount}
              </div>
              <div className="text-[9px] text-[var(--color-fg-muted)] uppercase">Other</div>
            </div>
          </div>
        </div>

        {/* Threat list */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {topThreats.slice(0, 10).map((threat, i) => (
            <div
              key={threat.id || `threat-${i}`}
              onClick={() => setSelectedThreat(threat)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setSelectedThreat(threat);
              }}
              role="button"
              tabIndex={0}
              className={cn(
                'group flex items-start gap-2 px-3 py-2 border-b border-[var(--color-border)] transition-colors cursor-pointer',
                threat.severity === 'critical' && 'border-l-2 border-l-[var(--color-danger)] bg-[var(--color-danger)]/[0.02]',
                threat.severity === 'high' && 'bg-[var(--color-warning)]/[0.02]',
                'hover:bg-[var(--color-bg-elevated)]'
              )}
            >
              {/* Severity dot */}
              <span
                className={cn(
                  'mt-1 w-1.5 h-1.5 rounded-full shrink-0',
                  threat.severity === 'critical' && 'bg-[var(--color-danger)]',
                  threat.severity === 'high' && 'bg-[var(--color-warning)]',
                  threat.severity === 'medium' && 'bg-[var(--color-info)]',
                  threat.severity === 'low' && 'bg-[var(--color-success)]'
                )}
              />

              <div className="flex-1 min-w-0">
                {/* Title + score */}
                <div className="flex items-start justify-between gap-1">
                  <h4 className="font-ui text-[11px] font-semibold text-[var(--color-fg)] leading-tight line-clamp-2">
                    {threat.title}
                  </h4>
                  {threat.score > 0 && (
                    <span className={cn(
                      'font-mono text-[10px] font-bold shrink-0',
                      threat.score > 80 ? 'text-[var(--color-danger)]' : threat.score > 50 ? 'text-[var(--color-warning)]' : 'text-[var(--color-fg-muted)]'
                    )}>{threat.score.toFixed(0)}</span>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-[var(--color-fg-muted)] font-mono">
                    {threat.region}
                  </span>
                  <span className="text-[10px] text-[var(--color-fg-muted)]">
                    {threat.time}
                  </span>
                </div>

                {/* Actions */}
                {threat.trackId && (
                  <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onHoverThreat?.(threat); }}
                      className="px-1.5 py-0.5 bg-[var(--color-bg-elevated)] hover:bg-[var(--color-primary-600)] hover:text-white border border-[var(--color-border)] text-[10px] font-medium text-[var(--color-fg-muted)] flex items-center gap-0.5 transition-colors"
                      title="Focus on Map"
                    >
                      <LocateFixed className="h-2.5 w-2.5" />
                      Focus
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedThreat(threat); }}
                      className="px-2 py-0.5 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white text-[10px] font-medium flex items-center gap-0.5 transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-2.5 w-2.5" />
                      View
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-3 py-2 border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)]/50">
          <Link
            to="/intelligence"
            className="block text-center font-ui text-[11px] text-[var(--color-primary-600)] hover:underline transition-colors"
          >
            Open Intelligence Center →
          </Link>
        </div>
      </div>
    </aside>
  );
}

export function ThreatDetailModal({
  selectedThreat,
  onClose,
}: {
  selectedThreat: ThreatItem | null;
  onClose: () => void;
}) {
  if (!selectedThreat) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Threat Intelligence Detail"
    >
      <div
        className="border border-[var(--color-border)] bg-[var(--color-bg-card)] max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 pb-2 border-b border-[var(--color-border)]">
          <div className="flex-1 min-w-0 mr-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                'h-2 w-2 rounded-full shrink-0',
                selectedThreat.severity === 'critical' && 'bg-[var(--color-danger)]',
                selectedThreat.severity === 'high' && 'bg-[var(--color-warning)]',
                selectedThreat.severity === 'medium' && 'bg-[var(--color-info)]',
                selectedThreat.severity === 'low' && 'bg-[var(--color-success)]'
              )} />
              <span className={cn(
                'text-[10px] font-semibold uppercase tracking-wider',
                selectedThreat.severity === 'critical' && 'text-[var(--color-danger)]',
                selectedThreat.severity === 'high' && 'text-[var(--color-warning)]',
                selectedThreat.severity === 'medium' && 'text-[var(--color-info)]',
                selectedThreat.severity === 'low' && 'text-[var(--color-success)]'
              )}>
                {selectedThreat.severity}
              </span>
            </div>
            <h3 className="font-display text-base font-semibold text-[var(--color-fg)] leading-snug">
              {selectedThreat.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)] transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <p className="font-ui text-[13px] text-[var(--color-fg-muted)] leading-relaxed">
            {selectedThreat.description}
          </p>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Region', value: selectedThreat.region },
              { label: 'Anomaly Score', value: `${selectedThreat.score.toFixed(0)}/100` },
              { label: 'Track ID', value: selectedThreat.trackId || 'N/A' },
              { label: 'Asset', value: selectedThreat.assetName },
              { label: 'Detected', value: selectedThreat.time },
              { label: 'Level', value: selectedThreat.severity },
            ].map((f) => (
              <div key={f.label} className="bg-[var(--color-bg)] border border-[var(--color-border)] p-2">
                <div className="text-[10px] text-[var(--color-fg-muted)] uppercase">{f.label}</div>
                <div className="text-[13px] font-semibold text-[var(--color-fg)] mt-0.5">{f.value}</div>
              </div>
            ))}
          </div>

          {selectedThreat.score > 80 && (
            <div className="bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--color-danger)] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-[var(--color-danger)]">Escalation Warning</div>
                <p className="text-[11px] text-[var(--color-fg-muted)] mt-0.5">
                  Anomaly score exceeds 80/100. Requires immediate attention.
                </p>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-[var(--color-border)] flex gap-2">
            <button onClick={onClose} className="flex-1 border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] transition-colors">
              Close
            </button>
            <Link to="/intelligence" onClick={onClose} className="flex-1 bg-[var(--color-primary-600)] px-3 py-2 text-xs font-medium text-white text-center hover:bg-[var(--color-primary-700)] transition-colors">
              Open Intelligence →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
