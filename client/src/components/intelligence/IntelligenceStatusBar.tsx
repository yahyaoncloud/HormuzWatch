import React from 'react';
import { AlertTriangle, Flame, ShieldAlert, Clock, Activity } from 'lucide-react';
import { cn } from '@/utils/cn';
import { DataFreshnessIndicator } from '@/components/common/DataFreshnessIndicator';

export interface IntelligenceStatusBarProps {
  activeAnomalies: number;
  criticalCount: number;
  highCount: number;
  newCount1h?: number;
  latestTimestamp?: string | number | Date | null;
  avgScore?: number;
  className?: string;
}

export const IntelligenceStatusBar: React.FC<IntelligenceStatusBarProps> = ({
  activeAnomalies,
  criticalCount,
  highCount,
  newCount1h = 0,
  latestTimestamp,
  avgScore,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 tactical-beveled flex items-center justify-between gap-2 flex-wrap select-none',
        className
      )}
    >
      {/* Metrics Group */}
      <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
        {/* Active Anomalies Readout */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border border-[var(--color-border)] bg-[var(--color-bg-input)] flex items-center justify-center text-[var(--color-primary-600)] dark:text-[#38bdf8]">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase font-bold text-[var(--color-fg-muted)] tracking-wider">
              ACTIVE ANOMALIES
            </div>
            <div className="font-mono text-sm font-bold text-[var(--color-fg)]">
              {activeAnomalies} <span className="text-[10px] text-[var(--color-fg-subtle)] font-normal">TRACKS</span>
            </div>
          </div>
        </div>

        <div className="w-px h-6 bg-[var(--color-border)] hidden sm:block" />

        {/* Critical Threats */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border border-rose-600/50 bg-rose-500/10 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase font-bold text-[var(--color-fg-muted)] tracking-wider">
              CRITICAL THREATS
            </div>
            <div className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400">
              {criticalCount}
            </div>
          </div>
        </div>

        <div className="w-px h-6 bg-[var(--color-border)] hidden sm:block" />

        {/* High Risk */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border border-amber-600/50 bg-amber-500/10 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase font-bold text-[var(--color-fg-muted)] tracking-wider">
              HIGH RISK
            </div>
            <div className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
              {highCount}
            </div>
          </div>
        </div>

        <div className="w-px h-6 bg-[var(--color-border)] hidden sm:block" />

        {/* New 1H */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border border-cyan-600/50 bg-cyan-500/10 dark:bg-cyan-950/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase font-bold text-[var(--color-fg-muted)] tracking-wider">
              NEW (1H)
            </div>
            <div className="font-mono text-sm font-bold text-cyan-600 dark:text-cyan-400">
              {newCount1h}
            </div>
          </div>
        </div>

        {avgScore !== undefined && (
          <>
            <div className="w-px h-6 bg-[var(--color-border)] hidden md:block" />
            <div className="hidden md:flex items-center gap-2">
              <div className="w-6 h-6 border border-[var(--color-border)] bg-[var(--color-bg-input)] flex items-center justify-center text-[var(--color-fg-muted)]">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-mono text-[9px] uppercase font-bold text-[var(--color-fg-muted)] tracking-wider">
                  AVG RISK INDEX
                </div>
                <div className="font-mono text-sm font-bold text-[var(--color-fg)]">
                  {avgScore.toFixed(0)} <span className="text-[10px] text-[var(--color-fg-subtle)] font-normal">/ 100</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Freshness Indicator */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-[var(--color-fg-muted)] uppercase hidden md:inline">STREAM STATUS:</span>
        <DataFreshnessIndicator timestamp={latestTimestamp} />
      </div>
    </div>
  );
};
