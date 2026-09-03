import { useMemo } from 'react';
import { cn } from '@/utils/cn';
import type { FeedEventType } from './FeedFilters';
import { AnomalyFeedEvent } from './AnomalyFeedEvent';
import { NewsFeedEvent, type NewsArticleItem } from './NewsFeedEvent';
import { ConflictFeedEvent } from './ConflictFeedEvent';
import { FeedEmptyState } from './FeedEmptyState';
import type { AnomalyEventData } from '@/components/intelligence/AnomalyEventRow';
import type { ConflictEvent } from '@/types/websocket';

export type UnifiedFeedItem =
  | { kind: 'anomaly'; data: AnomalyEventData; timestamp: number }
  | { kind: 'conflict'; data: ConflictEvent; timestamp: number }
  | { kind: 'news'; data: NewsArticleItem; timestamp: number };

export interface FeedTimelineProps {
  anomalies: AnomalyEventData[];
  conflicts: ConflictEvent[];
  news: NewsArticleItem[];
  selectedType: FeedEventType;
  selectedSeverity: string;
  searchQuery: string;
  onViewOnMap?: (id: string, lat?: number, lon?: number) => void;
  maxBufferItems?: number;
  className?: string;
}

export const FeedTimeline: React.FC<FeedTimelineProps> = ({
  anomalies,
  conflicts,
  news,
  selectedType,
  selectedSeverity,
  searchQuery,
  onViewOnMap,
  maxBufferItems = 200,
  className,
}) => {
  // Merge and sort all items chronologically
  const unifiedItems: UnifiedFeedItem[] = useMemo(() => {
    const list: UnifiedFeedItem[] = [];

    // 1. Add Anomalies
    if (selectedType === 'all' || selectedType === 'anomaly' || selectedType === 'ais' || selectedType === 'aviation') {
      for (const a of anomalies) {
        const isAir = a.domain === 'aviation' || a.trackId.startsWith('FLIGHT-');
        if (selectedType === 'ais' && isAir) continue;
        if (selectedType === 'aviation' && !isAir) continue;

        if (selectedSeverity !== 'all' && (a.severity || 'low').toLowerCase() !== selectedSeverity) {
          continue;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const name = (a.assetName || '').toLowerCase();
          const id = (a.trackId || '').toLowerCase();
          const reasons = Array.isArray(a.reasons) ? a.reasons.join(' ').toLowerCase() : (a.reasons || '').toLowerCase();
          if (!name.includes(q) && !id.includes(q) && !reasons.includes(q)) {
            continue;
          }
        }

        const t = a.timestamp ? new Date(a.timestamp).getTime() : Date.now();
        list.push({ kind: 'anomaly', data: a, timestamp: isNaN(t) ? Date.now() : t });
      }
    }

    // 2. Add Conflict Events
    if (selectedType === 'all' || selectedType === 'conflict') {
      for (const c of conflicts) {
        if (selectedSeverity !== 'all' && (c.severity || 'low').toLowerCase() !== selectedSeverity) {
          continue;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const title = (c.title || '').toLowerCase();
          const desc = (c.description || '').toLowerCase();
          const src = (c.source || '').toLowerCase();
          if (!title.includes(q) && !desc.includes(q) && !src.includes(q)) {
            continue;
          }
        }

        const t = c.timestamp ? new Date(c.timestamp).getTime() : Date.now();
        list.push({ kind: 'conflict', data: c, timestamp: isNaN(t) ? Date.now() : t });
      }
    }

    // 3. Add News Articles
    if (selectedType === 'all' || selectedType === 'news') {
      for (const n of news) {
        if (selectedSeverity !== 'all') {
          const score = n.risk_score || 0;
          if (selectedSeverity === 'critical' && score < 80) continue;
          if (selectedSeverity === 'high' && score < 60) continue;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const title = (n.title || '').toLowerCase();
          const summary = (n.summary || n.description || '').toLowerCase();
          const src = (n.source || n.source_name || '').toLowerCase();
          if (!title.includes(q) && !summary.includes(q) && !src.includes(q)) {
            continue;
          }
        }

        const t = n.published_at || n.created_at || n.timestamp ? new Date(n.published_at || n.created_at || n.timestamp || 0).getTime() : Date.now();
        list.push({ kind: 'news', data: n, timestamp: isNaN(t) ? Date.now() : t });
      }
    }

    // Sort newest first
    list.sort((a, b) => b.timestamp - a.timestamp);

    // Bounded in-memory retention buffer
    return list.slice(0, maxBufferItems);
  }, [anomalies, conflicts, news, selectedType, selectedSeverity, searchQuery, maxBufferItems]);

  return (
    <div className={cn('space-y-2 overflow-y-auto flex-1 pr-1', className)}>
      {unifiedItems.map((item, idx) => {
        if (item.kind === 'anomaly') {
          return (
            <AnomalyFeedEvent
              key={`anom-${item.data.id || item.data.trackId}-${idx}`}
              anomaly={item.data}
              onViewOnMap={onViewOnMap}
            />
          );
        }
        if (item.kind === 'conflict') {
          return (
            <ConflictFeedEvent
              key={`conf-${item.data.id}-${idx}`}
              conflict={item.data}
              onViewOnMap={onViewOnMap}
            />
          );
        }
        if (item.kind === 'news') {
          return (
            <NewsFeedEvent
              key={`news-${item.data.id || idx}`}
              article={item.data}
            />
          );
        }
        return null;
      })}

      {unifiedItems.length === 0 && <FeedEmptyState />}
    </div>
  );
};
