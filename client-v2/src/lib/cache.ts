export const CACHE_TTL = {
  PUBLIC_METRICS: 30_000,    // 30 seconds
  TOP_TRACES: 10_000,        // 10 seconds
  NEWS_LATEST: 30_000,       // 30 seconds
  NEWS_TRENDING: 60_000,     // 1 minute
  COUNTRIES: 300_000,        // 5 minutes
  SOURCES: 300_000,          // 5 minutes
  EVENTS: 30_000,            // 30 seconds
  THREATS: 15_000,           // 15 seconds
  TIMELINE: 30_000,          // 30 seconds
  HEATMAP: 30_000,           // 30 seconds
} as const;

export const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 300_000,        // 5 minutes garbage collection
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
};
