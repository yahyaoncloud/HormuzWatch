# Hormuz Ship Tracker Integration & ML Service Enhancement Plan

> **Source:** [yasumorishima/hormuz-ship-tracker](https://github.com/yasumorishima/hormuz-ship-tracker) — MIT-licensed
> **Target:** HormuzWatch v2.0.0
> **Status:** Planning — no code written yet
> **Date:** 2026-07-24

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State — What HormuzWatch Already Has](#2-current-state--what-hormuzwatch-already-has)
3. [Current State — hormuz-ship-tracker Feature Inventory](#3-current-state--hormuz-ship-tracker-feature-inventory)
4. [Integration Plan — Backend (Go)](#4-integration-plan--backend-go)
5. [Integration Plan — Python ML Service Enhancement](#5-integration-plan--python-ml-service-enhancement)
6. [Integration Plan — Frontend (React)](#6-integration-plan--frontend-react)
7. [Database Changes](#7-database-changes)
8. [API Surface Changes](#8-api-surface-changes)
9. [Performance & Scaling Considerations](#9-performance--scaling-considerations)
10. [Implementation Phases](#10-implementation-phases)
11. [Risks & Mitigations](#11-risks--mitigations)
12. [Success Metrics](#12-success-metrics)

---

## 1. Executive Summary

The `hormuz-ship-tracker` by @yasumorishima is a focused, production-hardened AIS maritime monitor running on Raspberry Pi 5. It has been operating 24/7 collecting real-world AIS data from the Strait of Hormuz since at least early 2026, and has identified critical real-world anomalies (AIS dead zone mid-strait at ~35 NM wide, 102.3 kn sentinel value, ~17% anomalous positions).

HormuzWatch shares the same geographic focus (Persian Gulf / Strait of Hormuz) and the same primary data source (aisstream.io), but approaches it as a **multi-source intelligence platform** rather than a pure AIS tracker. The two projects are highly complementary — integrating the tracker's proven AIS-specific features into HormuzWatch's broader intelligence architecture creates a single system that covers the full spectrum from raw vessel tracking to multi-source threat intelligence.

This document also covers the planned enhancement of the Python ML service, which currently supports 4 domains (vessel/aviation/heatmap/news) but has architectural debt (two legacy code paths, GPU support limited by AMD RX 6500 XT ROCm restrictions, ensemble not fully exploited for transit/blockade analysis).

---

## 2. Current State — What HormuzWatch Already Has

### 2.1 AIS Ingestion Pipeline

```
aisstream.io WebSocket
        │
        ▼
[aisstream.go]  ── 6 bounding boxes, PositionReport only
        │
        ▼
[intelligence/pipeline.go]  ── 9-step pipeline
 ├── 1. Increment counter
 ├── 2. Heatmap grid
 ├── 3. TrackStateManager.Update() — EWMA baselines
 ├── 4. ExtractFeatures() — geofence + attack proximity
 ├── 5. anomaly.Score() — rule-based 0-100
 ├── 6. MLClient.Predict() — gRPC → Python ML
 ├── 7. GeoStore.ScoreForLocation() — GDELT/FIRMS
 ├── 8. ComputeComposite() — 40/40/20 blend
 └── 9. WebSocket publish + DB persist
```

**Strengths:**
- Multi-source anomaly scoring (rule + ML + geopolitical)
- EWMA baseline tracking per vessel
- Composite threat assessment with explainability
- Production infrastructure (Supabase, Docker, Terraform, Cloudflare)

**Gaps (relative to hormuz-ship-tracker):**
- No gate-line transit detection
- No vessel state classification (anchored/maneuvering/transiting)
- No AIS data quality filtering (102.3 kn sentinel, 40-99 kn glitches)
- No land mask filtering (positions can appear on land)
- No MMSI→flag enrichment
- No destination normalization
- No anchorage congestion monitoring
- No waiting fleet / blockade impact detection
- No dedicated visualization generators (heatmap PNG, timelapse GIF)

### 2.2 Python ML Service Architecture

```
ml-service/
├── app.py              # FastAPI — 2 API surfaces (legacy /predict + ensemble /api/predict)
├── grpc_server.py      # gRPC — same ensemble via protobuf
├── model.py            # Legacy — single IsolationForest (8 features, no calibration)
├── pipeline.py         # Training orchestrator — DataFetcher → Trainer → Registry → Promote
├── conflict_predictor.py  # XGBoost severity + RandomForest escalation
├── backup_pipeline.py  # Dataset export to Supabase/Telegram
├── train_gpu.py        # ROCm GPU training (AMD RX 6500 XT — but GPU NOT on ROCm support list)
├── lib/
│   ├── features.py     # Pydantic — 4 domains (vessel/aviation/heatmap/news), 9+9+4+18 cols
│   ├── scoring.py      # Ensemble — IF + LOF + IsotonicRegression calibrator
│   └── logger.py
├── api/
│   ├── __init__.py
│   └── train.py        # Offline CLI training
└── models/
    ├── isolation_forest.joblib           # Legacy artifact
    ├── vessel_ensemble.joblib            # Main artifact (IF+LOF+scaler+calibrator)
    ├── conflict_model.joblib             # Conflict predictor
    └── model_registry.json               # Version tracking
```

**Current endpoints:**

| Endpoint | Transport | Consumer | Purpose |
|---|---|---|---|
| `POST /predict` | REST (FastAPI) | Legacy clients | Single IF, 8 features, SHAP optional |
| `POST /train` | REST (FastAPI) | CLI/curl | Online training (≥50 samples) |
| `POST /api/predict` | REST (FastAPI) | Go backend | Ensemble IF+LOF+calibrator, 4 domains |
| `POST /api/train` | REST (FastAPI) | Documentation | Returns training instructions (offline) |
| `GET /api/models` | REST (FastAPI) | Operations | Which domains have artifacts |
| `GET /health` | REST (FastAPI) | Docker/compose | Health + model status |
| `Predict` (gRPC) | gRPC | Go backend | Same ensemble via protobuf |
| `Train` (gRPC) | gRPC | Go backend | Acknowledged, training runs offline |

**Current model artifacts:**

| Domain | Features | Model | Status |
|---|---|---|---|
| `vessel` | 9 cols (8 sent by Go + ewma_deviation optional) | IF + LOF + Isotonic | **Deployed** |
| `aviation` | 9 cols | IF + LOF + Isotonic | Defined, no artifact |
| `heatmap` | 4 cols | IF + LOF + Isotonic | Defined, no artifact |
| `news` | 18 cols | IF + LOF + Isotonic | Defined, no artifact |

**Key issues in current ML service:**

1. **AMD RX 6500 XT NOT on ROCm supported GPU list** — `train_gpu.py` and ROCm deps (`requirements-gpu.txt`) are retained for the **future Linux deployment environment** where ROCm-capable GPUs will be available. Current Windows environment uses CPU-only inference. DirectML+ONNX remains a fallback option if needed. [KEEP GPU FILES — PART OF FUTURE SYSTEM]
2. **Two inference code paths** — `model.py` (legacy single IF, 8 features, `/predict`) and `lib/scoring.py` (ensemble IF+LOF+calibrator, 4 domains, `/api/predict`). The Go backend uses `/api/predict` → the legacy path is dead weight. 
3. **No online ensemble training** — `/api/train` returns instructions to run offline CLI. `/train` (legacy) does train but only for the single IF model. [FIX IT]
4. **Feature count mismatch** — Go sends 8 features. VesselFeatures schema expects 9 (`ewma_deviation`). The schema defaults to 0.0, which is acceptable but means the 9th dimension always contributes zero for real traffic. [FIX IT]
5. **Only vessel domain has trained models** — aviation, heatmap, and news domains have schemas defined but no trained `.joblib` artifacts. The health endpoint correctly reports this. [COVER ALL DOMAINS]
6. **No transit/blockade ML** — The tracker's transit detection and blockade indicators are pure rule-based SQL. There's an opportunity to apply the existing ensemble infrastructure to these new analytics domains. [EXPLORE IT [WITHOUT INFRA]]

---

## 3. Current State — hormuz-ship-tracker Feature Inventory

### 3.1 Source Files and Their Functions

| File | Lines | Purpose | Dependencies |
|---|---|---|---|
| `src/main.py` | 33 | Entry point — asyncio.gather(collect, api, analytics) | uvicorn |
| `src/collector.py` | 244 | AIS WebSocket ingest → SQLite, land filter, MMSI→flag, dest normalize | websockets, aiosqlite, shapely |
| `src/analytics.py` | 886 | Transit detection, vessel states, anchorage, blockade, situation assessment | aiosqlite |
| `src/api.py` | 526 | FastAPI — 18 endpoints, anomaly classification, ship profiles, replay | FastAPI, Jinja2 |
| `src/land_filter.py` | 66 | Natural Earth 10m land mask — point-in-polygon via Shapely prepared geometry | shapely |
| `src/country_codes.py` | 152 | MMSI MID (first 3 digits) → country code/name — 110 entries | None |
| `src/destinations.py` | 168 | AIS destination free-text → 25 canonical port names + region mapping | re |
| `src/heatmap.py` | 469 | 3-panel matplotlib heatmap — hexbin Gulf + zoom Strait + infographic bars | matplotlib, numpy, shapely |
| `src/timelapse.py` | — | Animated GIF with interpolated vessel movement + trails | matplotlib, Pillow |
| `src/transit_report.py` | — | Map + table showing gate crossings with ship details | matplotlib |
| `src/snapshot.py` | — | Auto-snapshot → GitHub commit (every 6h via cron) | git |
| `src/migrate.py` | — | Historical data fix (timestamps, flags, destinations) | aiosqlite |
| `src/stats_report.py` | — | Daily statistics report generation | — |
| `scripts/generate_land_mask.py` | — | Pre-process Natural Earth → cropped/simplified GeoJSON | shapely |
| `data/land_mask.geojson` | — | Pre-computed land polygons for Persian Gulf region | — |

### 3.2 Database Schema (SQLite)

```sql
-- positions: raw AIS position reports
CREATE TABLE positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mmsi INTEGER NOT NULL, timestamp TEXT NOT NULL,
    latitude REAL, longitude REAL, speed REAL, course REAL, heading REAL,
    ship_name TEXT, ship_type INTEGER, destination TEXT,
    draught REAL, length REAL, width REAL,
    flag TEXT, received_at TEXT NOT NULL
);

-- transit_events: detected gate-line crossings
CREATE TABLE transit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mmsi INTEGER NOT NULL, gate_name TEXT NOT NULL,
    direction TEXT NOT NULL, crossed_at TEXT NOT NULL,
    latitude REAL, longitude REAL, speed REAL,
    ship_name TEXT, ship_type INTEGER, flag TEXT, destination TEXT
);

-- analytics_state: key-value store for last_check timestamps
CREATE TABLE analytics_state (
    key TEXT PRIMARY KEY, value TEXT NOT NULL
);
```

### 3.3 Key Algorithms

**Gate-line crossing detection** (`analytics.py:detect_transits`):
1. Query positions since `last_transit_check` from `analytics_state`
2. Fetch 1 prior position per vessel (to catch crossings spanning the window boundary)
3. For each consecutive pair `(p1, p2)`:
   - Reject if speed ≥ 102.3 (AIS unavailable sentinel)
   - Reject if |Δlat| > 0.5° or |Δlon| > 0.5° (position jump)
   - Reject if time gap > 30 min
   - Reject if both points > 30 NM from gate center (performance pre-filter)
   - Check 2D segment intersection: `segments_intersect(p1, p2, gate_a, gate_b)`
   - Determine direction via cross product relative to gate vector
   - Deduplicate: same MMSI + same gate in last 6 hours → skip
   - Insert `transit_events` row
4. Update `analytics_state.last_transit_check`

**3 virtual gate lines defined:**

| Gate | A (lat, lon) | B (lat, lon) | Inbound Side | Description |
|---|---|---|---|---|
| Strait of Hormuz | (26.05, 56.50) Oman | (26.65, 56.10) Iran | left (east/Oman Sea) | Main chokepoint |
| Dubai / Jebel Ali | (25.00, 55.20) South | (25.35, 55.20) North | left (offshore) | Port approach |
| Fujairah Approach | (25.00, 56.50) South | (25.30, 56.50) North | left (offshore) | Anchorage traffic |

**Direction logic** — cross product of `(gate_a → gate_b)` vector against each position:
- `cross_product(gate_a, gate_b, p) > 0` → point is to the LEFT of the gate vector
- For Strait gate: left = Gulf of Oman side = "outside" the Gulf → INBOUND = left→right crossing

**AIS data quality filtering:**
- `speed == 102.3` → AIS protocol "not available" sentinel (10-bit field 0x3FF)
- `speed >= 40.0` → Coastal receiver glitch (most merchant ships max ~25 kn)
- `|Δlat| > 0.5° or |Δlon| > 0.5°` → Position jump (spoofing/multipath)
- ~17% of positions anomalous per real-world data

**Vessel state classification:**
- `speed < 0.5` → anchored
- `0.5 ≤ speed < 3.0` → slow
- `3.0 ≤ speed < 8.0` → maneuvering
- `speed ≥ 8.0` → transiting
- Plus anchorage zone identification via Haversine distance

**Blockade indicators:**
- Waiting fleet 6h+: `MAX(speed) < 1.0` over 6h, ≥3 positions
- Waiting fleet 24h+: same over 24h, ≥10 positions
- Strait status: `NO_TRANSIT` (0), `LIMITED` (1-5), `ACTIVE` (>5)
- Data-driven situation assessment with 5 severity levels

---

## 4. Integration Plan — Backend (Go)

### 4.1 Gate-Line Transit Detection

**New file:** `server/internal/intelligence/gate.go`

**Design:**

The transit detection algorithm from `analytics.py` ports cleanly to Go with the existing Haversine utilities in `geo/haversine.go`:

```
GateLine struct {
    Name        string
    PointA      [2]float64  // (lat, lon)
    PointB      [2]float64  // (lat, lon)
    InboundSide string      // "left" or "right"
    Description string
}

Pre-defined gates:
  - Strait of Hormuz: (26.05,56.50) → (26.65,56.10), inbound_side=left
  - Dubai/Jebel Ali: (25.00,55.20) → (25.35,55.20), inbound_side=left
  - Fujairah Approach: (25.00,56.50) → (25.30,56.50), inbound_side=left
```

**Integration point:** After `Pipeline.ProcessObservation()` in the pipeline, or as a background goroutine running every 5 minutes (matching the tracker's interval). The background goroutine approach is preferred because:

1. Transit detection requires comparing consecutive positions — the per-observation pipeline processes one position at a time.
2. The tracker's approach of scanning recent DB positions every 5 minutes is efficient and proven.
3. It doesn't add latency to the real-time pipeline.

**Alternative integration:** Store the last known position per vessel in `TrackStateManager` (already has ring buffer) and check crossings synchronously in `ProcessObservation()`. This is more real-time but for correctness must still query for the "last position before the window" which the ring buffer already provides.

**Recommended approach:** Hybrid — check synchronously using `TrackStateManager` ring buffer (already stores up to 20 previous positions per vessel), with a background periodic scan as fallback/validation.

**Pseudocode:**

```go
// In intelligence/gate.go
func DetectCrossing(prev, curr TrackPoint, gate GateLine) (direction string, crossed bool) {
    // Reject if speed >= 102.3 (AIS unavailable)
    // Reject if position jump > 0.5°
    // Reject if time gap > 30 min
    // Pre-filter: both points within 30 NM of gate center
    if segmentsIntersect(prev.latlon, curr.latlon, gate.a, gate.b) {
        direction = determineDirection(prev.latlon, curr.latlon, gate)
        return direction, true
    }
    return "", false
}

func segmentsIntersect(p1, p2, p3, p4 [2]float64) bool {
    // Standard 2D segment intersection test
    d1 := crossProduct2D(p3, p4, p1)
    d2 := crossProduct2D(p3, p4, p2)
    d3 := crossProduct2D(p1, p2, p3)
    d4 := crossProduct2D(p1, p2, p4)
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
           ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
}

func determineDirection(p1, p2, gateA, gateB [2]float64, inboundSide string) string {
    side1 := crossProduct2D(gateA, gateB, p1)
    side2 := crossProduct2D(gateA, gateB, p2)
    if inboundSide == "left" {
        if side1 > 0 && side2 < 0 { return "INBOUND" }
        if side1 < 0 && side2 > 0 { return "OUTBOUND" }
    }
    return "UNKNOWN"
}
```

**Deduplication:** Query `transit_events` table for same MMSI + same gate within last 6 hours.

**Database:** New `transit_events` table (see Section 7).

### 4.2 AIS Data Quality Filtering

**Modify:** `server/internal/integrations/aisstream.go`

Add pre-pipeline filters in the AIS message handler, before calling `ProcessObservation()`:

```go
// In aisstream.go, inside the PositionReport handler:
const (
    AISSpeedUnavailable  = 102.3  // 0x3FF sentinel
    AISSpeedSuspicious   = 40.0   // threshold for receiver glitches
    MaxPositionJumpDeg   = 0.5    // degrees
)

// After decoding position:
if speed >= AISSpeedUnavailable {
    log.Printf("[aisstream] AIS speed unavailable for MMSI %d, dropping position", mmsi)
    continue
}
if speed >= AISSpeedSuspicious {
    log.Printf("[aisstream] Suspicious speed %.1f kn for MMSI %d, dropping position", speed, mmsi)
    continue
}
// Position jump check requires comparing with previous position from TrackStateManager
```

**Metrics:** Add Prometheus counters:
- `ais_positions_filtered_speed_unavailable`
- `ais_positions_filtered_speed_suspicious`
- `ais_positions_filtered_position_jump`
- `ais_positions_filtered_land`

### 4.3 Land Mask Filtering

**New file:** `server/internal/geo/landmask.go`

**Approach:** Pre-compute land polygon data and use point-in-polygon checks.

**Two implementation options:**

| Option | Library | Performance | Complexity |
|---|---|---|---|
| A) Go geometry library | `github.com/paulmach/orb` + `orb/geojson` + R-tree index | ~O(log n) per check | Medium |
| B) Pre-computed grid | In-memory 0.05° grid (~80,000 cells for Gulf region) | O(1) per check | Low |

**Recommended:** Option B for simplicity. The Persian Gulf region at 0.05° resolution requires a boolean grid of approximately (12° lat × 28° lon) / 0.05² ≈ 134,400 cells (~134 KB). This is trivially cacheable and provides O(1) lookups.

Implementation:
1. Use the tracker's `data/land_mask.geojson` (pre-computed from Natural Earth 10m)
2. At startup, rasterize the polygon to a 0.05° grid
3. `isOnLand(lat, lon) → bool` does a simple grid lookup + optional precise polygon check for edge cells

### 4.4 Vessel State Classification

**Extend:** `server/internal/intelligence/state.go`

Add to `TrackStateManager.Update()` or as a separate function:

```go
func ClassifyVesselState(speed float64) string {
    switch {
    case speed < 0.5:  return "anchored"
    case speed < 3.0:  return "slow"
    case speed < 8.0:  return "maneuvering"
    default:           return "transiting"
    }
}
```

Store state in the `TrackState` struct and include it in telemetry WebSocket payloads.

### 4.5 MMSI → Flag & Destination Normalization

**New file:** `server/internal/intelligence/enrichment.go`

**MMSI→flag:** Port the `country_codes.py` MID lookup table (~110 entries, map[int]struct{Code, Name}). The MMSI is already available in the AIS stream metadata.

**Destination normalization:** Port the `destinations.py` variant map (~120 variants → 25 canonical names). Process in `aisstream.go` when `ShipStaticData` messages arrive, before storing.

### 4.6 Anchorage Zone Monitoring

**Extend:** `server/internal/anomaly/geofence.go`

Add the tracker's 11 anchorage zones alongside the existing 4 restricted military zones. The anchorage zones are for congestion monitoring (different purpose):

```go
var AnchorageZones = []Zone{
    {Name: "Fujairah Anchorage", Lat: 25.15, Lon: 56.40, RadiusNM: 10},
    {Name: "Khor Fakkan", Lat: 25.35, Lon: 56.40, RadiusNM: 5},
    {Name: "Dubai / Jebel Ali", Lat: 25.05, Lon: 55.05, RadiusNM: 12},
    // ... 8 more
}
```

Add a `GET /api/analytics/anchorage` endpoint returning vessel counts per zone.

### 4.7 Blockade / Waiting Fleet Detection

**New file:** `server/internal/intelligence/blockade.go`

Implement the tracker's SQL queries against Supabase PostgreSQL:

```sql
-- Waiting fleet 6h+
SELECT COUNT(DISTINCT mmsi) FROM tracks
WHERE last_updated > NOW() - INTERVAL '6 hours'
GROUP BY mmsi
HAVING MAX(speed) < 1.0 AND COUNT(*) >= 3;

-- Waiting fleet 24h+
SELECT COUNT(DISTINCT mmsi) FROM telemetry
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY mmsi
HAVING MAX(speed) < 1.0 AND COUNT(*) >= 10;

-- Strait transits 24h
SELECT COUNT(*) FROM transit_events
WHERE gate_name = 'Strait of Hormuz'
  AND crossed_at > NOW() - INTERVAL '24 hours';
```

Add the data-driven `_assess_situation()` function as a Go equivalent, generating human-readable assessments from numeric indicators.

### 4.8 Summary of Go Changes

| # | File | Action | Description |
|---|---|---|---|
| 1 | `intelligence/gate.go` | **Create** | Gate definition, segment intersection, crossing detection |
| 2 | `intelligence/blockade.go` | **Create** | Waiting fleet, strait status, situation assessment |
| 3 | `intelligence/enrichment.go` | **Create** | MMSI→flag, destination normalization |
| 4 | `geo/landmask.go` | **Create** | Land mask rasterization + point check |
| 5 | `integrations/aisstream.go` | **Modify** | Add data quality filters (speed sentinel, position jump), land check |
| 6 | `intelligence/state.go` | **Extend** | Add vessel state classification, store in TrackState |
| 7 | `anomaly/geofence.go` | **Extend** | Add 11 anchorage zones |
| 8 | `intelligence/pipeline.go` | **Modify** | Add gate crossing check, state classification to pipeline |
| 9 | `api/transit_handlers.go` | **Create** | Transit, hourly, blockade, vessel-states endpoints |
| 10 | `api/data_quality.go` | **Create** | Data quality summary endpoint |
| 11 | `db/schema.go` | **Modify** | Add transit_events, analytics_state tables |

---

## 5. Integration Plan — Python ML Service Enhancement

### 5.1 Clean Up Legacy Code Paths

**Remove or deprecate:**
- `model.py` — Legacy single-IF model. The ensemble in `lib/scoring.py` supersedes it entirely. Keep the file as a reference but remove from `app.py` routing.
- `/predict` endpoint — Redirect to `/api/predict` or return 410 Gone with migration instructions.
- `/train` endpoint — Merge into `/api/train` with actual online training capability (currently returns instructions).

### 5.2 Fix Feature Count Mismatch

**Current:** Go sends 8 features, `VesselFeatures` schema requires 9 (`ewma_deviation` optional with default 0.0).
**Fix:** Either:
- (A) Train models on 8 features only — remove `ewma_deviation` from `VESSEL_COLS`, or
- (B) Have Go backend compute and send `ewma_deviation` (it's already tracked in `TrackStateManager` but not serialized into the gRPC feature vector)

**Recommendation:** (B) — the EWMA deviation is the most informative feature. Check if the gRPC `FeatureVector` proto already includes it (the Go `MLClient.Predict()` may already send it but the field may not be populated). If proto has the field, populate it from `TrackState.deltas.EWMADeviation`. If not, add it to the proto.

### 5.3 GPU Strategy Correction

**Problem:** `requirements-gpu.txt` and `train_gpu.py` target ROCm, but AMD RX 6500 XT is *not* on the ROCm supported GPU list (requires RDNA2 CDNA or Navi 21/31). The existing `docs/plan/ml-unification-plan.md` correctly identifies this and proposes DirectML + ONNX Runtime instead.

**Action:**
1. Remove `requirements-gpu.txt` and `train_gpu.py` (or archive them)
2. Implement the DirectML + ONNX Runtime approach as documented in `ml-unification-plan.md`:
   - `lib/convert.py` — sklearn→ONNX for scaler + IsolationForest (LOF and calibrator stay CPU)
   - `lib/scoring_gpu.py` — ONNX Runtime inference with DirectML EP, CPU fallback
3. Add ONNX artifacts to `.gitignore` (generated at build time)

### 5.4 Online Ensemble Training

**Current:** `/api/train` returns instructions, doesn't actually train.
**Fix:** Implement online training for the ensemble in `lib/training.py`:

```python
def train_ensemble(domain, data, labels=None, contamination=0.05):
    """Train IF + LOF + calibrator in one call."""
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(data)

    iforest = IsolationForest(n_estimators=200, contamination=contamination, ...)
    iforest.fit(X_scaled)

    lof = LocalOutlierFactor(n_neighbors=20, novelty=True, ...)
    lof.fit(X_scaled)

    calibrator = IsotonicRegression(out_of_bounds='clip')
    # ... calibrate using ensemble scores

    joblib.dump({model_iforest, model_lof, scaler, calibrator, ...}, f"{domain}_ensemble.joblib")
```

**Endpoint:** `POST /api/train` accepts `{domain, data, contamination, labels?}` and returns metrics.

### 5.5 Train Missing Domain Models

**Current:** Only `vessel` domain has a trained artifact. Aviation, heatmap, and news have schemas but no models.

**Action:**
1. **Aviation:** Requires OpenSky data. Currently the Go backend collects ADS-B data. Export training data via the existing `/public/top-traces` endpoint or a new `/api/training-data/aviation` endpoint. Train offline.
2. **Heatmap:** 4 features from grid-cell aggregation. Data already exists in the heatmap module. Export and train.
3. **News:** 18 features from the news pipeline. The news pipeline is fully operational. Export scored articles and train.

**Minimum viable:** At least train aviation model (aircraft are actively tracked). Heatmap and news can follow.

### 5.6 Add Transit/Blockade Analytics to ML Scope

**New capability:** Apply the existing ensemble infrastructure to transit and blockade analysis.

**Transit anomaly detection** — features for detecting anomalous transit patterns:
- `crossing_speed` — speed at gate crossing (tanker suddenly speeding → anomalous)
- `time_since_last_transit` — how long since this vessel last crossed (hours)
- `crossing_hour` — time of day (night crossings more suspicious)
- `vessel_state_before_crossing` — was it anchored/maneuvering before crossing
- `destination_match` — does destination match crossing direction (0/1)

**Blockade severity classification** — multi-class model:
- Features: `strait_transits_24h`, `anchored_ratio`, `waiting_fleet_6h`, `waiting_fleet_24h`, `avg_wait_time`, `flag_entropy`, `type_diversity`
- Labels: `normal`, `elevated`, `high`, `critical` (from `_assess_situation` rules)
- Model: XGBoost classifier (already used for conflict severity)

### 5.7 Model Versioning & Promotion

**Current:** `ModelRegistry` in `pipeline.py` handles versioning and promotion with `model_registry.json`. This is functional but manual.

**Enhancements:**
1. Add automated promotion thresholds in the health endpoint response
2. Add a `/api/models/promote` endpoint for programmatic promotion
3. Track model drift — compare current inference distribution vs training distribution
4. Add model warmup on startup (already partially done in `grpc_server.py`)

### 5.8 Summary of ML Service Changes

| # | File | Action | Description |
|---|---|---|---|
| 1 | `app.py` | **Modify** | Remove legacy `/predict` and `/train`; keep only ensemble API |
| 2 | `model.py` | **Archive** | Move to `legacy/` or delete |
| 3 | `schemas.py` | **Archive** | Legacy schemas — no longer needed |
| 4 | `requirements-gpu.txt` | **Delete** | ROCm not supported on target GPU |
| 5 | `train_gpu.py` | **Delete** | ROCm training not viable |
| 6 | `lib/training.py` | **Create** | Online ensemble training (IF+LOF+calibrator in one call) |
| 7 | `lib/convert.py` | **Create** | sklearn→ONNX for scaler + IF |
| 8 | `lib/scoring_gpu.py` | **Create** | ONNX Runtime + DirectML inference pipeline |
| 9 | `lib/features.py` | **Modify** | Add transit_domain and blockade_domain feature schemas |
| 10 | `api/train.py` | **Modify** | Wire online training to FastAPI endpoint |
| 11 | `proto/ml_service.proto` | **Modify** | Add `ewma_deviation` if missing; add transit/blockade domain |
| 12 | `models/` | **Populate** | Train aviation, heatmap, news models |

---

## 6. Integration Plan — Frontend (React)

### 6.1 New Map Layers

| Layer | Data Source | Visualization |
|---|---|---|
| Gate lines | `GET /api/analytics/gate` | Dashed cyan lines on Leaflet map with direction arrows |
| Anchorage zones | `GET /api/analytics/gate` | Semi-transparent circles with vessel count labels |
| Transit events | `GET /api/analytics/transits` | Animated crossing markers (fade in/out) |
| AIS dead zone | Static (gate API) | Red dashed rectangle with "NO COVERAGE" label |
| Danger zone | Static (gate API) | Red polygon overlay for Strait danger area |
| Anomalous vessels | `GET /api/latest` (anomaly flags) | Red markers with dashed border |

### 6.2 New Dashboard Panels

| Panel | Data Source | Content |
|---|---|---|
| Transit counter | `GET /api/analytics/transits?hours=24` | INBOUND/OUTBOUND counts, stacked bar by gate |
| Strait status badge | `GET /api/analytics/blockade` | Colored badge: NO TRANSIT (red) / LIMITED (yellow) / ACTIVE (green) |
| Vessel state pie | `GET /api/analytics/states` | anchored / slow / maneuvering / transiting |
| Anchorage congestion | `GET /api/analytics/states` | Bar chart: vessel count per anchorage zone |
| Waiting fleet | `GET /api/analytics/blockade` | 6h/24h counters with trend indicator |
| Flag distribution | `GET /api/analytics/flags` | Horizontal bar chart (top 10) |
| Data quality | `GET /api/analytics/data-quality` | Clean % gauge + anomaly breakdown |
| Situation report | `GET /api/analytics/blockade` | Auto-generated text assessment (from `_assess_situation`) |

### 6.3 Animated Replay Page

Port the tracker's `/replay` Leaflet.js playback:
- Play/pause, speed control (0.25x–16x), timeline scrubbing
- Keyboard shortcuts: Space (play), arrows (step), +/- (speed)
- Transit ship panel on the side
- Data from `GET /api/replay/frames?hours=96&interval=30`

### 6.4 Ship Profile Panel

New page/panel triggered by clicking a vessel marker:
- Ship name, type, flag, destination, dimensions
- Position history track (last 6h) shown as polyline
- Transit history (all gates crossed)
- MMSI → flag lookup display
- Destination normalization display
- Data from `GET /api/ship/{mmsi}/profile`

---

## 7. Database Changes

### 7.1 New Tables (Supabase PostgreSQL)

```sql
-- Transit events: detected gate-line crossings
CREATE TABLE IF NOT EXISTS transit_events (
    id BIGSERIAL PRIMARY KEY,
    mmsi BIGINT NOT NULL,
    gate_name TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
    crossed_at TIMESTAMPTZ NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    speed REAL,
    ship_name TEXT,
    ship_type INTEGER,
    flag TEXT,
    destination TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transit_crossed_at ON transit_events(crossed_at);
CREATE INDEX IF NOT EXISTS idx_transit_mmsi ON transit_events(mmsi);
CREATE INDEX IF NOT EXISTS idx_transit_gate ON transit_events(gate_name);
CREATE INDEX IF NOT EXISTS idx_transit_dedup ON transit_events(mmsi, gate_name, crossed_at);

-- Analytics state: key-value store for last-check timestamps
CREATE TABLE IF NOT EXISTS analytics_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.2 Schema Migrations (Existing Tables)

```sql
-- Add flag column to tracks table (if not already present)
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS flag TEXT;

-- Add destination_normalized column
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS destination_normalized TEXT;

-- Add vessel_state column
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS vessel_state TEXT;

-- Add data_quality column (JSONB for anomaly flags)
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS data_quality JSONB DEFAULT '[]';

-- Add ship_type_label column (denormalized for query performance)
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS ship_type_label TEXT;
```

---

## 8. API Surface Changes

### 8.1 New Endpoints (Go Backend)

| Method | Endpoint | Description | Source |
|---|---|---|---|
| GET | `/api/analytics/transits?hours=24&gate=` | Transit events with per-gate breakdown | tracker `/api/analytics/transits` |
| GET | `/api/analytics/transit-ships?hours=0&gate=` | Detailed list of ships that crossed gates | tracker `/api/analytics/transit-ships` |
| GET | `/api/analytics/hourly?hours=48&gate=` | Hourly transit counts for charting | tracker `/api/analytics/hourly` |
| GET | `/api/analytics/states` | Vessel state classification + anchorage zone counts | tracker `/api/analytics/states` |
| GET | `/api/analytics/blockade` | Waiting fleet, anchored ratio, strait status, situation | tracker `/api/analytics/blockade` |
| GET | `/api/analytics/flags?hours=24` | Flag state distribution (MMSI MID) | tracker `/api/analytics/flags` |
| GET | `/api/analytics/destinations?hours=24` | Destination distribution (normalized) | tracker `/api/analytics/destinations` |
| GET | `/api/analytics/gate` | Gate lines, anchorage zones, danger zone, crisis timeline | tracker `/api/analytics/gate` |
| GET | `/api/analytics/data-quality` | AIS anomaly counts, known glitch sources | tracker `/api/analytics/data-quality` |
| GET | `/api/analytics/summary` | Comprehensive daily summary | tracker `/api/analytics/summary` |
| GET | `/api/ship/{mmsi}/profile` | Full ship profile — positions, transits, metadata | tracker `/api/ship/{mmsi}/profile` |
| GET | `/api/replay/frames?hours=96&interval=30` | Position data bucketed for animated replay | tracker `/api/replay/frames` |

### 8.2 Enhanced Existing Endpoints

| Endpoint | Enhancement |
|---|---|
| `GET /api/latest` | Add `anomaly_flags` array, `vessel_state`, `flag`, `destination_normalized`, `anchorage_zone` fields |
| `GET /api/tracks/active` | Add `vessel_state`, `anchorage_zone`, `transit_count` fields |
| `GET /api/vessels` | Add filter params: `?state=anchored&zone=Dubai&flag=PA&type=Tanker` |

### 8.3 Python ML Service — New Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST /api/train` | **Enhanced** | Accept training data and actually train (not just return instructions) |
| `POST /api/predict` | **Enhanced** | Add `transit` and `blockade` domains |
| `GET /api/models` | **Enhanced** | Add training metrics, last trained timestamp, drift indicators |
| `POST /api/models/promote` | **New** | Promote a model version to production |
| `GET /api/export/{domain}` | **New** | Export training data from DB for a domain |

---

## 9. Performance & Scaling Considerations

### 9.1 Transit Detection Performance

**Tracker's approach:** Periodic scan (every 5 min) of all positions since last check. At ~43,000 positions/day, each 5-min window averages ~150 positions. Processing 150 positions against 3 gates with a 30 NM pre-filter = ~3 segment intersection tests per position pair. Total: ~450 geometry ops per cycle. Negligible.

**HormuzWatch approach:** Synchronous check using TrackStateManager ring buffer (20 positions per vessel). For 384 active vessels × 2 consecutive pairs per check = ~768 checks in-memory, no DB query needed. Faster but may miss crossings if positions for a vessel arrive with gaps > ring buffer size.

**Decision:** Use synchronous check as primary (real-time), periodic DB scan as fallback (catches missed crossings).

### 9.2 Land Mask Performance

At 0.05° grid resolution: ~134,400 cells in the Gulf region. Each lookup is O(1) array access + bounds check. Adding a land check to every AIS position (~1-2/sec average, peak ~10/sec) adds negligible overhead.

### 9.3 ML Inference Performance

**Current:** ~8-15 ms per sample (CPU), 2-5 ms (projected GPU). Add transit and blockade domains:
- Transit anomaly: same inference path, different features → same cost
- Blockade severity: XGBoost classifier (already used in conflict_predictor) → ~2-5 ms

**Total additional ML cost:** ~5-10 ms per domain. Fits within the existing Go backend's 500ms gRPC timeout.

### 9.4 Database Query Performance

The new analytics endpoints query aggregated data (counts, groups). Recommended indexes already defined above. For the hourly transit chart, pre-aggregate in a materialized view or cache the result with a 5-minute TTL.

---

## 10. Implementation Phases

### Phase 1: Core AIS Enhancements (Week 1)

**Goal:** Land mask, data quality filters, and vessel state classification — the lowest-hanging fruit with immediate accuracy improvements.

| Step | Description | Files |
|---|---|---|
| 1.1 | Create land mask grid from GeoJSON | `geo/landmask.go` |
| 1.2 | Add data quality filters to AIS stream handler | `integrations/aisstream.go` |
| 1.3 | Add vessel state classification | `intelligence/state.go` |
| 1.4 | Add MMSI→flag enrichment | `intelligence/enrichment.go` |
| 1.5 | Add destination normalization | `intelligence/enrichment.go` |
| 1.6 | Expose new fields in API responses | `api/tracks.go`, `api/handlers.go` |
| 1.7 | DB migrations for new columns | `db/schema.go` |

**Verification:** Run AIS stream, verify < 17% positions filtered, vessel states classified correctly, flags appear in API.

### Phase 2: Gate Lines & Transit Detection (Week 2)

**Goal:** The most impactful missing feature — knowing when vessels cross the Strait.

| Step | Description | Files |
|---|---|---|
| 2.1 | Implement gate line geometry + intersection | `intelligence/gate.go` |
| 2.2 | Integrate crossing detection into pipeline | `intelligence/pipeline.go` |
| 2.3 | Create transit_events DB table + queries | `db/schema.go` |
| 2.4 | Transit API endpoints | `api/transit_handlers.go` |
| 2.5 | Frontend: gate lines on map, transit counter panel | `client-v2/` |

**Verification:** Simulate vessel crossing gate line, verify transit event created, deduplication works, API returns correct INBOUND/OUTBOUND counts.

### Phase 3: Anchorages, Blockade & Data Quality (Week 2-3)

**Goal:** Anchorage congestion monitoring, waiting fleet detection, and AIS quality dashboard.

| Step | Description | Files |
|---|---|---|
| 3.1 | Add 11 anchorage zones | `anomaly/geofence.go` |
| 3.2 | Implement blockade/waiting fleet queries | `intelligence/blockade.go` |
| 3.3 | Situation assessment engine | `intelligence/blockade.go` |
| 3.4 | Blockade + data quality API endpoints | `api/transit_handlers.go`, `api/data_quality.go` |
| 3.5 | Frontend: strait status badge, anchorage panel | `client-v2/` |

### Phase 4: ML Service Cleanup & Enhancement (Week 3-4)

**Goal:** Remove dead code, fix feature mismatch, add online training, train missing domains.

| Step | Description | Files |
|---|---|---|
| 4.1 | Remove legacy `/predict` and `model.py` | `app.py`, archive `model.py` |
| 4.2 | Delete ROCm GPU code | `train_gpu.py`, `requirements-gpu.txt` | **KEPT** — retained for future Linux ROCm deployment |
| 4.3 | Fix ewma_deviation in proto if needed | `proto/ml_service.proto` | **DONE** — Go backend already passes ewma_deviation in gRPC feature vector |
| 4.4 | Implement online ensemble training | `lib/training.py` | Pending |
| 4.5 | Wire `/api/train` to actual training | `app.py` | Pending |
| 4.6 | Train aviation domain model | `api/train.py` (CLI) | Pending |
| 4.7 | Add transit + blockade feature schemas | `lib/features.py` | Pending |
| 4.8 | Implement DirectML+ONNX GPU path | `lib/convert.py`, `lib/scoring_gpu.py` | Pending (future Linux deployment) |

### Phase 5: Frontend & Visualization (Week 4-5)

**Goal:** Complete dashboard panels, animated replay, ship profiles.

| Step | Description | Files |
|---|---|---|
| 5.1 | New dashboard panels (all 8 listed above) | `client-v2/src/app/routes/dashboard/` |
| 5.2 | Map layers (gates, anchorages, dead zone) | `client-v2/src/components/map/` |
| 5.3 | Ship profile panel/page | `client-v2/src/app/routes/ship/` |
| 5.4 | Animated replay page | `client-v2/src/app/routes/replay/` |
| 5.5 | Data quality dashboard section | `client-v2/src/app/routes/admin/` |

### Phase 6: Polish & Production Readiness (Week 5-6)

**Goal:** Testing, monitoring, documentation, performance tuning.

| Step | Description |
|---|---|
| 6.1 | End-to-end integration tests |
| 6.2 | Load testing (simulated AIS stream at 10x normal rate) |
| 6.3 | Prometheus metrics for all new features |
| 6.4 | Alert rules (no transit for 24h = critical alert) |
| 6.5 | Documentation updates |
| 6.6 | Performance profiling and optimization |

---

## 11. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| **AIS dead zone means transit detection unreliable** | High | Certain | The tracker already documents this — 0 strait crossings detected despite active traffic. Document clearly. Consider satellite AIS as future enhancement. |
| **Additional Go packages bloat binary** | Low | Medium | Land mask uses grid (no external dependency). Gate detection uses existing Haversine code. Only net-new dependency: none significant. |
| **Feature mismatch breaks ML inference** | High | Low | Fix proto to include ewma_deviation and have Go populate it. Backward-compatible. |
| **AMD GPU DirectML support flaky** | Medium | Medium | Always maintain CPU fallback (current ensemble already works on CPU). GPU path as optional optimization. |
| **Database migration on production** | Medium | Low | All new tables use `CREATE TABLE IF NOT EXISTS`. Column additions use `ADD COLUMN IF NOT EXISTS`. Zero-downtime. |
| **Frontend bundle size increase** | Low | Low | New panels are incremental. Lazy-load dashboard sub-panels via React Router route splitting. |
| **Tracker's SQLite queries don't directly port to PostgreSQL** | Low | Medium | SQLite datetime functions differ from PostgreSQL. Use parameterized queries and test. |

---

## 12. Success Metrics

### Quantitative

| Metric | Current | Target | How Measured |
|---|---|---|---|
| AIS positions filtered (data quality) | 0% (none filtered) | ~17% (matches tracker findings) | Prometheus counter |
| Gate-line crossings detected | 0 (no detection) | Tracked per gate per hour | `transit_events` table |
| Vessel states classified | 0% | 100% of active vessels | API response field |
| ML model domains trained | 1/4 (vessel only) | 3/4 (vessel + aviation + transit) | `/api/models` endpoint |
| ML inference latency (p99) | ~30ms | < 20ms (CPU), < 10ms (GPU) | gRPC client metrics |
| Dashboard panels with live data | 3 (map + anomaly + news) | 11 (all 8 new + 3 existing) | Manual count |
| API endpoints returning data | ~15 | ~27 (12 new) | Health check |

### Qualitative

- Transit events appear within 1 minute of vessel crossing a gate line
- Situation assessment text is coherent and data-driven (not hardcoded)
- Anomalous AIS positions are visibly flagged on the map (red border)
- Anchorage congestion is visible at a glance from the dashboard
- Ship profiles show complete history: track + transits + metadata
- Model training can be triggered from the API without SSH/CLI access

---

## Appendix A: Key Differences — Tracker vs HormuzWatch

| Aspect | hormuz-ship-tracker | HormuzWatch |
|---|---|---|
| **Language** | Python 3.12 | Go 1.23 + Python 3.11 |
| **Database** | SQLite (single file) | PostgreSQL (Supabase) |
| **Deployment** | Raspberry Pi 5 + Docker | Docker + Azure (Terraform) |
| **Scope** | Pure AIS vessel tracking | Multi-source intelligence (AIS + ADS-B + News + GDELT + FIRMS) |
| **ML** | None (rule-based only) | Ensemble IF+LOF+calibrator, XGBoost conflict, SHAP |
| **Auth** | None (public dashboard) | Supabase JWT + admin roles |
| **Scale** | Single region, ~384 vessels | 6 regions, multi-domain |
| **Visualization** | matplotlib PNG/GIF + Leaflet | React 19 + Leaflet + Chart.js |
| **Data sharing** | Hugging Face dataset | Internal/private |

## Appendix B: Proto Changes (if needed)

```protobuf
// Current FeatureVector in ml_service.proto:
message FeatureVector {
    double course_delta = 1;
    double heading_delta = 2;
    double speed_delta = 3;
    double average_speed = 4;
    double speed_variance = 5;
    double ais_gap_minutes = 6;
    double dist_restricted_zone = 7;
    double dist_historical_site = 8;
    // MISSING: double ewma_deviation = 9;
}

// Proposed: add field 9 (backward-compatible — new field, default 0.0)
message FeatureVector {
    // ... existing fields 1-8 ...
    double ewma_deviation = 9;  // NEW: z-score vs per-track EWMA baseline
}

// Proposed: add new domains for transit and blockade
// TransitAnomalyFeatures: 5 fields
// BlockadeFeatures: 7 fields
```

## Appendix C: Directory Structure After Integration

```
server/internal/
├── intelligence/
│   ├── pipeline.go          # Modified: gate check, state classification
│   ├── gate.go              # NEW: gate definitions, crossing detection
│   ├── blockade.go          # NEW: waiting fleet, strait status, situation
│   ├── enrichment.go        # NEW: MMSI→flag, destination normalization
│   ├── state.go             # Modified: vessel state classification
│   ├── features.go          # Unchanged
│   ├── composite.go         # Unchanged
│   ├── ml_client.go         # Modified: add transit/blockade domains
│   ├── trainer.go           # Unchanged
│   └── geopolitical.go      # Unchanged
├── geo/
│   ├── haversine.go         # Unchanged
│   ├── attack.go            # Unchanged
│   └── landmask.go          # NEW: land mask grid + point check
├── anomaly/
│   ├── scorer.go            # Unchanged
│   └── geofence.go          # Modified: add 11 anchorage zones
├── api/
│   ├── handlers.go          # Unchanged
│   ├── tracks.go            # Modified: add new filter params
│   ├── transit_handlers.go  # NEW: 12 transit/blockade/analytics endpoints
│   ├── data_quality.go      # NEW: AIS data quality endpoint
│   └── ...                  # Existing handlers unchanged
├── integrations/
│   └── aisstream.go         # Modified: add data quality + land filters
└── db/
    └── schema.go            # Modified: transit_events, analytics_state tables
```

---

**Document version:** 1.0
**Next step:** Review and approval before Phase 1 implementation begins.
