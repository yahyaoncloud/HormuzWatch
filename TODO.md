# HormuzWatch — Master Engineering Roadmap & DevOps / MLOps Backlog

## 0. Infrastructure & Topology Overview

- **CI/CD Controller Node (`tunkstun`):**
  - Host IP: `100.126.193.36` (Tailscale) / `192.168.1.46` (LAN)
  - Role: Jenkins Master (Java 21 LTS, Port `:8085`), Artifact Linters, SAST, Security Scanners
  - Workload State: Dedicated CI runner (No application containers hosted here)
- **Production Workload Edge Node (`E5530` / `late5530`):**
  - Host IP: `100.66.64.31` (Tailscale)
  - Public Ingress: `https://hormuzwatch.aburcloud.com` (Nginx reverse proxy + SSL)
  - Deployed Services:
    - React Frontend Client: `:3000`
    - Go Backend Server: `:10020`
    - Python ML Service: `:8090` (HTTP) / `:8091` (gRPC)
    - PostgreSQL 16 Alpine: `:5433` -> `:5432`
    - Prometheus (`:9090`) & Grafana (`:3001`)
- **Reference Specifications:**
  - [`docs/study/11_complete_devops_pipeline_end_to_end_report.md`](file:///home/yahya/SHARED/Projects/HormuzWatch/docs/study/11_complete_devops_pipeline_end_to_end_report.md)
  - [`docs/study/12_graceful_shutdown_and_cold_start_runbook.md`](file:///home/yahya/SHARED/Projects/HormuzWatch/docs/study/12_graceful_shutdown_and_cold_start_runbook.md)
  - [`docs/study/13_critical_issue_analysis_and_devops_audit_report.md`](file:///home/yahya/SHARED/Projects/HormuzWatch/docs/study/13_critical_issue_analysis_and_devops_audit_report.md)
  - [`docs/study/DEVOPS_CHAT_SESSION_TRANSCRIPT.md`](file:///home/yahya/SHARED/Projects/HormuzWatch/docs/study/DEVOPS_CHAT_SESSION_TRANSCRIPT.md)

---

## 1. Track A: DevOps CI/CD Pipeline Remediation (Phased Implementation)

### Phase 1: Critical Hotfixes & Quality Enforcement (Immediate / In-Progress)
- [x] **AUDIT-03 (Fix Rollback Target):** Patch [`Jenkinsfile`](file:///home/yahya/SHARED/Projects/HormuzWatch/Jenkinsfile) to remotely query target host `E5530` (`git rev-parse HEAD`) *prior* to rollout. Ensures failures roll back to the previously stable running commit instead of re-checking out the broken commit.
- [x] **AUDIT-02 (Strict Go Test Gate):** Remove `|| true` from `go test -v ./...` in the backend verification stage. Unit test failures now strictly abort the build.
- [x] **AUDIT-01 (Remote Container Rebuild):** Add `--build --remove-orphans` to `Zero-Downtime Rollout` and post-failure rollback on `E5530` so git updates actually rebuild images rather than executing stale container caches.
- [x] **AUDIT-02 (Enforce Blocking Security Gates):**
  - Configured Trivy to fail on Critical container CVEs (`--exit-code 1 --severity CRITICAL`).
  - Added repository-wide `.gitleaks.toml` allowlist, sanitized test fixtures, and enforced blocking Gitleaks scan without `|| true`.
  - Configured Python Bandit with venv exclusions to fail on high-confidence security flaws (`-ll -ii`), resolving all B104, B108, and B310 issues across `mlops` and `service/ml-service`.
- [x] **AUDIT-05 (Edge Environment Sanitization):**
  - Updated [`Jenkinsfile`](file:///home/yahya/SHARED/Projects/HormuzWatch/Jenkinsfile) `COMPOSE_FILE` to use hardened production compose configuration (`docker-compose.yml`) instead of dev compose.
  - Enabled release-mode security defaults (`GIN_MODE=release`, `AUTH_DISABLED=false`) preventing stack trace disclosure and enforcing API authorization.
  - Aligned production database service and network definitions.

### Phase 2: Architectural Realignment & Artifact Delivery (Medium Term)
- [ ] **AUDIT-01 (OCI Container Registry Integration - GHCR):**
  - Eliminate the "Ghost Build" disconnect between `tunkstun` and `E5530`.
  - Authenticate Jenkins with GitHub Container Registry (`ghcr.io/yahyaoncloud/hormuzwatch-*`).
  - Build, tag (`:${GIT_COMMIT}`), scan with Trivy, and push images from `tunkstun`.
  - Update deployment on `E5530` to pull signed, immutable image digests directly from GHCR (zero builds on edge hardware).
- [ ] **AUDIT-06 (True Zero-Downtime Blue/Green Rollout):**
  - Replace in-place `docker compose up -d` container restarts with Blue/Green deployment slots.
  - Provision dual service groups: Blue (`:10020`, `:8090`, `:3000`) and Green (`:10022`, `:8092`, `:3002`).
  - Orchestrate rolling cutover: Start Green -> Probe health until ML models warm up -> Atomically switch Nginx upstream proxy on `E5530` -> Gracefully terminate Blue.
  - Eliminates the 10–25s `502 Bad Gateway` window during model weight loading.
- [ ] **AUDIT-08 (Automated Database Schema Migrations):**
  - Integrate `golang-migrate` CLI step into Jenkins pipeline prior to service rollout.
  - Version-control relational schema migrations under `server/migrations/`.
  - Implement automated down-migration step inside post-failure rollback block.

### Phase 3: Infrastructure Hardening & Resilience (Long Term)
- [ ] **AUDIT-04 (Eliminate Host Docker Socket Mounting):**
  - Remove `/var/run/docker.sock` mount from Jenkins master container on `tunkstun`.
  - Migrate container builds to rootless build systems (e.g. Kaniko, Buildah, or ephemeral isolated DinD agents).
  - Enforce least-privilege non-root execution inside build containers.
- [ ] **AUDIT-07 (Decouple Ingress & Eliminate Circular Mesh SPOF):**
  - Move GitHub webhook ingress away from edge host `E5530` to a dedicated ingress proxy / Cloudflare Worker pointing directly to `tunkstun:8085`.
  - Decouples CI trigger availability from target node health (if `E5530` crashes, Jenkins remains reachable to deploy fixes).
  - Implement automated SSH fallback routes if Tailscale connection is degraded.
- [ ] **Jenkins Controller/Agent Decoupling:**
  - Convert monolithic Jenkins setup to Master/Agent architecture.
  - Offload linters (Go, Node, Python) into ephemeral containerized agents to keep the controller clean.

---

## 2. Track B: MLOps, Continuous Training (CT) & Model Management

- [x] **Dedicated MLOps Directory Structure:** Consolidated all MLOps assets into [`mlops/`](file:///home/yahya/SHARED/Projects/HormuzWatch/mlops/) with root backward-compatibility symlinks (`data`, `models`, `notebooks`, `pipeline`).
- [x] **DVC Dataset Versioning:** Initialized DVC repository tracking (`.dvc/`, `.dvcignore`, `dvc.yaml`) linked to MinIO S3 object storage at `s3://hormuzwatch-datasets` (`http://localhost:9000`).
- [x] **Interactive Jupyter Experimentation Suite:** Created 6 specialized notebooks in [`mlops/notebooks/`](file:///home/yahya/SHARED/Projects/HormuzWatch/mlops/notebooks/):
  1. `01_maritime_vessel_anomaly.ipynb` (Dual-Path IF + LOF with Isotonic Calibration)
  2. `02_aviation_anomaly.ipynb` (Kinematic radar anomaly detection)
  3. `03_chokepoint_blockade_transit.ipynb` (Strait of Hormuz congestion & transit bottleneck analysis)
  4. `04_geopolitical_news_and_conflict.ipynb` (GDELT 2.0 & RSS OSINT conflict forecasting)
  5. `05_geospatial_heatmap_fusion.ipynb` (Kernel Density Estimation & risk heatmap surface)
  6. `06_statistical_drift_and_ct_loop.ipynb` (Population Stability Index & Kolmogorov-Smirnov drift loop)
- [x] **ZenML Pipeline Orchestration:** Implemented modular DAGs in `mlops/pipeline/zenml/` (`setup_zenml_stack.sh`, `run.py`, data loading, training, evaluation, drift detection, deployment).
- [x] **Fine-Grained Slice-Based Evaluation:** Built [`mlops/models/evaluations/slice_evaluator.py`](file:///home/yahya/SHARED/Projects/HormuzWatch/mlops/models/evaluations/slice_evaluator.py) assessing vessel types, geofences, and diurnal navigation slices to prevent masked aggregate degradation.
- [x] **Cryptographic Model & Dataset Manifests:** Added SHA-256 verification via `scripts/model_registry.py verify` and `scripts/dataset_registry.py list`.
- [x] **Automated Event-Driven Drift Remediation:** Implemented asymptotic KS p-value and rolling-window PSI monitoring ($PSI \ge 0.20$, $p < 0.01$) in [`service/ml-service/lib/drift.py`](file:///home/yahya/SHARED/Projects/HormuzWatch/service/ml-service/lib/drift.py) with cooldown-throttled background retraining dispatch and `POST /drift/remediate/{domain}` API.
- [x] **Deep Learning Autoencoder Anomaly Scoring:** Implemented [`mlops/pipeline/train_autoencoder.py`](file:///home/yahya/SHARED/Projects/HormuzWatch/mlops/pipeline/train_autoencoder.py) and trained semi-supervised corridor reconstruction autoencoder [`service/ml-service/models/vessel_autoencoder.joblib`](file:///home/yahya/SHARED/Projects/HormuzWatch/service/ml-service/models/vessel_autoencoder.joblib), cryptographically verified in manifest.
- [x] **Multi-Chokepoint Expansion:** Replicated geofence models and transit tracking for Bab el-Mandeb (`AREA-RS-SOUTH`), Suez Approach (`AREA-RS-NORTH`), and Malacca Strait (`AREA-MALACCA`) in [`server/internal/anomaly/geofence.go`](file:///home/yahya/SHARED/Projects/HormuzWatch/server/internal/anomaly/geofence.go) and ArcGIS ingest.

---

## 3. Track C: Server Reliability & Telemetry Architecture

- [x] **HTTP 429 Prevention & Upstream Leniency:**
  - Implemented quota-compliant polling schedules (4.5 min anonymous, 2.5 min auth) in [`server/internal/integrations/opensky.go`](file:///home/yahya/SHARED/Projects/HormuzWatch/server/internal/integrations/opensky.go).
  - Added HTTP 429 `Retry-After` header parsing with exponential backoff and jitter.
- [x] **Kinematic Dead-Reckoning Extrapolation:** Added 15-second dead-reckoning projection to interpolate missing ADS-B radar observations without dropping tracks.
- [x] **In-Memory Time-Shifted Playback Buffer:**
  - Built [`PlaybackBuffer`](file:///home/yahya/SHARED/Projects/HormuzWatch/server/internal/intelligence/playback.go) with configurable pre-gather delay (default 90 seconds via `PLAYBACK_DELAY_SECONDS`).
  - Pre-gathers live maritime and aviation observations in an in-memory priority queue, releasing mature events into the WebSocket hub to ensure smooth, jitter-free client map rendering.

---

## 4. Track D: Client Global State & Stream Fixation

- [x] **Global Server Status Store:** Built [`client/src/stores/slices/serverStatus.store.ts`](file:///home/yahya/SHARED/Projects/HormuzWatch/client/src/stores/slices/serverStatus.store.ts) tracking connection state (`online`, `streaming`, `buffered_playback`, `reconnecting`, `offline`), signal quality, heartbeat timestamps, and pipeline stages (`ingestion`, `mlEnsemble`, `playbackBuffer`, `storage`).
- [x] **Eliminated Remote Signal Flickering:**
  - Diagnosed root cause: `DataFreshnessIndicator` evaluated raw timestamps with tiny 5s/30s/120s thresholds, misinterpreting the 90s playback buffer as "STALE" and flipping to "OFFLINE".
  - Upgraded [`DataFreshnessIndicator.tsx`](file:///home/yahya/SHARED/Projects/HormuzWatch/client/src/components/common/DataFreshnessIndicator.tsx) to calculate effective age relative to the playback buffer ($Age_{\text{effective}} = \max(0, Age - 90s)$).
  - Added dedicated `buffered` state displaying `STREAMING (90s BUF)` in cyan with steady pulse.
- [x] **Tactical Status Bar & System Health Upgrades:**
  - Updated [`IntelligenceStatusBar.tsx`](file:///home/yahya/SHARED/Projects/HormuzWatch/client/src/components/intelligence/IntelligenceStatusBar.tsx) to render steady `● SERVER: ONLINE`, stream status, and pipeline stage badges (`[INGEST: LIVE] [ML: 6/6 READY] [BUFFER: 90s]`).
  - Updated [`IntelligenceSystemStatus.tsx`](file:///home/yahya/SHARED/Projects/HormuzWatch/client/src/components/intelligence/IntelligenceSystemStatus.tsx) with the `PLAYBACK BUFFER STAGE (90s TIME-SHIFT)` tile and fixated WebSocket streaming status.

---

## 5. Track E: Resolved Critical Bugs & Technical Debt (P0/P1)

- [x] **P0 — ML Inference REST Service 500 Crash:** Fixed `service/ml-service/app.py` by converting Pydantic `VesselFeatures` to numpy array with canonical feature names passed to `score()` and `global_drift_monitor`.
- [x] **P0 — CT Pipeline Deploy Script CLI Args:** Fixed `mlops/pipeline/deploy_candidate.py` to support `--validate-only`, `--execute`, and `--domain [domain]`.
- [x] **P0 — Jenkins Java 17 EOL Upgrade:** Upgraded Jenkins container from `jenkins/jenkins:lts-jdk17` to `jenkins/jenkins:lts-jdk21` (Java 21 LTS).
- [x] **P1 — Statistical Drift Monitor Config Mismatch:** Aligned `ks_test_alpha` and `ks_alpha` across `mlops/pipeline/drift_monitor.py` and `config.py`.
- [x] **P1 — Feature Extractor DB Config Fallback:** Added `db_url` and `min_samples_for_retrain` to `MLOpsConfig`.
- [x] **P1 — Model Registry Logger String Formatting:** Replaced Go format specifier `%v` with `%s` in `service/ml-service/core/registry.py`.
- [x] **P1 — Compose Core Volume Mount:** Added `- ./service/ml-service/core:/app/core:ro` to `docker-compose.dev.yml`.

---

## 6. Track F: Codebase Security, Concurrency & Technical Debt (Audit Findings)

Reference: [`docs/study/14_codebase_architectural_and_security_audit_report.md`](file:///home/yahya/SHARED/Projects/HormuzWatch/docs/study/14_codebase_architectural_and_security_audit_report.md)

### Critical & High Priority Security (P0/P1)
- [x] **CODE-01 (Eliminate Insecure Fallback Secrets):** Hardened [`server/internal/auth/jwt.go`](file:///home/yahya/SHARED/Projects/HormuzWatch/server/internal/auth/jwt.go) to strictly require `JWT_SECRET` in release mode, rejecting silent fallback to insecure strings.
- [x] **CODE-02 (Strict Cryptographic Model Gating):** Patched [`service/ml-service/app.py`](file:///home/yahya/SHARED/Projects/HormuzWatch/service/ml-service/app.py) to reject `joblib.load()` and raise a fatal `ValueError` if SHA-256 hash fails against `registry_manifest.json` or `manifest.json`.
- [x] **CODE-03 (Server-Side Admin Role Enforcement):** Removed hardcoded personal admin email whitelists (`ykinwork1@gmail.com`) from [`client/src/environments/environment.ts`](file:///home/yahya/SHARED/Projects/HormuzWatch/client/src/environments/environment.ts) and [`client/src/app/routes/admin/watchlist.tsx`](file:///home/yahya/SHARED/Projects/HormuzWatch/client/src/app/routes/admin/watchlist.tsx), transitioning to environment variables and server-issued role verification.
- [x] **CODE-05 (Fix WebSocket Hub Race Condition & Channel Panic):** In [`server/internal/websocket/hub/hub.go`](file:///home/yahya/SHARED/Projects/HormuzWatch/server/internal/websocket/hub/hub.go), eliminated asynchronous goroutine channel closures. Evicts slow clients synchronously within the single-threaded `Run()` select loop under mutex lock.
- [x] **CODE-06 (Sanitize FastAPI CORS Configuration):** In [`service/ml-service/app.py`](file:///home/yahya/SHARED/Projects/HormuzWatch/service/ml-service/app.py), disallowed `allow_credentials=True` when `allow_origins=["*"]`.

### Performance, Persistence & Reliability (P1/P2)
- [x] **CODE-04 (Extract Database DDL to Migrations):** Removed synchronous `CREATE TABLE` and `ALTER TABLE` blocks from [`server/internal/db/db.go`](file:///home/yahya/SHARED/Projects/HormuzWatch/server/internal/db/db.go). Implemented transactional, versioned migration runner in [`server/migrations/migrations.go`](file:///home/yahya/SHARED/Projects/HormuzWatch/server/migrations/migrations.go) with embedded `000001_initial_schema.up.sql` tracking via `schema_migrations`.
- [x] **CODE-07 (Bounded LRU Cache & Rate Limiting):** In [`server/internal/api/middleware.go`](file:///home/yahya/SHARED/Projects/HormuzWatch/server/internal/api/middleware.go), capped `cacheMap` (2,000 items) and `visitors` (10,000 items) with background eviction to prevent memory exhaustion DoS.
- [x] **CODE-08 (Telemetry Bulk Micro-Batching):** Implemented `PersistTelemetryBatch` in [`server/internal/db/telemetry.go`](file:///home/yahya/SHARED/Projects/HormuzWatch/server/internal/db/telemetry.go) and asynchronous non-blocking `persistenceBatcher` in [`server/internal/intelligence/pipeline.go`](file:///home/yahya/SHARED/Projects/HormuzWatch/server/internal/intelligence/pipeline.go) (500ms / 100-record flushes).
- [x] **CODE-09 (Global React Error Boundary):** Implemented tactical cyber `<ErrorBoundary>` component in [`client/src/components/common/ErrorBoundary.tsx`](file:///home/yahya/SHARED/Projects/HormuzWatch/client/src/components/common/ErrorBoundary.tsx) and wrapped root application in [`client/src/main.tsx`](file:///home/yahya/SHARED/Projects/HormuzWatch/client/src/main.tsx).
