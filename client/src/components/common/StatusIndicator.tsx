import React from 'react';
import { cn } from '@/utils/cn';

export type StatusColor = 'emerald' | 'amber' | 'rose' | 'purple' | 'sky' | 'indigo' | 'gray';

export interface StatusIndicatorProps {
  status?: 'ok' | 'warn' | 'error' | 'idle' | 'info';
  color?: StatusColor;
  pulse?: boolean;
  ping?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const colorMap: Record<StatusColor, { bg: string; border?: string; text?: string }> = {
  emerald: { bg: 'bg-emerald-500' },
  amber: { bg: 'bg-amber-500' },
  rose: { bg: 'bg-rose-500' },
  purple: { bg: 'bg-purple-500' },
  sky: { bg: 'bg-sky-500' },
  indigo: { bg: 'bg-indigo-500' },
  gray: { bg: 'bg-[var(--color-fg-subtle)]' },
};

const statusToColor: Record<'ok' | 'warn' | 'error' | 'idle' | 'info', StatusColor> = {
  ok: 'emerald',
  warn: 'amber',
  error: 'rose',
  idle: 'gray',
  info: 'sky',
};

const sizeMap = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  color,
  pulse = true,
  ping = false,
  size = 'md',
  className,
}) => {
  const activeColor = color ?? (status ? statusToColor[status] : 'emerald');
  const colorClasses = colorMap[activeColor] || colorMap.emerald;

  return (
    <span className={cn('relative inline-flex items-center justify-center shrink-0', className)}>
      {ping && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
            colorClasses.bg
          )}
        />
      )}
      <span
        className={cn(
          'inline-block rounded-full',
          sizeMap[size],
          colorClasses.bg,
          pulse && !ping && 'animate-pulse'
        )}
      />
    </span>
  );
};
