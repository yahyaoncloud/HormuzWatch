import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { StatusIndicator, type StatusColor } from '@/components/common/StatusIndicator';
import { HoverLogCard } from '@/components/common/HoverLogCard';
import type { MetricLogEntry } from '@/types/health';

export interface HudMetricConfig {
  id: string;
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  iconColor?: string;
  statusColor?: StatusColor;
  ping?: boolean;
  pulse?: boolean;
  extraInfo?: React.ReactNode;
  hoverTitle?: string;
  log?: MetricLogEntry | null;
  defaultMessage?: string;
  defaultDetails?: string;
  onClick?: () => void;
  className?: string;
}

export const HudMetricBadge: React.FC<HudMetricConfig> = ({
  label,
  value,
  icon: Icon,
  iconColor = 'text-[var(--color-primary-400)]',
  statusColor = 'emerald',
  ping = false,
  pulse = true,
  extraInfo,
  hoverTitle,
  log,
  defaultMessage,
  defaultDetails,
  onClick,
  className,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative group flex items-center gap-1.5 px-2.5 py-1',
        'bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-fg)]',
        'hover:border-[var(--color-primary-400)] transition-colors cursor-pointer font-mono text-[11px]',
        className
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', iconColor)} />
      <span className="text-[var(--color-fg-subtle)] font-medium">{label}:</span>
      <span className={cn('font-bold', iconColor)}>{value}</span>
      {extraInfo}
      <StatusIndicator color={statusColor} ping={ping} pulse={pulse} size="md" />

      {/* Hover Tactical Log Tooltip Card */}
      <HoverLogCard
        title={hoverTitle || `${label} LOG`}
        icon={Icon}
        iconColor={iconColor}
        log={log}
        defaultMessage={defaultMessage}
        defaultDetails={defaultDetails}
      />
    </div>
  );
};
