import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { FeedEvent } from './FeedEvent';
import { FeedEventMeta } from './FeedEventMeta';
import type { AnomalyEventData } from '@/components/intelligence/AnomalyEventRow';

export interface AnomalyFeedEventProps {
  anomaly: AnomalyEventData;
  onViewOnMap?: (trackId: string, lat?: number, lon?: number) => void;
}

export const AnomalyFeedEvent: React.FC<AnomalyFeedEventProps> = ({
  anomaly,
  onViewOnMap,
}) => {
  const isAir = anomaly.domain === 'aviation' || anomaly.trackId.startsWith('FLIGHT-');
  const reasonsList = Array.isArray(anomaly.reasons)
    ? anomaly.reasons
    : typeof anomaly.reasons === 'string' && anomaly.reasons.trim()
    ? anomaly.reasons.split(';').map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <FeedEvent
      id={anomaly.id}
      typeBadge={isAir ? 'ADS-B AIR ANOMALY' : 'AIS MARITIME DEVIATION'}
      typeColor={isAir ? 'text-cyan-600 dark:text-cyan-400 border-cyan-600/40 bg-cyan-500/10 dark:bg-cyan-950/40' : 'text-amber-600 dark:text-amber-400 border-amber-600/40 bg-amber-500/10 dark:bg-amber-950/40'}
      severity={anomaly.severity}
      score={anomaly.score}
      timestamp={anomaly.timestamp}
      actions={
        onViewOnMap && (
          <button
            type="button"
            onClick={() => onViewOnMap(anomaly.trackId, anomaly.lat, anomaly.lon)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-input)] font-mono text-[9px] font-bold text-[var(--color-primary-600)] dark:text-[#38bdf8] hover:bg-[var(--color-bg-hover)] uppercase active:translate-y-px"
          >
            <span>MAP</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        )
      }
    >
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-[var(--color-fg)] uppercase">
            {isAir ? 'Air Track' : 'Vessel'}: {anomaly.assetName || anomaly.trackId}
          </span>
          <span className="font-mono text-[10px] text-[var(--color-fg-muted)]">
            [MMSI/ID: {anomaly.trackId}]
          </span>
        </div>

        {/* Deviation Reason Tags */}
        <div className="flex flex-wrap gap-1">
          {reasonsList.map((r, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-input)] font-mono text-[10px] text-[var(--color-fg-muted)]"
            >
              <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
              {r}
            </span>
          ))}
          {reasonsList.length === 0 && (
            <span className="font-mono text-[10px] text-[var(--color-fg-subtle)]">
              Sub-threshold multi-factor kinematic variation
            </span>
          )}
        </div>

        {/* Metadata Footer */}
        <FeedEventMeta
          source="ML ENSEMBLE"
          sourceType="Inference"
          region={anomaly.region}
          score={anomaly.score}
        />
      </div>
    </FeedEvent>
  );
};
