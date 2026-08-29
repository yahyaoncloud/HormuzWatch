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
  const status = log?.status || 'ok';
  const category = log?.category;

  // Semantic styling configurations based on log status
  const statusStyles = {
    ok: {
      badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      border: 'hover:border-emerald-500/40 border-[var(--color-border)]',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.08)]',
      dot: 'bg-emerald-400',
      label: 'OK',
    },
    warn: {
      badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      border: 'border-amber-500/40',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.12)]',
      dot: 'bg-amber-400',
      label: 'WARN',
    },
    error: {
      badge: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      border: 'border-rose-500/50',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)]',
      dot: 'bg-rose-400',
      label: 'ERR',
    },
  }[status] || {
    badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    border: 'border-[var(--color-border)]',
    glow: 'shadow-2xl',
    dot: 'bg-cyan-400',
    label: 'LIVE',
  };

  return (
    <div
      className={cn(
        'absolute bottom-full left-0 mb-2 hidden group-hover:flex flex-col z-50 w-84 p-3',
        'bg-[var(--color-bg)]/95 border backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-150',
        'text-left pointer-events-none rounded-lg',
        statusStyles.border,
        statusStyles.glow,
        className
      )}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase font-mono">
          <Icon className={cn('h-3.5 w-3.5', iconColor)} />
          <span className={iconColor}>{title}</span>
          {category && (
            <span className="px-1 py-0.2 rounded text-[8px] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-fg-muted)]">
              {category}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Status Badge */}
          <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border flex items-center gap-1', statusStyles.badge)}>
            <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', statusStyles.dot)} />
            {statusStyles.label}
          </span>
          <span className="text-[9px] font-mono text-[var(--color-fg-muted)]">{displayTime}</span>
        </div>
      </div>

      {/* Main Log Message */}
      <div className="text-[11px] font-mono text-[var(--color-fg)] font-medium leading-relaxed break-words">
        {displayMessage}
      </div>

      {/* Secondary Forensic Details / Metadata */}
      {displayDetails && (
        <div className="mt-2 pt-2 border-t border-[var(--color-border)]/60 text-[10px] font-mono text-[var(--color-fg-muted)] leading-normal break-words bg-[var(--color-bg-elevated)]/50 p-1.5 rounded border border-[var(--color-border)]/40">
          {displayDetails}
        </div>
      )}
    </div>
  );
};

