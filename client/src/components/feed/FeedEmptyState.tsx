import React from 'react';
import { Newspaper } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface FeedEmptyStateProps {
  message?: string;
  subMessage?: string;
  className?: string;
}

export const FeedEmptyState: React.FC<FeedEmptyStateProps> = ({
  message = 'NO DISPATCHES MATCH CURRENT FILTER SELECTION',
  subMessage = 'Adjust your event type or severity filter criteria to inspect recorded intelligence events.',
  className,
}) => {
  return (
    <div
      className={cn(
        'py-16 text-center font-mono text-xs border border-dashed border-[var(--color-border)] bg-[var(--color-bg-input)] p-6 select-none',
        className
      )}
    >
      <Newspaper className="w-8 h-8 text-[var(--color-fg-subtle)] mx-auto mb-2" />
      <div className="text-[var(--color-fg)] font-bold uppercase">{message}</div>
      <div className="text-[10px] text-[var(--color-fg-muted)] mt-1 max-w-md mx-auto leading-relaxed">
        {subMessage}
      </div>
    </div>
  );
};
