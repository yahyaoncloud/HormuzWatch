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
        <div className="h-3 w-1/2 rounded bg-[var(--color-bg-elevated)]" />
        <div className="mt-2 h-7 w-3/4 rounded bg-[var(--color-bg-elevated)]" />
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
        'group flex flex-col items-start bg-[var(--color-bg-card)] p-4 text-left transition-colors',
        onClick && 'cursor-pointer hover:bg-[var(--color-bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]',
        className
      )}
    >
      <dt className="font-ui text-xs text-[var(--color-fg-muted)] tracking-wide flex items-center gap-1">
        {accentColor && (
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
        )}
        <span>{label}</span>
      </dt>

      <dd className="mt-1 font-data text-2xl font-semibold text-[var(--color-fg)] transition-colors group-hover:text-[var(--color-primary-600)]">
        {prefix}
        {formattedValue}
        {suffix && <span className="text-sm font-normal text-[var(--color-fg-muted)] ml-0.5">{suffix}</span>}
      </dd>

      {change !== undefined && (
        <span
          className={cn(
            'mt-1 font-data text-xs',
            change >= 0 ? 'text-emerald-500' : 'text-rose-500'
          )}
        >
          {change >= 0 ? '+' : ''}{change}% {changePeriod && <span className="text-[var(--color-fg-muted)]">vs {changePeriod}</span>}
        </span>
      )}

      {description && (
        <p className="mt-1 text-[11px] font-ui text-[var(--color-fg-muted)] line-clamp-1">
          {description}
        </p>
      )}
    </Comp>
  );
};
