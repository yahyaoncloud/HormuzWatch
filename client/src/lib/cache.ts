export const CACHE_TTL = {
  PUBLIC_METRICS: 30_000, // 30 seconds
  TOP_TRACES: 10_000, // 10 seconds
  NEWS_LATEST: 30_000, // 30 seconds
  NEWS_TRENDING: 60_000, // 1 minute
  COUNTRIES: 300_000, // 5 minutes
  SOURCES: 300_000, // 5 minutes
  EVENTS: 30_000, // 30 seconds
  THREATS: 15_000, // 15 seconds
  TIMELINE: 30_000, // 30 seconds
  HEATMAP: 30_000, // 30 seconds
  TRACK_HISTORY: 60_000, // 1 minute
  OBJECT_SPECS: 600_000, // 10 minutes (static IMO / registration metadata)
  CHOKEPOINT_SNAPSHOT: 15_000, // 15 seconds
} as const;

export const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 300_000, // 5 minutes garbage collection
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
};

/**
 * High-performance In-Memory Bounded LRU Object Cache for Vessel / Aircraft Telemetry & Metadata
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class ObjectLRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly maxEntries: number;
  private readonly defaultTTL: number;

  constructor(maxEntries = 1000, defaultTTL: number = CACHE_TTL.OBJECT_SPECS) {
    this.maxEntries = maxEntries;
    this.defaultTTL = defaultTTL;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Refresh LRU order (delete & re-insert)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs = this.defaultTTL): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      // Evict oldest (first item in Map iteration)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global Singletons for High-Frequency Object & History Lookups
export const globalVesselMetadataCache = new ObjectLRUCache<any>(2000, CACHE_TTL.OBJECT_SPECS);
export const globalTrackHistoryCache = new ObjectLRUCache<any>(500, CACHE_TTL.TRACK_HISTORY);

/**
 * Predictive Pre-fetch Helper: Pre-fetches vessel/aircraft track history on hover or viewport entry
 */
export async function prefetchTrackHistory(
  trackId: string,
  fetchFn: (id: string) => Promise<any>
): Promise<void> {
  if (!trackId || globalTrackHistoryCache.has(trackId)) return;
  try {
    const data = await fetchFn(trackId);
    if (data) {
      globalTrackHistoryCache.set(trackId, data);
    }
  } catch {
    // Non-blocking pre-fetch failure
  }
}
