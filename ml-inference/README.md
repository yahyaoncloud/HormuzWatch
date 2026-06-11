# HormuzWatch ML Inference Service

Vercel-hosted Python serverless function providing ensemble anomaly scoring for the HormuzWatch strategic intelligence platform.

Three domain-specific models are served:

| Domain | Features | Description |
|---|---|---|
| `vessel` | 9 | Maritime vessel kinematic anomaly detection |
| `aviation` | 9 | Aircraft track anomaly detection (OpenSky) |
| `heatmap` | 4 | Regional geospatial event density anomaly detection |

Each model is an **IsolationForest + LocalOutlierFactor ensemble** calibrated by an **IsotonicRegression** to produce a 0–100 probability score, with optional **SHAP** feature attribution.

---

## Project Structure

```
ml-inference/
├── api/
│   ├── predict.py          # Vercel handler — POST /api/predict
│   └── train.py            # Offline training script (NOT deployed)
├── lib/
│   ├── features.py         # Pydantic schemas + canonical feature ordering
│   └── scoring.py          # Ensemble scoring pipeline
├── models/                 # .joblib artifacts (produced by train.py)
│   ├── vessel_ensemble.joblib
│   ├── aviation_ensemble.joblib
│   └── heatmap_ensemble.joblib
├── tests/
│   └── test_scoring.py     # Unit tests
├── requirements.txt        # Runtime deps (no pandas)
└── vercel.json
```

---

## Quickstart: Training Model Artifacts

### Prerequisites

```bash
pip install scikit-learn numpy pydantic joblib shap pandas pytest
```

### Prepare Training Data

Each domain requires a CSV (or JSON) file where every row represents one historical telemetry observation.

**Vessel features (9 columns):**
```
course_delta, heading_delta, speed_delta, average_speed,
speed_variance, ais_gap_minutes, dist_restricted_zone,
dist_historical_site, ewma_deviation
```

**Aviation features (9 columns):**
```
course_delta, alt_delta, speed_delta, average_speed,
speed_variance, gap_minutes, dist_restricted_airspace,
squawk_anomaly_flag, ewma_deviation
```

**Heatmap features (4 columns):**
```
event_density_grid, event_velocity, gdelt_firms_ratio,
distance_to_nearest_track
```

### Optional: Label File

For calibrated probabilities, supply a companion CSV with a single `label` column (`0` = normal, `1` = anomalous). Row count must match the feature file exactly.

### Run Training

```bash
# From the ml-inference/ directory:

# Unsupervised (no labels; sigmoid calibration fallback — outputs a warning)
python api/train.py --domain vessel --input data/vessel_tracks.csv

# With labels (calibrated isotonic regression; prints AUC-ROC + precision/recall)
python api/train.py --domain vessel --input data/vessel_tracks.csv \
    --labels data/vessel_labels.csv

python api/train.py --domain aviation --input data/aviation_tracks.csv \
    --labels data/aviation_labels.csv

python api/train.py --domain heatmap --input data/heatmap_cells.csv
```

Artifacts are written to `models/{domain}_ensemble.joblib`.

> **Note:** `pandas` is only required for `train.py`. It is intentionally excluded from `requirements.txt` to keep the Vercel cold-start bundle small.

---

## Deploying to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# From ml-inference/ directory
vercel deploy --prod

# Commit the models/ directory — Vercel bundles them with the function
git add models/*.joblib
```

> **Important:** Commit the `.joblib` files to the repository. Vercel bundles the entire project root with the function. The models are loaded into module-level globals on first invocation and reused on warm calls.

---

## API Reference

### `POST /api/predict`

#### Request

```json
{
  "domain":  "vessel",
  "features": {
    "course_delta":          52.1,
    "heading_delta":        -48.3,
    "speed_delta":          -8.0,
    "average_speed":         6.5,
    "speed_variance":        9.2,
    "ais_gap_minutes":       22.0,
    "dist_restricted_zone":  1.4,
    "dist_historical_site":  3.8,
    "ewma_deviation":        2.7
  },
  "explain": true
}
```

#### Successful Response (200)

```json
{
  "domain":            "vessel",
  "probability":       74.2,
  "is_anomaly":        true,
  "raw_iforest_score": -0.182,
  "raw_lof_score":     -0.231,
  "inference_time_ms": 63.4,
  "model_version":     "2026-06-11T15:10:00.000000+00:00",
  "shap_contributions": [
    { "feature": "course_delta",       "value": 52.1, "contribution": -0.034, "direction": "anomalous" },
    { "feature": "ais_gap_minutes",    "value": 22.0, "contribution": -0.029, "direction": "anomalous" },
    { "feature": "dist_restricted_zone","value": 1.4,  "contribution": -0.021, "direction": "anomalous" },
    { "feature": "ewma_deviation",     "value": 2.7,  "contribution": -0.018, "direction": "anomalous" },
    { "feature": "speed_delta",        "value": -8.0, "contribution": -0.012, "direction": "anomalous" },
    { "feature": "average_speed",      "value": 6.5,  "contribution":  0.006, "direction": "normal"    },
    { "feature": "heading_delta",      "value": -48.3,"contribution": -0.005, "direction": "anomalous" },
    { "feature": "speed_variance",     "value": 9.2,  "contribution": -0.003, "direction": "anomalous" },
    { "feature": "dist_historical_site","value": 3.8, "contribution":  0.001, "direction": "normal"    }
  ]
}
```

#### Aviation Request

```json
{
  "domain": "aviation",
  "features": {
    "course_delta":            15.0,
    "alt_delta":             -800.0,
    "speed_delta":            -45.0,
    "average_speed":          230.0,
    "speed_variance":          12.0,
    "gap_minutes":              1.5,
    "dist_restricted_airspace": 3.0,
    "squawk_anomaly_flag":      1.0,
    "ewma_deviation":           1.8
  },
  "explain": false
}
```

#### Heatmap Request

```json
{
  "domain": "heatmap",
  "features": {
    "event_density_grid":        28.0,
    "event_velocity":             3.5,
    "gdelt_firms_ratio":          4.2,
    "distance_to_nearest_track":  1.1
  },
  "explain": false
}
```

#### Error Responses

| Status | Condition |
|---|---|
| `400` | Malformed JSON body |
| `422` | Unknown domain or feature validation failure |
| `500` | Model artifact not found or internal error |

---

## Go Backend Integration

The Go backend's `MLClient` already implements a 500ms timeout and graceful degradation. To integrate with this Vercel endpoint, update `ML_SERVICE_URL` in the server `.env`:

```bash
# .env (server)
ML_SERVICE_URL=https://your-deployment.vercel.app
```

The existing `MLClient` in `server/internal/intelligence/ml_client.go` sends:

```go
// POST {ML_SERVICE_URL}/predict
type MLPredictRequest struct {
    TrackID  string           `json:"track_id"`
    Features MLFeaturePayload `json:"features"`
}
```

This needs a minor adaptation to include the `domain` field:

```go
type VercelPredictRequest struct {
    Domain   string           `json:"domain"`   // "vessel" or "aviation"
    Features MLFeaturePayload `json:"features"`
    Explain  bool             `json:"explain"`
}
```

**Graceful degradation (already implemented in Go):**

```go
func (c *MLClient) Predict(features FeatureVector) (float64, *MLExplanation) {
    // 500ms timeout — if Vercel cold-start or network fails:
    // returns 0.0, nil
    // ComputeComposite then uses mlScore=0.0 and continues with rule + geo
}
```

On ML service unavailability, the composite score formula degrades cleanly:

```
FinalScore = RuleScore × 0.40 + 0.0 × 0.40 + GeoScore × 0.20
           → effectively re-weighted to rule+geo only
```

No changes to the frontend or scoring engine are required — the ML layer is fully opt-in.

---

## Running Tests

```bash
cd ml-inference/
pytest tests/ -v
```

Expected output (without SHAP installed — SHAP tests auto-skip):

```
tests/test_scoring.py::TestNormalizeRawScore::test_score_zero_maps_to_zero PASSED
tests/test_scoring.py::TestNormalizeRawScore::test_score_minus_one_maps_to_one PASSED
...
tests/test_scoring.py::TestScoreFunction::test_extreme_anomalous_vector_scores_higher PASSED
== 24 passed in 3.1s ==
```

---

## Scoring Pipeline Summary

```
Input feature dict
       │
       ▼
Pydantic validation + to_array()
       │
       ▼
StandardScaler.transform()          (saved scaler from training)
       │
       ├──▶ IsolationForest.score_samples() → raw_if  ∈ [-1, 0]
       │                                              │
       └──▶ LOF.score_samples()             → raw_lof ∈ [-1, 0]
                                                       │
                         normalize: (-1→1, 0→0)        │
                         average: ensemble_01 ∈ [0, 1] ◀┘
                                                       │
                         IsotonicRegression.predict()  │
                                                       │
                         probability ∈ [0, 100] ◀──────┘
                                                       │
              (if explain=True)                        │
              shap.TreeExplainer(iforest) ─────▶ ranked contributions
```

---

## Cost & Performance Notes

- **Cold start:** ~3-8s (scikit-learn + SHAP import). Vercel `maxDuration=15s`.
- **Warm inference:** 30-80ms without SHAP; 80-250ms with SHAP.
- **Vercel Free tier:** 100k function invocations/month. At HormuzWatch's scale (100-500 vessels × 0.1 req/s), this is ~43M calls/month — **upgrade to Vercel Pro or migrate to Azure Container Apps for production**.
- **Alternative:** Deploy this as an Azure Container App (same `requirements.txt`, replace the Vercel handler with a FastAPI wrapper). The `lib/` and `models/` directories are shared.
