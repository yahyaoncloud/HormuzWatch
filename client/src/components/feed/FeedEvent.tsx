import React from 'react';
import { cn } from '@/utils/cn';
import { SeverityIndicator } from '@/components/common/SeverityIndicator';
import { TimestampDisplay } from '@/components/common/TimestampDisplay';

export interface FeedEventProps {
  id?: string;
  typeBadge: string;
  typeColor?: string;
  severity?: string;
  score?: number;
  timestamp?: string | number | Date | null;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const FeedEvent: React.FC<FeedEventProps> = ({
  typeBadge,
  typeColor = 'text-[var(--color-primary-600)] dark:text-[#38bdf8] border-[var(--color-border)] bg-[var(--color-bg-input)]',
  severity,
  score,
  timestamp,
  children,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        'p-2.5 border border-[var(--color-border)] bg-[var(--color-bg-card)] tactical-beveled flex flex-col gap-2 transition-colors select-none',
        className
      )}
    >
      {/* Top Header Strip */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-1.5 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Type Badge */}
          <span className={cn('px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase border', typeColor)}>
            {typeBadge}
          </span>

          {/* Severity Indicator */}
          {severity && (
            <SeverityIndicator severity={severity} score={score} showScore size="sm" />
          )}
        </div>

        {/* Timestamp & Actions */}
        <div className="flex items-center gap-2">
          <TimestampDisplay timestamp={timestamp} format="auto" />
          {actions}
        </div>
      </div>

      {/* Main Event Body */}
      <div>{children}</div>
    </div>
  );
};
