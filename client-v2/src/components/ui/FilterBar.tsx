import type { ReactNode } from 'react';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/utils/cn';

export interface FilterOption {
  value: string;
  label: string;
}

interface SearchFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterGroup[];
  className?: string;
  showFilterToggle?: boolean;
  filterCount?: number;
}

export interface FilterGroup {
  key: string;
  label: string;
  options: readonly FilterOption[] | FilterOption[];
  value: string;
  onChange: (value: any) => void;
  placeholder?: string;
}

export function SearchFilter({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  className,
  showFilterToggle = true,
  filterCount,
}: SearchFilterProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-fg-muted)]" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] pl-9 pr-4 py-2 text-xs font-ui text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:border-[var(--color-primary-600)] focus:outline-none"
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)] transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter Toggles */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter, idx) => (
            <FilterSelect
              key={filter.key}
              label={filter.label}
              options={filter.options}
              value={filter.value}
              onChange={filter.onChange}
              placeholder={filter.placeholder}
              showLabel={idx === 0 && filters.length > 1}
            />
          ))}
        </div>
      )}

      {/* Advanced Filters Toggle */}
      {filters.length > 3 && showFilterToggle && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'px-3 py-1.5 rounded-lg font-ui text-xs font-medium transition-colors border inline-flex items-center gap-1.5',
            expanded
              ? 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)]'
              : 'bg-[var(--color-bg-card)] border-[var(--color-border)] text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)]'
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          {expanded ? 'Hide Filters' : `Filters (${filterCount ?? filters.length})`}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
        </button>
      )}

      {/* Expanded Filters */}
      {expanded && filters.length > 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 animate-in slide-in-from-top-2 duration-200">
          {filters.slice(3).map((filter) => (
            <FilterSelect
              key={filter.key}
              label={filter.label}
              options={filter.options}
              value={filter.value}
              onChange={filter.onChange}
              placeholder={filter.placeholder}
              showLabel
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  options: readonly FilterOption[] | FilterOption[];
  value: string;
  onChange: (value: any) => void;
  placeholder?: string;
  showLabel?: boolean;
}

function FilterSelect({ label, options, value, onChange, placeholder, showLabel = true }: FilterSelectProps) {
  return (
    <div className="flex flex-col gap-1 min-w-[140px]">
      {showLabel && (
        <label className="text-[10px] font-mono text-[var(--color-fg-muted)] uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-xs font-ui text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none appearance-none bg-no-repeat bg-right"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundPosition: 'right 8px center', backgroundSize: '12px' }}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface QuickFilterChipsProps {
  chips: QuickFilterChip[];
  activeValue?: string;
  onChange: (value: string) => void;
  className?: string;
  allowMultiple?: boolean;
  activeValues?: string[];
  onMultipleChange?: (values: string[]) => void;
}

interface QuickFilterChip {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
  className?: string;
}

export function QuickFilterChips({
  chips,
  activeValue,
  onChange,
  className,
  allowMultiple = false,
  activeValues = [],
  onMultipleChange,
}: QuickFilterChipsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)} role="group" aria-label="Quick filters">
      {chips.map((chip) => {
        const isActive = allowMultiple ? activeValues.includes(chip.id) : activeValue === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => {
              if (allowMultiple && onMultipleChange) {
                const next = isActive
                  ? activeValues.filter((v) => v !== chip.id)
                  : [...activeValues, chip.id];
                onMultipleChange(next);
              } else {
                onChange(isActive ? '' : chip.id);
              }
            }}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-mono transition-all border inline-flex items-center gap-1.5',
              isActive
                ? 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)]'
                : 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-primary-600)]'
            )}
          >
            {chip.icon}
            {chip.label}
            {chip.count !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-mono font-bold',
                  isActive ? 'bg-white/20 text-white' : 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)]'
                )}
              >
                {chip.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface SortSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export function SortSelector({ value, onChange, options, className }: SortSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-xs font-ui text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none font-mono',
        className
      )}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}