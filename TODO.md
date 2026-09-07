# HormuzWatch — Production-Grade Roadmap & Master Engineering Backlog
 
## 0. Master Strategic Initiative: Dual-Track DevOps & MLOps Program

Reference Specification: [`docs/plan/DEVOPS_AND_MLOPS_SRE_PLANNING_MINDMAP.md`](file:///run/media/tp24/SHARED1/Projects/HormuzWatch/docs/plan/DEVOPS_AND_MLOPS_SRE_PLANNING_MINDMAP.md)  
Theoretical Basis: *The DevOps Handbook (2nd Ed.)* & *Designing Machine Learning Systems* in [`books/`](file:///run/media/tp24/SHARED1/Projects/HormuzWatch/books/)

### Track A: DevOps, Continuous Delivery (CI/CD) & SRE
- [x] **Assessment & Hotfix:** Audit existing GitHub Actions workflows (`deploy.yml`, `server-pipeline.yml`, etc.) and align host paths / user (`tp24@tunkstun`).
- [ ] **Open-Source Telemetry Overlay:** Deploy `docker-compose.monitoring.yml` on `tunkstun` with Prometheus (`:9090`), Node Exporter (`:9100`), and cAdvisor (`:8080`).
- [ ] **Grafana SRE Dashboard:** Configure Grafana (`:3001`) with host hardware panels, container memory/CPU throttling, and Go API request duration histograms.
- [ ] **DevSecOps in CI:** Integrate Aqua Security `trivy` container scanning and `govulncheck` into `.github/workflows/deploy.yml` and `server-pipeline.yml`.
- [ ] **SRE Error Budget & Alerting:** Define SLIs/SLOs (99.9% uptime, p95 <= 50ms) and configure Discord/Slack/email alerts on error budget burn.

### Track B: MLOps, Continuous Training (CT) & Drift Feedback Loop
- [x] **Pipeline Foundation:** Establish weekly CT schedule and drift-triggered `repository_dispatch` in `.github/workflows/ml-continuous-training.yml`.
- [ ] **Open-Source Experiment Tracking:** Deploy self-hosted `mlflow` tracking server on `tunkstun` for experiment logging, artifact storage, and model versioning.
- [ ] **Data Contracts & Leakage Prevention:** Codify schema enforcement and chronological splits (70/15/15) in historical dataset generation (`docs/DATASET_RUNBOOK.md`).
- [ ] **Automated Model Gatekeeper:** Enforce hard gating assertion (`PR-AUC >= 0.90`, `FPR <= 0.05`, `p95 <= 12ms`) before promoting candidate models.
- [ ] **Drift Telemetry with Evidently AI:** Export feature distribution drift (PSI / Wasserstein distance) to Prometheus to automatically trigger retraining pipelines.

---

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

---

## 14. MLOps Continuous Training (CT), Core Systems Optimization & Workstation Portability (Updated: 2026-09-05)

### 14.1. Domain: Concrete MLOps Pipeline & Automated CI/CD/CT
- [x] **Architecture Specification & Tooling Stack Selection**  
  Documented complete CI/CD/CT lifecycle in [`docs/plan/01_MLOPS_AND_CICD_CT_PIPELINE.md`](file:///home/tp24/SHARED/Projects/HormuzWatch/docs/plan/01_MLOPS_AND_CICD_CT_PIPELINE.md). Integrated DVC for versioned split tracking, MLflow for experiment tracking and registry, Optuna for Bayesian HPO, and Scipy/Evidently for distribution drift.
- [x] **Continuous Training GitHub Actions Workflow**  
  Created [`.github/workflows/ml-continuous-training.yml`](file:///home/tp24/SHARED/Projects/HormuzWatch/.github/workflows/ml-continuous-training.yml) supporting scheduled runs (`0 2 * * 0`), data-drift repository dispatch triggers (`PSI > 0.20`), and manual `workflow_dispatch`.
- [ ] **Automated Evaluation Gatekeeper & Cryptographic Manifest Validation**  
  Enforce strict threshold gates in pipeline runner: PR-AUC $\ge 0.90$, Expected Calibration Error $\le 0.10$, and P95 latency $\le 12.0\text{ms}$. Generate signed SHA-256 digests in `models/manifest.json`.
- [ ] **Zero-Downtime Hot-Reload Hook**  
  Automate atomic pointer swap on `POST /models/reload` across live gRPC worker processes on `tunkstun` without dropping in-flight telemetry packets.

### 14.2. Domain: ML Anomaly Detection Model Experimentation (`/server/datasets` on Jupyter Notebook)
- [x] **Experimentation Protocol & Comparative Metric Formulation**  
  Formulated benchmarking protocol in [`docs/plan/02_ML_MODEL_EXPERIMENTATION_AND_BENCHMARKING.md`](file:///home/tp24/SHARED/Projects/HormuzWatch/docs/plan/02_ML_MODEL_EXPERIMENTATION_AND_BENCHMARKING.md) addressing $\approx 3.2\%$ class imbalance, PR-AUC, F1-scores, and single-sample latency.
- [x] **Interactive Jupyter Benchmark Notebook**  
  Authored [`notebooks/ml_anomaly_detection_experiments.ipynb`](file:///home/tp24/SHARED/Projects/HormuzWatch/notebooks/ml_anomaly_detection_experiments.ipynb) connecting to `/server/datasets/` and `server/datasets/`. Implemented comparative pipelines for:
  - Isolation Forest (tree path length)
  - Local Outlier Factor (density novelty)
  - One-Class SVM (RBF kernel boundary)
  - Elliptic Envelope (Mahalanobis distance)
  - Reconstruction Autoencoder (SVD/PCA latent bottleneck)
  - Supervised Random Forest baseline
- [ ] **Execute Notebook & Record Pareto-Optimal Frontier**  
  Run full evaluation across all 153,052 vessel rows and 22,000 aircraft rows; record Pareto-optimal tradeoffs between PR-AUC and CPU latency; export candidate weights.

### 14.3. Domain: Pluggable & Extensible Python ML Service Base Architecture
- [x] **Core Abstract Base Class (`BaseAnomalyModel`)**  
  Created [`service/ml-service/core/base_model.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/service/ml-service/core/base_model.py) defining standard interfaces for `train()`, `predict()`, `explain()`, `save()`, `load()`, and `get_metadata()`.
- [x] **Dynamic Model Registry & Auto-Discovery (`ModelRegistry`)**  
  Created [`service/ml-service/core/registry.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/service/ml-service/core/registry.py) with `@ModelRegistry.register("name")` decorator and dynamic plugin discovery.
- [x] **Pluggable Ensemble Engine (`PluggableEnsemble`)**  
  Created [`service/ml-service/core/ensemble.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/service/ml-service/core/ensemble.py) providing weighted averaging, max gating, voting, and Isotonic calibration.
- [x] **Plug-and-Play Model Adapters**  
  Implemented modular adapters in `service/ml-service/core/models/`:
  - [`isolation_forest.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/service/ml-service/core/models/isolation_forest.py)
  - [`local_outlier_factor.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/service/ml-service/core/models/local_outlier_factor.py)
  - [`autoencoder.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/service/ml-service/core/models/autoencoder.py)
  Verified that new models register and instantiate with zero changes to existing dispatchers.

### 14.4. Domain: High-Performance Go Server Refinement (Memory, Pooling & Caching)
- [x] **Go Server Performance Architecture Specification**  
  Documented optimization blueprint in [`docs/plan/04_HIGH_PERFORMANCE_GO_SERVER_AND_DEDICATED_DATASET_WORKER.md`](file:///home/tp24/SHARED/Projects/HormuzWatch/docs/plan/04_HIGH_PERFORMANCE_GO_SERVER_AND_DEDICATED_DATASET_WORKER.md).
- [x] **Zero-Allocation In-Place Sliding Window Moments**  
  Eliminated dynamic `allSpeeds` slice allocations in `server/internal/intelligence/state.go`'s `computeDeltas`. Benchmark verified: latency dropped by ~27% (1,214ns -> 881.5ns), memory allocations cut by >57% (301 B/op -> 127 B/op), and allocations per update reduced from 2 to 1.
- [ ] **Fixed-Size Circular Ring Buffer Implementation**  
  Replace dynamic slice `History = append(s.History[1:], obs)` with fixed `[20]Observation` ring buffer in `server/internal/intelligence/state.go` to achieve zero heap allocations per telemetry frame.
- [ ] **Sharded Concurrency Map for TrackStateManager**  
  Partition single `sync.RWMutex` into 32 independent shards indexed by `FNV-1a(TrackID)` to eliminate global lock contention between live sensor ingestion and WebSocket reads.
- [ ] **Zero-Allocation Object Pooling with `sync.Pool`**  
  Introduce `sync.Pool` for JSON buffers, telemetry packet structs, and gRPC payload builders to reduce garbage collector invocation frequency.
- [x] **Axis-Aligned Bounding Box (AABB) Spatial Filter**  
  Optimized `IsNearHistoricalAttack` in [`server/internal/geo/attack.go`](file:///home/tp24/SHARED/Projects/HormuzWatch/server/internal/geo/attack.go) with $O(1)$ coordinate min/max bounding box pre-filtering and squared Euclidean distance, completely eliminating expensive `math.Pow` and `math.Sqrt` calls on every telemetry check.

### 14.5. Domain: Dedicated Dataset Creation Server & Decoupled ETL Engine
- [x] **Decoupled Architecture Specification**  
  Designed standalone dataset worker separation to eliminate CPU, memory, and database pool starvation on core operational server.
- [x] **Standalone Dataset Worker Container (`Dockerfile.dataset-worker`)**  
  Packaged `server/cmd/dataset_generator/main.go` into [`server/Dockerfile.dataset-worker`](file:///home/tp24/SHARED/Projects/HormuzWatch/server/Dockerfile.dataset-worker) and configured dedicated container service in [`docker-compose.yml`](file:///home/tp24/SHARED/Projects/HormuzWatch/docker-compose.yml) and [`docker-compose.dev.yml`](file:///home/tp24/SHARED/Projects/HormuzWatch/docker-compose.dev.yml) with isolated persistent mounts for `/server/datasets/`.
- [ ] **Core Server Decoupling & Cleanup**  
  Deprecate background dataset snapshot scheduling inside `server/internal/bootstrap/app.go`, leaving the Go API server purely dedicated to low-latency HTTP, WebSocket, and gRPC operations.

### 14.6. Domain: Remote Host Automation (`ssh tunkstun`) & Ansible Portability Suite
- [x] **Workstation Portability Specification**  
  Documented full bare-metal to operational node procedure in [`docs/plan/05_INFRASTRUCTURE_AUTOMATION_AND_ANSIBLE_PORTABILITY.md`](file:///home/tp24/SHARED/Projects/HormuzWatch/docs/plan/05_INFRASTRUCTURE_AUTOMATION_AND_ANSIBLE_PORTABILITY.md).
- [x] **Ansible Inventory & Master Playbook**  
  Created [`ansible/inventory.ini`](file:///home/tp24/SHARED/Projects/HormuzWatch/ansible/inventory.ini) and [`ansible/playbooks/site.yml`](file:///home/tp24/SHARED/Projects/HormuzWatch/ansible/playbooks/site.yml).
- [x] **Automated Migration & Portability Playbook**  
  Created [`ansible/playbooks/migrate_station.yml`](file:///home/tp24/SHARED/Projects/HormuzWatch/ansible/playbooks/migrate_station.yml) automating source shutdown, rsync of codebase and `/server/datasets/`, target provisioning, container build, and health verification gates.
- [x] **Modular Ansible Roles**  
  Created:
  - [`ansible/roles/system_prep/tasks/main.yml`](file:///home/tp24/SHARED/Projects/HormuzWatch/ansible/roles/system_prep/tasks/main.yml) (sysctl tuning, ulimits, packages)
  - [`ansible/roles/docker_runtime/tasks/main.yml`](file:///home/tp24/SHARED/Projects/HormuzWatch/ansible/roles/docker_runtime/tasks/main.yml) (Docker CE, compose, log rotation)
  - [`ansible/roles/hormuzwatch_stack/tasks/main.yml`](file:///home/tp24/SHARED/Projects/HormuzWatch/ansible/roles/hormuzwatch_stack/tasks/main.yml) (git sync, build, up -d, health checks)

---

## 15. Implementation Record & Verified Work Done (Updated: 2026-09-05)

### 15.1. Concrete MLOps & CI/CD/CT Pipeline Infrastructure
- [x] **Full MLOps Lifecycle Architecture:** Authored [`docs/plan/01_MLOPS_AND_CICD_CT_PIPELINE.md`](file:///home/tp24/SHARED/Projects/HormuzWatch/docs/plan/01_MLOPS_AND_CICD_CT_PIPELINE.md) documenting the continuous training lifecycle (DVC versioning, Optuna HPO, MLflow registry, PSI/KS drift monitoring, and zero-downtime hot-reload).
- [x] **Autonomous Continuous Training Workflow:** Implemented [`.github/workflows/ml-continuous-training.yml`](file:///home/tp24/SHARED/Projects/HormuzWatch/.github/workflows/ml-continuous-training.yml) supporting weekly cron schedules (`0 2 * * 0`), drift repository dispatch events, and manual triggers.

### 15.2. ML Anomaly Model Experimentation & Benchmark Notebook
- [x] **Experimentation Protocol:** Documented methodology in [`docs/plan/02_ML_MODEL_EXPERIMENTATION_AND_BENCHMARKING.md`](file:///home/tp24/SHARED/Projects/HormuzWatch/docs/plan/02_ML_MODEL_EXPERIMENTATION_AND_BENCHMARKING.md) targeting the 3.2% maritime anomaly class imbalance.
- [x] **Jupyter Benchmark Notebook:** Created [`notebooks/ml_anomaly_detection_experiments.ipynb`](file:///home/tp24/SHARED/Projects/HormuzWatch/notebooks/ml_anomaly_detection_experiments.ipynb) connecting to `/server/datasets/` and `server/datasets/`. Evaluates Isolation Forest, LOF, One-Class SVM, Elliptic Envelope, SVD Reconstruction Autoencoder, and Random Forest baselines with PR-AUC, F1, latency, and Top-50 alert precision.

### 15.3. Pluggable Python ML Service Base Architecture
- [x] **Abstract Base Contract:** Created [`service/ml-service/core/base_model.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/service/ml-service/core/base_model.py) defining `BaseAnomalyModel`, `ModelInferenceOutput`, `FeatureAttribution`, and `ModelMetadata`.
- [x] **Thread-Safe Model Registry:** Created [`service/ml-service/core/registry.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/service/ml-service/core/registry.py) with dynamic `@ModelRegistry.register("name")` decorator and module auto-discovery.
- [x] **Pluggable Ensemble Engine:** Created [`service/ml-service/core/ensemble.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/service/ml-service/core/ensemble.py) supporting weighted averaging, max gating, voting, and Isotonic calibration.
- [x] **Pluggable Model Adapters:** Implemented:
  - [`core/models/isolation_forest.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/service/ml-service/core/models/isolation_forest.py)
  - [`core/models/local_outlier_factor.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/service/ml-service/core/models/local_outlier_factor.py)
  - [`core/models/autoencoder.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/service/ml-service/core/models/autoencoder.py) (Deep SVD/PCA reconstruction bottleneck).
  - Verified import and registration with virtualenv Python (`Registered models: ['isolation_forest', 'local_outlier_factor', 'reconstruction_autoencoder']`).

### 15.4. High-Performance Go Server Memory Optimization (Benchmark Verified)
- [x] **In-Place Zero-Allocation Sliding Window:** Eliminated dynamic slice heap allocations in `server/internal/intelligence/state.go` (`computeDeltas`).
  - **Latency:** Reduced from `1,214 ns/op` to **`881.5 ns/op`** (~27.4% faster).
  - **Memory Allocation:** Reduced from `301 B/op` to **`127 B/op`** (>57.8% memory reduction).
  - **Allocations/Op:** Halved from `2 allocs/op` down to **`1 alloc/op`**.
- [x] **AABB Spatial Pre-Filtering:** Upgraded `IsNearHistoricalAttack` in [`server/internal/geo/attack.go`](file:///home/tp24/SHARED/Projects/HormuzWatch/server/internal/geo/attack.go) with $O(1)$ bounding box pre-filtering and squared Euclidean distance, eliminating `math.Pow` and `math.Sqrt`.
- [x] **Test Verification:** All Go unit and benchmark tests passing (`ok Geospatial-harmuz-watch/server/internal/intelligence`, `ok Geospatial-harmuz-watch/server/internal/geo`).

### 15.5. Dedicated Dataset Creation Server (Decoupled ETL Engine)
- [x] **Dedicated Container:** Created [`server/Dockerfile.dataset-worker`](file:///home/tp24/SHARED/Projects/HormuzWatch/server/Dockerfile.dataset-worker) packaging `server/cmd/dataset_generator/main.go` into a minimal Alpine container.
- [x] **Orchestration Decoupling:** Added `dataset-worker` to [`docker-compose.yml`](file:///home/tp24/SHARED/Projects/HormuzWatch/docker-compose.yml) and [`docker-compose.dev.yml`](file:///home/tp24/SHARED/Projects/HormuzWatch/docker-compose.dev.yml) with isolated persistent mounts for `/server/datasets/`, protecting live API/WebSocket streaming from analytical query spikes.

### 15.6. Remote Host Automation & Live Ansible Execution (`ssh tunkstun`)
- [x] **Ansible Portability Suite:** Created:
  - [`ansible/inventory.ini`](file:///home/tp24/SHARED/Projects/HormuzWatch/ansible/inventory.ini)
  - [`ansible/playbooks/site.yml`](file:///home/tp24/SHARED/Projects/HormuzWatch/ansible/playbooks/site.yml)
  - [`ansible/playbooks/migrate_station.yml`](file:///home/tp24/SHARED/Projects/HormuzWatch/ansible/playbooks/migrate_station.yml)
  - Roles: `system_prep`, `docker_runtime`, `hormuzwatch_stack`.
- [x] **SSH Access Configuration:** Configured passwordless ED25519 key authentication in `~/.ssh/config` and `authorized_keys` for `tunkstun`.
- [x] **Automated Deployment Execution:** Created and executed [`ansible/playbooks/deploy_docker.yml`](file:///home/tp24/SHARED/Projects/HormuzWatch/ansible/playbooks/deploy_docker.yml) via `uv tool run --from ansible-core ansible-playbook`.
- [x] **Live Operational Verification:**
  - Buildx compiled all images (`server`, `ml`, `client`).
  - Multi-container stack started in detached mode.
  - Healthcheck probes verified on Go Backend (`:10020/health/live`), Python ML Engine (`:8090/health`), and Client Nginx (`:3000`).
  - Active telemetry stream verified with **1,285 active tracks** and **0 drops**.
  - Ansible recap: `tunkstun: ok=7 changed=2 unreachable=0 failed=0 skipped=0`.

---

## 16. MLOps Codebase Review & Production Hardening Backlog (*Designing Machine Learning Systems* by Chip Huyen)

Comprehensive action items, architectural alignment, and critical bug fixes identified during the systematic review against Chip Huyen's *Designing Machine Learning Systems* (`books/_OceanofPDF.com_Designing_Machine_Learning_Systems_.../`).

### 16.1. Critical Defects & Immediate Bug Fixes (P0)

- [x] **Priority:** P0  
  **Area:** ML Inference REST Service / Runtime 500 Crash  
  **File:** [`service/ml-service/app.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/service/ml-service/app.py)  
  **Problem:** `POST /api/predict` crashes with HTTP 500 (`TypeError: float() argument must be a string or a real number, not 'VesselFeatures'`). `parse_features` returns a Pydantic model instance which is directly passed to `global_drift_monitor.record_observation` (expects numpy array) and to `score(x=x_arr, track_id=...)` with invalid kwargs (`score` expects positional `feature_array` and `feature_names`).  
  **Fix:** Call `feature_array = features_model.to_array()` and pass canonical `feature_array` and `feature_names` to both `global_drift_monitor.record_observation` and `score()`, matching the working pattern in `grpc_server.py`.

- [x] **Priority:** P0  
  **Area:** Continuous Training Pipeline / CLI Parameter Handling  
  **Files:** [`Jenkinsfile.mlops`](file:///home/tp24/SHARED/Projects/HormuzWatch/Jenkinsfile.mlops), [`pipeline/deploy_candidate.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/pipeline/deploy_candidate.py)  
  **Problem:** `Jenkinsfile.mlops` invokes `python3 pipeline/deploy_candidate.py --validate-only` and `python3 pipeline/deploy_candidate.py --execute`. However, `deploy_candidate.py` reads `sys.argv[1]` as the domain name, crashing immediately with `ValueError: Unknown domain '--validate-only'`.  
  **Fix:** Implement formal `argparse` in `pipeline/deploy_candidate.py` supporting `--domain [domain]`, `--validate-only`, and `--execute`.

### 16.2. Configuration & Integration Defects (P1)

- [x] **Priority:** P1  
  **Area:** Statistical Drift Monitor / Config Attribute Mismatch  
  **File:** [`pipeline/drift_monitor.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/pipeline/drift_monitor.py)  
  **Problem:** Line 58 accesses `config.ks_alpha`, but the field is defined as `ks_test_alpha` in [`pipeline/config.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/pipeline/config.py). Invoking feature drift evaluation raises `AttributeError`.  
  **Fix:** Align attribute name to `config.ks_test_alpha` (or add alias `ks_alpha`).

- [x] **Priority:** P1  
  **Area:** Feature Extractor / Database Fallback Swallowing  
  **Files:** [`pipeline/extract_features.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/pipeline/extract_features.py), [`pipeline/config.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/pipeline/config.py)  
  **Problem:** `extract_features_from_db` references `config.db_url` and `config.min_samples_for_retrain`, which are absent from `MLOpsConfig`. The resulting `AttributeError` is caught by a blanket `except Exception: pass`, silently forcing training pipelines to always use synthetic parametric data instead of PostgreSQL telemetry history.  
  **Fix:** Add `db_url: str = os.getenv("DATABASE_URL", ...)` and `min_samples_for_retrain: int = 500` to `MLOpsConfig`, and add logging for database connection failures.

- [x] **Priority:** P1  
  **Area:** Dynamic Model Registry / String Formatting Exception  
  **File:** [`service/ml-service/core/registry.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/service/ml-service/core/registry.py)  
  **Problem:** Line 80 uses Go format specifier `%v` (`logger.error("Failed to load model module '%s': %v", ...)`), causing a `ValueError: unsupported format character 'v'` upon module discovery errors.  
  **Fix:** Replace `%v` with `%s`.

- [x] **Priority:** P1  
  **Area:** Container Orchestration / Missing Pluggable Core Volume  
  **File:** [`docker-compose.dev.yml`](file:///home/tp24/SHARED/Projects/HormuzWatch/docker-compose.dev.yml)  
  **Problem:** The `ml` service volume mounts mount individual files and `api/` and `lib/`, but omit `./service/ml-service/core:/app/core:ro`. New models or registry modifications in `core/` are not mounted into the dev container.  
  **Fix:** Add `- ./service/ml-service/core:/app/core:ro` to `ml` service volumes.

### 16.3. Advanced MLOps System Evolution (P2 — Architectural Alignment)

- [ ] **Priority:** P2  
  **Area:** Slice-Based Evaluation (Chip Huyen Chapter 6)  
  **Files:** [`pipeline/train_and_evaluate.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/pipeline/train_and_evaluate.py), [`pipeline/benchmark_poc.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/pipeline/benchmark_poc.py)  
  **Objective:** Expand offline evaluation from aggregate PR-AUC to fine-grained slice metrics:
  - Vessel type slices (Cargo, Tanker, Fishing, High-Speed Craft, Military/Law Enforcement).
  - Geofence slices (Hormuz TSS Chokepoint vs Fujairah Offshore Anchorage vs Persian Gulf Basin).
  - Time-of-day / visibility slices (Day vs Night navigation).  
  **Outcome:** Guard against slice-level metric degradation that is hidden by macro-level averages.

- [ ] **Priority:** P2  
  **Area:** Automated Event-Driven Drift Remediation Loop (Chip Huyen Chapters 8 & 9)  
  **Files:** [`service/ml-service/lib/drift.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/service/ml-service/lib/drift.py), [`pipeline/orchestrator.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/pipeline/orchestrator.py)  
  **Objective:** Connect the in-memory rolling drift monitor (`global_drift_monitor`) to an automated webhook / dispatch trigger:
  - When cumulative PSI for any canonical feature exceeds `0.20` or KS $p < 0.01$ over a rolling 1,000-sample window, automatically emit a drift alert and dispatch `run_pipeline_cycle(domain, reason="CRITICAL_DATA_DRIFT")`.
  - Expose Prometheus metrics for per-feature PSI and KS statistics so Prometheus / Alertmanager can track covariate shifts over time.

- [ ] **Priority:** P2  
  **Area:** Unified Pluggable Architecture Migration (Chip Huyen Chapter 10)  
  **Files:** [`service/ml-service/core/ensemble.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/service/ml-service/core/ensemble.py), [`service/ml-service/grpc_server.py`](file:///home/tp24/SHARED/Projects/HormuzWatch/service/ml-service/grpc_server.py)  
  **Objective:** Transition `grpc_server.py` and `app.py` from reading rigid dictionary `.joblib` bundles to natively loading registered `PluggableEnsemble` instances managed via `ModelRegistry`. Allows seamless integration of newly developed models (e.g., `reconstruction_autoencoder`, Deep One-Class Classifiers) without altering serving logic.
