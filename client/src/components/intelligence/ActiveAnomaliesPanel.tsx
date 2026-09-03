import React, { useMemo, useState } from 'react';
import { ShieldAlert, Search, Filter } from 'lucide-react';
import { cn } from '@/utils/cn';
import { AnomalyEventRow, type AnomalyEventData } from './AnomalyEventRow';

export interface ActiveAnomaliesPanelProps {
  anomalies: AnomalyEventData[];
  onViewOnMap?: (trackId: string, lat?: number, lon?: number) => void;
  onSelectAnomaly?: (anomaly: AnomalyEventData) => void;
  selectedId?: string | null;
  className?: string;
  maxItems?: number;
}

const SEVERITY_WEIGHT: Record<string, number> = {
  emergency: 5,
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  nominal: 0,
};

export const ActiveAnomaliesPanel: React.FC<ActiveAnomaliesPanelProps> = ({
  anomalies,
  onViewOnMap,
  onSelectAnomaly,
  selectedId,
  className,
  maxItems = 50,
}) => {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  const sortedAndFiltered = useMemo(() => {
    let list = anomalies.filter((a) => {
      if (a.score < 1 && (!a.severity || a.severity === 'low' || a.severity === 'nominal')) {
        return false;
      }
      if (severityFilter !== 'all' && (a.severity || 'low').toLowerCase() !== severityFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = (a.assetName || '').toLowerCase();
        const id = (a.trackId || '').toLowerCase();
        const region = (a.region || '').toLowerCase();
        const reasons = Array.isArray(a.reasons) ? a.reasons.join(' ').toLowerCase() : (a.reasons || '').toLowerCase();
        return name.includes(q) || id.includes(q) || region.includes(q) || reasons.includes(q);
      }
      return true;
    });

    list.sort((a, b) => {
      const wA = SEVERITY_WEIGHT[(a.severity || 'low').toLowerCase()] ?? 0;
      const wB = SEVERITY_WEIGHT[(b.severity || 'low').toLowerCase()] ?? 0;
      if (wA !== wB) return wB - wA;

      if ((b.score || 0) !== (a.score || 0)) {
        return (b.score || 0) - (a.score || 0);
      }

      const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tB - tA;
    });

    return list.slice(0, maxItems);
  }, [anomalies, severityFilter, search, maxItems]);

  return (
    <div
      className={cn(
        'border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 tactical-beveled flex flex-col h-full overflow-hidden select-none',
        className
      )}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--color-border)] shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[var(--color-primary-600)] dark:text-[#38bdf8]" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-fg)]">
            ACTIVE ANOMALIES & BEHAVIORAL DEVIATIONS
          </span>
          <span className="font-mono text-[10px] text-[var(--color-fg-muted)]">
            [{sortedAndFiltered.length} DETECTED]
          </span>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3 h-3 text-[var(--color-fg-subtle)] absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH TRACK / REASON..."
              className="pl-6 pr-2 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-input)] font-mono text-[10px] text-[var(--color-fg)] placeholder-[var(--color-fg-subtle)] focus:outline-none focus:border-[var(--color-primary-600)] w-36 sm:w-44"
            />
          </div>

          {/* Severity Select */}
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-[var(--color-fg-subtle)]" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-1.5 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-input)] font-mono text-[10px] text-[var(--color-fg)] uppercase focus:outline-none focus:border-[var(--color-primary-600)]"
            >
              <option value="all">ALL SEV</option>
              <option value="critical">CRITICAL</option>
              <option value="high">HIGH</option>
              <option value="medium">MEDIUM</option>
              <option value="low">LOW</option>
            </select>
          </div>
        </div>
      </div>

      {/* Anomalies List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {sortedAndFiltered.map((a) => (
          <AnomalyEventRow
            key={a.id || a.trackId}
            event={a}
            isSelected={selectedId === a.trackId || selectedId === a.id}
            onViewOnMap={onViewOnMap}
            onSelect={onSelectAnomaly}
          />
        ))}

        {sortedAndFiltered.length === 0 && (
          <div className="py-12 text-center font-mono text-xs text-[var(--color-fg-muted)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-input)] p-4">
            <ShieldAlert className="w-8 h-8 text-[var(--color-fg-subtle)] mx-auto mb-2" />
            <div className="text-[var(--color-fg)] font-bold uppercase">NO ACTIVE ANOMALIES MATCHING CRITERIA</div>
            <div className="text-[10px] text-[var(--color-fg-muted)] mt-1">
              All vessels & air assets operating within nominal kinematic corridors (threshold: score &ge; 1).
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
