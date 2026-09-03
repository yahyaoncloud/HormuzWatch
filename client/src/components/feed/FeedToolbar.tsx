import React from 'react';
import { Newspaper, RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { DataFreshnessIndicator } from '@/components/common/DataFreshnessIndicator';

export interface FeedToolbarProps {
  totalEvents: number;
  latestTimestamp?: string | number | Date | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export const FeedToolbar: React.FC<FeedToolbarProps> = ({
  totalEvents,
  latestTimestamp,
  onRefresh,
  isRefreshing = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 tactical-beveled flex items-center justify-between gap-2 flex-wrap select-none',
        className
      )}
    >
      {/* Title & Dispatches Counter */}
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 border border-[var(--color-border)] bg-[var(--color-bg-input)] flex items-center justify-center text-[var(--color-primary-600)] dark:text-[#38bdf8]">
          <Newspaper className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-fg)]">
            INTELLIGENCE DISPATCH WIRE & REAL-TIME EVENT STREAM
          </span>
          <span className="font-mono text-[10px] text-[var(--color-fg-muted)] ml-2">
            [{totalEvents} DISPATCHES IN BUFFER]
          </span>
        </div>
      </div>

      {/* Freshness & Refresh Control */}
      <div className="flex items-center gap-2">
        <DataFreshnessIndicator timestamp={latestTimestamp} />

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1 border border-[var(--color-border)] bg-[var(--color-bg-input)] font-mono text-[10px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-primary-600)] transition-colors active:translate-y-px"
            title="Refresh Wire Dispatches"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
          </button>
        )}
      </div>
    </div>
  );
};
