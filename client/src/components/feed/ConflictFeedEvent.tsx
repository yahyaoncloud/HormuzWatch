import React from 'react';
import { ExternalLink, Users, Package } from 'lucide-react';
import { FeedEvent } from './FeedEvent';
import { FeedEventMeta } from './FeedEventMeta';
import type { ConflictEvent } from '@/types/websocket';

export interface ConflictFeedEventProps {
  conflict: ConflictEvent;
  onViewOnMap?: (id: string, lat?: number, lon?: number) => void;
}

export const ConflictFeedEvent: React.FC<ConflictFeedEventProps> = ({
  conflict,
  onViewOnMap,
}) => {
  return (
    <FeedEvent
      id={conflict.id}
      typeBadge="MILITARY / CONFLICT DISPATCH"
      typeColor="text-rose-600 dark:text-rose-400 border-rose-600/50 bg-rose-500/10 dark:bg-rose-950/40"
      severity={conflict.severity}
      timestamp={conflict.timestamp}
      actions={
        onViewOnMap && (
          <button
            type="button"
            onClick={() => onViewOnMap(conflict.id, conflict.lat, conflict.lon)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-input)] font-mono text-[9px] font-bold text-[var(--color-primary-600)] dark:text-[#38bdf8] hover:bg-[var(--color-bg-hover)] uppercase active:translate-y-px"
          >
            <span>MAP</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        )
      }
    >
      <div className="space-y-1.5">
        <h4 className="font-mono text-xs font-bold text-[var(--color-fg)] uppercase">
          {conflict.title}
        </h4>

        {conflict.description && (
          <p className="font-mono text-[11px] text-[var(--color-fg-muted)] leading-relaxed">
            {conflict.description}
          </p>
        )}

        {/* Additional Tactical Impact Tags */}
        <div className="flex items-center gap-3 font-mono text-[10px] text-[var(--color-fg-subtle)] flex-wrap">
          {conflict.affectedAssets && (
            <span className="flex items-center gap-1 text-[var(--color-fg)]">
              <Package className="w-3 h-3 text-[var(--color-primary-600)] dark:text-[#38bdf8]" />
              Assets: {conflict.affectedAssets}
            </span>
          )}

          {conflict.casualties && (
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <Users className="w-3 h-3" />
              Casualties: {conflict.casualties}
            </span>
          )}

          {conflict.conflictType && (
            <span className="px-1 py-0.2 border border-[var(--color-border)] bg-[var(--color-bg-input)] uppercase">
              Type: {conflict.conflictType}
            </span>
          )}
        </div>

        <FeedEventMeta
          source={conflict.source}
          sourceType={conflict.sourceType}
          region={conflict.region}
          verified={conflict.verified}
        />
      </div>
    </FeedEvent>
  );
};
