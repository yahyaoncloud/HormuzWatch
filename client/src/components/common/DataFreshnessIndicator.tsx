import React, { useEffect, useState } from 'react';
import { cn } from '@/utils/cn';

export interface DataFreshnessIndicatorProps {
  timestamp?: string | number | Date | null;
  liveThresholdSec?: number;
  recentThresholdSec?: number;
  staleThresholdSec?: number;
  className?: string;
  showLabel?: boolean;
}

export type FreshnessState = 'live' | 'recent' | 'stale' | 'offline';

export const DataFreshnessIndicator: React.FC<DataFreshnessIndicatorProps> = ({
  timestamp,
  liveThresholdSec = 5,
  recentThresholdSec = 30,
  staleThresholdSec = 120,
  className,
  showLabel = true,
}) => {
  const [ageSec, setAgeSec] = useState<number | null>(null);

  useEffect(() => {
    if (!timestamp) {
      setAgeSec(null);
      return;
    }

    const calcAge = () => {
      const timeMs = new Date(timestamp).getTime();
      if (isNaN(timeMs)) {
        setAgeSec(null);
        return;
      }
      const diffSec = Math.max(0, (Date.now() - timeMs) / 1000);
      setAgeSec(diffSec);
    };

    calcAge();
    const interval = setInterval(calcAge, 1000);
    return () => clearInterval(interval);
  }, [timestamp]);

  let state: FreshnessState = 'offline';
  if (ageSec !== null) {
    if (ageSec <= liveThresholdSec) state = 'live';
    else if (ageSec <= recentThresholdSec) state = 'recent';
    else if (ageSec <= staleThresholdSec) state = 'stale';
    else state = 'offline';
  }

  const formatAge = (sec: number | null): string => {
    if (sec === null) return 'NO DATA';
    if (sec < 1) return '< 1s';
    if (sec < 60) return `${sec.toFixed(1)}s`;
    const min = Math.floor(sec / 60);
    const remSec = Math.floor(sec % 60);
    return `${min}m ${remSec}s`;
  };

  const statusConfig = {
    live: {
      color: 'bg-emerald-500 shadow-[0_0_4px_#22c55e]',
      text: 'text-emerald-400',
      label: 'LIVE',
      pulse: true,
    },
    recent: {
      color: 'bg-cyan-500 shadow-[0_0_4px_#06b6d4]',
      text: 'text-cyan-400',
      label: 'RECENT',
      pulse: false,
    },
    stale: {
      color: 'bg-amber-500 shadow-[0_0_4px_#f59e0b]',
      text: 'text-amber-400',
      label: 'STALE',
      pulse: false,
    },
    offline: {
      color: 'bg-rose-500 shadow-[0_0_4px_#ef4444]',
      text: 'text-rose-400',
      label: 'OFFLINE',
      pulse: false,
    },
  };

  const conf = statusConfig[state];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-input)] font-mono text-[10px] select-none',
        className
      )}
      title={timestamp ? `Last updated: ${new Date(timestamp).toISOString()}` : 'No timestamp available'}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-none border border-black/40',
          conf.color,
          conf.pulse && 'animate-pulse'
        )}
      />
      {showLabel && <span className={cn('font-bold tracking-wider uppercase', conf.text)}>{conf.label}</span>}
      <span className="text-[var(--color-fg-muted)]">[{formatAge(ageSec)}]</span>
    </div>
  );
};
