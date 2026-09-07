import React from 'react';
import { AlertTriangle, Flame, ShieldAlert, Clock, Activity, Server, Radio, Cpu, Layers } from 'lucide-react';
import { cn } from '@/utils/cn';
import { DataFreshnessIndicator } from '@/components/common/DataFreshnessIndicator';
import { useServerStatusStore } from '@/stores/slices/serverStatus.store';

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
  const isOnline = useServerStatusStore((s) => s.isOnline);
  const isStreaming = useServerStatusStore((s) => s.isStreaming);
  const serverState = useServerStatusStore((s) => s.serverState);
  const stages = useServerStatusStore((s) => s.stages);
  const playbackDelaySec = useServerStatusStore((s) => s.playbackDelaySec);

  return (
    <div
      className={cn(
        'w-full border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 tactical-beveled flex items-center justify-between gap-3 flex-wrap select-none',
        className
      )}
    >
      {/* Metrics Group */}
      <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
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

      {/* Global Server State & Pipeline Stages Cluster */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap ml-auto">
        {/* Pipeline Stages Mini Badges */}
        <div className="hidden xl:flex items-center gap-1.5 font-mono text-[9px]">
          {/* Ingestion */}
          <span
            className="px-1.5 py-0.5 border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 flex items-center gap-1"
            title={stages.ingestion.details}
          >
            <Radio className="w-2.5 h-2.5 animate-pulse" />
            INGEST: LIVE
          </span>

          {/* ML Ensemble */}
          <span
            className="px-1.5 py-0.5 border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 flex items-center gap-1"
            title={stages.mlEnsemble.details}
          >
            <Cpu className="w-2.5 h-2.5" />
            ML: {stages.mlEnsemble.badge}
          </span>

          {/* Playback Buffer */}
          <span
            className="px-1.5 py-0.5 border border-indigo-500/40 bg-indigo-500/10 text-indigo-400 flex items-center gap-1"
            title={stages.playbackBuffer.details}
          >
            <Layers className="w-2.5 h-2.5" />
            BUFFER: {playbackDelaySec}s
          </span>
        </div>

        <div className="w-px h-6 bg-[var(--color-border)] hidden xl:block" />

        {/* Server Online Indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 border border-[var(--color-border)] bg-[var(--color-bg-input)] font-mono text-[10px]">
          <Server className="w-3 h-3 text-[var(--color-fg-muted)]" />
          <span className="text-[var(--color-fg-muted)] uppercase hidden sm:inline">SERVER:</span>
          {isOnline ? (
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-none shadow-[0_0_6px_#22c55e] animate-pulse" />
              ONLINE
            </span>
          ) : serverState === 'reconnecting' ? (
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-none animate-ping" />
              RECONNECTING
            </span>
          ) : (
            <span className="font-bold text-rose-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-rose-400 rounded-none" />
              OFFLINE
            </span>
          )}
        </div>

        {/* Data Stream Freshness Indicator (Steady, buffered) */}
        <DataFreshnessIndicator
          timestamp={latestTimestamp}
          isStreaming={isStreaming}
          playbackDelaySec={playbackDelaySec}
        />
      </div>
    </div>
  );
};
