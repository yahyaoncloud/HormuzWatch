import React from 'react';
import { Filter, Search } from 'lucide-react';
import { cn } from '@/utils/cn';

export type FeedEventType = 'all' | 'anomaly' | 'conflict' | 'news' | 'ais' | 'aviation';

export interface FeedFiltersProps {
  selectedType: FeedEventType;
  onSelectType: (type: FeedEventType) => void;
  selectedSeverity: string;
  onSelectSeverity: (severity: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  className?: string;
}

const TYPE_OPTIONS: Array<{ id: FeedEventType; label: string }> = [
  { id: 'all', label: 'ALL EVENTS' },
  { id: 'anomaly', label: 'ANOMALIES' },
  { id: 'conflict', label: 'MIL / CONFLICT' },
  { id: 'news', label: 'OSINT / NEWS' },
  { id: 'ais', label: 'AIS MARITIME' },
  { id: 'aviation', label: 'ADS-B AIR' },
];

export const FeedFilters: React.FC<FeedFiltersProps> = ({
  selectedType,
  onSelectType,
  selectedSeverity,
  onSelectSeverity,
  searchQuery,
  onSearchChange,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 tactical-beveled flex items-center justify-between gap-2 flex-wrap select-none',
        className
      )}
    >
      {/* Type Segmented Buttons */}
      <div className="flex gap-1 overflow-x-auto">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelectType(opt.id)}
            className={cn(
              'px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase transition-all border',
              selectedType === opt.id
                ? 'bg-[var(--color-bg-hover)] text-[var(--color-primary-600)] dark:text-[#38bdf8] border-[var(--color-primary-600)] dark:border-[#38bdf8] shadow-[inset_0_2px_0_var(--color-primary-600)]'
                : 'bg-[var(--color-bg-input)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-hover)]'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Severity & Search Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Severity Selector */}
        <div className="flex items-center gap-1">
          <Filter className="w-3 h-3 text-[var(--color-fg-subtle)]" />
          <select
            value={selectedSeverity}
            onChange={(e) => onSelectSeverity(e.target.value)}
            className="px-2 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-input)] font-mono text-[10px] text-[var(--color-fg)] uppercase focus:outline-none focus:border-[var(--color-primary-600)]"
          >
            <option value="all">ALL SEVERITY</option>
            <option value="critical">CRITICAL</option>
            <option value="high">HIGH RISK</option>
            <option value="medium">MEDIUM</option>
            <option value="low">LOW / NOMINAL</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3 h-3 text-[var(--color-fg-subtle)] absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="FILTER DISPATCHES..."
            className="pl-6 pr-2 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-input)] font-mono text-[10px] text-[var(--color-fg)] placeholder-[var(--color-fg-subtle)] focus:outline-none focus:border-[var(--color-primary-600)] w-40 sm:w-48"
          />
        </div>
      </div>
    </div>
  );
};
