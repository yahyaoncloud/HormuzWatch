import React from 'react';
import { Ship, Anchor, Navigation, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface VesselActivitySummaryProps {
  totalVessels: number;
  transitingCount: number;
  maneuveringCount: number;
  anchoredCount: number;
  waiting6hCount?: number;
  className?: string;
}

export const VesselActivitySummary: React.FC<VesselActivitySummaryProps> = ({
  totalVessels,
  transitingCount,
  maneuveringCount,
  anchoredCount,
  waiting6hCount = 0,
  className,
}) => {
  const transitingPct = totalVessels > 0 ? Math.round((transitingCount / totalVessels) * 100) : 0;
  const anchoredPct = totalVessels > 0 ? Math.round((anchoredCount / totalVessels) * 100) : 0;
  const maneuveringPct = totalVessels > 0 ? Math.round((maneuveringCount / totalVessels) * 100) : 0;

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
          <Ship className="w-4 h-4 text-[var(--color-primary-600)] dark:text-[#38bdf8]" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-fg)]">
            MARITIME TRAFFIC & FLEET ACTIVITY SUMMARY
          </span>
        </div>
        <span className="font-mono text-[10px] text-[var(--color-fg-muted)]">
          TOTAL: {totalVessels} VESSELS
        </span>
      </div>

      {/* Progress Bar Distribution */}
      <div className="w-full h-2 bg-[var(--color-bg-input)] border border-[var(--color-border)] flex overflow-hidden mb-3">
        <div style={{ width: `${transitingPct}%` }} className="bg-emerald-500 transition-all" title={`Transiting: ${transitingPct}%`} />
        <div style={{ width: `${maneuveringPct}%` }} className="bg-cyan-500 transition-all" title={`Maneuvering: ${maneuveringPct}%`} />
        <div style={{ width: `${anchoredPct}%` }} className="bg-amber-500 transition-all" title={`Anchored: ${anchoredPct}%`} />
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2 border border-[var(--color-border)] bg-[var(--color-bg-input)] tactical-beveled flex items-center gap-2">
          <Navigation className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <div className="font-mono text-[9px] text-[var(--color-fg-muted)] uppercase font-bold">TRANSITING</div>
            <div className="font-mono text-sm font-bold text-[var(--color-fg)]">{transitingCount} <span className="text-[10px] text-[var(--color-fg-subtle)]">({transitingPct}%)</span></div>
          </div>
        </div>

        <div className="p-2 border border-[var(--color-border)] bg-[var(--color-bg-input)] tactical-beveled flex items-center gap-2">
          <Ship className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <div>
            <div className="font-mono text-[9px] text-[var(--color-fg-muted)] uppercase font-bold">MANEUVERING</div>
            <div className="font-mono text-sm font-bold text-[var(--color-fg)]">{maneuveringCount} <span className="text-[10px] text-[var(--color-fg-subtle)]">({maneuveringPct}%)</span></div>
          </div>
        </div>

        <div className="p-2 border border-[var(--color-border)] bg-[var(--color-bg-input)] tactical-beveled flex items-center gap-2">
          <Anchor className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <div className="font-mono text-[9px] text-[var(--color-fg-muted)] uppercase font-bold">ANCHORED</div>
            <div className="font-mono text-sm font-bold text-[var(--color-fg)]">{anchoredCount} <span className="text-[10px] text-[var(--color-fg-subtle)]">({anchoredPct}%)</span></div>
          </div>
        </div>

        <div className="p-2 border border-[var(--color-border)] bg-[var(--color-bg-input)] tactical-beveled flex items-center gap-2">
          <Clock className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <div>
            <div className="font-mono text-[9px] text-[var(--color-fg-muted)] uppercase font-bold">WAITING 6H+</div>
            <div className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400">{waiting6hCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
