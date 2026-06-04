# HormuzWatch Intelligence Platform — Production Architecture Review & Redesign

**Classification**: UNCLASSIFIED // FOUO  
**Author**: Principal ML Engineer / Geospatial Intelligence Architect  
**Date**: 2026-06-04  
**Status**: DRAFT — Pending stakeholder review

---

## Table of Contents

1. [Critical Architectural Review](#1-critical-architectural-review)
2. [Feature Engineering Redesign](#2-feature-engineering-redesign)
3. [Model Architecture Comparison & Selection](#3-model-architecture-comparison--selection)
4. [Multi-Model Intelligence Engine](#4-multi-model-intelligence-engine)
5. [Explainable AI System](#5-explainable-ai-system)
6. [Continuous Learning Architecture](#6-continuous-learning-architecture)
7. [Adversarial Resilience](#7-adversarial-resilience)
8. [Future-State Architecture](#8-future-state-architecture)
9. [Database Design](#9-database-design)
10. [API Contracts](#10-api-contracts)
11. [Cloud Deployment & Scaling](#11-cloud-deployment--scaling)
12. [Latency Budget](#12-latency-budget)
13. [Trade-Off Analysis](#13-trade-off-analysis)

---

## 1. Critical Architectural Review

### 1.1 Current System Inventory

| Component | File | Function |
|:---|:---|:---|
| Track State Manager | `intelligence/state.go` | In-memory ring buffer, 20 observations per track |
| Feature Extractor | `intelligence/features.go` | 8 features, Euclidean distance (not Haversine) |
| Rule Scorer | `anomaly/scorer.go` | 5-factor linear proportional scorer, max 100 pts |
| Geofence Engine | `anomaly/geofence.go` | 4 hardcoded radius zones, ray-casting polygon |
| Geopolitical Kernel | `intelligence/geopolitical.go` | Distance-weighted temporal decay, 1-hour window |
| Composite Scorer | `intelligence/composite.go` | `Final = Rule×0.4 + ML×0.4 + Geo×0.2` |
| ML Client | `intelligence/ml_client.go` | HTTP POST to Python, 500ms hard timeout |
| Isolation Forest | `ml-service/model.py` | 200 trees, 5% contamination, `joblib` serialization |
| Trainer | `intelligence/trainer.go` | Hourly batch retrain from in-memory tracks |

### 1.2 Weaknesses

> [!CAUTION]
> **W-1: Distance Calculations Use Euclidean Geometry on a Sphere**  
> `features.go:63` computes `math.Sqrt(math.Pow(lat-zone.CenterLat, 2) + math.Pow(lon-zone.CenterLon, 2))`.  
> At 26°N latitude, 1° longitude ≈ 100 km but 1° latitude ≈ 111 km. This 10% error distorts every geofence check and distance feature. At the equator the error is small; at the Strait of Hormuz it is operationally significant for zone boundaries.

> [!CAUTION]
> **W-2: Training Data = Live Inference Data (Data Leakage)**  
> `trainer.go` pulls features from the same `TrackStateManager` that is actively being scored. The model trains on the same distribution it is currently evaluating. This creates a **circular dependency**: the model learns the current operating state as "normal," including any active threat that has been present for >5 observations. A slow-moving adversary who establishes a pattern-of-life over hours will be learned as baseline.

> [!WARNING]
> **W-3: No Feature Normalization**  
> `course_delta` ranges [0, 180], `ais_gap_minutes` ranges [0, ∞), `dist_restricted_zone` ranges [0, 999]. Isolation Forest partitions uniformly — features with larger ranges dominate the split decisions. `dist_restricted_zone=999` (the sentinel value for "no zones defined") will dominate every split.

> [!WARNING]
> **W-4: In-Memory State is Ephemeral**  
> `TrackStateManager` stores all state in RAM. A server restart loses all track history, all pattern-of-life baselines, and all geopolitical events. The model returns to `v0.0.0` (neutral score) until 50 tracks accumulate again.

> [!WARNING]
> **W-5: Single-Point Scoring (No Trajectory Analysis)**  
> Every telemetry frame is scored in isolation against the previous frame. There is no concept of a *trajectory* — a sequence of positions that forms a route. A vessel making a slow, deliberate 180° turn over 30 minutes will never trigger the `courseDelta > 10°` threshold at any single frame, yet the aggregate behavior is a complete course reversal.

> [!IMPORTANT]
> **W-6: Static Composite Weights**  
> The 0.4/0.4/0.2 split is hardcoded. During periods of elevated geopolitical tension (e.g., IRGCN exercises), the geopolitical weight should increase. During periods of ML model uncertainty (freshly retrained, few samples), the rule weight should increase. There is no adaptive weighting mechanism.

### 1.3 Failure Modes

| ID | Failure | Impact | Current Mitigation |
|:---|:---|:---|:---|
| F-1 | ML service crash | 40% of scoring capacity lost | Graceful degradation returns 0.0 |
| F-2 | Server restart | All track state lost, model returns to v0.0.0 | None |
| F-3 | AISStream WebSocket disconnect | No maritime telemetry | Reconnection loop exists |
| F-4 | OpenSky rate limit (429) | No aviation telemetry for polling interval | Waits for next tick |
| F-5 | Training on < 50 tracks | Model not retrained | Job skips, logs warning |
| F-6 | Geopolitical store saturated | Score inflation from stale events | 1-hour purge exists |

### 1.4 Model Drift Risks

- **Concept drift**: Maritime traffic patterns change seasonally (monsoon routing), during geopolitical escalation, and during Ramadan/holidays. The 1-hour retrain window is too short to capture seasonal patterns and too long to react to sudden escalation.
- **Data drift**: OpenSky returns velocity in m/s while AIS reports in knots. If the conversion is inconsistent, the speed features will drift between sources.
- **Label drift**: There are no labels. The system has no ground truth for what constitutes a real threat vs. a false positive.

### 1.5 Adversarial Exploitation Opportunities

| Attack | Mechanism | Current Detection |
|:---|:---|:---|
| **AIS spoofing** | Report false position/speed/heading | None — system trusts all AIS data |
| **MMSI cloning** | Multiple vessels share an identity | None — `TrackID` is assumed unique |
| **Slow normalization** | Gradually shift behavior to make evasion the new baseline | Retraining absorbs the adversary's pattern |
| **GPS manipulation** | Broadcast false GNSS signals to alter reported positions | None |
| **Data poisoning** | Flood the system with synthetic normal traffic to dilute anomaly baseline | No sample validation or outlier rejection during training |

### 1.6 Scalability Bottlenecks

- `GeopoliticalStore.ScoreForLocation()` iterates **all events** for every telemetry frame. With 200 FIRMS events and 500 AIS updates/minute, this is O(n×m) per scoring cycle.
- `TrackStateManager` uses a single `sync.RWMutex`. Under high concurrency (1000+ tracks), write contention on `Update()` becomes a bottleneck.
- ML inference is synchronous HTTP — every telemetry frame blocks on a network roundtrip to the Python service.

### 1.7 Explainability Gaps

The current system returns:
```json
{ "score": 72, "severity": "high", "reasons": ["Course deviation: 45.2° (> 10° threshold)"] }
```

What an analyst actually needs:
```json
{
  "score": 72,
  "confidence": 0.87,
  "severity": "high",
  "decomposition": {
    "rule_contribution": 34,
    "ml_contribution": 28,
    "geo_contribution": 10
  },
  "primary_factors": [
    { "factor": "Course Deviation", "value": 45.2, "threshold": 10.0, "impact_pct": 32, "trend": "escalating" },
    { "factor": "AIS Silence",     "value": 12.0, "threshold": 5.0,  "impact_pct": 24, "trend": "stable" }
  ],
  "ml_explainability": {
    "isolation_depth": 4.2,
    "top_feature_contributions": [
      { "feature": "course_delta", "shap_value": 0.34 },
      { "feature": "ais_gap_minutes", "shap_value": 0.28 }
    ]
  },
  "historical_context": {
    "similar_incidents": 3,
    "last_similar": "2025-11-14T08:30:00Z",
    "outcome": "IRGCN fast-boat interdiction"
  }
}
```

### 1.8 Feature Engineering Limitations

| Limitation | Impact |
|:---|:---|
| No trajectory-level features (route deviation, loitering detection) | Cannot detect strategic maneuvers |
| No fleet-level features (convoy detection, rendezvous probability) | Cannot detect coordinated activity |
| No pattern-of-life baseline per vessel | Cannot distinguish routine vs. anomalous for a specific identity |
| No maritime-specific domain features (draft change, AIS message type analysis) | Misses domain-critical signals |
| Distance computed as Euclidean, not Haversine/Vincenty | 10%+ error at Hormuz latitude |

---

## 2. Feature Engineering Redesign

### 2.1 Feature Taxonomy

```
┌─────────────────────────────────────────────────────────────────┐
│                    FEATURE ENGINEERING LAYERS                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  L1: KINEMATIC (per-frame)                                      │
│  ├── course_delta             (existing, keep)                  │
│  ├── heading_delta            (existing, keep)                  │
│  ├── speed_delta              (existing, keep)                  │
│  ├── speed_over_ground        (new: raw SOG)                    │
│  ├── rate_of_turn             (new: degrees/minute)             │
│  └── acceleration             (new: knots/minute)               │
│                                                                 │
│  L2: STATISTICAL (window-level, N=20)                           │
│  ├── average_speed            (existing, keep)                  │
│  ├── speed_variance           (existing, keep)                  │
│  ├── heading_entropy          (new: Shannon entropy of heading)  │
│  ├── speed_percentile_rank    (new: where is current speed       │
│  │                             relative to window)              │
│  └── jerk_magnitude           (new: derivative of acceleration)  │
│                                                                 │
│  L3: TRAJECTORY (route-level)                                   │
│  ├── route_deviation_score    (new: DTW to nearest TSS lane)    │
│  ├── loitering_score          (new: convex hull area / time)    │
│  ├── dark_activity_score      (new: transponder off/on ratio)   │
│  ├── distance_traveled        (new: cumulative Haversine)       │
│  ├── straightness_index       (new: displacement / distance)    │
│  └── corridor_penetration     (new: depth into restricted lane) │
│                                                                 │
│  L4: BEHAVIORAL (identity-level)                                │
│  ├── pattern_of_life_deviation(new: deviation from vessel's     │
│  │                             historical behavior profile)     │
│  ├── port_hopping_frequency   (new: unique ports / 30 days)     │
│  ├── flag_state_risk          (new: lookup against risk DB)     │
│  ├── sanctions_proximity      (new: owner/operator on OFAC)     │
│  └── historical_anomaly_rate  (new: past 30-day anomaly %)      │
│                                                                 │
│  L5: FLEET-LEVEL (multi-entity)                                 │
│  ├── rendezvous_probability   (new: CPA < 0.5nm + low speed)   │
│  ├── convoy_participation     (new: N vessels within 2nm,       │
│  │                             same heading ±5°)                │
│  ├── swarm_density            (new: vessels within 5nm radius)  │
│  └── anomaly_cluster_score    (new: nearby vessels also scored) │
│                                                                 │
│  L6: GEOSPATIAL (context-level)                                 │
│  ├── dist_restricted_zone     (existing, fix to Haversine)      │
│  ├── dist_historical_site     (existing, fix to Haversine)      │
│  ├── threat_heatmap_density   (new: from geopolitical kernel)   │
│  ├── tss_lane_compliance      (new: within designated TSS?)     │
│  ├── depth_bathymetry         (new: water depth at position)    │
│  └── anchorage_proximity      (new: near known anchorage?)      │
│                                                                 │
│  L7: TEMPORAL (time-context)                                    │
│  ├── hour_of_day_sin/cos      (new: cyclical time encoding)     │
│  ├── day_of_week_sin/cos      (new: cyclical day encoding)      │
│  ├── is_night                 (new: boolean, local time)        │
│  ├── tidal_state              (new: high/low/ebb/flood)         │
│  └── visibility_conditions    (new: from weather integration)   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Key New Feature Definitions

#### Route Deviation Score
```
deviation = DTW(observed_trajectory, nearest_TSS_reference_route)
score = min(100, deviation / max_expected_deviation × 100)
```
The Traffic Separation Scheme (TSS) in the Strait of Hormuz defines two lanes: inbound (south) at ~270° and outbound (north) at ~090°. Vessels deviating from these lanes without pilot notification are suspicious.

#### Loitering Score
```
hull_area = ConvexHull(positions_last_N_minutes).area
time_span = last_timestamp - first_timestamp
loitering = hull_area / max(time_span, 1)  # Low value = loitering
score = max(0, 100 - loitering × normalization_factor)
```

#### Dark Activity Score
```
expected_pings = time_window / expected_ping_interval
actual_pings = count(observations_in_window)
dark_ratio = 1 - (actual_pings / expected_pings)
score = min(100, dark_ratio × 100)
```

#### Rendezvous Probability
```
for each pair (vessel_a, vessel_b):
    cpa = closest_point_of_approach(a, b)
    if cpa < 0.5nm AND both_speeds < 5kts:
        score = 100 × (1 - cpa/0.5) × (1 - max_speed/5)
```

---

## 3. Model Architecture Comparison & Selection

### 3.1 Algorithm Comparison Matrix

| Algorithm | Type | Temporal | Explain | Train Speed | Infer Latency | Cold Start | Production Ready |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **Isolation Forest** | Tree | No | Low | Fast | <1ms | OK | ✅ |
| **One-Class SVM** | Kernel | No | Low | Slow | <1ms | Poor | ⚠️ |
| **Local Outlier Factor** | Density | No | Medium | Slow | ~5ms | Poor | ⚠️ |
| **Autoencoder** | Neural | No | Medium | Medium | <2ms | OK | ✅ |
| **VAE** | Neural | No | High | Medium | <3ms | OK | ✅ |
| **LSTM Autoencoder** | Seq2Seq | **Yes** | Medium | Slow | <5ms | Poor | ✅ |
| **Temporal CNN** | Conv1D | **Yes** | High | Fast | <3ms | OK | ✅ |
| **Transformer** | Attention | **Yes** | **High** | Slow | <10ms | Poor | ⚠️ |

### 3.2 Recommended Architecture Progression

#### MVP (Current → 3 months): Enhanced Isolation Forest + Autoencoder Ensemble

```
                    ┌──────────────┐
    Feature         │  Isolation   │──── Score A
    Vector ────────►│   Forest     │
    (8 → 24 feat)   └──────────────┘
         │          ┌──────────────┐
         └────────►│  Autoencoder │──── Score B
                    │  (recon err) │
                    └──────────────┘
                           │
                    ┌──────────────┐
                    │   Ensemble   │──── ML Score
                    │  max(A, B)   │
                    └──────────────┘
```

**Rationale**: The Autoencoder learns the *manifold* of normal behavior. Its reconstruction error is a natural anomaly score. It catches different anomaly types than the Isolation Forest (IF catches point anomalies; AE catches contextual anomalies). The ensemble `max()` ensures the highest alert from either model is surfaced.

#### Intermediate (3–9 months): LSTM Autoencoder for Trajectory

```
    Track History          ┌─────────────────────┐
    (seq of 20 obs) ──────►│  LSTM Encoder       │
                           │  (128 → 64 → 32)   │
                           └─────────┬───────────┘
                                     │ latent z
                           ┌─────────┴───────────┐
                           │  LSTM Decoder        │
                           │  (32 → 64 → 128)    │
                           └─────────┬───────────┘
                                     │
                           reconstruction_error ──── ML Score
```

**Rationale**: This model consumes the *entire trajectory window* (20 observations × 8 features = 160-dim input), not just a single frame. It learns temporal patterns — a vessel that normally maintains steady heading for 20 frames will generate high reconstruction error if it suddenly starts oscillating.

#### Advanced (9–18 months): Temporal Transformer + Classification Head

```
    Sequence              ┌────────────────────────┐
    (20 × 32 feat) ──────►│  Positional Encoding   │
                          │  + Multi-Head Attn     │
                          │  (4 heads, 64 dim)     │
                          └────────┬───────────────┘
                                   │
                          ┌────────┴───────────────┐
                          │  Classification Head   │
                          │  [Normal, Loitering,   │
                          │   Evasion, Dark,       │
                          │   Rendezvous, Attack]  │
                          └────────┬───────────────┘
                                   │
                          (class_probs, attn_weights)
```

**Rationale**: The attention mechanism provides built-in explainability — attention weights reveal *which frames* in the trajectory the model focused on when making its decision. The classification head requires labeled data from the analyst feedback loop (Layer 6).

---

## 4. Multi-Model Intelligence Engine

### 4.1 Layered Architecture

```
                 ┌─────────────────────────────────────────────────────────┐
                 │               TELEMETRY INGESTION                       │
                 │      AIS Stream ─── OpenSky ─── Radar ─── SAR          │
                 └──────────────────────┬──────────────────────────────────┘
                                        │
                 ┌──────────────────────▼──────────────────────────────────┐
  LAYER 1        │               RULE ENGINE                               │
  (deterministic)│  • Geofence violations        • Speed thresholds        │
                 │  • AIS gap detection           • Course delta rules     │
                 │  • Known sanctions list match  • TSS compliance         │
                 │  Latency: < 1ms  │  Output: rule_score (0-100)          │
                 └──────────────────────┬──────────────────────────────────┘
                                        │
                 ┌──────────────────────▼──────────────────────────────────┐
  LAYER 2        │           STATISTICAL DETECTION                         │
  (baseline)     │  • Z-score against vessel type baseline                 │
                 │  • EWMA (Exponentially Weighted Moving Average)         │
                 │  • Percentile rank within fleet                         │
                 │  Latency: < 1ms  │  Output: stat_score (0-100)          │
                 └──────────────────────┬──────────────────────────────────┘
                                        │
                 ┌──────────────────────▼──────────────────────────────────┐
  LAYER 3        │           ML ANOMALY DETECTION                          │
  (unsupervised) │  MVP: Isolation Forest + Autoencoder ensemble           │
                 │  INT: LSTM Autoencoder on trajectory sequences          │
                 │  ADV: Transformer with attention explainability         │
                 │  Latency: < 5ms  │  Output: ml_score (0-100)            │
                 └──────────────────────┬──────────────────────────────────┘
                                        │
                 ┌──────────────────────▼──────────────────────────────────┐
  LAYER 4        │          THREAT CLASSIFICATION                          │
  (supervised)   │  Classes: [Normal, Loitering, Evasion, Dark_Fleet,      │
                 │           Rendezvous, Interdiction, Spoofing]           │
                 │  Trained on analyst-labeled feedback (Layer 6)           │
                 │  Latency: < 3ms  │  Output: threat_class + probability  │
                 └──────────────────────┬──────────────────────────────────┘
                                        │
                 ┌──────────────────────▼──────────────────────────────────┐
  LAYER 5        │         GEOPOLITICAL RISK ENGINE                        │
                 │  • GDELT event proximity (temporal decay kernel)        │
                 │  • FIRMS fire/explosion proximity                       │
                 │  • News sentiment analysis                              │
                 │  • THREATCON level                                      │
                 │  Latency: < 2ms  │  Output: geo_score (0-100)           │
                 └──────────────────────┬──────────────────────────────────┘
                                        │
                 ┌──────────────────────▼──────────────────────────────────┐
  LAYER 6        │         ANALYST FEEDBACK LOOP                           │
                 │  • Confirm / Dismiss alerts                             │
                 │  • Label threat type                                    │
                 │  • Adjust severity                                      │
                 │  • Feeds back into Layer 4 training set                 │
                 │  Output: labeled_examples → retraining pipeline         │
                 └─────────────────────────────────────────────────────────┘
```

### 4.2 Score Fusion Strategy

Replace the static `0.4/0.4/0.2` with **Adaptive Bayesian Fusion**:

```
FinalScore = Σ(w_i × score_i) / Σ(w_i)

where:
  w_rule = base_weight × model_confidence_rule × recency_factor
  w_stat = base_weight × model_confidence_stat
  w_ml   = base_weight × model_confidence_ml × (1 - model_uncertainty)
  w_class = base_weight × classification_confidence
  w_geo  = base_weight × geopolitical_tension_level × temporal_decay
  w_analyst = base_weight × analyst_agreement_rate
```

**Base weights** (adjustable via config):

| Layer | Base Weight | Confidence Multiplier | Notes |
|:---|:---|:---|:---|
| L1 Rule | 0.25 | 1.0 (always confident) | Hard rules never uncertain |
| L2 Statistical | 0.10 | Varies by sample size | Low weight when few observations |
| L3 ML | 0.25 | `1 - reconstruction_uncertainty` | Drops when model is freshly retrained |
| L4 Classification | 0.15 | `max(class_probability)` | Only active once labeled data exists |
| L5 Geopolitical | 0.15 | `THREATCON_level / 5` | Scales with geopolitical tension |
| L6 Analyst | 0.10 | `agreement_rate` across analysts | Consensus-weighted |

**Conflict Resolution**:
- If L1 (Rule) triggers a **critical** geofence violation, it overrides all other layers → `FinalScore = max(FinalScore, rule_score)`.
- If L3 (ML) and L1 (Rule) disagree by > 40 points, flag for analyst review.
- If L6 (Analyst) has dismissed a similar alert 3+ times, automatically suppress future occurrences of that pattern.

---

## 5. Explainable AI System

### 5.1 Analyst-Facing Explanation Schema

```json
{
  "track_id": "AIS-211331640",
  "assessment_id": "ASM-20260604-143022-7a8b",
  "timestamp": "2026-06-04T14:30:22Z",

  "score": 84,
  "confidence": 0.91,
  "severity": "high",
  "threat_class": "evasion",
  "threat_class_probability": 0.73,

  "score_decomposition": {
    "rule_engine": { "score": 42, "weight": 0.25, "contribution": 10.5 },
    "statistical":  { "score": 68, "weight": 0.10, "contribution": 6.8 },
    "ml_anomaly":   { "score": 92, "weight": 0.25, "contribution": 23.0 },
    "classification":{ "score": 73, "weight": 0.15, "contribution": 10.95 },
    "geopolitical": { "score": 55, "weight": 0.15, "contribution": 8.25 },
    "analyst":      { "score": 80, "weight": 0.10, "contribution": 8.0 }
  },

  "primary_factors": [
    {
      "factor": "AIS Silence",
      "value": 18.5,
      "unit": "minutes",
      "threshold": 5.0,
      "impact_pct": 32,
      "trend": "escalating",
      "description": "Vessel transponder silent for 18.5 minutes, exceeding 5-minute threshold by 270%"
    },
    {
      "factor": "Course Deviation from TSS",
      "value": 34.2,
      "unit": "degrees",
      "threshold": 10.0,
      "impact_pct": 24,
      "trend": "stable",
      "description": "Vessel heading diverges 34.2° from nearest Traffic Separation Scheme lane"
    },
    {
      "factor": "Loitering Detection",
      "value": 0.02,
      "unit": "nm²/min",
      "threshold": 0.1,
      "impact_pct": 18,
      "trend": "new",
      "description": "Vessel has covered minimal area over 45 minutes, consistent with loitering pattern"
    }
  ],

  "ml_explainability": {
    "model_version": "v1.20260604130000",
    "isolation_depth": 4.2,
    "autoencoder_reconstruction_error": 0.34,
    "top_shap_contributions": [
      { "feature": "ais_gap_minutes", "shap_value": 0.34, "direction": "anomalous" },
      { "feature": "course_delta", "shap_value": 0.28, "direction": "anomalous" },
      { "feature": "speed_variance", "shap_value": -0.12, "direction": "normal" }
    ]
  },

  "historical_context": {
    "vessel_risk_history": {
      "anomaly_rate_30d": 0.12,
      "previous_alerts": 3,
      "last_alert": "2026-05-28T09:15:00Z",
      "flag_state_risk": "medium"
    },
    "similar_incidents": [
      {
        "date": "2025-11-14T08:30:00Z",
        "location": "26.42°N, 56.18°E",
        "type": "IRGCN fast-boat interdiction",
        "outcome": "Tanker boarded, crew detained 6 hours"
      }
    ],
    "area_threat_level": "elevated"
  },

  "recommended_actions": [
    {
      "action": "Immediate escalation to duty officer",
      "priority": "IMMEDIATE",
      "team": "INTEL OPS",
      "response_window": "< 5 MIN",
      "rationale": "AIS silence + course deviation pattern matches pre-interdiction behavior"
    }
  ]
}
```

### 5.2 SHAP Integration

For the Isolation Forest, compute approximate SHAP values using `shap.TreeExplainer`:

```python
import shap

explainer = shap.TreeExplainer(model.model)
shap_values = explainer.shap_values(X)

# Top contributing features for this prediction
feature_importance = sorted(
    zip(FEATURE_COLS, shap_values[0]),
    key=lambda x: abs(x[1]),
    reverse=True
)
```

This adds ~2ms to inference but provides the per-feature contribution breakdown that analysts need to trust the system's decisions.

---

## 6. Continuous Learning Architecture

### 6.1 Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                     CONTINUOUS LEARNING PIPELINE                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐       │
│  │ Feature  │───►│  Model   │───►│  Model   │───►│  Canary  │       │
│  │  Store   │    │ Training │    │ Registry │    │ Deploy   │       │
│  │ (Redis)  │    │ (Batch)  │    │ (S3+DB)  │    │ (Shadow) │       │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘       │
│       │               │               │               │             │
│  ┌────▼─────┐    ┌────▼─────┐    ┌────▼─────┐    ┌────▼─────┐      │
│  │  Drift   │    │  Human   │    │  A/B     │    │ Rollback │      │
│  │ Detector │    │ Feedback │    │  Test    │    │ Manager  │      │
│  │ (PSI/KL) │    │  (UI)    │    │ (10%trfc)│    │ (auto)   │      │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.2 Component Specifications

| Component | Technology | Purpose |
|:---|:---|:---|
| **Feature Store** | Redis Streams + PostgreSQL | Real-time feature serving (Redis) + historical features (Postgres) |
| **Model Registry** | MLflow / S3 + metadata DB | Version control for models with metrics, lineage, and artifacts |
| **Model Versioning** | Semantic: `v{major}.{YYYYMMDD}.{run}` | Example: `v2.20260604.3` = architecture v2, June 4, 3rd training run |
| **Canary Deployment** | Shadow mode scoring | New model scores in parallel; results logged but not served |
| **Shadow Testing** | Compare canary vs. production on same traffic | Metrics: precision@k, recall, score correlation, latency |
| **Drift Detection** | Population Stability Index (PSI) + KL Divergence | Alert if feature distribution shifts > threshold |
| **Human Feedback** | Dashboard UI: confirm/dismiss/relabel alerts | Feeds labeled examples into supervised Layer 4 |
| **Rollback** | Automatic if canary metrics degrade > 10% | Registry maintains last 5 model versions for instant rollback |

### 6.3 Drift Detection Protocol

```
Every training cycle:
  1. Compute PSI for each feature between training set and live data
  2. If PSI > 0.25 for any feature → ALERT: significant drift
  3. If PSI > 0.10 for 3+ features → ALERT: moderate multi-feature drift
  4. If KL-divergence(score_distribution_new, score_distribution_old) > 0.1 → ALERT: score drift
  5. If false_positive_rate (from analyst feedback) > 0.3 → TRIGGER: automatic retraining
```

---

## 7. Adversarial Resilience

### 7.1 Detection Mechanisms

#### AIS Spoofing Detection
```
Indicators:
  • Position jump > 50nm between consecutive pings (impossible speed)
  • Reported speed ≠ computed speed from position delta
  • Heading ≠ bearing between consecutive positions
  • MMSI not in ITU allocation for reported flag state
  • Navigation status "at anchor" but speed > 1 kts

Implementation:
  computed_speed = haversine(pos_prev, pos_curr) / time_delta
  reported_speed = ais_message.sog
  if abs(computed_speed - reported_speed) > 5.0:
      flag: SPOOF_SUSPECTED, confidence = abs(diff) / computed_speed
```

#### MMSI Cloning Detection
```
Indicators:
  • Same MMSI reported from two locations > 10nm apart within 5 minutes
  • Same MMSI with inconsistent vessel type/dimensions
  • Sudden MMSI change mid-track

Implementation:
  for each MMSI in active_tracks:
      positions = all_positions_last_5min(MMSI)
      if max_distance(positions) > 10nm:
          flag: MMSI_CLONE, confidence = 0.95
```

#### GPS Manipulation Detection
```
Indicators:
  • Position reported on land
  • Position reported outside possible speed cone
  • Clock offset in AIS timestamp vs. system time
  • Multiple vessels in same area report simultaneous position shifts

Implementation:
  speed_cone_radius = max_possible_speed × time_since_last_fix
  if haversine(current_pos, last_pos) > speed_cone_radius × 1.2:
      flag: GPS_MANIPULATION, confidence = excess / speed_cone_radius
```

#### Slow-Moving Stealth (Pattern Normalization Attack)
```
Defense: Dual-baseline architecture
  • Short-term baseline: last 2 hours (adapts to current behavior)
  • Long-term baseline: last 30 days (vessel's historical pattern)

  If short_term_score < threshold BUT long_term_score > threshold:
      flag: SLOW_NORMALIZATION_ATTACK
      description: "Vessel has gradually shifted behavior over N hours"
```

#### Data Poisoning Defense
```
Training Pipeline Guards:
  1. Minimum sample diversity: require tracks from ≥ 20 unique MMSIs
  2. Outlier rejection: remove top/bottom 1% of each feature before training
  3. Temporal diversity: require samples spanning ≥ 4 hours
  4. Geographic diversity: require samples from ≥ 3 distinct grid cells
  5. Holdout validation: always test on a held-out set from previous epoch
```

---

## 8. Future-State Architecture

### 8.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          HORMUZWATCH PLATFORM                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─── DATA PLANE ───────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  AIS        OpenSky      SAR        Radar      ELINT     HUMINT  │   │
│  │  Stream     REST         Imagery    Feed       Signals   Reports │   │
│  │    │          │            │          │           │         │     │   │
│  │    └──────────┴─────┬──────┴──────────┴───────────┴─────────┘     │   │
│  │                     │                                             │   │
│  │              ┌──────▼──────┐                                      │   │
│  │              │  Event Hub  │  (Azure Event Hub / Kafka)           │   │
│  │              │  Ingestion  │                                      │   │
│  │              └──────┬──────┘                                      │   │
│  └─────────────────────┼─────────────────────────────────────────────┘   │
│                        │                                                 │
│  ┌─── INTELLIGENCE PLANE ───────────────────────────────────────────┐   │
│  │                     │                                             │   │
│  │  ┌─────────────────▼─────────────────┐                           │   │
│  │  │    Track State Manager (Go)       │                           │   │
│  │  │    • Per-vessel sliding window    │                           │   │
│  │  │    • Feature extraction pipeline  │                           │   │
│  │  │    • Trajectory assembly          │                           │   │
│  │  └─────────────────┬─────────────────┘                           │   │
│  │                    │                                              │   │
│  │    ┌───────────────┼───────────────┐                              │   │
│  │    │               │               │                              │   │
│  │    ▼               ▼               ▼                              │   │
│  │  ┌────┐  ┌────────────┐  ┌──────────────┐                       │   │
│  │  │Rule│  │ ML Service │  │ Geo-Risk     │                       │   │
│  │  │Eng.│  │ (Python)   │  │ Engine       │                       │   │
│  │  └──┬─┘  └──────┬─────┘  └──────┬───────┘                       │   │
│  │     │           │               │                                │   │
│  │     └───────────┼───────────────┘                                │   │
│  │                 │                                                │   │
│  │          ┌──────▼──────┐                                         │   │
│  │          │  Composite  │                                         │   │
│  │          │  Scorer     │                                         │   │
│  │          │  (Adaptive  │                                         │   │
│  │          │   Fusion)   │                                         │   │
│  │          └──────┬──────┘                                         │   │
│  └─────────────────┼────────────────────────────────────────────────┘   │
│                    │                                                     │
│  ┌─── PRESENTATION PLANE ──────────────────────────────────────────┐    │
│  │                 │                                                │    │
│  │  ┌──────────────▼──────────────┐     ┌──────────────────────┐   │    │
│  │  │   WebSocket Broadcast       │────►│  Dashboard (React)   │   │    │
│  │  │   (Real-time telemetry +    │     │  • Live Map          │   │    │
│  │  │    threat assessments)      │     │  • Intelligence Panel│   │    │
│  │  └─────────────────────────────┘     │  • Analytics         │   │    │
│  │                                      │  • Alert Queue       │   │    │
│  │  ┌─────────────────────────────┐     │  • Feedback UI       │   │    │
│  │  │   REST API (Gin)            │────►│  • Audit Trail       │   │    │
│  │  │   /api/tracks               │     └──────────────────────┘   │    │
│  │  │   /api/anomalies            │                                │    │
│  │  │   /api/assessments          │                                │    │
│  │  │   /api/feedback             │                                │    │
│  │  └─────────────────────────────┘                                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌─── OPERATIONS PLANE ────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  Feature Store │ Model Registry │ Drift Detector │ Canary Deploy │  │
│  │  (Redis/PG)    │ (MLflow/S3)    │ (PSI/KL)       │ (Shadow)      │  │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Multi-Domain Extension

| Domain | Data Sources | Unique Features |
|:---|:---|:---|
| **Maritime** | AIS, SAR imagery, port records | Draft change, cargo manifests, flag state |
| **Aviation** | ADS-B (OpenSky), Mode-S, ACAS | Altitude profile, squawk codes, flight plan deviation |
| **Border Surveillance** | Ground radar, camera feeds, mobile signals | Border crossing frequency, travel document anomalies |
| **National Security** | SIGINT, HUMINT, OSINT fusion | Entity resolution, network analysis |

---

## 9. Database Design

### 9.1 PostgreSQL Schema (Production)

```sql
-- Tracks: durable track state (replaces in-memory TSM for persistence)
CREATE TABLE tracks (
    track_id        TEXT PRIMARY KEY,
    asset_name      TEXT,
    vessel_type     TEXT,
    flag_state      TEXT,
    mmsi            TEXT,
    last_lat        DOUBLE PRECISION,
    last_lon        DOUBLE PRECISION,
    last_speed      DOUBLE PRECISION,
    last_heading    DOUBLE PRECISION,
    last_seen       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    observation_count INTEGER DEFAULT 0
);

-- Observations: time-series telemetry
CREATE TABLE observations (
    id              BIGSERIAL PRIMARY KEY,
    track_id        TEXT REFERENCES tracks(track_id),
    lat             DOUBLE PRECISION,
    lon             DOUBLE PRECISION,
    speed           DOUBLE PRECISION,
    heading         DOUBLE PRECISION,
    timestamp       TIMESTAMPTZ,
    source          TEXT  -- 'ais', 'opensky', 'radar'
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions
CREATE TABLE observations_2026_06 PARTITION OF observations
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- Assessments: threat scoring history
CREATE TABLE assessments (
    id              BIGSERIAL PRIMARY KEY,
    track_id        TEXT REFERENCES tracks(track_id),
    timestamp       TIMESTAMPTZ DEFAULT NOW(),
    final_score     INTEGER,
    rule_score      INTEGER,
    ml_score        REAL,
    geo_score       REAL,
    severity        TEXT,
    threat_class    TEXT,
    confidence      REAL,
    reasons         JSONB,
    actions         JSONB,
    factors         JSONB,     -- explainability payload
    model_version   TEXT
);

-- Analyst Feedback: labeled examples for supervised learning
CREATE TABLE feedback (
    id              BIGSERIAL PRIMARY KEY,
    assessment_id   BIGINT REFERENCES assessments(id),
    analyst_id      TEXT,
    action          TEXT,  -- 'confirm', 'dismiss', 'relabel', 'escalate'
    label           TEXT,  -- threat class label if relabeled
    severity_override TEXT,
    notes           TEXT,
    timestamp       TIMESTAMPTZ DEFAULT NOW()
);

-- Model Registry: model version tracking
CREATE TABLE model_versions (
    version         TEXT PRIMARY KEY,
    architecture    TEXT,
    trained_at      TIMESTAMPTZ,
    sample_count    INTEGER,
    contamination   REAL,
    metrics         JSONB,  -- precision, recall, PSI scores
    artifact_path   TEXT,   -- S3 path to serialized model
    status          TEXT DEFAULT 'shadow',  -- shadow, canary, production, retired
    promoted_at     TIMESTAMPTZ,
    retired_at      TIMESTAMPTZ
);

-- Geopolitical Events: persistent event store
CREATE TABLE geo_events (
    id              BIGSERIAL PRIMARY KEY,
    lat             DOUBLE PRECISION,
    lon             DOUBLE PRECISION,
    weight          REAL,
    source          TEXT,  -- 'gdelt', 'firms', 'manual'
    description     TEXT,
    timestamp       TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_observations_track_time ON observations (track_id, timestamp DESC);
CREATE INDEX idx_assessments_track_time ON assessments (track_id, timestamp DESC);
CREATE INDEX idx_assessments_severity ON assessments (severity) WHERE severity IN ('critical', 'high');
CREATE INDEX idx_geo_events_time ON geo_events (timestamp DESC);
CREATE INDEX idx_geo_events_location ON geo_events USING GIST (
    ST_SetSRID(ST_MakePoint(lon, lat), 4326)
);
```

---

## 10. API Contracts

### 10.1 ML Service API (Enhanced)

#### `POST /predict` — Real-time Inference
```json
// Request
{
  "track_id": "AIS-211331640",
  "features": {
    "course_delta": 34.2,
    "heading_delta": -12.5,
    "speed_delta": -8.3,
    "average_speed": 6.2,
    "speed_variance": 14.7,
    "ais_gap_minutes": 18.5,
    "dist_restricted_zone": 0.15,
    "dist_historical_site": 0.08
  },
  "explain": true
}

// Response
{
  "track_id": "AIS-211331640",
  "anomaly_score": 84.2,
  "is_anomaly": true,
  "confidence": 0.91,
  "model_version": "v2.20260604.3",
  "inference_time_ms": 2.4,
  "explanation": {
    "top_features": [
      { "feature": "ais_gap_minutes", "shap_value": 0.34, "direction": "anomalous" },
      { "feature": "course_delta", "shap_value": 0.28, "direction": "anomalous" }
    ],
    "isolation_depth": 4.2,
    "reconstruction_error": 0.34
  }
}
```

#### `POST /train` — Batch Retraining
```json
// Request
{
  "data": [ /* array of feature dicts */ ],
  "contamination": 0.05,
  "holdout_fraction": 0.1,
  "validate_against": "v2.20260604.2"
}

// Response
{
  "status": "trained",
  "model_version": "v2.20260604.3",
  "n_samples": 1247,
  "metrics": {
    "auc_holdout": 0.87,
    "psi_vs_previous": 0.08,
    "score_correlation_vs_previous": 0.92,
    "promoted": false,
    "promotion_reason": "shadow_testing_pending"
  }
}
```

#### `GET /health` — Operational Status
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_version": "v2.20260604.2",
  "model_status": "production",
  "shadow_model": "v2.20260604.3",
  "uptime_seconds": 86400,
  "total_predictions": 142857,
  "avg_latency_ms": 2.1,
  "drift_status": "nominal"
}
```

---

## 11. Cloud Deployment & Scaling

### 11.1 Azure Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AZURE DEPLOYMENT                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐     ┌──────────────┐    ┌──────────────┐  │
│  │ Azure       │     │ AKS Cluster  │    │ Azure        │  │
│  │ Front Door  │────►│              │    │ PostgreSQL   │  │
│  │ (CDN+WAF)   │     │ ┌──────────┐ │    │ Flexible     │  │
│  └─────────────┘     │ │ Go API   │ │───►│ Server       │  │
│                      │ │ (3 pods) │ │    └──────────────┘  │
│  ┌─────────────┐     │ └──────────┘ │                      │
│  │ Azure Event │     │              │    ┌──────────────┐  │
│  │ Hub         │────►│ ┌──────────┐ │    │ Azure Cache  │  │
│  │ (Ingestion) │     │ │ ML Svc   │ │───►│ for Redis    │  │
│  └─────────────┘     │ │ (2 pods) │ │    │ (Features)   │  │
│                      │ └──────────┘ │    └──────────────┘  │
│  ┌─────────────┐     │              │                      │
│  │ Azure Blob  │     │ ┌──────────┐ │    ┌──────────────┐  │
│  │ Storage     │◄────│ │ React    │ │    │ Azure        │  │
│  │ (Models)    │     │ │ SPA      │ │    │ Monitor      │  │
│  └─────────────┘     │ └──────────┘ │    │ (Logs+Metrics│  │
│                      └──────────────┘    └──────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 11.2 Scaling Strategy

| Component | Min Pods | Max Pods | Scale Trigger | Scale Metric |
|:---|:---|:---|:---|:---|
| Go API | 3 | 10 | CPU > 70% OR WebSocket connections > 500/pod | HPA |
| ML Service | 2 | 6 | Request queue depth > 100 OR p99 latency > 10ms | HPA |
| React SPA | Static | Static | N/A — served from CDN | Azure Front Door |
| Redis | 1 primary + 2 replicas | 3 + 3 replicas | Memory > 80% | Manual |
| PostgreSQL | 4 vCPU / 16 GB | 16 vCPU / 64 GB | Connection count > 80% | Vertical |

---

## 12. Latency Budget

| Stage | Component | Target | Measured |
|:---|:---|:---|:---|
| Ingestion → TSM | `aisstream.go` → `state.Update()` | < 0.5ms | ~0.1ms |
| TSM → Feature Extract | `features.ExtractFeatures()` | < 0.5ms | ~0.2ms |
| Feature → Rule Engine | `anomaly.Score()` | < 0.5ms | ~0.05ms |
| Feature → ML Service | HTTP POST `/predict` | < 5ms | ~2-3ms |
| Feature → Geo Score | `GeoStore.ScoreForLocation()` | < 1ms | ~0.3ms |
| Composite Fusion | `ComputeComposite()` | < 0.1ms | ~0.02ms |
| WebSocket Broadcast | `hub.Broadcast` | < 1ms | ~0.5ms |
| **Total E2E** | **Ingestion → Frontend** | **< 10ms** | **~4-6ms** |
| ML Training (batch) | `/train` with 1000 samples | < 30s | ~5-15s |
| SHAP Explanation | Per-prediction, if requested | < 5ms | ~2-3ms |

---

## 13. Trade-Off Analysis

### 13.1 Key Architectural Decisions

| Decision | Option A | Option B | Chosen | Rationale |
|:---|:---|:---|:---|:---|
| **ML framework** | scikit-learn (Isolation Forest) | PyTorch (LSTM Autoencoder) | **A for MVP, B for Intermediate** | sklearn is production-stable, PyTorch unlocks temporal modeling |
| **Feature store** | Redis (in-memory) | PostgreSQL (on-disk) | **Redis for hot path, PG for cold** | Hot features need <1ms access; historical features can tolerate 5ms |
| **Score fusion** | Static weights (0.4/0.4/0.2) | Adaptive Bayesian fusion | **Adaptive** | Static weights fail under changing threat environments |
| **Explainability** | Post-hoc SHAP | Inherent (Transformer attention) | **SHAP for MVP, Attention for Advanced** | SHAP works with any model; attention requires Transformer architecture |
| **State persistence** | In-memory only | PostgreSQL write-through | **Write-through** | Eliminates F-2 failure mode (restart data loss) |
| **Drift detection** | Manual monitoring | Automated PSI/KL alerts | **Automated** | Human monitoring doesn't scale at 1000+ tracks |
| **Training frequency** | Hourly | Daily with drift-triggered | **Daily + drift-triggered** | Hourly is too aggressive for model stability; drift-triggered handles emergencies |
| **Distance math** | Euclidean (current) | Haversine | **Haversine** | Non-negotiable for operational accuracy at maritime scales |

### 13.2 Risk Matrix

| Risk | Probability | Impact | Mitigation |
|:---|:---|:---|:---|
| Model learns adversary as baseline | HIGH | CRITICAL | Dual-baseline (short-term + long-term), data poisoning guards |
| Feature distribution drift | MEDIUM | HIGH | Automated PSI monitoring, drift-triggered retraining |
| ML service outage | LOW | MEDIUM | Graceful degradation (already implemented), multi-pod redundancy |
| Analyst feedback insufficient | HIGH | MEDIUM | Active learning: prioritize uncertain predictions for review |
| AIS spoofing undetected | MEDIUM | CRITICAL | Computed vs. reported speed cross-check, MMSI validation |
| Training data too homogeneous | MEDIUM | HIGH | Diversity guards (20+ MMSIs, 4+ hours, 3+ grid cells) |

---

> [!IMPORTANT]
> **Implementation Priority Order**:
> 1. Fix Haversine distance (1 day) — eliminates W-1
> 2. Add feature normalization to ML pipeline (1 day) — eliminates W-3
> 3. PostgreSQL write-through for track state (3 days) — eliminates W-4/F-2
> 4. Trajectory-level features: loitering, route deviation (1 week)
> 5. SHAP explainability integration (2 days)
> 6. Autoencoder ensemble (1 week)
> 7. Analyst feedback UI + supervised Layer 4 (2 weeks)
> 8. LSTM Autoencoder for trajectory (3 weeks)
> 9. Adversarial detection suite (2 weeks)
> 10. Transformer + attention explainability (4 weeks)
