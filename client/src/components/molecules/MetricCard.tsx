import React from 'react';
import { cn, formatCompact } from '@/utils/cn';

export interface MetricCardProps {
  label: string;
  value: number | string | null | undefined;
  suffix?: string;
  prefix?: string;
  description?: string;
  accentColor?: string;
  change?: number;
  changePeriod?: string;
  isLoading?: boolean;
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  suffix = '',
  prefix = '',
  description,
  accentColor,
  change,
  changePeriod,
  isLoading = false,
  onClick,
  className,
}) => {
  if (isLoading) {
    return (
      <div className={cn('animate-pulse bg-[var(--color-bg-card)] p-4 flex flex-col', className)}>
        <div className="h-3 w-1/2 rounded-none bg-[var(--color-bg-elevated)]" />
        <div className="mt-2 h-7 w-3/4 rounded-none bg-[var(--color-bg-elevated)]" />
      </div>
    );
  }

  const formattedValue =
    typeof value === 'number' ? formatCompact(value) : value !== null && value !== undefined ? String(value) : '—';

  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'group flex flex-col items-start bg-[var(--color-bg-card)] p-2.5 sm:p-3 text-left transition-colors border border-[var(--color-border)] tactical-beveled',
        onClick && 'cursor-pointer hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-primary-600)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary-600)]',
        className
      )}
    >
      <dt className="font-mono text-[10px] uppercase font-bold text-[var(--color-fg-muted)] tracking-wider flex items-center gap-1.5 w-full">
        {accentColor && (
          <span className="w-1.5 h-1.5 rounded-none border border-black/50" style={{ backgroundColor: accentColor }} />
        )}
        <span className="truncate">{label}</span>
      </dt>

      <dd className="mt-1 font-mono text-xl sm:text-2xl font-bold text-[var(--color-fg)] transition-colors group-hover:text-[var(--color-primary-600)] dark:group-hover:text-[#38bdf8] tracking-tight">
        {prefix}
        {formattedValue}
        {suffix && <span className="text-xs font-normal text-[var(--color-fg-muted)] ml-1">{suffix}</span>}
      </dd>

      {change !== undefined && (
        <span
          className={cn(
            'mt-0.5 font-mono text-[10px] font-bold',
            change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          )}
        >
          {change >= 0 ? '▲ +' : '▼ '}{change}% {changePeriod && <span className="text-[var(--color-fg-subtle)] font-normal">vs {changePeriod}</span>}
        </span>
      )}

      {description && (
        <p className="mt-1 text-[10px] font-mono text-[var(--color-fg-muted)] line-clamp-1 border-t border-[var(--color-border)] pt-1 w-full">
          {description}
        </p>
      )}
    </Comp>
  );
};
