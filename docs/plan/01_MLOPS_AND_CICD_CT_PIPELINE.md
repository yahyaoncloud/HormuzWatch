# 🚀 MLOps & CI/CD/CT Concrete Pipeline Architecture

> **Date:** September 5, 2026  
> **Status:** Implementation Blueprint  
> **Author:** HormuzWatch Engineering  

---

## 1. Executive Summary & Objective

In geospatial maritime and aviation monitoring, the operational environment is inherently non-stationary. Hydrodynamic conditions, shifting naval blockade zones, geopolitical confrontations in the Strait of Hormuz, and coastal receiver telemetry noise cause continuous data and concept drift.

This specification details the **Concrete MLOps Pipeline** and **GitHub Actions DevOps Infrastructure** enabling complete **CI/CD/CT**:
* **CI (Continuous Integration):** Automated multi-stage linting, type validation, unit testing, and integration verification for Client (React 19), Server (Go 1.24), and ML Engine (Python 3.11).
* **CD (Continuous Deployment):** Automated container build, vulnerability scanning, atomic deployment over SSH to on-premise workstation `tunkstun`, healthcheck gates, and automatic rollback on failure.
* **CT (Continuous Training):** Closed-loop, autonomous retraining triggered by data drift or schedule, managed by DVC, Optuna, MLflow, strict quality gates, and zero-downtime model hot-reloading.

---

## 2. CI/CD/CT Architectural Flow

```mermaid
flowchart TD
    subgraph Data Tier & Versioning
        DB[(PostgreSQL TimescaleDB)] --> Exporter[Dedicated Dataset Worker]
        Exporter --> Parquet[Compressed Parquet Splits]
        Parquet --> DVC[DVC: Remote S3 / Local Cache]
    end

    subgraph Continuous Training (CT) Pipeline
        DVC --> Splitter[Grouped MMSI Stratified Splitter]
        Splitter --> Optuna[Optuna Bayesian HPO Engine]
        Optuna --> Train[Model Training: IF, LOF, Autoencoder, XGBoost]
        Train --> Calibrator[Isotonic Quantile Calibrator]
        Calibrator --> Gatekeeper{Automated Quality Gate<br/>PR-AUC >= 0.90<br/>ECE <= 0.10<br/>Latency <= 12ms}
    end

    subgraph Model Registry & Release
        Gatekeeper -- Passes --> Signer[SHA-256 Hasher & Manifest Builder]
        Signer --> MLflow[(MLflow Model Registry)]
        MLflow --> Release[Release Candidate Bundle]
    end

    subgraph Continuous Deployment (CD) & Production
        Release --> HotReload[Zero-Downtime Hot Reloader: POST /models/reload]
        HotReload --> LiveService[Python ML Service :8090 / :8091]
        LiveService --> DriftMonitor[Drift Monitor: PSI & KS-Test]
        DriftMonitor -- "PSI > 0.20 or KS p < 0.01" --> Trigger[CT Retrain Trigger]
        Trigger --> Optuna
    end
```

---

## 3. Concrete Tooling Stack

| Function | Tool | Operational Role in HormuzWatch |
| :--- | :--- | :--- |
| **Data Version Control** | **DVC** (`v3.50+`) | Version control for training splits (`train.csv`, `val.csv`, `test.csv`, Parquet) with remote caching; ties dataset Git commits to ML models. |
| **Experiment Tracking** | **MLflow** (`v2.16+`) | Logs hyperparameter runs, metric curves, artifacts, confusion matrices, and serves as production Model Registry. |
| **Hyperparameter Optimization** | **Optuna** (`v3.6+`) | Bayesian Tree-structured Parzen Estimator (TPE) search over estimators, subsampling, contamination, and neural architectures. |
| **Drift Monitoring** | **Evidently / Scipy** | Real-time calculation of Population Stability Index (PSI) and two-sample Kolmogorov-Smirnov (KS) test on live inference data. |
| **Model Verification Gate** | **Python Gatekeeper** | Automated gate requiring PR-AUC $\ge 0.90$, Expected Calibration Error $\le 0.10$, and latency $\le 12.0\text{ms}$. |
| **Pipeline Automation** | **GitHub Actions** | Automated CI workflows, deployment to `tunkstun`, and scheduled / drift-triggered CT execution. |
| **Container Engine** | **Docker & Compose** | Multi-stage production containerization with non-root isolation and healthchecks. |
| **Inference Runtime** | **FastAPI & gRPC** | Dual-protocol serving engine providing high-throughput gRPC for Go backend and REST for diagnostics. |

---

## 4. Continuous Training (CT) Detailed Protocol

### 4.1. Dataset Partitioning & Leakage Prevention
Consecutive telemetry reports from the same maritime vessel (`MMSI`) or aircraft (`ICAO_HEX`) exhibit high temporal autocorrelation. To prevent synthetic performance inflation:
1. **Entity-Grouped Split**: Telemetry is partitioned strictly by unique entity ID (`MMSI` / `ICAO_HEX`). All observations for a given entity reside exclusively in either Train (60%), Validation (15%), Calibration (15%), or Test (10%).
2. **Temporal Ordering**: Features within entity tracks preserve exact chronological order to reflect online kinematics (EWMA deviations, speed deltas, course turns).

### 4.2. Bayesian Hyperparameter Optimization (Optuna)
Optuna runs $N=50$ trials per domain model targeting the optimization objective:
$$\text{Maximize } \mathcal{L}_{\text{obj}} = \text{PR-AUC}_{\text{val}} - \lambda \cdot \max(0, \text{Latency}_{\text{ms}} - 12.0) - \beta \cdot \text{ECE}$$
* Isolation Forest search space: `n_estimators` [50, 300], `max_samples` [0.5, 1.0], `contamination` [0.01, 0.10].
* Autoencoder search space: `latent_dim` [4, 16], `lr` [$10^{-4}$, $10^{-2}$], `dropout` [0.0, 0.3].
* XGBoost search space: `max_depth` [3, 9], `subsample` [0.6, 1.0], `colsample_bytree` [0.6, 1.0].

### 4.3. Automated Model Verification Gate
Before any trained candidate is registered for production:
```python
def evaluate_gate(candidate_metrics: dict) -> bool:
    if candidate_metrics["pr_auc"] < 0.90:
        logger.error("Failed Gate: PR-AUC %.3f < 0.90", candidate_metrics["pr_auc"])
        return False
    if candidate_metrics["ece"] > 0.10:
        logger.error("Failed Gate: ECE %.3f > 0.10", candidate_metrics["ece"])
        return False
    if candidate_metrics["p95_latency_ms"] > 12.0:
        logger.error("Failed Gate: P95 Latency %.1fms > 12.0ms", candidate_metrics["p95_latency_ms"])
        return False
    return True
```

### 4.4. Cryptographic Manifest & Zero-Downtime Hot-Reload
1. The trained model artifact is serialized (`.joblib`, `.pt`, or `.onnx`).
2. A SHA-256 cryptographic digest is computed and written to `models/manifest.json`.
3. The candidate artifact is copied to the live model path via atomic file replacement (`os.replace`).
4. A webhook or internal signal triggers `POST /models/reload` on the FastAPI/gRPC engine.
5. The engine loads the new model into memory, verifies the SHA-256 hash, runs a warmup inference, and atomically swaps pointer references with zero dropped frames.

---

## 5. GitHub Actions DevOps Pipeline Matrix

```text
.github/workflows/
├── client-pipeline.yml     # TypeScript check, ESLint, Vite build, Vercel/Nginx preview
├── server-pipeline.yml     # Go fmt, go vet, golangci-lint, race detector, go test
├── ml-service-pipeline.yml # Flake8/Black, mypy, pytest, model serialization integrity
├── ml-continuous-training.yml # Scheduled/Drift-triggered CT workflow (HPO, evaluation, gate)
├── deploy.yml              # Unified CD: SSH to tunkstun, build, up -d, healthcheck gate, rollback
└── service-pipeline.yml    # Cloudflare tunnel ingress & observability stack validation
```

### 5.1. Automated Continuous Training Workflow (`ml-continuous-training.yml`)
* **Triggers:**
  * Schedule: Every Sunday at 02:00 UTC (`0 2 * * 0`)
  * Repository Dispatch: Webhook from `drift_monitor` when PSI $> 0.20$
  * Manual: `workflow_dispatch` with target domain parameter (`vessel`, `aircraft`, `all`)
* **Execution:**
  1. Pulls the latest versioned dataset from `/server/datasets/` or DVC remote.
  2. Runs Optuna Bayesian HPO and training scripts.
  3. Evaluates candidates against holdout test set.
  4. Publishes experiment run to MLflow.
  5. If Gate passes: commits candidate manifest, syncs weights to deployment host, and triggers hot-reload.

### 5.2. Automated Health Gate and Rollback in `deploy.yml`
During CD deployment to `tunkstun`:
* 15 health probes over 45 seconds polling:
  * Backend REST API: `http://localhost:10020/health/ready` (DB pool, WebSocket hub, ML circuit breaker)
  * ML Engine: `http://localhost:8090/health` (model versions, cache integrity)
  * Client SPA: `http://localhost:3000/status` (Nginx reverse proxy, static asset delivery)
* If any probe fails after 15 attempts, the pipeline invokes git rollback to previous commit (`HEAD~1`), rebuilds, and restarts containers, alerting on failure.
