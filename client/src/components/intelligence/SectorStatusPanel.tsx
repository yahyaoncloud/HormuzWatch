import React from 'react';
import { Compass } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SectorData {
  id: string;
  name: string;
  code: string;
  trafficCount: number;
  anomalyCount: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'nominal';
  avgScore: number;
}

export interface SectorStatusPanelProps {
  sectors?: SectorData[];
  onSelectSector?: (sectorId: string) => void;
  selectedSectorId?: string | null;
  className?: string;
}

const DEFAULT_SECTORS: SectorData[] = [
  { id: 'AREA-HORMUZ', name: 'Strait of Hormuz (TSS)', code: 'HORMUZ-TSS', trafficCount: 42, anomalyCount: 3, riskLevel: 'high', avgScore: 48 },
  { id: 'AREA-PGULF', name: 'Persian Gulf Basin', code: 'PGULF-MAIN', trafficCount: 118, anomalyCount: 1, riskLevel: 'medium', avgScore: 22 },
  { id: 'AREA-KHARG', name: 'Kharg Island Deepwater', code: 'KHARG-TERM', trafficCount: 14, anomalyCount: 0, riskLevel: 'nominal', avgScore: 12 },
  { id: 'AREA-FUJAIRAH', name: 'Fujairah Anchorage (FOA)', code: 'FOA-ANCHOR', trafficCount: 65, anomalyCount: 2, riskLevel: 'medium', avgScore: 35 },
  { id: 'AREA-GOMAN', name: 'Gulf of Oman Approach', code: 'GOMAN-SECT', trafficCount: 38, anomalyCount: 0, riskLevel: 'low', avgScore: 15 },
  { id: 'AREA-RASTANURA', name: 'Ras Tanura Terminal', code: 'RTAN-CRUDE', trafficCount: 21, anomalyCount: 1, riskLevel: 'medium', avgScore: 28 },
];

export const SectorStatusPanel: React.FC<SectorStatusPanelProps> = ({
  sectors = DEFAULT_SECTORS,
  onSelectSector,
  selectedSectorId,
  className,
}) => {
  return (
    <div
      className={cn(
        'border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 tactical-beveled flex flex-col h-full select-none',
        className
      )}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--color-border)] shrink-0">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-[var(--color-primary-600)] dark:text-[#38bdf8]" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-fg)]">
            SECTOR & CHOKEPOINT RISK MATRIX
          </span>
        </div>
        <span className="font-mono text-[10px] text-[var(--color-fg-muted)]">
          6 SECTORS MONITORED
        </span>
      </div>

      {/* Grid of Monitored Sectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 overflow-y-auto flex-1 pr-1">
        {sectors.map((sec) => {
          const isSelected = selectedSectorId === sec.id;

          return (
            <div
              key={sec.id}
              onClick={() => onSelectSector?.(sec.id)}
              className={cn(
                'p-2.5 border bg-[var(--color-bg-input)] tactical-beveled transition-all cursor-pointer flex flex-col justify-between',
                isSelected
                  ? 'border-[var(--color-primary-600)] dark:border-[#38bdf8] bg-[var(--color-bg-hover)]'
                  : 'border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]'
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-mono text-[9px] font-bold text-[var(--color-fg-muted)] uppercase tracking-wider">
                    {sec.code}
                  </span>
                  <span
                    className={cn(
                      'px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase border',
                      sec.riskLevel === 'critical' && 'bg-rose-500/10 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border-rose-600/60',
                      sec.riskLevel === 'high' && 'bg-amber-500/10 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-600/60',
                      sec.riskLevel === 'medium' && 'bg-yellow-500/10 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400 border-yellow-600/50',
                      sec.riskLevel === 'low' && 'bg-emerald-500/10 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-600/50',
                      sec.riskLevel === 'nominal' && 'bg-slate-500/10 dark:bg-slate-900 text-[var(--color-fg-muted)] border-[var(--color-border)]'
                    )}
                  >
                    {sec.riskLevel}
                  </span>
                </div>

                <div className="font-mono text-xs font-bold text-[var(--color-fg)] truncate">
                  {sec.name}
                </div>
              </div>

              {/* Status Metrics Strip */}
              <div className="mt-2 pt-2 border-t border-[var(--color-border)] grid grid-cols-3 gap-1 text-center font-mono text-[10px]">
                <div className="bg-[var(--color-bg-card)] p-1 border border-[var(--color-border)]">
                  <div className="text-[8px] text-[var(--color-fg-subtle)] uppercase">TRAFFIC</div>
                  <div className="font-bold text-[var(--color-fg)] mt-0.5">{sec.trafficCount}</div>
                </div>

                <div className="bg-[var(--color-bg-card)] p-1 border border-[var(--color-border)]">
                  <div className="text-[8px] text-[var(--color-fg-subtle)] uppercase">ANOMALIES</div>
                  <div className={cn('font-bold mt-0.5', sec.anomalyCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--color-fg-muted)]')}>
                    {sec.anomalyCount}
                  </div>
                </div>

                <div className="bg-[var(--color-bg-card)] p-1 border border-[var(--color-border)]">
                  <div className="text-[8px] text-[var(--color-fg-subtle)] uppercase">AVG RISK</div>
                  <div className="font-bold text-[var(--color-primary-600)] dark:text-[#38bdf8] mt-0.5">{sec.avgScore.toFixed(0)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
