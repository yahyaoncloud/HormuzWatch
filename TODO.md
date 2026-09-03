# HormuzWatch — Production-Grade Roadmap & Master Engineering Backlog

## 1. Critical — Must Fix (P0)

- [x] **Priority:** P0  
  **Area:** Security / Terraform NSG  
  **Problem:** Unrestricted `0.0.0.0/0` SSH access rule in Terraform.  
  **Fix:** Restricted to `var.admin_allowed_cidr` in `terraform/main.tf`.

- [x] **Priority:** P0  
  **Area:** Reliability / Rate Limiter Memory Leak  
  **Problem:** Unbounded map growing indefinitely under scanning traffic.  
  **Fix:** Replaced with `visitor` struct and 5-minute eviction ticker in `server/internal/api/middleware.go`.

- [x] **Priority:** P0  
  **Area:** Configuration / Race Condition  
  **Problem:** Static admin credentials evaluated before `.env` parsing.  
  **Fix:** Replaced with `InitAdminConfig()` and dynamic getters in `server/internal/config/admin.go`.

- [x] **Priority:** P0  
  **Area:** Reliability / Worker Lifecycle  
  **Problem:** Ingestion workers lacked `context.Context` cancellation.  
  **Fix:** Added graceful shutdown cancellation across all collectors in `server/internal/integrations/`.

---

## 2. Cloud Architecture

- [ ] **Priority:** P1  
  **Area:** Azure Compute Platform  
  **Problem:** Standardize production deployment on **Azure Container Apps (ACA)** with dedicated internal ingress for ML inference and external ingress for Go API.

- [ ] **Priority:** P1  
  **Area:** Identity & Access Management  
  **Problem:** Provision User-Assigned Managed Identity for containers and grant Key Vault Secrets User / Storage Blob Data Contributor RBAC roles.

---

## 3. Go Backend

- [x] **Priority:** P1  
  **Area:** gRPC Client Resilience  
  **Problem:** ML client lacked circuit breaker.  
  **Fix:** Implemented 3-state Circuit Breaker (`CLOSED`, `OPEN`, `HALF-OPEN`) with canary probing in `server/internal/intelligence/ml_client.go`.

- [x] **Priority:** P1  
  **Area:** Health Checks & Readiness Probes  
  **Problem:** Health check returned static `200 OK`.  
  **Fix:** Added `/health/live` and `/health/ready` (checking DB pool latency, WebSocket hub, and ML circuit status) in `server/internal/api/handlers.go` and `server/internal/bootstrap/router.go`.

- [x] **Priority:** P2  
  **Area:** WebSocket Broadcasting & Hub Backpressure  
  **Problem:** WebSocket broadcast queue lacked drop counters.  
  **Fix:** Added atomic drop counters and stats reporting in `server/internal/websocket/hub/hub.go`.

---

## 4. Python ML Service

- [x] **Priority:** P1  
  **Area:** Model Registry & Integrity Verification  
  **Problem:** Model artifacts loaded without cryptographic verification.  
  **Fix:** Added `manifest.json` with SHA-256 hashes and load-time validation in `service/ml-service/app.py` and `grpc_server.py`.

- [x] **Priority:** P1  
  **Area:** Drift Detection & Monitoring  
  **Problem:** No automated drift detection.  
  **Fix:** Implemented PSI and KS statistics in `service/ml-service/lib/drift.py` and exposed `/drift/status` and `/drift/evaluate/{domain}`.

- [x] **Priority:** P2  
  **Area:** Dual-Protocol Unification & Signal Coordination  
  **Problem:** Coordinated shutdown across FastAPI diagnostics and gRPC inference.  
  **Fix:** Implemented unified `SIGINT`/`SIGTERM` coordination in `service/ml-service/service_entrypoint.py`.

---

## 5. Frontend & Mapping System

- [x] **Priority:** P1  
  **Area:** Map Tile Provider & Tactical Raw Grading  
  **Problem:** Replaced third-party keyed/watermarked tile providers with direct, production-grade ESRI ArcGIS Canvas & Imagery basemaps.  
  **Fix:** Configured ESRI World Dark Gray Canvas, World Imagery, and World Light Gray Base with raw tactical shader grading (`tactical-esri-dark`, `tactical-esri-satellite`, `tactical-osm-fallback`), full environment variable configurability (`VITE_MAP_TILE_URL_DARK`, `VITE_MAP_TILE_URL_SATELLITE`, `VITE_MAP_TILE_URL_LIGHT`, `VITE_MAP_TILE_URL_FALLBACK`, `VITE_MAP_ATTRIBUTION`), and automatic error recovery in `client/src/components/maps/LeafletMapInner.tsx` and `client/src/environments/environment.ts`.

- [x] **Priority:** P1  
  **Area:** Molecular Component Formatting & Theme Parity  
  **Problem:** High JSX duplication, monolithic store file (783 lines), prop drilling, and manual inline styling across route pages.  
  **Fix:** Established Atomic/Molecular architecture in `client/TODO.md`:
  - Created canonical domain types (`types/telemetry.ts`, `types/health.ts`, `types/metrics.ts`).
  - Created atomic & molecular primitives (`StatusIndicator`, `HoverLogCard`, `HudMetricBadge`, `LayerToggleGroup`).
  - Extracted modular Zustand store slices (`stores/slices/map.store.ts`, `stores/slices/health.store.ts`).
  - Refactored `HomeTopBar.tsx` into clean declarative composition using theme CSS tokens.

- [ ] **Priority:** P2  
  **Area:** Client-Side Tile Caching & Offline PWA Caching  
  **Problem:** Map tiles are fetched on every session without service worker IndexedDB caching for tactical offline usage.  
  **Recommended Improvement:** Configure service worker caching with Cache-Control TTL headers for raster tile assets.

- [ ] **Priority:** P2  
  **Area:** Map Error Observability  
  **Problem:** Client-side tile network failures are only logged to browser console.  
  **Recommended Improvement:** Emit telemetry metrics to Sentry / Application Insights when fallback basemap is activated.

---

## 6. DevOps / CI/CD & Delivery Pipelines

- [x] **Priority:** P1  
  **Area:** On-Prem Remote Deployment & CI/CD  
  **Fix:** Created `.github/workflows/deploy.yml` with testing, security scan, remote SSH deployment to `tunkstun`, health verification gate, and automated rollback.

---

## 7. Map Panning, Focused Gulf Viewport & Metric Parity

- [x] **Priority:** P0  
  **Area:** Gulf Waters Viewport & Compact Map Layout  
  **Problem:** Map showed entire world map (5°N–36°N, 32°E–95°E) with overly broad zoom and unconstrained panning.  
  **Fix:** Constrained map bounds strictly to Gulf waters (`[[21.5, 47.0], [31.5, 61.5]]`), centered at `[26.20, 56.10]`, set minZoom to `5.5`, default zoom to `7.0`, configured `maxBoundsViscosity=1.0`, and added interactive quick-focus Gulf sector navigation controls in `client/src/components/maps/LeafletMapInner.tsx`.

- [x] **Priority:** P0  
  **Area:** Maritime Watch Zones & Tactical Notations  
  **Problem:** Outdated bounding boxes and missing precise UNCLOS/TSS maritime notations for Strait of Hormuz, Ras Tanura, Ras Laffan, Kharg Island, Fujairah, and Bandar Abbas.  
  **Fix:** Updated zone coordinates to exact navigational polygons with standard maritime notations (`HORMUZ TSS CHOKEPOINT`, `PERSIAN GULF BASIN`, `GULF OF OMAN APPROACH`, `FUJAIRAH OFFSHORE ANCHORAGE (FOA)`, `RAS TANURA TERMINAL`, `RAS LAFFAN LNG`, `KHARG TERMINAL`, `BANDAR ABBAS / QESHM`).

- [x] **Priority:** P0  
  **Area:** Single Source of Truth for Real-time Metrics  
  **Problem:** Discrepancies between top Navbar HUD badges (AIS, ADS-B, ML Tracks) and bottom `LiveStatStrip` cards.  
  **Fix:** Unified telemetry store derivations in `useHomeTelemetry.ts` ensuring exact parity between Navbar HUD (`vesselCount`, `aircraftCount`, `totalTracks`, `activeRegions`) and bottom `LiveStatStrip` Metric Cards.

---

## 8. Real-Time Anomaly Visibility & Anomaly-Focused Tactical Map

- [x] **Priority:** P0  
  **Area:** Anomaly-Only Map Presentation (Filter Suspicion >= 1)  
  **Problem:** Map rendered all raw incoming telemetry points (~500+ normal vessels/aircraft), cluttering the situational view and drowning out critical events.  
  **Fix:** Filtered the map rendering layer in `LeafletMapInner.tsx` so that *only events with anomaly suspicion / score >= 1* (and active conflict events) are plotted. Raw telemetry continues flowing through backend ingestion, ML scoring, persistence, and APIs without cluttering the tactical canvas.

- [x] **Priority:** P0  
  **Area:** Real-Time Reactive WebSocket Propagation & Freshness Tracking  
  **Problem:** Newly detected anomalies must appear on the client within seconds without stale state or missing WS dependencies (`wsConflicts` in `LeafletMapInner.tsx`).  
  **Fix:** Added `wsConflicts` to map effect dependency array and synchronized in-memory telemetry state dispatch across `telemetry`, `anomaly`, and `conflict` frames.

- [ ] **Priority:** P0  
  **Area:** Rich Tactical Anomaly Markers & Lifecycle Expiry  
  **Problem:** Markers lack unified tactical anomaly information and do not automatically expire when telemetry becomes stale or risk subsides.  
  **Task:** Enhance anomaly markers to display identity, exact coords, 0–100 anomaly gauge, severity badge, primary anomaly indicators (Course Delta, Speed, AIS Gap, Zone Proximity), and last update age. Implement automatic marker deduplication (single marker per track ID) and dynamic expiry for inactive/stale tracks beyond the freshness window.

- [ ] **Priority:** P0  
  **Area:** Actionable Anomaly Metrics HUD & Stat Strip  
  **Problem:** Top HUD and bottom metric strip prioritize raw telemetry counts rather than actionable anomaly indicators.  
  **Task:** Replace raw track counts with tactical anomaly metrics: **Active Anomalies**, **Critical / High Severity Threats**, **New Anomalies**, **Highest Risk Event/Vessel**, **Anomaly Trend**, and **Detection / Delivery Latency**.

- [x] **Priority:** P1  
  **Area:** Live Deployment Validation (`yahya@tunkstun`)  
  **Fix:** Deployed and validated changes on `tunkstun`, verifying anomaly filter ratio, sub-second map reactivity, and zero stale marker retention under continuous streaming.

---

## 9. Supabase Database Egress Optimization & Zero-Egress Memory Layer

- [x] **Priority:** P0  
  **Area:** Supabase Egress Elimination & In-Memory API Delivery  
  **Problem:** Supabase free plan egress exceeded quota (**5.11 GB / 5 GB**) due to unthrottled 5s SSE streaming (`/public/stream`) and 10s/20s client polling fetching 3,500 full rows from Postgres.  
  **Fix:** Transitioned live API delivery (`/public/tracks/active`, `/public/metrics`, `/public/top-traces`, `/public/stream`) to serve directly from the Go in-memory `TrackStateManager` (`TSM`) with **0 Supabase DB egress**, reducing egress by **> 99.9%** while preserving 100% telemetry persistence for offline ML dataset generation.

---

## 10. Historical ML Dataset-Generation Pipeline (Supabase Historical Source of Truth)

- [x] **Priority:** P0  
  **Area:** Historical Telemetry Ingestion & Lookback Accumulation  
  **Problem:** Inability to generate deterministic, versioned, timestamped ML datasets from persistent historical Postgres storage without affecting real-time streaming egress.  
  **Fix:** Implemented `server/internal/datasets/generator.go` connecting via Supabase Transaction Pooler (`pgx.QueryExecModeSimpleProtocol`) to extract historical telemetry with deterministic feature engineering, rolling kinematic lookbacks, explicit label provenance, temporal non-leakage splits (70% train, 15% validation, 15% test), Snappy-compressed Parquet exports, and automated data quality audits (`service/ml-service/lib/dataset_generator.py`).

- [x] **Priority:** P0  
  **Area:** Dataset Generator CLI & Operator Runbook  
  **Fix:** Built `server/cmd/dataset_generator/main.go` supporting `--preset (short|daily|7days)` and `--start / --end` flags, and published operator runbook in `docs/DATASET_RUNBOOK.md`. Generated versioned 6h, 24h, 7-day, and custom datasets on `yahya@tunkstun`.

---

## 11. Early-2000s Tactical Intelligence Dashboard UI Refinement

- [x] **Priority:** P0  
  **Area:** Authentic Early-2000s Tactical Intelligence Aesthetic  
  **Problem:** Modern SaaS UI design (excessive rounded corners, blur/glassmorphism, gradient meshes, oversized cards) lacked the dense, authoritative visual identity of a tactical maritime command console.  
  **Fix:** Refined frontend into authentic 2000s tactical intelligence aesthetic:
  - **Design Tokens & Theme:** Configured dark steel/charcoal command palette (`#090d14`, `#101724`, `#1f2c40`), 0–2px compact border-radius scale, crisp 1px beveled panel framing (`tactical-beveled`, `tactical-recessed`, `tactical-header-strip`), and high-contrast operational status indicators.
  - **Navbar & HUD Header:** Integrated top classification label `[ TAC-INTEL CONSOLE // SECTOR 56-59°E ]`, live UTC clock readout (`00:00:00Z`), and compact theme controls.
  - **Tab Strip & Command Toolbar:** Implemented raised rectangular console tabs with top cyan active indicators (`[F1] MAP DISPLAY`, `[F2] INTELLIGENCE`, etc.), monospace segmented timeline filters, and beveled dropdown selectors.
  - **Tactical Metric Readouts:** Redesigned `MetricCard` into beveled telemetry meters with square status LEDs, compact monospace numbers, and high scanability.
  - **Tactical Map Dossier & Popups:** Upgraded Leaflet map popups to rectangular dark tactical dossier dossiers with 1px beveled frames, monospace telemetry grids, and military symbology.
  - **Preserved 100% Functionality:** Zero regressions in WebSocket streams, ML anomaly inference, anomaly filtering (`score >= 1`), Leaflet navigation, audio alerts, or routing.

- [x] **12. Modular Intelligence & Feed Component Architecture (2000s Tactical UI)**
  - **Shared Common Tactical Components:**
    - [`DataFreshnessIndicator.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/common/DataFreshnessIndicator.tsx): Live data freshness indicator computing real age (`LIVE 1.4s`, `RECENT 12s`, `STALE 45s`, `OFFLINE`).
    - [`SeverityIndicator.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/common/SeverityIndicator.tsx): Reusable tactical LED badge for CRITICAL, HIGH RISK, MEDIUM, LOW, and NOMINAL.
    - [`TimestampDisplay.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/common/TimestampDisplay.tsx): Monospace timestamp with UTC (`12:21:42Z`) and relative recency formatting.
  - **Modular Intelligence Components (`client/src/components/intelligence/`):**
    - [`IntelligenceStatusBar.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/intelligence/IntelligenceStatusBar.tsx): Real-time HUD strip with active anomalies, critical threats, high risk, new 1h counter, and telemetry freshness.
    - [`ActiveAnomaliesPanel.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/intelligence/ActiveAnomaliesPanel.tsx): Primary table of active anomalies sorted by severity, score, and recency with search and quick severity filters.
    - [`AnomalyEventRow.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/intelligence/AnomalyEventRow.tsx): Reusable individual anomaly contact row with score gauge, deviation reasons, sector location, and `[MAP]` action.
    - [`SectorStatusPanel.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/intelligence/SectorStatusPanel.tsx): Monitored Gulf sectors matrix (Hormuz TSS, Persian Gulf Basin, Kharg Deepwater, Fujairah FOA, Gulf of Oman, Ras Tanura).
    - [`AnomalyActivityPanel.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/intelligence/AnomalyActivityPanel.tsx): 60-minute real-time anomaly frequency histogram with score thresholds.
    - [`IntelligenceSystemStatus.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/intelligence/IntelligenceSystemStatus.tsx): Multi-subsystem health panel (AIS, ADS-B, ML Ensemble 6/6, GDELT Scraper, WebSocket Hub, PostgreSQL Pool).
    - [`TopRiskEventsPanel.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/intelligence/TopRiskEventsPanel.tsx): Condensed top-5 highest-priority threat ranking dossier.
    - [`VesselActivitySummary.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/intelligence/VesselActivitySummary.tsx): Kinematic distribution breakdown (Transiting, Maneuvering, Anchored, Waiting 6h+).
    - [`IntelligenceDashboard.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/intelligence/IntelligenceDashboard.tsx): Master orchestrator composing domain-specific subcomponents with zero backend egress loops.
  - **Dedicated Feed Architecture (`client/src/components/feed/`):**
    - [`FeedPage.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/feed/FeedPage.tsx): Master dispatch wire orchestrator.
    - [`FeedToolbar.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/feed/FeedToolbar.tsx): Header strip with buffer count, data freshness, and manual wire refresh.
    - [`FeedFilters.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/feed/FeedFilters.tsx): Segmented type selectors (ALL, ANOMALIES, CONFLICTS, OSINT NEWS, AIS, ADS-B) and severity filters.
    - [`FeedTimeline.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/feed/FeedTimeline.tsx): Chronological unified stream with bounded in-memory buffer (200 items, newest first).
    - [`FeedEvent.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/feed/FeedEvent.tsx): Base tactical card shell with status LED and UTC timestamp.
    - [`AnomalyFeedEvent.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/feed/AnomalyFeedEvent.tsx): Specialized anomaly dispatch with ML deviation reasons and `[MAP]` action.
    - [`NewsFeedEvent.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/feed/NewsFeedEvent.tsx): Specialized OSINT news dispatch with source links.
    - [`ConflictFeedEvent.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/feed/ConflictFeedEvent.tsx): Military conflict dispatch with verification status, casualties, and affected assets.
- [x] **13. Light/Dark Theme Synchronization & Layout Refinement**
  - **Synchronized Global Theme Variables ([`globals.css`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/styles/globals.css)):**
    - High-contrast Light Mode palette (Tactical Steel `#e2e8f0`, elevated `#cbd5e1`, card `#f8fafc`, input `#ffffff`, border `#94a3b8`, text `#0f1724`) and Dark Mode palette (Command Steel `#090d14`, elevated `#101724`, card `#0c1322`, border `#1f2c40`, text `#f1f5f9`).
    - Multi-theme tactical utility definitions (`tactical-beveled`, `tactical-recessed`, `tactical-header-strip`) delivering crisp beveling and rim lighting across both theme states.
    - Standardized robust font fallback chains (`Share Tech`, `Inter`, `JetBrains Mono`).
  - **Page Switching Tabs & Navigation ([`HomeTopBar.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/home/HomeTopBar.tsx), [`navbar.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/ui/navbar.tsx)):**
    - Refactored page tabs to use semantic theme tokens (`bg-[var(--color-bg-card)]`, `text-[var(--color-primary-600)]`, `border-[var(--color-border-strong)]`, `hover:bg-[var(--color-bg-hover)]`).
    - Decoupled hardcoded dark navbar colors in favor of responsive elevated surfaces.
  - **Intel Console Layout & Width Refinement ([`IntelligenceConsole.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/components/intelligence/IntelligenceConsole.tsx), [`home.tsx`](file:///home/tp24/SHARED/Projects/HormuzWatch/client/src/app/routes/public/home.tsx)):**
    - Increased default sidebar width from 240px to 285px (`260px–440px` clamp boundaries) to ensure tab headers (`ZONES (9)`, `NOTES (15)`, `LEGEND`) and status tags render cleanly with zero clipping.
    - Updated Intel Console header, tabs, and zone action rows to use variable theme tokens.
  - **Live Production Deployment:**
    - Verified clean client build and deployed to VM container `hormuzwatch-client-dev`.
    - Live verified at `https://hormuzwatch.aburcloud.com` with `HTTP/2 200 OK`.


