import { AlertTriangle, X } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/utils/cn';

export interface ThreatItem {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  region: string;
  time: string;
  score: number;
  trackId: string;
  assetName: string;
}

interface ThreatsPanelProps {
  topThreats: ThreatItem[];
  totalThreats: number;
  criticalCount: number;
  highCount: number;
  selectedThreat: ThreatItem | null;
  setSelectedThreat: (threat: ThreatItem | null) => void;
}

export function ThreatsPanel({
  topThreats,
  totalThreats,
  criticalCount,
  highCount,
  setSelectedThreat,
}: ThreatsPanelProps) {
  return (
    <aside className="hidden lg:block w-80 flex-shrink-0 p-4">
      <div className="glass-card rounded-xl border border-[var(--color-border)]/50 flex flex-col max-h-[calc(100vh-8rem)]">
        {/* Header — fixed */}
        <div className="shrink-0 px-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-semibold text-[var(--color-fg)] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--color-danger)]" />
              Threat Intelligence
            </h3>
            <span className="font-data text-[11px] font-medium text-[var(--color-fg-muted)] bg-[var(--color-bg-elevated)] px-2 py-0.5 rounded-full">
              {totalThreats} reports
            </span>
          </div>

          {/* Severity summary bar */}
          <div className="mb-3 flex gap-1.5">
            <div className="flex-1 rounded-md bg-[var(--color-danger-muted)]/50 border border-[var(--color-danger)]/20 p-2 text-center">
              <div className="font-data text-sm font-bold text-[var(--color-danger)]">
                {criticalCount}
              </div>
              <div className="font-ui text-[10px] text-[var(--color-fg-muted)]">Critical</div>
            </div>
            <div className="flex-1 rounded-md bg-[var(--color-warning-muted)]/50 border border-[var(--color-warning)]/20 p-2 text-center">
              <div className="font-data text-sm font-bold text-[var(--color-warning)]">
                {highCount}
              </div>
              <div className="font-ui text-[10px] text-[var(--color-fg-muted)]">High</div>
            </div>
            <div className="flex-1 rounded-md bg-[var(--color-info-muted)]/50 border border-[var(--color-info)]/20 p-2 text-center">
              <div className="font-data text-sm font-bold text-[var(--color-info)]">
                {totalThreats - criticalCount - highCount}
              </div>
              <div className="font-ui text-[10px] text-[var(--color-fg-muted)]">Other</div>
            </div>
          </div>
        </div>

        {/* Scrollable threat list */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-2 space-y-2.5">
          {topThreats.slice(0, 8).map((threat, i) => (
            <div
              key={threat.id || `threat-${i}`}
              onClick={() => setSelectedThreat(threat)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setSelectedThreat(threat);
              }}
              role="button"
              tabIndex={0}
              className={cn(
                'group relative rounded-lg p-3 border transition-all cursor-pointer',
                threat.severity === 'critical' &&
                  'border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5',
                threat.severity === 'high' &&
                  'border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5',
                threat.severity === 'medium' &&
                  'border-[var(--color-info)]/30 bg-[var(--color-bg-card)]',
                threat.severity === 'low' &&
                  'border-[var(--color-border)] bg-[var(--color-bg-card)]',
                threat.score > 0 && 'hover:border-[var(--color-primary-400)]/40'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-data text-xs font-bold text-[var(--color-fg-muted)]">
                      #{i + 1}
                    </span>
                    <h4 className="font-ui text-xs font-semibold text-[var(--color-fg)] leading-snug line-clamp-2">
                      {threat.title}
                    </h4>
                  </div>
                  <p className="font-ui text-[11px] text-[var(--color-fg-muted)] line-clamp-2 mt-0.5">
                    {threat.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      threat.severity === 'critical' && 'bg-[var(--color-danger)]',
                      threat.severity === 'high' && 'bg-[var(--color-warning)]',
                      threat.severity === 'medium' && 'bg-[var(--color-info)]',
                      threat.severity === 'low' && 'bg-[var(--color-success)]'
                    )}
                  />
                  <span
                    className={cn(
                      'font-data text-[10px] font-semibold uppercase',
                      threat.severity === 'critical' && 'text-[var(--color-danger)]',
                      threat.severity === 'high' && 'text-[var(--color-warning)]',
                      threat.severity === 'medium' && 'text-[var(--color-info)]',
                      threat.severity === 'low' && 'text-[var(--color-success)]'
                    )}
                  >
                    {threat.severity}
                  </span>
                </div>
              </div>
              {threat.score > 0 && (
                <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[11px]">
                  <span className="font-data text-[var(--color-fg-muted)]">
                    {threat.region}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-data text-[var(--color-fg-muted)]">
                      {threat.time}
                    </span>
                    <span className="font-data font-semibold text-[var(--color-primary-600)]">
                      {threat.score.toFixed(0)}/100
                    </span>
                  </div>
                </div>
              )}
              {threat.score === 0 && (
                <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[11px]">
                  <span className="font-data text-[var(--color-fg-muted)]">
                    {threat.region}
                  </span>
                  <span className="font-data text-[var(--color-fg-muted)]">{threat.time}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer — fixed */}
        <div className="shrink-0 px-4 pb-4 pt-2 border-t border-[var(--color-border)]">
          <Link
            to="/intelligence"
            className="block text-center font-ui text-sm text-[var(--color-primary-700)] hover:underline transition-colors"
          >
            View full intelligence record →
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-overlay-enter"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Threat Intelligence Detail"
    >
      <div
        className="glass-card rounded-2xl border border-[var(--color-border)] max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-xl animate-dropdown-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full shrink-0',
                  selectedThreat.severity === 'critical' && 'bg-[var(--color-danger)]',
                  selectedThreat.severity === 'high' && 'bg-[var(--color-warning)]',
                  selectedThreat.severity === 'medium' && 'bg-[var(--color-info)]',
                  selectedThreat.severity === 'low' && 'bg-[var(--color-success)]'
                )}
              />
              <span
                className={cn(
                  'font-data text-[11px] font-semibold uppercase tracking-wider',
                  selectedThreat.severity === 'critical' && 'text-[var(--color-danger)]',
                  selectedThreat.severity === 'high' && 'text-[var(--color-warning)]',
                  selectedThreat.severity === 'medium' && 'text-[var(--color-info)]',
                  selectedThreat.severity === 'low' && 'text-[var(--color-success)]'
                )}
              >
                {selectedThreat.severity}
              </span>
            </div>
            <h3 className="font-display text-lg font-semibold text-[var(--color-fg)] leading-snug">
              {selectedThreat.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)] transition-colors"
            aria-label="Close detail"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-5 space-y-4">
          <p className="font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
            {selectedThreat.description}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--color-bg-elevated)] rounded-lg p-3">
              <div className="font-ui text-[11px] text-[var(--color-fg-muted)] mb-0.5">
                Region
              </div>
              <div className="font-data text-sm font-semibold text-[var(--color-fg)]">
                {selectedThreat.region}
              </div>
            </div>
            <div className="bg-[var(--color-bg-elevated)] rounded-lg p-3">
              <div className="font-ui text-[11px] text-[var(--color-fg-muted)] mb-0.5">
                Anomaly Score
              </div>
              <div className="font-data text-sm font-semibold text-[var(--color-primary-600)]">
                {selectedThreat.score.toFixed(0)}
                <span className="text-[var(--color-fg-muted)] font-normal">/100</span>
              </div>
            </div>
            <div className="bg-[var(--color-bg-elevated)] rounded-lg p-3">
              <div className="font-ui text-[11px] text-[var(--color-fg-muted)] mb-0.5">
                Track ID
              </div>
              <div
                className="font-data text-sm font-semibold text-[var(--color-fg)] font-mono text-xs truncate"
                title={selectedThreat.trackId}
              >
                {selectedThreat.trackId || 'N/A'}
              </div>
            </div>
            <div className="bg-[var(--color-bg-elevated)] rounded-lg p-3">
              <div className="font-ui text-[11px] text-[var(--color-fg-muted)] mb-0.5">
                Asset
              </div>
              <div className="font-data text-sm font-semibold text-[var(--color-fg)]">
                {selectedThreat.assetName}
              </div>
            </div>
            <div className="bg-[var(--color-bg-elevated)] rounded-lg p-3">
              <div className="font-ui text-[11px] text-[var(--color-fg-muted)] mb-0.5">
                Detected
              </div>
              <div className="font-data text-sm font-semibold text-[var(--color-fg)]">
                {selectedThreat.time}
              </div>
            </div>
            <div className="bg-[var(--color-bg-elevated)] rounded-lg p-3">
              <div className="font-ui text-[11px] text-[var(--color-fg-muted)] mb-0.5">
                Threat Level
              </div>
              <div className="font-data text-sm font-semibold capitalize text-[var(--color-fg)]">
                {selectedThreat.severity}
              </div>
            </div>
          </div>

          {selectedThreat.score > 80 && (
            <div className="bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--color-danger)] shrink-0 mt-0.5" />
              <div>
                <div className="font-ui text-xs font-semibold text-[var(--color-danger)]">
                  Escalation Warning
                </div>
                <p className="font-ui text-[11px] text-[var(--color-fg-muted)] mt-0.5">
                  Anomaly score exceeds 80/100. This asset requires immediate attention.
                  Consider notifying coalition command or flagging for watchlist monitoring.
                </p>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-[var(--color-border)] flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-[var(--color-border)] px-4 py-2.5 font-ui text-sm font-medium text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] transition-colors"
            >
              Close
            </button>
            <Link
              to="/intelligence"
              onClick={onClose}
              className="flex-1 rounded-lg bg-[var(--color-primary-600)] px-4 py-2.5 font-ui text-sm font-medium text-white text-center hover:bg-[var(--color-primary-700)] transition-colors"
            >
              Open Intelligence →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
