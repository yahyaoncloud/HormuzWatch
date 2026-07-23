# TODO — HormuzWatch Gulf Intelligence Platform Evolution

> Architecture-driven implementation roadmap. Phases must complete sequentially.
> Each phase must compile (`go build ./...`) and pass tests before the next begins.

---

## Phase 1 · Architectural Audit `[x]`

> Objective: Understand every module, dependency, and responsibility before changing anything.

### 1.1 · Project Layout & Structure
- [x] Map top-level directories (`server/`, `ml-service/`, `client-v2/`, `proto/`, `terraform/`, `ansible/`, `infra-observability/`)
- [x] Inventory all Go packages under `server/internal/` (14 packages, 45+ files)
- [x] Inventory Python ML service (`ml-service/`) — FastAPI, gRPC server, ensemble pipeline, SHAP

### 1.2 · Dependency Graph
- [x] Trace import chain: `cmd/main.go` → `db` → `intelligence` → `integrations` → `api` → `websocket`
- [x] Identify cross-package coupling (`intelligence` imports `api` — wrong direction)
- [x] Map gRPC contract: `proto/ml_service.proto` → Go stubs + Python stubs — domain-aware, versioned

### 1.3 · Existing Responsibilities
- [x] Go backend owns: AIS/OpenSky/Kystverket/GDELT/FIRMS/Weather ingestion, rule scoring, feature engineering, composite threat scoring, REST API, WebSocket, JWT auth, heatmap, retention
- [x] Python ML service owns: IsolationForest + LOF ensemble, Isotonic calibration, SHAP explanations, offline training
- [x] Gaps identified: no news/text pipeline, no language detection, no translation, no NER, no dedup, no structured observability

### 1.4 · Technical Debt & Bottlenecks
- [x] 4x duplicated intelligence pipeline code across `aisstream.go`, `opensky.go`, `kystverket.go`, `simulator.go`
- [x] Dual DB drivers (`database/sql` + `pgxpool`) — incomplete migration
- [x] Hardcoded admin credentials in `config/admin.go`
- [x] Dead code: `environment/env.go`, root-level `internal/mlgrpc/`, committed SQLite `.db` files
- [x] No structured logging, no metrics, no tracing in Go code
- [x] SQLite-style `?` placeholders in PostgreSQL queries via `Rebind()` adapter

### 1.5 · Extension Points
- [x] `integrations/` package — pattern for new collectors (follows AISStream/OpenSky worker model)
- [x] `intelligence/` package — pipeline design supports new domains (vessel + aviation + heatmap already)
- [x] `intelligence/ml_client.go` — gRPC client already domain-parameterized; adding `"news"` is additive
- [x] `api/` middleware stack — CORS, rate-limit, cache, JWT auth reusable for new endpoints
- [x] `db/db.go` — `CREATE TABLE IF NOT EXISTS` pattern supports adding schema without migration framework

### 1.6 · Database Schema Review
- [x] Existing tables: `news`, `tracks`, `telemetry_observations`, `anomalies`, `settings`, `watchlist`, `users`, `sessions`, `dataset_snapshots`
- [x] Missing for intelligence: `sources`, `articles` (full content), `entities`, `countries`, `categories`, `scrape_jobs`, `scrape_logs`, `content_hashes`, `events`
- [x] `news` table is summary-only (no `content`, `language`, `category`, `risk_score`, `entities`)

---

## Phase 2 · Architecture Design `[x]`

> Objective: Design the Intelligence Collection subsystem — packages, interfaces, data flows, API surface, DB schema.

### 2.1 · Package Structure
- [x] New `intelligence/news/` — 10 files: `features.go`, `collector.go`, `cleaner.go`, `normalizer.go`, `dedup.go`, `language.go`, `translator.go`, `entity.go`, `keywords.go`, `enrichment.go`, `scorer.go`
- [x] New `intelligence/source/` — 5 files: `interface.go`, `registry.go`, `rss.go`, `scraper.go`, `api.go`
- [x] New `worker/` — 4 files: `pool.go` (context + rate-limit + semaphore), `collector.go`, `retry.go`, `metrics.go`

### 2.2 · Interface Contracts
- [x] `Source` interface: `Name()`, `Type()`, `Fetch(ctx) → []RawArticle`, `Validate(RawArticle) → error`
- [x] Processing interfaces: `Cleaner`, `Normalizer`, `Deduplicator`, `LanguageDetector`, `Translator`, `EntityExtractor`
- [x] `NewsFeatureVector` — 18 features (keyword_count, entity_count, article_length, military/energy/shipping/cyber terms, country_risk, source_reliability, sentiment, org/company/port/airport/ship/aircraft counts, publisher_weight)

### 2.3 · Data Flow
- [x] News pipeline: Source → Validate → Clean → Normalize → Dedup → Language Detect → Translate → Entity Extract → Keyword Extract → Features → gRPC Predict → Threat Enrichment → Store → API
- [x] Kinematic pipeline unified: `pipeline.ProcessObservation()` eliminates 4x duplication
- [x] Python boundary: Go sends `NewsFeatureVector`, Python returns `{probability, anomaly_score, shap_contributions}`

### 2.4 · API Endpoints
- [x] `/news/latest`, `/news/search`, `/news/trending`, `/news/:id` — news intelligence with filtering
- [x] `/countries`, `/country/:code` — regional risk profiles
- [x] `/categories`, `/sources` — metadata lookups
- [x] `/events`, `/events/:id`, `/timeline`, `/threats` — aggregated intelligence

### 2.5 · Database Extensions
- [x] 7 new tables: `sources`, `articles`, `entities`, `countries`, `content_hashes`, `scrape_jobs`, `events`
- [x] Index strategy: `articles(language, category, published_at)`, `entities(entity_type, entity_name)`, `content_hashes(hash)`
- [x] Existing tables untouched — all additions use `CREATE TABLE IF NOT EXISTS`

### 2.6 · Gulf Source Configuration
- [x] 15 pre-configured sources: WAM (UAE), SPA (Saudi), KUNA (Kuwait), BNA (Bahrain), ONA (Oman), QNA (Qatar), IRNA (Iran), INA (Iraq), USNI, DefenseNews, GDELT, FIRMS, Open-Meteo, + NOTAM/UKMTO (future)
- [x] Per-source: type (rss/api/scraper), country, language, reliability score, rate limit
- [x] Configurable region scope (Gulf + optional: Red Sea, Gulf of Aden, Strait of Hormuz, Levant)

---

## Phase 3 · Migration Plan `[x]`

> Objective: File-by-file change log — what gets created, modified, or deleted. Every change has a reason.

### 3.1 · Phase 3A — Foundation (Dedup + Observability + Cleanup)
- [x] CREATE `intelligence/pipeline.go` — single `ProcessObservation()` replacing 4x duplicated code
- [x] MODIFY `integrations/aisstream.go`, `opensky.go`, `kystverket.go`, `simulator.go` — use unified pipeline
- [x] CREATE `observability/logging.go` — structured logging via `log/slog`
- [x] CREATE `observability/metrics.go` — Prometheus counters/gauges/histograms
- [x] DELETE root-level `internal/mlgrpc/` — duplicate; only `server/internal/mlgrpc/` used
- [x] DELETE `environment/env.go` — dead code
- [x] DELETE `server/hormuzwatch.db*` — committed binaries
- [x] MODIFY `config/admin.go` — remove hardcoded email + hash fallback
- [x] MODIFY `intelligence/features.go` — remove `api` import; move `IsNearHistoricalAttack` to `geo/`

### 3.2 · Phase 3B — Infrastructure (Source + Worker + Scheduler)
- [x] CREATE `intelligence/source/interface.go`, `registry.go`, `rss.go`, `scraper.go`, `api.go` — source abstraction
- [x] CREATE `worker/pool.go` — generic worker pool with context + rate limiting + semaphore
- [x] CREATE `worker/retry.go` — bounded exponential backoff
- [x] CREATE `worker/collector.go` — collection worker wrapping source + pipeline
- [x] CREATE `worker/metrics.go` — queue depth, utilization, error rate
- [x] CREATE `scheduler/scheduler.go` — cron-based job scheduling
- [x] CREATE `scheduler/jobs.go` — RSS refresh, cleanup, dedup recheck

### 3.3 · Phase 3C — News Processing Pipeline
- [x] CREATE `intelligence/news/cleaner.go` — HTML strip, unicode normalize, encoding fix
- [x] CREATE `intelligence/news/normalizer.go` — date parsing, coordinate validation
- [x] CREATE `intelligence/news/dedup.go` — URL hash + simhash content dedup
- [x] CREATE `intelligence/news/language.go` — detection via `whatlanggo`
- [x] CREATE `intelligence/news/translator.go` — interface + Google/Azure/LibreTranslate impl
- [x] CREATE `intelligence/news/entity.go` — NER: orgs, people, ships, aircraft, ports, airports
- [x] CREATE `intelligence/news/enrichment.go` — country lookup, source reliability, category
- [x] CREATE `intelligence/news/keywords.go` — TF-IDF keyword extraction
- [x] CREATE `intelligence/news/features.go` — `NewsFeatureVector` + `ExtractNewsFeatures()`
- [x] CREATE `intelligence/news/scorer.go` — pre-ML heuristic (keyword count, source weight, country risk)

### 3.4 · Phase 3D — ML Integration for News
- [x] MODIFY `ml-service/lib/features.py` — add `NewsFeatures` Pydantic model + `NEWS_COLS`
- [x] MODIFY `server/internal/intelligence/ml_client.go` — add `PredictNews(NewsFeatureVector)` method
- [x] No proto changes — existing `domain` field already supports `"news"`

### 3.5 · Phase 3E — Database Extensions
- [x] MODIFY `server/internal/db/db.go` — add `sources`, `articles`, `entities`, `countries`, `content_hashes`, `scrape_jobs`, `events`
- [x] CREATE `server/internal/db/queries_news.go` — insert article, find duplicates, query entities

### 3.6 · Phase 3F — API Endpoints
- [x] CREATE `server/internal/api/news_handlers.go` — `GetLatestNews`, `SearchNews`, `GetTrendingNews`, `GetNewsByID`
- [x] CREATE `server/internal/api/entity_handlers.go` — `GetCountries`, `GetCountryDetail`, `GetCategories`, `GetSources`
- [x] CREATE `server/internal/api/event_handlers.go` — `GetEvents`, `GetEventDetail`, `GetTimeline`, `GetThreats`
- [x] MODIFY `server/cmd/main.go` — register new routes

### 3.7 · Phase 3G — Wiring + Gulf Sources
- [x] CREATE `server/internal/intelligence/source/gulf_sources.go` — 15 pre-configured sources
- [x] MODIFY `server/cmd/main.go` — init source registry, worker pool, scheduler, news collector
- [x] MODIFY `server/internal/integrations/worker.go` — add news worker dispatch
- [x] MODIFY `server/internal/integrations/news.go` — deprecate old RSS loop; use pipeline collector

### 3.8 · Summary
- [x] **24 new files** created across 7 new packages
- [x] **~22 files modified** (no breaking changes)
- [x] **5 files deleted** (dead code, duplicates, committed binaries)
- [x] Zero changes to gRPC contract, kinematic pipeline core, or REST API contract

---

## Phase 4 · Implementation `[~]`

> Only begin after Phase 1–3 approval. Execute in order: 3A → 3B → 3C → 3D → 3E → 3F → 3G.
> Each step must `go build ./...` clean before proceeding.

### 4.1 · Phase 3A — Foundation `[x]`
- [x] CREATE `intelligence/pipeline.go` — unified `ProcessObservation()` eliminates 4x duplication (~160 lines removed)
- [x] MODIFY `aisstream.go`, `opensky.go`, `kystverket.go`, `simulator.go` — use `p.ProcessObservation()`, remove unused imports
- [x] CREATE `observability/logging.go` — structured JSON logging via `log/slog`, wired into `main.go`
- [x] CREATE `observability/metrics.go` — expvar counters (observations, anomalies, ML, DB), `/debug/vars` endpoint
- [x] DELETE 6 files: `internal/mlgrpc/` (duplicate), `environment/env.go` (dead), `server/hormuzwatch.db*` (committed binaries)
- [x] MODIFY `config/admin.go` — removed hardcoded email fallback; env-only now
- [x] CREATE `geo/attack.go` — moved `IsNearHistoricalAttack` + `LoadHistoricalAttacks` from `api/` to `geo/`
- [x] MODIFY `intelligence/features.go` — removed `api` import; uses `geo` now (coupling fixed)
- [x] MODIFY `api/handlers.go` — uses `geo.IsNearHistoricalAttack`
- [x] MODIFY `api/history.go` — delegates to `geo.GetHistoricalAttacks`
- [x] MODIFY `cmd/main.go` — uses `geo.LoadHistoricalAttacks`, imports `observability`

### 4.2 · Phase 3B — Infrastructure `[x]`
- [x] CREATE `intelligence/source/interface.go` — `Source` interface, `RawArticle` struct, `Type` enum
- [x] CREATE `intelligence/source/registry.go` — thread-safe registry (Register, Get, List, All)
- [x] CREATE `intelligence/source/rss.go` — RSS source using `gofeed`
- [x] CREATE `intelligence/source/scraper.go` — HTML scraper using `goquery`, link + detail extraction
- [x] CREATE `intelligence/source/api.go` — REST API source with JSON parsing
- [x] CREATE `worker/pool.go` — bounded goroutine pool with context, rate limiting, semaphore
- [x] CREATE `worker/collector.go` — `Collector` wrapping Source → Fetch → Validate → result
- [x] CREATE `worker/retry.go` — `Backoff` with bounded exponential delay
- [x] CREATE `worker/metrics.go` — atomic counters (tasks, collections, articles fetched/dropped)
- [x] CREATE `scheduler/scheduler.go` — interval-based job scheduler with graceful shutdown
- [x] CREATE `scheduler/jobs.go` — `DefaultJobs` for RSS (15min) and API (30min) refresh
- [x] DELETE `integrations/kystverket.go` — removed per user request
- [x] MODIFY `integrations/worker.go` — removed Kystverket dispatch

### 4.3 · Phase 3C — News Processing Pipeline `[x]`
- [x] CREATE `intelligence/news/cleaner.go` — HTML strip (regex + html.UnescapeString), unicode NFC normalize, encoding fix (Windows-1252 mojibake)
- [x] CREATE `intelligence/news/normalizer.go` — multi-format date parsing (20 layouts), DMS+decimal coordinate extraction, number normalization, text truncation
- [x] CREATE `intelligence/news/dedup.go` — URL hash (SHA-256 of normalized URL with tracking param stripping), SimHash (64-bit with tokenization), content hash, Hamming distance
- [x] CREATE `intelligence/news/language.go` — unicode-range-based detection for Arabic/Farsi/Hebrew/Latin scripts, Gulf languages list
- [x] CREATE `intelligence/news/translator.go` — `Translator` interface + NoopTranslator (swap in Google/Azure/LibreTranslate when credentials available)
- [x] CREATE `intelligence/news/entity.go` — gazetteer-based NER: regex patterns for orgs (Corps/Command/Ministry), ships (MMSI/IMO/MV prefix), aircraft (ICAO24/type), port/airport/country/city gazetteers
- [x] CREATE `intelligence/news/enrichment.go` — category classification (10 categories via keyword scoring), source reliability table (13 sources), country risk scores (22 countries)
- [x] CREATE `intelligence/news/keywords.go` — TF-IDF-ish extraction with stop-word filtering, 4 term category counters (military/energy/shipping/cyber)
- [x] CREATE `intelligence/news/features.go` — 18-field `NewsFeatureVector` + `ExtractNewsFeatures()` (all computed in Go)
- [x] CREATE `intelligence/news/scorer.go` — pre-ML heuristic scoring (keyword 0-20, entity 0-15, source 0-25, country 0-15, category 0-15, recency 0-10) + `ProcessArticle()` pipeline orchestrator

### 4.4 · Phase 3D — ML Integration for News `[x]`
- [x] CREATE `intelligence/news/openrouter.go` — reusable OpenRouter client: `chat()`, `Translate()` (Arabic/Farsi/Hebrew/Turkish → EN), `ClassifyThreat()` (LLM threat JSON), `Summarize()`
- [x] MODIFY `intelligence/news/translator.go` — `NewTranslator()` auto-selects OpenRouterTranslator when `OPENROUTER_API_KEY` is set; falls back to NoopTranslator
- [x] MODIFY `ml-service/lib/features.py` — added `NewsFeatures` Pydantic model (18 cols with range validation), `NEWS_COLS`, updated `DOMAIN_FEATURE_COLS`, `DOMAIN_SCHEMA`, `AnyFeatures`, `parse_features`
- [x] MODIFY `server/internal/intelligence/ml_client.go` — added `PredictNews()` + `newsFeaturePayload` struct + `localNewsHeuristic()` (Go-side fallback, mirrors news.ComputeNewsScore)

### 4.5 · Phase 3E — Database Extensions `[x]`
- [x] MODIFY `server/internal/db/db.go` — added 7 new intelligence platform tables with indexes, CHECK constraints, and foreign keys
- [x] CREATE `server/internal/db/queries_news.go` — 20+ query helpers: UpsertSource, InsertArticle, GetLatestArticles (with country/category/language filters), SearchArticles (ILIKE), GetTrendingArticles (last 6h high-risk), InsertEntities (pgx transactional bulk), InsertContentHash, HashExists, StartScrapeJob/CompleteScrapeJob/FailScrapeJob, UpsertEvent, GetEvents, GetTimeline (UNION articles+events), SeedCountries (22 Gulf+global countries)

### 4.6 · Phase 3F — API Endpoints `[x]`
- [x] CREATE `api/news_handlers.go` — GetLatestNews (paginated + filters), SearchNews (ILIKE), GetTrendingNews (last 6h high-risk), GetNewsByID
- [x] CREATE `api/entity_handlers.go` — GetCountries, GetCountryDetail (with recent articles), GetCategories (with counts), GetSources (with article counts)
- [x] CREATE `api/event_handlers.go` — GetEvents (filterable by type/severity/country), GetEventDetail, GetTimeline (UNION articles+events), GetThreats (anomalies + high-risk articles)
- [x] MODIFY `server/cmd/main.go` — registered 16 new routes across public, unauthenticated, and authenticated groups

### 4.7 · Phase 3G — Wiring + Gulf Sources `[x]`
- [x] CREATE `intelligence/source/gulf_sources.go` — 15 pre-configured GCC/Iran/Iraq/International sources (WAM, SPA, KUNA, BNA, ONA, QNA, IRNA, INA, USNI, DefenseNews, Al Jazeera, Reuters, UKMTO, IMO, OPEC)
- [x] MODIFY `server/cmd/main.go` — init source registry (15 sources), worker pool (4 workers, rate-limited), scheduler (RSS 15min, API 30min), news collector, SeedCountries
- [x] Build + vet exit 0 across all phases

---

## Notes
- **Go owns**: ingestion, scraping, cleaning, normalization, enrichment, feature engineering, APIs, storage, scheduling
- **Python owns**: model training, inference, calibration, SHAP, confidence — receives structured vectors only, never queries DB
- **Never rewrite**: preserve existing architecture; add modules, don't replace them
- **Small commits**: each phase independently compilable; never hundreds of files at once
