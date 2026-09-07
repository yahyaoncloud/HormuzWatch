# HormuzWatch — Master Engineering Roadmap & DevOps / MLOps Backlog

## 0. Executive Summary & Program Architecture

Reference Specifications:
- [`docs/MLOPS_COMPLETION_REPORT.md`](file:///home/yahya/SHARED/Projects/HormuzWatch/docs/MLOPS_COMPLETION_REPORT.md)
- [`docs/plan/DEVOPS_AND_MLOPS_SRE_PLANNING_MINDMAP.md`](file:///home/yahya/SHARED/Projects/HormuzWatch/docs/plan/DEVOPS_AND_MLOPS_SRE_PLANNING_MINDMAP.md)
- Theoretical Basis: *The DevOps Handbook (2nd Ed.)* & *Designing Machine Learning Systems* in `books/`

Target Deployment Infrastructure:
- Host: `tunkstun` (`192.168.1.46`) Docker Compose Engine (Passwordless SSH via `yahya@192.168.1.46`)
- CI/CD Orchestrator: Jenkins LTS (`service/jenkins/`, Port `8085`)
- Server Ports:
  - React Frontend Client: `http://192.168.1.46:3000`
  - Go Backend Server: `http://192.168.1.46:10020`
  - Python ML Service: `http://192.168.1.46:8090` (HTTP) / `:8091` (gRPC)
  - PostgreSQL 16 Alpine: `http://192.168.1.46:5433` -> `:5432`
  - MinIO S3 Object Store: `http://192.168.1.46:9000` / `:9001`
  - MLflow Registry Server: `http://192.168.1.46:5001`

---

## 1. Track A: DevOps, Continuous Delivery (CI/CD) & SRE

- [x] **Passwordless Remote Authentication:** Configured SSH keys (`id_ed25519_tnkstn`, `id_ed25519_ytp24`, `id_ed25519_yoc`) into `yahya@192.168.1.46:~/.ssh/authorized_keys`. Verified passwordless logins and updated local `~/.ssh/config` for `Host tunkstun`.
- [x] **Declarative Jenkins CI/CD DevOps Pipeline:** Authored [`Jenkinsfile`](file:///home/yahya/SHARED/Projects/HormuzWatch/Jenkinsfile) orchestrating:
  - Baseline capture & automated rollback on failure
  - Parallel pre-flight verification: Python ML telemetry contracts, Go server binary build, React client TypeScript check
  - Multi-service Docker container image build (`server`, `ml`, `client`)
  - Zero-downtime container rollout on `tunkstun`
  - Automated SRE health gate verification (20 attempts probing `:10020`, `:8090`, `:3000`)
  - Post-deployment SRE diagnostic health suite
- [x] **Jenkins Server Infrastructure:** Dockerized Jenkins LTS in [`service/jenkins/`](file:///home/yahya/SHARED/Projects/HormuzWatch/service/jenkins/) with host Docker socket passthrough (configured with GID `984` matching `tunkstun`).
- [x] **Remote Host Deployment (`tunkstun`):** Synchronized codebase via `rsync`, pulled images, built containers, and deployed `server`, `ml`, `postgres`, and `client` on `192.168.1.46`. All containers reporting `healthy` status.
- [x] **Automated Codebase Synchronization:** Configured bidirectional deployment flow between local workstation and `tunkstun`.
- [ ] **Open-Source Telemetry Overlay:** Deploy `docker-compose.monitoring.yml` on `tunkstun` with Prometheus (`:9090`), Node Exporter (`:9100`), and cAdvisor (`:8080`).
- [ ] **Grafana SRE Dashboard:** Configure Grafana (`:3001`) with host hardware panels, container memory/CPU throttling, and Go API request duration histograms.
- [ ] **DevSecOps in CI:** Integrate Aqua Security `trivy` container scanning and `govulncheck` into pipeline.

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
- [x] **Continuous Training (CT) Loop:** Integrated `Jenkinsfile.mlops` for scheduled weekly retraining and drift-triggered pipeline runs.

---

## 3. Server Rate-Limit Leniency & Playback Buffer Architecture

- [x] **HTTP 429 Prevention & Upstream Leniency:**
  - Implemented quota-compliant polling schedules (4.5 min anonymous, 2.5 min auth) in [`server/internal/integrations/opensky.go`](file:///home/yahya/SHARED/Projects/HormuzWatch/server/internal/integrations/opensky.go).
  - Added HTTP 429 `Retry-After` header parsing with exponential backoff and jitter.
- [x] **Kinematic Dead-Reckoning Extrapolation:** Added 15-second dead-reckoning projection to interpolate missing ADS-B radar observations without dropping tracks.
- [x] **In-Memory Time-Shifted Playback Buffer:**
  - Built [`PlaybackBuffer`](file:///home/yahya/SHARED/Projects/HormuzWatch/server/internal/intelligence/playback.go) with configurable pre-gather delay (default 90 seconds via `PLAYBACK_DELAY_SECONDS`).
  - Pre-gathers live maritime and aviation observations in an in-memory priority queue, releasing mature events into the WebSocket hub to ensure smooth, jitter-free client map rendering.

---

## 4. Client Global State & Stream Fixation

- [x] **Global Server Status Store:** Built [`client/src/stores/slices/serverStatus.store.ts`](file:///home/yahya/SHARED/Projects/HormuzWatch/client/src/stores/slices/serverStatus.store.ts) tracking connection state (`online`, `streaming`, `buffered_playback`, `reconnecting`, `offline`), signal quality, heartbeat timestamps, and pipeline stages (`ingestion`, `mlEnsemble`, `playbackBuffer`, `storage`).
- [x] **Eliminated Remote Signal Flickering:**
  - Diagnosed root cause: `DataFreshnessIndicator` evaluated raw timestamps with tiny 5s/30s/120s thresholds, misinterpreting the 90s playback buffer as "STALE" and flipping to "OFFLINE".
  - Upgraded [`DataFreshnessIndicator.tsx`](file:///home/yahya/SHARED/Projects/HormuzWatch/client/src/components/common/DataFreshnessIndicator.tsx) to calculate effective age relative to the playback buffer ($Age_{\text{effective}} = \max(0, Age - 90s)$).
  - Added dedicated `buffered` state displaying `STREAMING (90s BUF)` in cyan with steady pulse.
- [x] **Tactical Status Bar & System Health Upgrades:**
  - Updated [`IntelligenceStatusBar.tsx`](file:///home/yahya/SHARED/Projects/HormuzWatch/client/src/components/intelligence/IntelligenceStatusBar.tsx) to render steady `● SERVER: ONLINE`, stream status, and pipeline stage badges (`[INGEST: LIVE] [ML: 6/6 READY] [BUFFER: 90s]`).
  - Updated [`IntelligenceSystemStatus.tsx`](file:///home/yahya/SHARED/Projects/HormuzWatch/client/src/components/intelligence/IntelligenceSystemStatus.tsx) with the `PLAYBACK BUFFER STAGE (90s TIME-SHIFT)` tile and fixated WebSocket streaming status.

---

## 5. Resolved Critical Bugs & Technical Debt (P0/P1)

- [x] **P0 — ML Inference REST Service 500 Crash:** Fixed `service/ml-service/app.py` by converting Pydantic `VesselFeatures` to numpy array with canonical feature names passed to `score()` and `global_drift_monitor`.
- [x] **P0 — CT Pipeline Deploy Script CLI Args:** Fixed `mlops/pipeline/deploy_candidate.py` to support `--validate-only`, `--execute`, and `--domain [domain]`.
- [x] **P1 — Statistical Drift Monitor Config Mismatch:** Aligned `ks_test_alpha` and `ks_alpha` across `mlops/pipeline/drift_monitor.py` and `config.py`.
- [x] **P1 — Feature Extractor DB Config Fallback:** Added `db_url` and `min_samples_for_retrain` to `MLOpsConfig`.
- [x] **P1 — Model Registry Logger String Formatting:** Replaced Go format specifier `%v` with `%s` in `service/ml-service/core/registry.py`.
- [x] **P1 — Compose Core Volume Mount:** Added `- ./service/ml-service/core:/app/core:ro` to `docker-compose.dev.yml`.

---

## 6. Future Expansion Roadmap

- [ ] **Automated Event-Driven Drift Remediation:** Automatically trigger CT pipelines when cumulative PSI exceeds 0.20 or KS p < 0.01 over rolling 1,000-sample window.
- [ ] **Deep Learning Autoencoder Anomaly Scoring:** Train semi-supervised reconstruction autoencoder on normal transit corridor coordinates.
- [ ] **Multi-Chokepoint Expansion:** Replicate model architecture for Bab el-Mandeb and the Strait of Malacca.
