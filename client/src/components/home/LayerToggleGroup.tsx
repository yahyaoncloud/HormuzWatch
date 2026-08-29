import React from 'react';
import { Ship, Plane, AlertTriangle, Layers, Eye, EyeOff, Activity } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface LayerToggleGroupProps {
  showVessels: boolean;
  onToggleVessels: () => void;
  showAircraft: boolean;
  onToggleAircraft: () => void;
  showConflicts: boolean;
  onToggleConflicts: () => void;
  showAreas: boolean;
  onToggleAreas: () => void;
  showHeatmap?: boolean;
  onToggleHeatmap?: () => void;
  showMetrics?: boolean;
  onToggleMetrics?: () => void;
  className?: string;
}

export const LayerToggleGroup: React.FC<LayerToggleGroupProps> = ({
  showVessels,
  onToggleVessels,
  showAircraft,
  onToggleAircraft,
  showConflicts,
  onToggleConflicts,
  showAreas,
  onToggleAreas,
  showHeatmap,
  onToggleHeatmap,
  showMetrics,
  onToggleMetrics,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-1 flex-wrap', className)}>
      <span className="text-[10px] text-[var(--color-fg-muted)] uppercase tracking-wider mr-0.5">
        Show:
      </span>

      {/* Vessels Toggle */}
      <button
        type="button"
        onClick={onToggleVessels}
        className={cn(
          'px-2.5 py-1 text-[11px] font-semibold transition-all border flex items-center gap-1',
          showVessels
            ? 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)]'
            : 'bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-primary-400)]'
        )}
        title="Toggle AIS Maritime Vessels"
      >
        <Ship className="h-3.5 w-3.5" />
        Vessels
      </button>

      {/* Aircraft Toggle */}
      <button
        type="button"
        onClick={onToggleAircraft}
        className={cn(
          'px-2.5 py-1 text-[11px] font-semibold transition-all border flex items-center gap-1',
          showAircraft
            ? 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)]'
            : 'bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-primary-400)]'
        )}
        title="Toggle ADS-B Air Corridor Flights"
      >
        <Plane className="h-3.5 w-3.5" />
        Aircraft
      </button>

      {/* Conflicts Toggle */}
      <button
        type="button"
        onClick={onToggleConflicts}
        className={cn(
          'px-2.5 py-1 text-[11px] font-semibold transition-all border flex items-center gap-1',
          showConflicts
            ? 'bg-rose-600 text-white border-rose-600'
            : 'bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-primary-400)]'
        )}
        title="Toggle Kinetic Incidents & Conflict Events"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Conflicts
      </button>

      {/* Strategic Areas Toggle */}
      <button
        type="button"
        onClick={onToggleAreas}
        className={cn(
          'px-2.5 py-1 text-[11px] font-semibold transition-all border flex items-center gap-1',
          showAreas
            ? 'bg-amber-600 text-white border-amber-600'
            : 'bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-primary-400)]'
        )}
        title="Toggle Strategic Watch Zones & Chokepoints"
      >
        <Layers className="h-3.5 w-3.5" />
        Areas
      </button>

      {/* Optional Heatmap Toggle */}
      {onToggleHeatmap !== undefined && showHeatmap !== undefined && (
        <button
          type="button"
          onClick={onToggleHeatmap}
          className={cn(
            'px-2.5 py-1 text-[11px] font-semibold transition-all border flex items-center gap-1',
            showHeatmap
              ? 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)]'
              : 'bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-primary-400)]'
          )}
          title="Toggle Vessel Density Heatmap"
        >
          {showHeatmap ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {showHeatmap ? 'Heatmap On' : 'Heatmap'}
        </button>
      )}

      {/* Optional Metrics Toggle */}
      {onToggleMetrics !== undefined && showMetrics !== undefined && (
        <button
          type="button"
          onClick={onToggleMetrics}
          className={cn(
            'px-2.5 py-1 text-[11px] font-semibold transition-all border flex items-center gap-1',
            showMetrics
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-primary-400)]'
          )}
          title="Toggle Real-time Metrics HUD Banner"
        >
          <Activity className="h-3.5 w-3.5" />
          {showMetrics ? 'Metrics On' : 'Metrics'}
        </button>
      )}
    </div>
  );
};
