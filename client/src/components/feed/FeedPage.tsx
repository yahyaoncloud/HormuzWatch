import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLatestNews, getTopTraces, getConflictFeed } from '@/lib/api';
import { useRealtimeStore } from '@/stores';

import { FeedToolbar } from './FeedToolbar';
import { FeedFilters, type FeedEventType } from './FeedFilters';
import { FeedTimeline } from './FeedTimeline';
import type { AnomalyEventData } from '@/components/intelligence/AnomalyEventRow';
import type { NewsArticleItem } from './NewsFeedEvent';
import type { ConflictEvent } from '@/types/websocket';
import { cn } from '@/utils/cn';

export interface FeedPageProps {
  onViewOnMap?: (id: string, lat?: number, lon?: number) => void;
  className?: string;
}

export function FeedPage({ onViewOnMap, className }: FeedPageProps) {
  const [selectedType, setSelectedType] = useState<FeedEventType>('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Queries
  const { data: newsData, refetch: refetchNews, isRefetching: isRefetchingNews } = useQuery({
    queryKey: ['feed-news'],
    queryFn: () => getLatestNews(),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const { data: tracesData, refetch: refetchTraces, isRefetching: isRefetchingTraces } = useQuery({
    queryKey: ['feed-traces'],
    queryFn: getTopTraces,
    refetchInterval: false,
    staleTime: 60000,
  });

  const { data: conflictData, refetch: refetchConflicts, isRefetching: isRefetchingConflicts } = useQuery({
    queryKey: ['feed-conflicts'],
    queryFn: getConflictFeed,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const liveTelemetry = useRealtimeStore((s) => s.telemetry);

  const handleRefresh = () => {
    refetchNews();
    refetchTraces();
    refetchConflicts();
  };

  const isRefreshing = isRefetchingNews || isRefetchingTraces || isRefetchingConflicts;

  // Normalized anomalies
  const anomalies: AnomalyEventData[] = useMemo(() => {
    const raw = tracesData?.traces || [];
    return raw.map((t: any) => {
      let reasons: string[] = [];
      if (Array.isArray(t.reasons)) {
        reasons = t.reasons;
      } else if (typeof t.reasons === 'string' && t.reasons.trim()) {
        try {
          const parsed = JSON.parse(t.reasons);
          reasons = Array.isArray(parsed) ? parsed : [String(parsed)];
        } catch {
          reasons = t.reasons.split(';').map((s: string) => s.trim()).filter(Boolean);
        }
      }

      const isAir = String(t.trackId || '').startsWith('FLIGHT');

      return {
        id: t.trackId || t.id,
        trackId: t.trackId || t.id,
        assetName: t.assetName || t.trackId || 'Contact',
        domain: isAir ? 'aviation' : 'maritime',
        severity: t.severity || 'low',
        score: Number(t.score || t.anomalyScore || 0),
        reasons,
        region: t.region || 'Strait of Hormuz',
        timestamp: t.lastUpdated || t.timestamp || new Date().toISOString(),
        lat: t.lat,
        lon: t.lon,
        speed: t.speed,
        heading: t.heading,
      };
    });
  }, [tracesData?.traces]);

  // Normalized news
  const news: NewsArticleItem[] = useMemo(() => {
    const raw = (newsData as any)?.articles || (newsData as any)?.data || (newsData as any)?.news || [];
    return raw;
  }, [newsData]);

  // Normalized conflicts
  const conflicts: ConflictEvent[] = useMemo(() => {
    return conflictData?.conflicts || [];
  }, [conflictData?.conflicts]);

  const totalEvents = anomalies.length + conflicts.length + news.length;
  const latestTimestamp = liveTelemetry?.timestamp || (news.length > 0 ? news[0].published_at || news[0].created_at : undefined);

  return (
    <div className={cn('w-full max-w-[1600px] mx-auto px-2 sm:px-3 py-2 space-y-2 h-[calc(100vh-3.2rem)] flex flex-col overflow-hidden select-none', className)}>
      {/* 1. Feed Toolbar */}
      <FeedToolbar
        totalEvents={totalEvents}
        latestTimestamp={latestTimestamp}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* 2. Feed Filters */}
      <FeedFilters
        selectedType={selectedType}
        onSelectType={setSelectedType}
        selectedSeverity={selectedSeverity}
        onSelectSeverity={setSelectedSeverity}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* 3. Chronological Feed Timeline */}
      <FeedTimeline
        anomalies={anomalies}
        conflicts={conflicts}
        news={news}
        selectedType={selectedType}
        selectedSeverity={selectedSeverity}
        searchQuery={searchQuery}
        onViewOnMap={onViewOnMap}
        maxBufferItems={200}
      />
    </div>
  );
}
