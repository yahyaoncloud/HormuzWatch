import React from 'react';
import { cn } from '@/utils/cn';

export type AnomalySeverity = 'critical' | 'high' | 'medium' | 'low' | 'nominal' | 'emergency';

export interface SeverityIndicatorProps {
  severity?: AnomalySeverity | string | null;
  score?: number | null;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SeverityIndicator: React.FC<SeverityIndicatorProps> = ({
  severity = 'low',
  score,
  showScore = false,
  size = 'md',
  className,
}) => {
  const normSev = (severity || 'low').toLowerCase();

  const configMap: Record<
    string,
    { bg: string; text: string; border: string; label: string; led: string }
  > = {
    critical: {
      bg: 'bg-rose-950/70',
      text: 'text-rose-400',
      border: 'border-rose-600/70',
      led: 'bg-rose-500 shadow-[0_0_6px_#ef4444]',
      label: 'CRITICAL',
    },
    emergency: {
      bg: 'bg-rose-950/80',
      text: 'text-rose-300',
      border: 'border-rose-500',
      led: 'bg-rose-400 animate-ping shadow-[0_0_8px_#f43f5e]',
      label: 'EMERGENCY',
    },
    high: {
      bg: 'bg-amber-950/60',
      text: 'text-amber-400',
      border: 'border-amber-600/60',
      led: 'bg-amber-500 shadow-[0_0_5px_#f59e0b]',
      label: 'HIGH RISK',
    },
    medium: {
      bg: 'bg-yellow-950/40',
      text: 'text-yellow-400',
      border: 'border-yellow-600/50',
      led: 'bg-yellow-500',
      label: 'MEDIUM',
    },
    low: {
      bg: 'bg-emerald-950/40',
      text: 'text-emerald-400',
      border: 'border-emerald-600/50',
      led: 'bg-emerald-500',
      label: 'LOW',
    },
    nominal: {
      bg: 'bg-slate-900/60',
      text: 'text-slate-400',
      border: 'border-slate-700',
      led: 'bg-slate-500',
      label: 'NOMINAL',
    },
  };

  const conf = configMap[normSev] || configMap.nominal;

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[9px] gap-1',
    md: 'px-2 py-0.5 text-[10px] gap-1.5',
    lg: 'px-2.5 py-1 text-xs gap-2',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono font-bold uppercase tracking-wider border select-none',
        conf.bg,
        conf.text,
        conf.border,
        sizeClasses[size],
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-none shrink-0 border border-black/50', conf.led)} />
      <span>{conf.label}</span>
      {showScore && score !== undefined && score !== null && (
        <span className="text-white ml-0.5">[{score.toFixed(0)}]</span>
      )}
    </span>
  );
};
