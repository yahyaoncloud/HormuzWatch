# HormuzWatch News Intelligence Pipeline — Low-Level Design

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Component Map](#2-component-map)
3. [Single Pipeline Flow](#3-single-pipeline-flow)
4. [State Machine](#4-state-machine)
5. [Data Model](#5-data-model)
6. [Scoring Formula](#6-scoring-formula)
7. [Coordinate Extraction](#7-coordinate-extraction)
8. [API Surface](#8-api-surface)
9. [Fault Tolerance](#9-fault-tolerance)
10. [Code Readability Improvements](#10-code-readability-improvements)
11. [Future Integrations](#11-future-integrations)
12. [Recent Changes (July 2026)](#12-recent-changes-july-2026)
13. [DevOps & Operations](#13-devops--operations)
14. [Key File Index](#14-key-file-index)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        LAYER 1: INGEST                           │
│  source/interface.go  source/rss.go  source/api.go  source/scraper.go │
│  source/gulf_sources.go  (16 sources, extensible)                 │
└────────────────────────────┬─────────────────────────────────────┘
                             │ RawArticle{URL, Title, Content, ...}
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      LAYER 2: ORCHESTRATION                       │
│  scheduler/jobs.go → worker/pool.go → worker/collector.go        │
│  (15-min ticker, 4 goroutines, rate-limited at 2/sec)            │
└────────────────────────────┬─────────────────────────────────────┘
                             │ per article
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      LAYER 3: ML PROCESSING                       │
│  news/scorer.go (orchestrator)                                    │
│    ├─ news/cleaner.go      HTML strip, unicode normalize         │
│    ├─ news/dedup.go        URL hash, SimHash, content hash       │
│    ├─ news/language.go     Unicode-range detection (ar/fa/he/en) │
│    ├─ news/entity.go       Gazetteer NER + regex patterns        │
│    ├─ news/enrichment.go   Category classify + risk maps         │
│    ├─ news/features.go     18-dim NewsFeatureVector              │
│    └─ news/scorer.go       6-sub-score composite → 0-100         │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                     LAYER 4: GEO-EXTRACTION                       │
│  news/coordinates.go  (4-phase extraction)                        │
│  news/geocode.go      (80+ named locations → lat/lon)            │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      LAYER 5: PERSISTENCE                         │
│  news/persist.go → db/queries_news.go → PostgreSQL (Supabase)    │
│  Tables: sources, articles, entities, content_hashes,            │
│          scrape_jobs, events, countries                          │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                       LAYER 6: API                                │
│  api/news_handlers.go  (Gin HTTP handlers)                       │
│  /public/news/latest         /public/news/heatmap                │
│  /public/news/search         /public/news/trending               │
│  /public/news/pipeline/status                                    │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                     LAYER 7: FRONTEND                             │
│  client-v2/src/lib/api.ts       (React Query client)             │
│  client-v2/src/app/routes/admin/news.tsx   (admin feed)          │
│  client-v2/src/app/routes/admin/tracking.tsx (live map)          │
└──────────────────────────────────────────────────────────────────┘
```

## 2. Component Map

```
server/
├── cmd/main.go                          # Entry point, wires all layers
├── internal/
│   ├── intelligence/
│   │   ├── source/
│   │   │   ├── interface.go             # Source interface (Fetch, Validate)
│   │   │   ├── registry.go              # Thread-safe source registry
│   │   │   ├── gulf_sources.go          # 16 pre-configured RSS feeds
│   │   │   ├── rss.go                   # RSSSource — gofeed parser
│   │   │   ├── api.go                   # APISource — JSON API fetcher
│   │   │   └── scraper.go              # ScraperSource — HTML + goquery
│   │   └── news/
│   │       ├── scorer.go                # ProcessArticle() — 7-step orchestrator
│   │       ├── cleaner.go              # HTML strip, unicode normalize
│   │       ├── dedup.go                # URL/SimHash/content hashing
│   │       ├── language.go             # Language detection
│   │       ├── entity.go               # NER: ports, ships, orgs, aircraft
│   │       ├── enrichment.go           # Category classifier, risk maps
│   │       ├── features.go             # 18-dim feature vector
│   │       ├── keywords.go             # TF keyword extraction
│   │       ├── coordinates.go          # 4-phase coordinate extractor
│   │       ├── geocode.go              # Named-location → lat/lon gazetteer
│   │       ├── persist.go              # ProcessAndStore() — pipeline→DB
│   │       ├── pipeline_state.go       # State machine + metrics
│   │       ├── translator.go           # Translation interface (OpenRouter)
│   │       └── openrouter.go           # LLM translation/threat classification
│   ├── scheduler/
│   │   ├── scheduler.go                # Generic periodic job runner
│   │   └── jobs.go                     # rss-refresh (15m), api-refresh (30m)
│   ├── worker/
│   │   ├── pool.go                     # Bounded goroutine pool + rate limiter
│   │   ├── collector.go                # Fetch → validate per source
│   │   ├── retry.go                    # Retry with exponential backoff
│   │   └── metrics.go                  # Atomic counters (tasks, articles)
│   ├── db/
│   │   ├── db.go                       # Schema DDL (CREATE TABLE)
│   │   └── queries_news.go            # All news CRUD + geo queries
│   └── api/
│       └── news_handlers.go            # REST handlers (news, heatmap, pipeline)
│
client-v2/
├── src/lib/api.ts                      # Frontend API client (React Query)
├── src/app/routes/admin/
│   ├── news.tsx                        # Admin news feed with geo badges
│   └── tracking.tsx                    # Live map with watchlist
```

## 3. Single Pipeline Flow

Every article goes through exactly ONE code path:

```
main.go                    scheduler/jobs.go      worker/collector.go
   │                              │                       │
   │  Register 16 sources         │                       │
   │  Start pool (4 workers)      │                       │
   │  Start scheduler             │                       │
   │                              │                       │
   │                              ├─ rss-refresh (15m) ──→ for each source:
   │                              │   pool.Submit(task)      src.Fetch()
   │                              │       │                  src.Validate()
   │                              │       │                  return []RawArticle
   │                              │       │                       │
   │                              │       └── news.ProcessAndStore()
   │                              │              │
   │                              │     ┌────────┴────────┐
   │                              │     │ ProcessArticle() │ scorer.go
   │                              │     │ 7-step ML pipe   │
   │                              │     ├─────────────────┤
   │                              │     │ ExtractCoords()  │ coordinates.go
   │                              │     │ 4-phase geo      │
   │                              │     ├─────────────────┤
   │                              │     │ InsertArticle()  │ DB
   │                              │     │ InsertEntities() │ DB
   │                              │     └─────────────────┘
   │                              │
   │                              └── api-refresh (30m) ──→ (same flow for API sources)
   │
   ├─ Register routes ──────────────→ GET /public/news/latest
   │                                   GET /public/news/heatmap
   │                                   GET /public/news/pipeline/status
   │
   └─ Frontend consumes ───────────→ React Query → admin/news.tsx
```

## 4. State Machine

### Article Lifecycle

```
                    ┌─────────┐
                    │ QUEUED  │  ← article enters pipeline
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │PROCESSING│  ← 7-step ML pipeline running
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │ SCORED  │  ← risk_score computed (0-100)
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │GEOCODED │  ← coordinates resolved (or no-coords)
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │ STORED  │  ← persisted to articles table
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │  DONE   │  ← terminal
                    └─────────┘

Error paths:
  PROCESSING ──→ PROCESS_FAILED ──→ QUEUED (retry)
  STORED     ──→ PROCESS_FAILED ──→ QUEUED (retry)
  Any state  ──→ DUPLICATE (terminal)
```

### Source Lifecycle

```
  IDLE ──→ FETCHING ──→ FETCHED ──→ PROCESSING ──→ DONE
                │                                      │
                └──→ ERROR ──→ IDLE (next tick) ──────┘
```

### Monitoring via API

```
GET /public/news/pipeline/status

{
  "articles_total": 1423,
  "articles_done": 1401,
  "articles_failed": 12,
  "articles_duplicate": 10,
  "articles_in_flight": 0,
  "sources_total": 16,
  "sources_active": 2,
  "sources_errored": 1,
  "source_states": {
    "WAM": "DONE",
    "IRNA": "ERROR",
    "USNI News": "FETCHING",
    ...
  },
  "state_counts": {
    "DONE": 1401,
    "PROCESS_FAILED": 12,
    "DUPLICATE": 10
  }
}
```

## 5. Data Model

### articles table
```sql
CREATE TABLE articles (
    id TEXT PRIMARY KEY,                    -- SHA-256 of URL (first 16 bytes)
    source_id TEXT REFERENCES sources(id),  -- source name (e.g. "WAM")
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,               -- dedup key: ON CONFLICT(url) DO NOTHING
    content TEXT,                            -- full article text
    summary TEXT,                            -- truncated content (500 chars)
    published_at TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    language TEXT,                           -- ISO 639-1 (ar, fa, he, en)
    category TEXT,                           -- military, energy, maritime, political...
    risk_score REAL,                         -- 0-100 composite from 6 sub-scores
    ml_score REAL,                           -- reserved for Python ML model output
    source_reliability REAL,                 -- 0.0-1.0 per source
    country TEXT,                            -- ISO 3166-1 alpha-2
    lat DOUBLE PRECISION,                    -- extracted/geocoded latitude
    lon DOUBLE PRECISION,                    -- extracted/geocoded longitude
    metadata JSONB                           -- extensible (translation, LLM output...)
);
```

### entities table
```sql
CREATE TABLE entities (
    id BIGSERIAL PRIMARY KEY,
    article_id TEXT REFERENCES articles(id) ON DELETE CASCADE,
    entity_type TEXT,   -- organization, ship, port, airport, country, city, company
    entity_name TEXT,   -- human-readable name
    entity_value TEXT,  -- canonical value (MMSI, ICAO24, ISO code)
    confidence REAL     -- 0.0-1.0 extraction confidence
);
```

### sources table
```sql
CREATE TABLE sources (
    id TEXT PRIMARY KEY,     -- source name
    name TEXT NOT NULL,
    type TEXT NOT NULL,      -- rss, api, scraper
    url TEXT NOT NULL,
    country TEXT,
    language TEXT,
    reliability REAL DEFAULT 0.7,
    enabled BOOLEAN DEFAULT TRUE
);
```

### scrape_jobs table
```sql
CREATE TABLE scrape_jobs (
    id BIGSERIAL PRIMARY KEY,
    source_id TEXT REFERENCES sources(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    articles_fetched INT DEFAULT 0,
    articles_new INT DEFAULT 0,
    articles_duplicate INT DEFAULT 0,
    errors INT DEFAULT 0,
    error_detail TEXT,
    status TEXT DEFAULT 'running'  -- running, completed, failed
);
```

## 6. Scoring Formula

The `risk_score` (0-100) is a weighted composite of 6 sub-scores, computed entirely in Go:

| # | Sub-score | Range | Formula |
|---|-----------|-------|---------|
| 1 | Keyword density | 0-20 | `min(20, (keywordCount / articleLength) * 1000 * 2)` |
| 2 | Entity density | 0-15 | `min(15, (entityCount / articleLength) * 1000 * 3)` |
| 3 | Source reliability | 0-25 | `sourceReliability * 25` |
| 4 | Country risk | 0-15 | `countryRiskScore * 15` |
| 5 | Military/conflict | 0-15 | `min(15, militaryTermCount * 2)` |
| 6 | Recency | 0-10 | `<1h=10, <6h=7, <24h=4, <72h=1, else 0` |

**Risk level mapping:**
- 0-30: LOW (green)
- 31-55: MEDIUM (amber)
- 56-75: HIGH (orange)
- 76-100: CRITICAL (red)

### Source Reliability Defaults
```go
WAM: 0.85, SPA: 0.80, KUNA: 0.80, BNA: 0.80, ONA: 0.80, QNA: 0.80
IRNA: 0.55, INA: 0.60
USNI News: 0.90, DefenseNews: 0.85
Maritime Executive: 0.75, gCaptain: 0.75
UKMTO: 0.95, IMO: 0.90, OPEC: 0.80
Al Jazeera: 0.70, Reuters: 0.85
Default (unknown): 0.50
```

### Country Risk Defaults
```go
IR: 0.85, YE: 0.80, SY: 0.80, IQ: 0.75, PS: 0.70, LB: 0.65
RU: 0.60, PK: 0.60, IL: 0.55, EG: 0.50
JO: 0.45, TR: 0.45
SA: 0.40, CN: 0.40
KW: 0.35, BH: 0.35, IN: 0.35
QA: 0.30
AE: 0.25
OM: 0.20, FR: 0.20
US: 0.15, GB: 0.15
Default: 0.40
```

## 7. Coordinate Extraction

Four-phase extraction, highest confidence wins:

| Phase | Method | Confidence | Example |
|-------|--------|-----------|---------|
| 1 | Regex decimal coords | 0.85 | `"25.2345, 55.3456"` or `"25.23°N, 55.34°E"` |
| 2 | Regex DMS coords | 0.75 | `"25°14'04\"N 55°18'22\"E"` |
| 3 | Entity geocoding | 0.60 | Port "Bandar Abbas" → `{27.1833, 56.2667}` via gazetteer |
| 4 | Country centroid | 0.25 | Country "IR" → `{32.4279, 53.6880}` |

Gazetteer covers 80+ locations:
- 30 ports (Jebel Ali, Dammam, Bandar Abbas, Chabahar...)
- 18 airports (DXB, AUH, DOH, IKA...)
- 27 cities (Dubai, Riyadh, Tehran, Baghdad...)
- 22 country centroids

## 8. API Surface

### Public Endpoints (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/public/news/latest` | Paginated articles, filters: `?limit=&offset=&category=&language=&country=` |
| GET | `/public/news/search` | Full-text search: `?q=iran&limit=50` |
| GET | `/public/news/trending` | High-risk articles (last 6h): `?min_score=40&limit=20` |
| GET | `/public/news/heatmap` | Geo-tagged articles: `?north=35&south=10&east=65&west=35&min_score=0` |
| GET | `/public/news/pipeline/status` | Pipeline health metrics (article counts, source states) |
| GET | `/public/events` | Intelligence events: `?limit=&offset=&type=&severity=` |
| GET | `/public/threats` | Active threats |
| GET | `/public/timeline` | Chronological feed (articles + events) |
| GET | `/public/sources` | Registered sources list |
| GET | `/public/countries` | Country list with risk levels |
| GET | `/public/categories` | News category list |

### Authenticated Endpoints (JWT required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/news/latest` | Same as public, behind auth |
| GET | `/news/search` | Same as public |
| GET | `/news/trending` | Same as public |
| GET | `/news/heatmap` | Same as public |
| GET | `/news/pipeline/status` | Same as public |
| GET | `/news/:id` | Single article with full content + metadata |
| GET | `/settings` | Server configuration |
| POST | `/settings` | Update server configuration |

## 9. Fault Tolerance

### What's Already in Place

| Mechanism | Where | Effect |
|-----------|-------|--------|
| URL dedup | `queries_news.go` `ON CONFLICT(url) DO NOTHING` | Duplicate articles silently dropped |
| Worker pool bounds | `pool.go` `QueueSize:64, Workers:4` | Prevents goroutine explosion |
| Rate limiting | `pool.go` `RateLimit:2.0, RateBurst:4` | Prevents source hammering |
| Task timeout | `pool.go` 30s context deadline per task | Hangs don't block the pool |
| Validate before process | `collector.go` `src.Validate(a)` | Invalid articles filtered early |
| Error counters | `worker/metrics.go` atomic int64 | Observable failure rates |
| State tracking | `pipeline_state.go` | Know exactly where failures occur |

### What Should Be Added

**1. Circuit Breaker per Source**

If a source fails N consecutive times (e.g., 5), pause it for M minutes (e.g., 30) before retrying. Prevents wasting resources on dead feeds.

```go
// In pipeline_state.go, add to SourceRecord:
type SourceRecord struct {
    Name             string
    State            SourceState
    LastRun          time.Time
    Errors           int
    ConsecutiveFails int       // <-- NEW
    CircuitOpen      bool      // <-- NEW
    CircuitOpenedAt  time.Time // <-- NEW
}

// In jobs.go, before submitting:
if src.IsCircuitOpen() {
    slog.Warn("source circuit open, skipping", "source", src.Name())
    continue
}
```

**2. Dead Letter Queue**

Articles that fail processing 3+ times should go to a dead-letter table for manual review, rather than being silently dropped.

```sql
CREATE TABLE dead_letters (
    id BIGSERIAL PRIMARY KEY,
    article_id TEXT,
    source_name TEXT,
    url TEXT,
    error TEXT,
    attempts INT,
    last_attempt_at TIMESTAMPTZ,
    raw_content TEXT
);
```

**3. Graceful Shutdown**

Currently `defer pool.Shutdown(15*time.Second)` in main.go. Should also drain the scheduler and wait for in-flight articles:

```go
// In main.go shutdown handler:
sig := make(chan os.Signal, 1)
signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
go func() {
    <-sig
    slog.Info("shutting down...")
    newsScheduler.Stop()
    collectorPool.Shutdown(30 * time.Second)
    os.Exit(0)
}()
```

**4. Retry with Backoff for DB Writes**

If `InsertArticle` fails with a transient error (connection refused, timeout), retry with exponential backoff:

```go
// In persist.go:
func insertWithRetry(ctx context.Context, articleID string, ...) error {
    backoff := []time.Duration{100*time.Millisecond, 500*time.Millisecond, 1*time.Second, 5*time.Second}
    var lastErr error
    for i, d := range backoff {
        err := db.InsertArticle(...)
        if err == nil {
            return nil
        }
        if !isRetryable(err) {
            return err
        }
        lastErr = err
        time.Sleep(d)
    }
    return fmt.Errorf("insert failed after %d retries: %w", len(backoff), lastErr)
}
```

**5. Health Check Alerts**

The `/public/news/pipeline/status` endpoint should be monitored. Alert conditions:
- `sources_errored > sources_total * 0.3` → more than 30% of sources failing
- `articles_failed > articles_total * 0.1` → more than 10% article failure rate
- `articles_in_flight > 100` → pipeline backlog
- Any source `state == "ERROR"` for > 2 consecutive cycles

**6. Database Connection Pool**

Ensure pgx connection pool is configured:

```go
// In db/db.go:
poolConfig, _ := pgxpool.ParseConfig(databaseURL)
poolConfig.MaxConns = 20
poolConfig.MinConns = 4
poolConfig.MaxConnLifetime = 30 * time.Minute
poolConfig.MaxConnIdleTime = 5 * time.Minute
```

## 10. Code Readability Improvements

### Already Good

- **Layered architecture**: Each package has one responsibility (source, news, scheduler, worker, db, api)
- **Interface-based sources**: `source.Source` interface allows new feed types without changing orchestration
- **Consistent error handling**: Errors logged at the boundary, not swallowed silently
- **Atomic metrics**: `sync/atomic` counters for zero-lock observability
- **State machine validation**: `ValidTransitions` map prevents impossible state changes

### Should Improve

**1. Context Propagation**

Currently the scheduler creates fresh contexts per task. Some tasks lose parent cancellation:
```go
// BAD: taskCtx is disconnected from parent shutdown
pool.Submit(worker.Task{
    Fn: func(taskCtx context.Context) error { ... }
})

// BETTER: derive from a parent context that gets cancelled on shutdown
taskCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
defer cancel()
```

**2. Configuration Centralization**

Source reliability, country risk, and category keywords are hardcoded in Go maps. Move to a config file or database:

```go
// Instead of:
var SourceReliability = map[string]float64{ "WAM": 0.85, ... }

// Prefer:
type SourceConfig struct {
    Name        string  `json:"name"`
    URL         string  `json:"url"`
    Reliability float64 `json:"reliability"`
    Country     string  `json:"country"`
    Language    string  `json:"language"`
}
// Load from JSON/YAML/env at startup
```

**3. Structured Logging Consistency**

Some files use `log.Printf`, others use `slog`. Standardize on `slog` everywhere:

```go
// BAD:
log.Printf("[news] Failed to parse RSS %s", name)

// GOOD:
slog.Error("rss parse failed", "source", name, "error", err)
```

**4. Test Seams**

The pipeline currently has no interfaces for testing. Add test seams:

```go
// Define interfaces at package boundaries:
type ArticleStore interface {
    InsertArticle(...) error
    GetLatestArticles(...) (*sql.Rows, error)
}

// Use in production:
type defaultStore struct{}
func (s *defaultStore) InsertArticle(...) error { return db.InsertArticle(...) }

// Use in tests:
type mockStore struct{ articles []NewsArticle }
func (s *mockStore) InsertArticle(...) error { s.articles = append(...); return nil }
```

**5. Error Wrapping**

Errors should carry context about where they occurred:

```go
// BAD:
if err != nil { return err }

// GOOD:
if err != nil {
    return fmt.Errorf("collector: fetch source %s: %w", src.Name(), err)
}
```

**6. Remove Dead Code**

Files to audit for unused code:
- `integrations/news.go` — now deprecated after migration
- `translator.go` — `NoopTranslator` used when no API key; should this be the default?
- `openrouter.go` — wired but untested; add feature flag

**7. Database Query Parameterization**

Some queries build SQL strings with concatenation. Use parameterized queries consistently:

```go
// BAD:
query := "SELECT * FROM articles WHERE country = '" + country + "'"

// GOOD:
query := "SELECT * FROM articles WHERE country = $1"
db.Query(query, country)
```
(The current codebase already uses `?` placeholders correctly — this is a reminder.)

## 11. Future Integrations

### Adding a New RSS Source (2 lines of code)

```go
// In gulf_sources.go, add one line:
NewRSSSource("New Source Name", "https://feed.url/rss", "en", "XX"),
```

That's it. The scheduler picks it up automatically on the next 15-minute tick.

### Adding a New Source Type

If you need a source that isn't RSS (e.g., a Telegram scraper, a Twitter/X API, a government PDF portal):

1. Implement the `source.Source` interface
2. Register in the registry
3. The scheduler handles the rest

```go
type TelegramSource struct { ... }
func (s *TelegramSource) Name() string { ... }
func (s *TelegramSource) Type() Type { return "telegram" }  // define a new Type
func (s *TelegramSource) Fetch(ctx context.Context) ([]RawArticle, error) { ... }
func (s *TelegramSource) Validate(RawArticle) error { ... }
```

### Adding a New ML Feature

To add a new scoring dimension (e.g., `sentiment_score`):

1. Add the field to `NewsFeatureVector` in [features.go](server/internal/intelligence/news/features.go)
2. Compute it in `ExtractNewsFeatures()`
3. Add a new sub-score in `ComputeNewsScore()` in [scorer.go](server/internal/intelligence/news/scorer.go)
4. Update the Python `NewsFeatures` pydantic model in `ml-service/lib/features.py` if using the Python ML service

### Adding a New Gazetteer Category

To geocode a new entity type (e.g., military bases):

1. Add the gazetteer map in [geocode.go](server/internal/intelligence/news/geocode.go):
   ```go
   var MilitaryBases = map[string]GeoPoint{
       "al udeid": {25.1175, 51.3150},
       "al dhafra": {24.2483, 54.5472},
   }
   ```
2. Add a regex pattern in [entity.go](server/internal/intelligence/news/entity.go) to extract base names
3. Add the field to `EntityResult`
4. Add to `GeocodeEntity()` in geocode.go

### Running the Pipeline (Quick Reference)

```bash
# Start the backend (sources, scheduler, API)
cd server && go run ./cmd/...

# Check pipeline health
curl http://localhost:8080/public/news/pipeline/status

# View geo-tagged articles
curl "http://localhost:8080/public/news/heatmap?north=35&south=10&east=65&west=35&min_score=30"

# Start the frontend
cd client-v2 && npm run dev
# Open http://localhost:5173/admin/news
```

---

## 12. Recent Changes (July 2026)

### 12a. Pipeline Unification

Two parallel news pipelines were merged into one:

| Before | After |
|--------|-------|
| Pipeline A: 14 sources, 7-step ML, coordinates | **One pipeline:** 16 sources, same code path |
| Pipeline B: 5 hardcoded feeds, `risk_score=65.0`, no geo | **Removed** — feeds migrated to source registry |

The legacy `integrations/news.go` aggregator was deprecated. Its 5 feeds (Maritime Executive, gCaptain, Al Jazeera, USNI, DefenseNews) were added to [gulf_sources.go](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/server/internal/intelligence/source/gulf_sources.go#L86-L96). Both `StartNewsAggregator()` goroutine calls removed from [main.go](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/server/cmd/main.go).

### 12b. Coordinate Extraction

80+ named locations mapped to precise lat/lon in [geocode.go](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/server/internal/intelligence/news/geocode.go):

- 30 ports (Jebel Ali, Dammam, Bandar Abbas, Chabahar...)
- 18 airports (DXB, AUH, DOH, IKA...)
- 27 cities (Dubai, Riyadh, Tehran, Baghdad...)
- 22 country centroids

Four-phase extraction in [coordinates.go](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/server/internal/intelligence/news/coordinates.go):

| Phase | Method | Confidence |
|-------|--------|-----------|
| 1 | Regex decimal (`25.2345, 55.3456`) | 0.85 |
| 2 | Regex DMS (`25°14'04"N 55°18'22"E`) | 0.75 |
| 3 | Entity geocode (port/airport/city → lat/lon) | 0.60 |
| 4 | Country centroid fallback | 0.25 |

Stored in new columns: `articles.lat DOUBLE PRECISION`, `articles.lon DOUBLE PRECISION`.

### 12c. Pipeline State Machine

Created [pipeline_state.go](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/server/internal/intelligence/news/pipeline_state.go) tracking full article lifecycle:

```
QUEUED → PROCESSING → SCORED → GEOCODED → STORED → DONE
  │                      │          │
  └─→ SKIPPED      PROCESS_FAILED  PROCESS_FAILED
                       │              │
                       └──→ QUEUED (retry)
                    DUPLICATE (terminal)
```

Source-level states: `IDLE → FETCHING → FETCHED → PROCESSING → DONE / ERROR`

Integrated into [persist.go](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/server/internal/intelligence/news/persist.go) (article-level transitions) and [jobs.go](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/server/internal/scheduler/jobs.go) (source-level transitions). Eviction runs periodically to prevent unbounded memory.

### 12d. Health Monitoring

Enhanced health endpoint in [handlers.go](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/server/internal/api/handlers.go#L155):

```json
GET /health → {
  "status": "healthy|degraded",
  "components": {
    "database": {"healthy": true, "ping_ms": 45},
    "websocket": {"healthy": true}
  },
  "version": "2.0.0"
}
```

Added `db.Ping()` in [db.go](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/server/internal/db/db.go#L367) for live DB connectivity checks.

Pipeline metrics endpoint: `GET /public/news/pipeline/status` → article counts per state, source health.

### 12e. API Response Standardization

All endpoints now return uniform response shape:

```json
{"data": [...], "total": 42}
```

| Endpoint | Before | After |
|----------|--------|-------|
| `/public/news/latest` | `{"count":n, "articles":[...]}` | `{"data":[...], "total":n}` |
| `/public/events` | `{"count":n, "events":[...]}` | `{"data":[...], "total":n}` |
| `/public/threats` | `{"count":n, "threats":[...]}` | `{"data":[...], "total":n}` |
| `/public/timeline` | `{"count":n, "items":[...]}` | `{"data":[...], "total":n}` |
| `/public/sources` | `{"count":n, "sources":[...]}` | `{"data":[...], "total":n}` |
| `/public/news` | `{"news":[...]}` | `{"news":[...]}` (legacy, kept for home page) |

Field name fixes for frontend compatibility: `source_id→source`, `summary→description`, `published_at→publishedAt`, `event_type→type`, `start_time→occurredAt`, `severity/score→level`.

### 12f. Dedup & LLM Wiring

- **Dedup**: Content hash computed in `ProcessArticle()` and checked via `db.HashExists()` before insert — duplicate articles skipped at processing stage (not just at DB insert).
- **LLM Translation**: Gated by `NeedsTranslate` flag from language detection. Calls `NewTranslator().Translate()` in `ProcessAndStore()` when source language is ar/fa/he.

### 12g. Source DB State Updates

Scheduler now calls `db.MarkSourceFetched()` and `db.MarkSourceError()` per collection cycle — source health reflected in the `sources` table and visible via `/public/sources`.

---

## 13. DevOps & Operations

See [DEVOPS.md](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/DEVOPS.md) for:

- Cloudflare Tunnel setup (public serving via `api.hormuzwatch.app`)
- Windows background service management (`scripts/manage.ps1`)
- GitHub Actions CI/CD (auto-build on push to main)
- Python ML service management (`ml_cli.py`)
- Health monitoring runbook
- Troubleshooting guide

---

## 14. Key File Index

```
server/
├── cmd/main.go                              # Entry point — wires all layers
├── DESIGN.md                                # This document
├── internal/
│   ├── intelligence/
│   │   ├── source/
│   │   │   ├── interface.go                 # Source interface
│   │   │   ├── registry.go                  # Thread-safe registry
│   │   │   ├── gulf_sources.go              # 16 RSS sources
│   │   │   ├── rss.go                       # RSSSource (gofeed)
│   │   │   ├── api.go                       # APISource (JSON)
│   │   │   └── scraper.go                   # ScraperSource (goquery)
│   │   └── news/
│   │       ├── scorer.go                    # ProcessArticle() — 7-step orchestrator
│   │       ├── cleaner.go                   # HTML strip, unicode normalize
│   │       ├── dedup.go                     # URL/SimHash/content hashing
│   │       ├── language.go                  # ar/fa/he/en detection
│   │       ├── entity.go                    # Gazetteer NER
│   │       ├── enrichment.go                # Category classifier, risk maps
│   │       ├── features.go                  # 18-dim NewsFeatureVector
│   │       ├── coordinates.go               # 4-phase coordinate extractor
│   │       ├── geocode.go                   # 80+ locations → lat/lon
│   │       ├── persist.go                   # ProcessAndStore() → DB
│   │       ├── pipeline_state.go            # State machine + metrics
│   │       ├── translator.go                # Translation (OpenRouter)
│   │       └── openrouter.go                # LLM client
│   ├── scheduler/
│   │   ├── scheduler.go                     # Periodic job runner
│   │   └── jobs.go                          # rss-refresh, api-refresh
│   ├── worker/
│   │   ├── pool.go                          # Bounded goroutine pool
│   │   ├── collector.go                     # Fetch → validate per source
│   │   └── metrics.go                       # Atomic counters
│   ├── db/
│   │   ├── db.go                            # Schema DDL + Ping()
│   │   └── queries_news.go                  # All CRUD + geo queries
│   └── api/
│       ├── handlers.go                      # Health, telemetry, WebSocket
│       ├── news_handlers.go                 # News REST (latest, search, heatmap)
│       ├── event_handlers.go                # Events, threats, timeline
│       ├── entity_handlers.go               # Sources, countries, categories
│       ├── news.go                          # Legacy /public/news (redirected to articles)
│       └── datasets.go                      # GDrive snapshot pipeline

scripts/
└── manage.ps1                               # Windows service manager

ml-service/
├── app.py                                   # FastAPI (health, train, predict)
├── ml_cli.py                                # CLI (serve, status, stop, train, models, predict)
├── grpc_server.py                           # gRPC inference server
└── models/                                  # .joblib model bundles

.github/workflows/
└── backend-ci.yml                           # Auto-build on push to main
```
