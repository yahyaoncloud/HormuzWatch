import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { MetricLogEntry } from '@/types/health';

export interface HoverLogCardProps {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  log?: MetricLogEntry | null;
  defaultMessage?: string;
  defaultDetails?: string;
  className?: string;
}

export const HoverLogCard: React.FC<HoverLogCardProps> = ({
  title,
  icon: Icon,
  iconColor = 'text-[var(--color-primary-400)]',
  log,
  defaultMessage = 'Service active and streaming',
  defaultDetails,
  className,
}) => {
  const displayTime = log?.time || 'LIVE';
  const displayMessage = log?.message || defaultMessage;
  const displayDetails = log?.details || defaultDetails;

  return (
    <div
      className={cn(
        'absolute bottom-full left-0 mb-2 hidden group-hover:flex flex-col z-50 w-80 p-2.5',
        'bg-[var(--color-bg)] border border-[var(--color-border)] shadow-2xl backdrop-blur-md',
        'text-left pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-150',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase font-mono">
          <Icon className={cn('h-3 w-3', iconColor)} />
          <span className={iconColor}>{title}</span>
        </div>
        <span className="text-[9px] font-mono text-[var(--color-fg-muted)]">{displayTime}</span>
      </div>

      <div className="text-[11px] font-mono text-[var(--color-fg)] font-medium leading-tight break-words">
        {displayMessage}
      </div>

      {displayDetails && (
        <div className="mt-1.5 pt-1.5 border-t border-[var(--color-border)]/50 text-[10px] font-mono text-[var(--color-fg-muted)] leading-normal break-words">
          {displayDetails}
        </div>
      )}
    </div>
  );
};
