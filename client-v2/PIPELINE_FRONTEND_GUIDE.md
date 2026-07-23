# Frontend Pipeline Utilization Guide

## Quick Reference: Every Available Endpoint → Frontend Function

| # | Backend Route | Frontend Function | Used In | Status |
|---|--------------|-------------------|----------|--------|
| 1 | `GET /public/news/latest` | `getLatestNews()` | `admin/news.tsx` | Wired |
| 2 | `GET /public/news/search?q=` | `searchNews()` | — | **Not wired** |
| 3 | `GET /public/news/trending` | `getTrendingNews()` | — | **Not wired** |
| 4 | `GET /public/news/:id` | `getNewsById()` | — | **Not wired** |
| 5 | `GET /public/news/heatmap` | `getNewsHeatmap()` | — | **Not wired** |
| 6 | `GET /public/news/pipeline/status` | — | — | **No frontend function** |
| 7 | `GET /public/events` | `getEvents()` | — | **Not wired** |
| 8 | `GET /public/threats` | `getThreats()` | — | **Not wired** |
| 9 | `GET /public/timeline` | `getTimeline()` | — | **Not wired** |
| 10 | `GET /public/sources` | `getSources()` | `admin/sources.tsx` | Wired |
| 11 | `GET /public/countries` | `getCountries()` | — | **Not wired** |
| 12 | `GET /public/categories` | `getCategories()` | — | **Not wired** |
| 13 | `GET /public/metrics` | `getPublicMetrics()` | — | **Not wired** |
| 14 | `GET /tracks/active` | `getAllActiveTracks()` | `admin/tracking.tsx` | Wired |
| 15 | `POST /auth/login` | `adminLogin()` | `auth/login.tsx` | Wired |

---

## 1. Admin News Page (`/admin/news`) — Current State

**What it does:** Fetches 100 articles via `getLatestNews()`, filters/sorts client-side.

**What's missing:**

### 1a. Replace client-side search with server-side `searchNews()`

```tsx
// BEFORE (client-side filter, only searches already-fetched articles):
const filteredArticles = rawArticles.filter(a =>
  a.title.toLowerCase().includes(searchQuery.toLowerCase())
);

// AFTER (server-side search, searches ALL articles):
const { data: searchData } = useQuery({
  queryKey: ["admin", "news", "search", searchQuery],
  queryFn: () => searchNews(searchQuery),
  enabled: searchQuery.length > 2,
});
const dataSource = searchQuery.length > 2 ? searchData : data;
```

### 1b. Add trending tab with `getTrendingNews()`

```tsx
const [view, setView] = useState<"latest" | "trending">("latest");

const { data: trendingData } = useQuery({
  queryKey: ["admin", "news", "trending"],
  queryFn: () => getTrendingNews(),
  enabled: view === "trending",
  refetchInterval: 60_000,
});

const articles = view === "trending" ? trendingData?.data : data?.data;
```

### 1c. Fetch categories/countries from API instead of hardcoding

```tsx
// BEFORE (hardcoded):
const categories = ["Maritime Security", "Military Movement", "Energy", "Sanctions"];

// AFTER (live from database):
const { data: catData } = useQuery({
  queryKey: ["admin", "categories"],
  queryFn: () => getCategories(),
});
const categories = catData?.categories?.map(c => c.name) ?? [];

// Same for countries:
const { data: countryData } = useQuery({
  queryKey: ["admin", "countries"],
  queryFn: () => getCountries(),
});
const countries = countryData?.countries?.map(c => c.name) ?? [];
```

### 1d. Use real risk_score instead of mock

```tsx
// BEFORE (mock):
const mockThreatScore = Math.floor(Math.abs(a.title.length * 7) % 65) + 35;

// AFTER (real):
const threatScore = a.risk_score ?? 0;
```

---

## 2. Admin Dashboard (`/admin`) — Wiring Live Data

Replace all hardcoded stats with API calls:

```tsx
export default function AdminDashboard() {
  // Pipeline health
  const { data: pipelineData } = useQuery({
    queryKey: ["admin", "pipeline-status"],
    queryFn: () => fetchPublic("/public/news/pipeline/status"),
    refetchInterval: 30_000,
  });

  // Active tracks count
  const { data: metricsData } = useQuery({
    queryKey: ["admin", "metrics"],
    queryFn: () => getPublicMetrics(),
    refetchInterval: 10_000,
  });

  // Pending users
  const { data: pendingData } = useQuery({
    queryKey: ["admin", "pending-users"],
    queryFn: () => getPendingUsers(),
  });

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        label="Active Tracks"
        value={metricsData?.metrics?.totalTracks ?? "—"}
        icon={Radio}
      />
      <StatCard
        label="Articles Processed"
        value={pipelineData?.articles_done ?? "—"}
        icon={Newspaper}
      />
      <StatCard
        label="Critical Threats"
        value={metricsData?.metrics?.criticalCount ?? "—"}
        icon={ShieldAlert}
        color="danger"
      />
      <StatCard
        label="Pipeline Health"
        value={`${16 - (pipelineData?.sources_errored ?? 0)}/16 Sources`}
        icon={Activity}
        color={pipelineData?.sources_errored > 3 ? "danger" : "success"}
      />
    </div>
  );
}
```

---

## 3. News Map Page (`/admin/tracking` — Extend with News Overlay)

The tracking page already has Maplibre/Leaflet. Add a news heatmap layer:

```tsx
// In tracking.tsx, add a news layer to the existing map:

const { data: heatmapData } = useQuery({
  queryKey: ["admin", "news-heatmap"],
  queryFn: () => getNewsHeatmap({
    north: 30, south: 22, east: 60, west: 48,
    min_score: 40,
  }),
  refetchInterval: 60_000,
});

// Add news markers to the map:
useEffect(() => {
  if (!map || !heatmapData?.features) return;

  // Remove old markers
  markersRef.current.forEach(m => m.remove());
  markersRef.current = [];

  // Add new markers
  heatmapData.features.forEach(f => {
    const el = document.createElement("div");
    el.className = "news-marker";
    el.style.cssText = `
      width: ${8 + f.risk_score / 12}px;
      height: ${8 + f.risk_score / 12}px;
      background: ${getRiskColor(f.risk_score)};
      border-radius: 50%;
      border: 2px solid white;
      cursor: pointer;
    `;
    el.title = `${f.title}\nRisk: ${f.risk_score}/100\n${f.country}`;

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([f.lon, f.lat])
      .addTo(map);

    el.addEventListener("click", () => {
      // Show article detail in sidebar
      setSelectedNewsArticle(f);
    });

    markersRef.current.push(marker);
  });
}, [map, heatmapData]);
```

---

## 4. Events Timeline Page (New Admin Route)

The `/events` and `/timeline` endpoints exist but have no admin page:

```tsx
// Create: client-v2/src/app/routes/admin/timeline.tsx

export default function AdminTimeline() {
  const { data: timelineData } = useQuery({
    queryKey: ["admin", "timeline"],
    queryFn: () => getTimeline(50),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <h1 className="font-display text-2xl font-bold">Intelligence Timeline</h1>

      <div className="relative border-l-2 border-[var(--color-border)] pl-6 space-y-6">
        {timelineData?.data?.map(entry => (
          <div key={entry.id} className="relative">
            <div className="absolute -left-[29px] w-4 h-4 rounded-full border-2 border-[var(--color-border)] bg-[var(--color-bg)]" />
            <div className="rounded-xl border border-[var(--color-border)] p-4">
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-fg-muted)]">
                <span>{new Date(entry.publishedAt).toLocaleString()}</span>
                <span className="px-2 py-0.5 rounded bg-[var(--color-primary-600)]/15">
                  {entry.item_type}
                </span>
              </div>
              <h3 className="font-semibold mt-1">{entry.title}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Then register in [routes.ts](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/client-v2/src/app/routes.ts):

```ts
route("timeline", "routes/admin/timeline.tsx"),
```

---

## 5. Search Across Everything (Top Bar)

The admin header has a search bar. Make it search news, events, and threats simultaneously:

```tsx
// In AdminDashboardLayout header:
const [globalSearch, setGlobalSearch] = useState("");

const { data: searchResults } = useQuery({
  queryKey: ["admin", "global-search", globalSearch],
  queryFn: async () => {
    if (globalSearch.length < 2) return null;
    const [news, events, threats] = await Promise.all([
      searchNews(globalSearch),
      getEvents({ limit: 5 }),
      getThreats(5),
    ]);
    return { news: news.data, events: events.data, threats: threats.data };
  },
  enabled: globalSearch.length > 2,
});

// Show dropdown with categorized results
```

---

## 6. Pipeline Health Widget (Status Bar)

Add a persistent status bar at the top of every admin page:

```tsx
function PipelineStatusBar() {
  const { data } = useQuery({
    queryKey: ["pipeline-status"],
    queryFn: () => fetchPublic("/public/news/pipeline/status"),
    refetchInterval: 15_000,
  });

  if (!data) return null;

  return (
    <div className="flex items-center gap-4 px-4 py-1.5 bg-[var(--color-bg-elevated)] border-b text-[11px] font-mono text-[var(--color-fg-muted)]">
      <span>Articles: <b className="text-[var(--color-fg)]">{data.articles_done}</b> done</span>
      <span>Failed: <b className={data.articles_failed > 0 ? "text-[var(--color-danger)]" : ""}>{data.articles_failed}</b></span>
      <span>Duplicates: <b>{data.articles_duplicate}</b></span>
      <span>Sources: <b className="text-[var(--color-success)]">{data.sources_total - data.sources_errored}</b>/<b>{data.sources_total}</b> healthy</span>
      <span>In Flight: <b>{data.articles_in_flight}</b></span>
    </div>
  );
}
```

---

## 7. Complete Admin Route Map (After Wiring Everything)

```
/admin                         Dashboard (live metrics, pipeline health)
/admin/news                    News Feed (search, filter, trending tab, geo badges)
/admin/tracking                Live Map (vessels + aircraft + news heatmap overlay)
/admin/timeline                Timeline (articles + events chronological)
/admin/events                  Events Intelligence (type/severity/country filters)
/admin/threats                 Threat Board (severity levels, status management)
/admin/sources                 Source Management (health, reliability, article count)
/admin/watchlist               Watchlist (flagged vessels, auto-add threshold)
/admin/users                   User Management (approvals, roles, blacklist)
/admin/analytics               Analytics (region charts, source reliability, trends)
/admin/audit                   Audit Log (pipeline state transitions, admin actions)
/admin/settings                Settings (toggles, thresholds, retention, LLM config)
/admin/datasets                Dataset Pipeline (GDrive snapshots, queue)
/admin/profile                 Admin Profile (credentials, sessions, API keys)
```

---

## 8. Missing Frontend Type to Add

Add `getPipelineStatus()` to [api.ts](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/client-v2/src/lib/api.ts):

```ts
export async function getPipelineStatus(): Promise<{
  articles_total: number;
  articles_done: number;
  articles_failed: number;
  articles_duplicate: number;
  articles_in_flight: number;
  sources_total: number;
  sources_active: number;
  sources_errored: number;
  source_states: Record<string, string>;
  state_counts: Record<string, number>;
}> {
  return fetchPublic("/public/news/pipeline/status");
}
```

---

## 9. Key Pattern: React Query with Auto-Refresh

Every admin page should use this pattern:

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ["admin", "endpoint-name", ...filters],
  queryFn: () => getSomething(filters),
  refetchInterval: 30_000,     // auto-refresh every 30s
  staleTime: 15_000,           // consider fresh for 15s
  retry: 2,                    // retry twice on failure
});
```

---

## 10. Priority Order (What to Wire First)

| Priority | Page | Effort | Impact |
|----------|------|--------|--------|
| 1 | Fix news page: `searchNews()` + `getTrendingNews()` | 30 min | Search works, trending tab |
| 2 | Fix news page: real `risk_score` instead of mock | 5 min | Accurate threat display |
| 3 | Fix news page: `getCategories()` + `getCountries()` | 15 min | Dynamic filters |
| 4 | Dashboard: live pipeline metrics | 20 min | Real stats replace hardcoded |
| 5 | Tracking: news heatmap overlay on map | 45 min | Geo-visualization works |
| 6 | Timeline admin page | 30 min | New page, high value |
| 7 | Pipeline status bar on all admin pages | 15 min | Observability |
| 8 | Global search (news + events + threats) | 30 min | Power user feature |
