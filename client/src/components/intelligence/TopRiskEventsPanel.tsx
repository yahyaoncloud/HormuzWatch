import React from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { AnomalyEventData } from './AnomalyEventRow';
import { SeverityIndicator } from '@/components/common/SeverityIndicator';
import { TimestampDisplay } from '@/components/common/TimestampDisplay';

export interface TopRiskEventsPanelProps {
  threats: AnomalyEventData[];
  onViewOnMap?: (trackId: string, lat?: number, lon?: number) => void;
  onSelectThreat?: (threat: AnomalyEventData) => void;
  className?: string;
}

export const TopRiskEventsPanel: React.FC<TopRiskEventsPanelProps> = ({
  threats,
  onViewOnMap,
  onSelectThreat,
  className,
}) => {
  const top5 = threats.slice(0, 5);

  return (
    <div
      className={cn(
        'border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 tactical-beveled flex flex-col select-none',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--color-border)] shrink-0">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-fg)]">
            TOP 5 CRITICAL OPERATIONAL RISKS
          </span>
        </div>
        <span className="font-mono text-[10px] text-[var(--color-fg-muted)]">
          RANKED BY ML SEVERITY
        </span>
      </div>

      {/* Ranked List */}
      <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
        {top5.map((t, idx) => {
          const rank = idx + 1;
          const reasons = Array.isArray(t.reasons) ? t.reasons : (t.reasons || '').split(';');

          return (
            <div
              key={t.id || t.trackId}
              onClick={() => onSelectThreat?.(t)}
              className="p-2 border border-[var(--color-border)] bg-[var(--color-bg-input)] tactical-beveled hover:bg-[var(--color-bg-hover)] transition-all cursor-pointer flex items-center justify-between gap-2"
            >
              {/* Rank & Entity */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={cn(
                    'w-5 h-5 font-mono text-[11px] font-bold flex items-center justify-center border shrink-0',
                    rank === 1
                      ? 'bg-rose-500/10 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border-rose-600/70 shadow-[0_0_4px_#ef4444]'
                      : rank <= 3
                      ? 'bg-amber-500/10 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-600/60'
                      : 'bg-[var(--color-bg-card)] text-[var(--color-fg-muted)] border-[var(--color-border)]'
                  )}
                >
                  #{rank}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[var(--color-fg)] uppercase truncate">
                      {t.assetName || t.trackId}
                    </span>
                    <SeverityIndicator severity={t.severity} score={t.score} showScore size="sm" />
                  </div>
                  <div className="font-mono text-[10px] text-[var(--color-fg-muted)] truncate mt-0.5">
                    {reasons[0] || 'Unusual kinematic vector in transit corridor'}
                  </div>
                </div>
              </div>

              {/* Timestamp & Action */}
              <div className="flex items-center gap-2 shrink-0">
                <TimestampDisplay timestamp={t.timestamp} format="relative" />
                {onViewOnMap && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewOnMap(t.trackId, t.lat, t.lon);
                    }}
                    className="p-1 border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-primary-600)] text-[var(--color-primary-600)] dark:text-[#38bdf8] transition-colors"
                    title="View on Tactical Map"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {top5.length === 0 && (
          <div className="py-6 text-center font-mono text-[11px] text-[var(--color-fg-subtle)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-input)]">
            NO CRITICAL ANOMALIES RECORDED
          </div>
        )}
      </div>
    </div>
  );
};
