# ML Services Unification Plan

> **Target**: Merge `ml-service/` + `ml-inference/` into a single `ml-unified/` with two deployment variants:
> - `ml-unified/cpu/` — CPU + RAM only (scikit-learn)
> - `ml-unified/gpu/` — GPU accelerated (AMD Radeon RX 6500 XT, 80% VRAM lock)

---

## 1. Current State Analysis

### 1.1 Existing Services Side-by-Side

| Aspect | ml-service | ml-inference |
|---|---|---|
| **Location** | `ml-service/` | `ml-inference/` |
| **Model** | IsolationForest × 1 (200 trees) | IsolationForest (200) + LocalOutlierFactor (20 nn) + IsotonicRegression calibrator |
| **Domains** | Vessel only | Vessel (9 features), Aviation (9), Heatmap (4) |
| **Vessel Features** | 8 (no `ewma_deviation`) | 9 (includes `ewma_deviation`) |
| **Endpoints** | `/predict`, `/train`, `/health` | `/api/predict`, `/health` |
| **Training** | Online (POST /train) | Offline CLI only (train.py) |
| **SHAP** | Yes, but missing from requirements.txt (bug) | Yes, on IsolationForest only |
| **Persistence** | `models/isolation_forest.joblib` | `models/{domain}_ensemble.joblib` |
| **Docker** | Port 10000 (override to 8090) | Port 8090 |
| **Accuracy** | Lower (single model, no calibration) | Higher (ensemble + probability calibration) |

### 1.2 How the Go Backend Calls ML

The Go server (`server/internal/intelligence/ml_client.go`) sends **exactly one format**:

```json
POST {ML_SERVICE_URL}/api/predict  (500ms timeout)

// Request:
{
  "domain": "vessel",
  "features": {
    "course_delta": 12.5, "heading_delta": 8.2, "speed_delta": 3.1,
    "average_speed": 14.7, "speed_variance": 2.3,
    "ais_gap_minutes": 1.2, "dist_restricted_zone": 5.0,
    "dist_historical_site": 999.0
  },
  "explain": false
}

// Expected response shape:
{
  "track_id": "...",
  "anomaly_score": 67.4,       // 0-100, higher = more anomalous
  "is_anomaly": true,
  "confidence": 0.85,
  "model_version": "...",
  "inference_time_ms": 32.1,
  "explanation": { ... }       // optional
}
```

Key observations:
- Go **always** sends `"domain": "vessel"` — aviation and heatmap domains are **unused at runtime**
- Go sends **8 features** (no `ewma_deviation` field in the wire JSON)
- Go expects `anomaly_score` in the response (not `probability`)
- The composite scoring blends: `ML (40%) + Rules (40%) + Geo (20%) = Final`
- On any failure, falls back to `localHeuristicScore()` — system is never blocked by ML downtime

### 1.3 Inconsistencies Between Services

| Issue | ml-service | ml-inference | Go expects |
|---|---|---|---|
| API path | `/predict` | `/api/predict` | `/api/predict` |
| Request has `track_id`? | Yes (top-level) | No (Go doesn't send it) | Not sent on wire |
| Response score field | `anomaly_score` | `probability` | `anomaly_score` |
| Vessel feature count | 8 | 9 | 8 (no `ewma_deviation`) |
| `ewma_deviation` feature | None | Required by schema | Not computed/sent |

**Net result**: Neither existing service works 100% with the Go backend in its current state without compatibility adapters.

---

## 2. Unification Design

### 2.1 Architecture

```
ml-unified/
├── cpu/                          # CPU-only deployment
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app.py                    # FastAPI entry point
│   ├── schemas.py                # Pydantic request/response
│   ├── lib/
│   │   ├── __init__.py
│   │   ├── features.py           # Feature schemas (3 domains)
│   │   ├── scoring.py            # Ensemble scoring pipeline
│   │   └── training.py           # Online training support
│   ├── api/
│   │   ├── __init__.py
│   │   └── predict.py            # Inference handler
│   └── models/                   # .joblib artifacts
│
├── gpu/                          # GPU-accelerated deployment
│   ├── Dockerfile                # ROCm base image
│   ├── requirements.txt          # ONNX Runtime, DirectML, sklearn-onnx
│   ├── app.py                    # Same API contract as CPU
│   ├── schemas.py                # Symlinked or copied from cpu/
│   ├── lib/
│   │   ├── __init__.py
│   │   ├── features.py           # Same feature definitions
│   │   ├── scoring_gpu.py        # ONNX Runtime + DirectML pipeline
│   │   └── convert.py            # sklearn → ONNX conversion
│   ├── api/
│   │   └── predict.py
│   └── models/                   # .onnx artifacts + .joblib fallback
│
└── README.md                     # Setup, training, deployment docs
```

Both variants expose the **identical HTTP API** — same endpoints, same request/response schemas. Only the inference backend differs.

### 2.2 Unified API Contract

#### `POST /api/predict`

```json
// Request
{
  "domain": "vessel",                    // "vessel" | "aviation" | "heatmap"
  "features": {
    // Vessel (8 features — the 8 Go actually sends):
    "course_delta": 12.5,                // 0-360, absolute heading change
    "heading_delta": 8.2,               // -180 to 180, signed shortest arc
    "speed_delta": 3.1,                 // signed, knots
    "average_speed": 14.7,              // >= 0, knots
    "speed_variance": 2.3,              // >= 0
    "ais_gap_minutes": 1.2,             // >= 0, minutes since last report
    "dist_restricted_zone": 5.0,        // >= 0, NM to nearest zone boundary
    "dist_historical_site": 999.0       // >= 0, NM to nearest attack site
    // Note: ewma_deviation is OPTIONAL. If absent, defaults to 0.0.
  },
  "explain": false                      // optional, default false
}

// Response (200)
{
  "track_id": "",                       // echo if sent, else empty
  "anomaly_score": 67.4,               // 0-100, higher = more anomalous
  "is_anomaly": true,                  // score >= 50
  "confidence": 0.85,                  // 0-1
  "model_version": "2026-07-06T14:00:00.000000+00:00",
  "inference_time_ms": 32.1,
  "explanation": {                      // only when explain=true
    "top_features": [
      {
        "feature": "course_delta",
        "shap_value": -0.034,
        "direction": "anomalous"
      }
    ],
    "isolation_depth": 3.4
  }
}
```

#### `POST /api/train`

```json
// Request
{
  "domain": "vessel",
  "data": [
    { "course_delta": 12.5, ... },     // feature dicts
    ...
  ],
  "contamination": 0.05,               // 0.01-0.5, default 0.05
  "labels": [0, 1, 0, ...]             // optional binary labels for calibration
}

// Response (200)
{
  "status": "trained",
  "domain": "vessel",
  "model_version": "2026-07-06T14:00:00.000000+00:00",
  "n_samples": 500,
  "contamination": 0.05,
  "metrics": {                          // only if labels provided
    "auc_roc": 0.94,
    "precision_at_50": 0.87,
    "recall_at_50": 0.82,
    "f1_at_50": 0.84
  }
}
```

#### `GET /health`

```json
{
  "status": "healthy",
  "service": "ml-unified-cpu",          // or "ml-unified-gpu"
  "model_loaded": true,
  "model_version": "2026-07-06T14:00:00.000000+00:00",
  "gpu_available": false,              // true for GPU variant
  "vram_used_percent": 0.0             // 0 or estimated usage %
}
```

### 2.3 Model Architecture — Why Ensemble IF + LOF + Calibrator

| Component | Role | Why it matters for accuracy |
|---|---|---|
| **IsolationForest** (200 trees) | Tree-based anomaly detection | Fast on high-dimensional data, catches global outliers, handles mixed feature scales |
| **LocalOutlierFactor** (n_neighbors=20) | Density-based anomaly detection | Catches local anomalies that IF misses — a point normal in global context but anomalous in its local neighborhood |
| **Ensemble averaging** | Simple mean of normalized IF + LOF scores | Reduces variance; one model's blind spots are covered by the other |
| **IsotonicRegression calibrator** | Maps raw ensemble score → calibrated probability | Without calibration, the ensemble score is just a rank; with calibration (when labels are available), it becomes a meaningful probability. Even with pseudo-labels (sigmoid fallback), calibration produces more stable thresholds than raw scores. |

**Why not a single model?** A single IsolationForest (ml-service approach) produces rankings, but:
- No density awareness (a ship in a busy lane and a ship in open water may both look "normal" to IF)
- No probability calibration (the raw `decision_function` score has no statistical meaning)
- Higher false positive rate on edge cases

**Why not XGBoost/LightGBM?** Supervised models require labeled anomaly data. In maritime surveillance, labeled anomalies are scarce and adversarial. Unsupervised ensemble is the correct architectural choice for this domain.

### 2.4 Feature Design

#### Vessel Domain (8 required + 1 optional)

The 8 features the Go backend actually computes and sends:

| # | Feature | Go source | Rationale |
|---|---|---|---|
| 1 | `course_delta` | `state.go:computeDeltas` | Sudden course changes indicate evasive or erratic behavior |
| 2 | `heading_delta` | `state.go:computeDeltas` | Signed heading change captures direction of turn |
| 3 | `speed_delta` | `state.go:computeDeltas` | Acceleration/deceleration anomalies |
| 4 | `average_speed` | Sliding window mean | Baseline speed profile for the vessel |
| 5 | `speed_variance` | Sliding window variance | Erratic speed patterns (loitering, zigzag) |
| 6 | `ais_gap_minutes` | Timestamp delta | Dark periods / AIS spoofing indicator |
| 7 | `dist_restricted_zone` | `features.go:ExtractFeatures` | Proximity to Hormuz, Persian Gulf, Gulf of Oman zones |
| 8 | `dist_historical_site` | `features.go:ExtractFeatures` | Proximity to known attack/incident sites |

Feature #9 (`ewma_deviation`) is **optional with default 0.0**. It exists in the ml-inference schema but the Go backend does not compute or send it. Keeping it optional allows forward-compatibility without breaking existing clients.

#### Aviation Domain (9 features)

Mirrors vessel features but with aviation-specific replacements:
- `alt_delta` instead of (no vessel equivalent) — altitude changes
- `squawk_anomaly_flag` (0/1) — hijack/emergency/radio-failure squawk codes
- `dist_restricted_airspace` — distance to no-fly zones
- `gap_minutes` — time since last ADS-B update

#### Heatmap Domain (4 features)

Geospatial grid-cell level aggregation:
- `event_density_grid` — events per 0.5° cell per hour
- `event_velocity` — rate of change of density
- `gdelt_firms_ratio` — thermal vs geopolitical event ratio
- `distance_to_nearest_track` — proximity to any active vessel

---

## 3. CPU Variant (`ml-unified/cpu/`)

### 3.1 Stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | Python 3.11 | Matches existing services |
| Framework | FastAPI + Uvicorn | Matches existing, lightweight ASGI |
| ML Runtime | scikit-learn 1.5.0 | Standard, well-tested, no GPU deps |
| Explainability | SHAP 0.45.1 (TreeExplainer) | Only on IF, fast enough for CPU |
| Serialization | joblib 1.4.2 | Matches existing, handles sklearn objects |
| Validation | Pydantic 2.7.2 | Request/response schema enforcement |

### 3.2 Dockerfile

```dockerfile
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8090
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p models
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl --fail "http://127.0.0.1:${PORT:-8090}/health" || exit 1
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8090} --workers 2"]
```

### 3.3 Performance Targets

| Metric | Target |
|---|---|
| Inference latency (no SHAP) | < 15 ms per sample |
| Inference latency (with SHAP) | < 80 ms per sample |
| Model load time (cold start) | < 2 s |
| Memory usage (idle) | < 300 MB |
| Concurrent requests | 4 workers = 4 concurrent samples |
| Training time (500 samples) | < 5 s |

### 3.4 What Gets Merged From Existing Services

| Source | What comes over |
|---|---|
| `ml-inference/lib/scoring.py` | Ensemble pipeline (scaler → IF → LOF → normalize → average → calibrate → 0-100). This is the tested, correct pipeline. |
| `ml-inference/lib/features.py` | Pydantic schemas for all 3 domains, `DOMAIN_FEATURE_COLS`, `parse_features()`. Make `ewma_deviation` optional with default 0.0. |
| `ml-inference/api/predict.py` | Model loading, caching, handler logic. Strip Vercel-specific wrapper — the FastAPI app.py handles routing now. |
| `ml-service/model.py` | `train()` method adapted for ensemble training (train IF + LOF + calibrator instead of IF alone). Keep online training support. |
| `ml-service/app.py` | FastAPI structure with `/api/predict`, `/api/train`, `/health` endpoints. |
| `ml-inference/tests/` | 23 test cases — keep all, update for unified API contract. |

### 3.5 What Gets Discarded

| Source | What | Why |
|---|---|---|
| `ml-service/model.py` | Bare IsolationForest without ensemble | Replaced by IF+LOF+calibrator ensemble |
| `ml-service/schemas.py` | `FeatureInput` with 8 fields, no domain | Replaced by domain-aware schemas |
| `ml-inference/app.py` | `VercelMockRequest` wrapper | Not needed in FastAPI deployment |
| `ml-inference/vercel.json` | Vercel config | Not used in Docker deployment |

---

## 4. GPU Variant (`ml-unified/gpu/`)

### 4.1 Target Hardware

| Spec | Value |
|---|---|
| GPU | AMD Radeon RX 6500 XT |
| Architecture | RDNA 2 (Navi 24) |
| VRAM | 4 GB GDDR6 |
| Compute APIs | DirectML (DirectX 12), Vulkan, OpenCL |
| VRAM Target | ≤ 80% utilization (~3.2 GB usable) |

### 4.2 GPU Strategy — Why DirectML + ONNX Runtime

The RX 6500 XT has limited options for ML acceleration:

| Approach | Viable? | Notes |
|---|---|---|
| **ROCm** | No | 6500 XT is not on the ROCm supported GPU list. ROCm requires RDNA2 CDNA or specific Navi 21/31 GPUs. |
| **cuML (RAPIDS)** | No | CUDA-only. Requires NVIDIA GPU. |
| **OpenCL (clBLAS)** | Partial | sklearn does not support OpenCL. Custom OpenCL kernels would be required. |
| **DirectML via ONNX Runtime** | **Yes** | Works on any DirectX 12 GPU. `sklearn-onnx` converts sklearn pipelines to ONNX. ONNX Runtime with DirectML EP runs inference on GPU. |
| **Vulkan (Kompute)** | Partial | Possible but immature ecosystem for sklearn models. |

**Decision**: Use **ONNX Runtime with DirectML execution provider**. This is the only practical path for GPU acceleration on the 6500 XT.

### 4.3 ONNX Conversion Pipeline

```
Training (CPU)                          Inference (GPU via ONNX RT + DirectML)
─────────────                           ───────────────────────────────────────
sklearn Pipeline                         ONNX Runtime Session
  ├── StandardScaler                      ├── DirectML Execution Provider
  ├── IsolationForest (200 trees)         ├── CPU Execution Provider (fallback)
  └── IsotonicRegression                  └── Loaded from models/*.onnx
       │
       ▼
  sklearn-onnx (skl2onnx)
       │
       ▼
  models/vessel_ensemble.onnx
```

**What converts to ONNX:**
- `StandardScaler` → ONNX `Scaler` operator ✓ (trivial)
- `IsolationForest` → ONNX `TreeEnsemble` operator ⚠️ (requires custom converter; sklearn-onnx supports RandomForest but not IsolationForest directly. Each tree in an IF is a standard `ExtraTreeRegressor` — we can convert IF as a tree ensemble by accessing `estimators_`.)

**What stays on CPU even in GPU variant:**
- **LocalOutlierFactor** — uses `NearestNeighbors` internally. sklearn-onnx does not support converting LOF (no ONNX operator for k-NN with the `kneighbors` + `score_samples` logic). LOF inference runs on CPU via joblib.
- **SHAP TreeExplainer** — runs on CPU (tree traversal, no GPU path in shap).

**Net GPU acceleration**: ~65% of inference work (scaler + IF) runs on GPU. LOF (~30%) stays on CPU. SHAP (~5%) stays on CPU.

### 4.4 Dockerfile (GPU)

```dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8090
ENV ONNX_RUNTIME_PROVIDER=DML

WORKDIR /app

# DirectML requires DirectX runtime (Windows containers) or WSL2 with DX pass-through
# This Dockerfile targets a Windows host with WSL2 GPU passthrough
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    # DirectML depends on DirectX shader compiler
    libdrm2 \
    libdrm-amdgpu1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p models
RUN python -c "from lib.convert import convert_all; convert_all()" || true

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl --fail "http://127.0.0.1:${PORT:-8090}/health" || exit 1

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8090} --workers 2"]
```

### 4.5 GPU Requirements

```txt
# requirements.txt (GPU variant)
fastapi==0.111.0
uvicorn==0.30.1
pydantic==2.7.2
numpy==1.26.4
joblib==1.4.2

# CPU fallback (always available)
scikit-learn==1.5.0
shap==0.45.1

# ONNX Runtime with DirectML
onnxruntime-directml==1.18.0       # Windows native
# OR for WSL2/Linux with ROCm pass-through:
# onnxruntime==1.18.0

# Model conversion (training-time only)
skl2onnx==1.16.0
onnx==1.16.0
```

### 4.6 VRAM Lock Strategy (80% Target)

The RX 6500 XT has 4 GB VRAM. 80% = 3.2 GB usable.

| Component | Estimated VRAM |
|---|---|
| ONNX Runtime session (model weights) | ~15 MB per domain model |
| IF tree nodes (200 trees × ~20 nodes × 16 bytes) | ~64 KB |
| Preprocessing scaler | < 1 KB |
| Runtime scratch buffers | ~50 MB per concurrent request |
| **Total per domain** | **~70 MB** |
| **3 domains loaded** | **~210 MB** |

**At 210 MB, VRAM usage is ~5% of capacity.** The 80% VRAM lock is easily maintained. The lock is enforced by:
1. Limiting concurrent ONNX inference sessions (max 4 workers × 1 session = 4 concurrent)
2. Monitoring via `torch.cuda.memory_allocated()` or `onnxruntime.get_available_providers()` at startup
3. Health endpoint reporting vram_used_percent
4. If VRAM exceeds 70% (warning threshold), reject new requests until below 60%

### 4.7 Performance Comparison

| Metric | CPU (scikit-learn) | GPU (ONNX DirectML) |
|---|---|---|
| Single inference (no SHAP) | 8-15 ms | **2-5 ms** |
| Single inference (with SHAP) | 60-80 ms | **10-20 ms** (SHAP still CPU) |
| Batch of 100 (no SHAP) | 200-400 ms | **30-60 ms** |
| Model load (cold start) | 1-2 s | 3-5 s (ONNX session init + DirectML warmup) |
| Training | 2-5 s (500 samples) | **0.5-1 s** (if sklearn training uses GPU — but sklearn does not natively support GPU. Training benefit is minimal for small datasets.) |

**Bottom line**: GPU accelerates inference 3-7x for single samples, 5-10x for batched inference. Training benefits are limited since sklearn training is CPU-bound. The GPU variant is most valuable when:
- Batched scoring is needed (e.g., reprocessing all active tracks every 30s)
- Multiple domains are scored simultaneously
- SHAP explanations are requested at scale

---

## 5. File Structure & Migration Steps

### 5.1 New Files to Create

```
ml-unified/
├── cpu/
│   ├── Dockerfile                          (new — adapted from ml-inference/Dockerfile)
│   ├── requirements.txt                    (new — merge ml-service + ml-inference deps)
│   ├── app.py                              (new — unified FastAPI with both /api/predict + /api/train + /health)
│   ├── schemas.py                          (new — domain-aware, backward-compatible)
│   ├── lib/
│   │   ├── __init__.py                     (new)
│   │   ├── features.py                     (merge ml-inference/lib/features.py — make ewma_deviation optional)
│   │   ├── scoring.py                      (merge ml-inference/lib/scoring.py)
│   │   └── training.py                     (new — online training adapted from ml-service/model.py)
│   ├── api/
│   │   ├── __init__.py                     (new)
│   │   └── predict.py                      (merge ml-inference/api/predict.py — remove Vercel wrapper)
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_scoring.py                 (merge ml-inference/tests/test_scoring.py)
│   └── models/
│       └── .gitkeep                        (new)
│
├── gpu/
│   ├── Dockerfile                          (new — ROCm/DirectML base)
│   ├── requirements.txt                    (new — + onnxruntime-directml, skl2onnx, onnx)
│   ├── app.py                              (new — same API as cpu/)
│   ├── schemas.py                          (symlink or copy from cpu/)
│   ├── lib/
│   │   ├── __init__.py                     (new)
│   │   ├── features.py                     (copy from cpu/)
│   │   ├── scoring_gpu.py                  (new — ONNX Runtime inference pipeline)
│   │   ├── training.py                     (copy from cpu/)
│   │   └── convert.py                      (new — sklearn→ONNX conversion script)
│   ├── api/
│   │   └── predict.py                      (copy from cpu/, modified to use scoring_gpu)
│   ├── tests/
│   │   └── test_gpu.py                     (new — GPU-specific tests: ONNX parity with sklearn)
│   └── models/
│       ├── .gitkeep
│       └── *.onnx                          (generated at build time)
│
└── README.md                               (new)
```

### 5.2 Migration Steps

**Phase 1 — Core unification (CPU variant)**

| Step | Action | Verification |
|---|---|---|
| 1 | Create `ml-unified/cpu/` directory structure | — |
| 2 | Write `lib/features.py` — merge from ml-inference, make `ewma_deviation` Optional with default 0.0 | Unit tests pass |
| 3 | Write `lib/scoring.py` — copy from ml-inference, rename response field `probability` → `anomaly_score` | Unit tests pass (existing 23 tests) |
| 4 | Write `lib/training.py` — adapt from ml-service/model.py, add IF+LOF+calibrator training, add online training endpoint | Train on 500 synthetic samples, verify model loads |
| 5 | Write `schemas.py` — unified Pydantic models compatible with Go backend | Validation tests pass |
| 6 | Write `api/predict.py` — strip Vercel wrapper, use FastAPI | curl test with Go-format JSON |
| 7 | Write `app.py` — FastAPI with `/api/predict`, `/api/train`, `/health` | All endpoints return 200 |
| 8 | Write `Dockerfile` + `requirements.txt` — add `shap` dependency | Docker build succeeds, health check passes |
| 9 | Update Go backend `ML_SERVICE_URL` to point to new service | End-to-end: vessel data → ML → anomaly score in dashboard |
| 10 | Remove old `ml-service/` and `ml-inference/` from docker-compose, add `ml-unified/cpu/` | `docker compose up` starts clean |

**Phase 2 — GPU acceleration**

| Step | Action | Verification |
|---|---|---|
| 11 | Create `ml-unified/gpu/` directory structure | — |
| 12 | Write `lib/convert.py` — sklearn→ONNX conversion for scaler + IF (skip LOF and calibrator) | Convert, verify ONNX model outputs match sklearn within 1e-6 |
| 13 | Write `lib/scoring_gpu.py` — ONNX Runtime inference with DirectML EP, fallback to CPU for LOF | Inference returns same score as CPU within 1e-3 |
| 14 | Write `Dockerfile` + `requirements.txt` — add onnxruntime-directml, skl2onnx | Docker build succeeds |
| 15 | Add VRAM monitoring to health endpoint | Health shows `vram_used_percent` |
| 16 | Add 80% VRAM lock — reject requests at 70%, resume at 60% | Load test verifies throttling |
| 17 | Add GPU variant to docker-compose as optional profile | `docker compose --profile gpu up` starts GPU variant |

---

## 6. Backwards Compatibility

### 6.1 Go Backend (Primary Consumer)

The unified API supports the Go backend's existing contract **without changes**:

| Go sends | Unified API accepts |
|---|---|
| `POST /api/predict` | ✓ Same path |
| `{"domain": "vessel", "features": {...}}` | ✓ Same shape |
| 8 features (no `ewma_deviation`) | ✓ `ewma_deviation` defaults to 0.0 |
| Expects `anomaly_score` in response | ✓ Field name is `anomaly_score` |
| 500ms timeout | ✓ Well within budget (8-15ms CPU, 2-5ms GPU) |

### 6.2 Existing Model Artifacts

Pre-trained `.joblib` models from `ml-inference/models/` can be loaded by the unified service with these migration steps:
1. Copy `models/{domain}_ensemble.joblib` to `ml-unified/cpu/models/`
2. Verify the bundle contains `model_iforest`, `model_lof`, `scaler`, `calibrator`, `feature_cols`, `domain`, `version`
3. If `feature_cols` includes `ewma_deviation` but the data doesn't send it, the service fills 0.0 — this may cause a slight accuracy drop vs the original model but is functionally correct

---

## 7. Verification Plan

### 7.1 Unit Tests (from ml-inference, adapted)
- Feature schema validation (all 3 domains, valid + invalid inputs)
- Scoring pipeline (probability in [0,100], is_anomaly consistency, SHAP on/off)
- Normalization function (clamping, boundary mapping)
- Training pipeline (min 50 samples, correct model persistence)
- **GPU only**: ONNX <-> sklearn score parity (tolerance 1e-3)

### 7.2 Integration Tests
- `curl POST /api/predict` with Go-format vessel JSON — verify 200 + valid score
- `curl POST /api/train` with 50 synthetic samples — verify model persists and subsequent predict uses new model
- `curl GET /health` — verify model_loaded, model_version, gpu_available fields
- Docker health check passes within 30s of container start

### 7.3 End-to-End (with Go Backend)
- Start docker-compose with `ml-unified/cpu/`
- Send vessel telemetry → verify anomaly scores appear in dashboard
- Kill ML container → verify dashboard still shows scores (local heuristic fallback)
- Restart ML container → verify scores return
- Check `anomaly_score` in WebSocket messages matches ML response

---

## 8. Decisions & Trade-offs

| Decision | Rationale |
|---|---|
| **API path `/api/predict` (not `/predict`)** | Matches Go backend's actual call pattern; matches ml-inference convention |
| **Response field `anomaly_score` (not `probability`)** | Matches Go backend's `MLPredictResponse.AnomalyScore` field |
| **`ewma_deviation` optional (not required)** | Go doesn't send it; making it required would break all existing traffic |
| **Online training kept (not offline-only)** | Enables operational retraining without CI/CD + git commit cycle |
| **LOF stays on CPU even in GPU variant** | sklearn-onnx cannot convert LOF; nearest-neighbor ops have no ONNX equivalent |
| **SHAP on CPU only** | shap.TreeExplainer has no GPU path; GPU SHAP would require KernelExplainer (10-100x slower) |
| **DirectML (not ROCm) for GPU** | 6500 XT is not on ROCm supported GPU list; DirectML works on any DX12 GPU |
| **Training always on CPU** | sklearn training has no GPU path; GPU training benefit is minimal for 200-tree IF on <1000 samples |
| **80% VRAM lock** | Leaves 20% (~800 MB) headroom for OS framebuffer, display compositor, and unexpected spikes |
