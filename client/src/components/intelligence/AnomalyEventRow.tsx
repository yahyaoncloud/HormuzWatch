import React from 'react';
import { MapPin, Navigation, Compass, ExternalLink } from 'lucide-react';
import { cn } from '@/utils/cn';
import { SeverityIndicator } from '@/components/common/SeverityIndicator';
import { TimestampDisplay } from '@/components/common/TimestampDisplay';

export interface AnomalyEventData {
  id: string;
  trackId: string;
  assetName?: string;
  domain?: 'maritime' | 'aviation' | string;
  severity: string;
  score: number;
  reasons?: string[] | string;
  region?: string;
  timestamp?: string | number | Date | null;
  lat?: number;
  lon?: number;
  speed?: number;
  heading?: number;
}

export interface AnomalyEventRowProps {
  event: AnomalyEventData;
  onViewOnMap?: (trackId: string, lat?: number, lon?: number) => void;
  onSelect?: (event: AnomalyEventData) => void;
  isSelected?: boolean;
  className?: string;
}

export const AnomalyEventRow: React.FC<AnomalyEventRowProps> = ({
  event,
  onViewOnMap,
  onSelect,
  isSelected = false,
  className,
}) => {
  const reasonsList = Array.isArray(event.reasons)
    ? event.reasons
    : typeof event.reasons === 'string' && event.reasons.trim()
    ? event.reasons.split(';').map((s) => s.trim()).filter(Boolean)
    : [];

  const isAir = event.domain === 'aviation' || event.trackId.startsWith('FLIGHT-');

  return (
    <div
      onClick={() => onSelect?.(event)}
      className={cn(
        'group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 border border-[var(--color-border)] bg-[var(--color-bg-card)] tactical-beveled transition-colors cursor-pointer',
        isSelected ? 'border-[var(--color-primary-600)] dark:border-[#38bdf8] bg-[var(--color-bg-hover)]' : 'hover:bg-[var(--color-bg-hover)]',
        className
      )}
    >
      {/* Left: Entity & Severity Info */}
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <SeverityIndicator severity={event.severity} score={event.score} showScore size="sm" className="shrink-0 mt-0.5" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-[var(--color-fg)] uppercase truncate">
              {isAir ? '✈ AIR CORRIDOR' : '▲ VESSEL'}: {event.assetName || event.trackId}
            </span>
            <span className="font-mono text-[10px] text-[var(--color-fg-muted)]">
              [ID: {event.trackId}]
            </span>
          </div>

          {/* Primary Reason */}
          <div className="font-mono text-[11px] text-[var(--color-fg-muted)] mt-1 line-clamp-1">
            {reasonsList.length > 0
              ? reasonsList[0]
              : 'Kinematic trajectory & proximity variance detected'}
          </div>

          {/* Location & Navigation Metrics */}
          <div className="flex items-center gap-3 font-mono text-[10px] text-[var(--color-fg-subtle)] mt-1 flex-wrap">
            {event.region && (
              <span className="flex items-center gap-1 text-[var(--color-primary-600)] dark:text-[#38bdf8]">
                <MapPin className="w-3 h-3" />
                {event.region}
              </span>
            )}
            {event.speed !== undefined && (
              <span className="flex items-center gap-1">
                <Navigation className="w-3 h-3 text-[var(--color-fg-subtle)]" />
                {event.speed.toFixed(1)} kts
              </span>
            )}
            {event.heading !== undefined && (
              <span className="flex items-center gap-1">
                <Compass className="w-3 h-3 text-[var(--color-fg-subtle)]" />
                {event.heading.toFixed(0)}°
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Timestamp & Action */}
      <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--color-border)]">
        <TimestampDisplay timestamp={event.timestamp} format="relative" />

        {onViewOnMap && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewOnMap(event.trackId, event.lat, event.lon);
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-input)] font-mono text-[10px] font-bold text-[var(--color-primary-600)] dark:text-[#38bdf8] hover:bg-[var(--color-bg-hover)] transition-colors uppercase active:translate-y-px"
          >
            <span>MAP</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
};
