import React, { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { AnomalyEventData } from './AnomalyEventRow';

export interface AnomalyActivityPanelProps {
  anomalies: AnomalyEventData[];
  timeWindowMinutes?: number;
  className?: string;
}

export const AnomalyActivityPanel: React.FC<AnomalyActivityPanelProps> = ({
  anomalies,
  timeWindowMinutes = 60,
  className,
}) => {
  const bucketData = useMemo(() => {
    const bucketsCount = 12;
    const bucketDurationMs = (timeWindowMinutes * 60 * 1000) / bucketsCount;
    const now = Date.now();
    const startTime = now - timeWindowMinutes * 60 * 1000;

    const buckets = Array.from({ length: bucketsCount }, (_, i) => {
      const bStart = startTime + i * bucketDurationMs;
      const bEnd = bStart + bucketDurationMs;
      const timeLabel = new Date(bStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        start: bStart,
        end: bEnd,
        label: timeLabel,
        count: 0,
        critical: 0,
        high: 0,
        medium: 0,
        maxScore: 0,
      };
    });

    for (const a of anomalies) {
      if (!a.timestamp) continue;
      const t = new Date(a.timestamp).getTime();
      if (isNaN(t) || t < startTime || t > now) continue;

      const idx = Math.min(
        bucketsCount - 1,
        Math.max(0, Math.floor((t - startTime) / bucketDurationMs))
      );
      buckets[idx].count++;
      if (a.severity === 'critical') buckets[idx].critical++;
      else if (a.severity === 'high') buckets[idx].high++;
      else buckets[idx].medium++;
      buckets[idx].maxScore = Math.max(buckets[idx].maxScore, a.score || 0);
    }

    return buckets;
  }, [anomalies, timeWindowMinutes]);

  const maxCount = Math.max(1, ...bucketData.map((b) => b.count));

  return (
    <div
      className={cn(
        'border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 tactical-beveled flex flex-col select-none',
        className
      )}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--color-border)] shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--color-primary-600)] dark:text-[#38bdf8]" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-fg)]">
            ANOMALY ACTIVITY FREQUENCY (LAST 60 MINUTES)
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] text-[var(--color-fg-muted)]">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-rose-500 inline-block" /> CRITICAL
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-amber-500 inline-block" /> HIGH
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-[#0284c7] inline-block" /> MEDIUM/LOW
          </span>
        </div>
      </div>

      {/* Histogram Visualization */}
      <div className="h-32 w-full pt-2 pb-1 flex flex-col justify-end">
        <div className="grid grid-cols-12 gap-1.5 h-24 items-end border-b border-[var(--color-border)] px-1">
          {bucketData.map((b, i) => {
            const heightPct = Math.max(4, (b.count / maxCount) * 100);
            return (
              <div key={i} className="flex flex-col items-center h-full justify-end group relative">
                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col p-1.5 bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[9px] font-mono whitespace-nowrap z-20 shadow-lg pointer-events-none">
                  <div className="text-[var(--color-fg)] font-bold">{b.label}</div>
                  <div className="text-[var(--color-fg-muted)]">Total: {b.count} events</div>
                  {b.critical > 0 && <div className="text-rose-600 dark:text-rose-400">{b.critical} Critical</div>}
                  {b.high > 0 && <div className="text-amber-600 dark:text-amber-400">{b.high} High Risk</div>}
                  {b.maxScore > 0 && <div className="text-[var(--color-primary-600)] dark:text-[#38bdf8]">Max Score: {b.maxScore}</div>}
                </div>

                {/* Segmented Bar */}
                <div
                  style={{ height: `${heightPct}%` }}
                  className={cn(
                    'w-full transition-all border border-black/20 flex flex-col justify-end overflow-hidden',
                    b.count === 0 && 'bg-[var(--color-bg-hover)]',
                    b.critical > 0 && 'bg-rose-500 shadow-[0_0_4px_#ef4444]',
                    b.critical === 0 && b.high > 0 && 'bg-amber-500',
                    b.critical === 0 && b.high === 0 && b.count > 0 && 'bg-[#0284c7]'
                  )}
                />
              </div>
            );
          })}
        </div>

        {/* X-Axis Time Labels */}
        <div className="grid grid-cols-12 gap-1.5 text-center font-mono text-[9px] text-[var(--color-fg-subtle)] pt-1 px-1">
          {bucketData.map((b, i) => (
            <div key={i} className="truncate">
              {i % 2 === 0 ? b.label : ''}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
