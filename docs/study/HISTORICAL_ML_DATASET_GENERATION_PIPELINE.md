# HormuzWatch — Technical Study: Historical ML Dataset Generation Pipeline

**Document ID:** HW-STUDY-2026-005  
**Category:** Machine Learning Dataset Engineering & Data Provenance  
**Target Environment:** `yahya@tunkstun` (Supabase PostgreSQL + Python ML / Go Engine)  
**Status:** Implemented & Verified  

---

## 1. Executive Summary

This study documents the architecture and implementation of the **Historical ML Dataset-Generation Pipeline** for HormuzWatch. Following the egress remediation, Supabase PostgreSQL is established as the persistent source of truth for historical telemetry, decoupled from the real-time in-memory transport layer.

The pipeline enables operators and researchers to generate versioned, reproducible, chronological training datasets with deterministic feature reconstruction, temporal lookback isolation, and explicit label provenance.

---

## 2. Feature Schema & Reconstruction

The dataset generator reconstructs the exact feature representations expected by the Python inference ensemble:

| Feature Name | Type | Definition & Range | Source Module |
|---|---|---|---|
| `course_delta` | `float64` | Shortest angular turn ($0^\circ \le \Delta\theta \le 180^\circ$) | `server/internal/intelligence/kinematics.go` |
| `heading_delta` | `float64` | Signed heading change ($-180^\circ \le \Delta h \le +180^\circ$) | `server/internal/intelligence/kinematics.go` |
| `speed` | `float64` | Current Speed Over Ground ($0 \le v \le 50\text{ kts}$) | Ingested AIS/ADS-B payload |
| `speed_delta` | `float64` | Velocity difference $v_t - v_{t-1}$ | Derived from predecessor observation |
| `average_speed` | `float64` | Sliding window rolling mean ($\mu_v$) | Dynamic 20-sample window |
| `speed_variance` | `float64` | Sliding window rolling sample variance ($\sigma^2_v$) | Dynamic 20-sample window |
| `ais_gap_minutes` | `float64` | Elapsed interval $(t_i - t_{i-1})$ in minutes | AIS transmission delta |
| `dist_restricted_zone` | `float64` | Haversine distance to nearest restricted zone boundary (NM) | `server/internal/geo/zones.go` |
| `dist_historical_site` | `float64` | Haversine distance to historical conflict/attack sites (NM) | `server/internal/geo/attack.go` |
| `ewma_deviation` | `float64` | Standardized residual $\sqrt{\frac{1}{3}(Z_\theta^2 + Z_{\Delta v}^2 + Z_v^2)}$ | `server/internal/intelligence/state.go` |

---

## 3. Label Provenance & Ground Truth Taxonomy

The schema explicitly decouples model inferences from human ground truth:

```text
Label Category Hierarchy:
├── 1. ground_truth       (Verified external incident report / naval authority confirmation)
├── 2. human_reviewed     (Reviewed & confirmed by intelligence analyst in UI)
├── 3. weak_label         (Domain heuristic / geofence rule breach)
├── 4. model_prediction   (Inferred anomaly score from Isolation Forest ensemble)
└── 5. unlabeled          (Unannotated telemetry observation)
```

**Current Dataset State:** All initial historical records are tagged as `model_prediction` or `weak_label` with `human_reviewed: 0`, preventing model circularity.

---

## 4. Empirical Datasets Generated on Live System (`tunkstun`)

| Dataset ID | Window | Total Rows | Unique Vessels | Normal Pct | Anomaly Pct | Splits (Train / Val / Test) |
|---|---|---|---|---|---|---|
| `dataset_vessel_20260903_0542_20260903_1142` | Short (6h) | **428** | 106 | 92.99% | 7.01% | 299 / 64 / 65 |
| `dataset_vessel_20260902_1142_20260903_1142` | Daily (24h) | **2,611** | 275 | 93.76% | 6.24% | 1,827 / 392 / 392 |
| `dataset_vessel_20260827_1142_20260903_1142` | 7-Day History | **3,477** | 354 | 95.14% | 4.86% | 2,433 / 522 / 522 |
| `dataset_vessel_2026-09-01_to_2026-09-03` | Custom Range | **2,611** | 275 | 93.76% | 6.24% | 1,827 / 392 / 392 |

---

## 5. Artifact Manifest & Verification

Every dataset directory contains:
* `data.parquet` & `data.csv` (Full dataset)
* `train.parquet` & `train.csv` (Chronological 70% split)
* `val.parquet` & `val.csv` (Chronological 15% split)
* `test.parquet` & `test.csv` (Chronological 15% split)
* `metadata.json` (Machine-readable provenance)
* `quality_report.json` & `quality_report.md` (Automated data validation metrics)
