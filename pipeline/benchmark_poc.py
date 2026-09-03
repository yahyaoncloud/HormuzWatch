"""
pipeline/benchmark_poc.py
=========================
Authoritative, Zero-Data-Leakage Machine Learning Benchmark Suite:
Untrained / Baseline Isolation Forest vs. Trained & Calibrated MLOps Ensemble.

================================================================================
ARCHITECTURE & WORKFLOW COLOR-CODED TAG LEGEND:
  [STAGE]               - Computational pipeline phase in the end-to-end lifecycle
  [OBJECTIVE]           - Concrete mathematical or operational goal of the code block
  [MATHEMATICAL BASIS]  - Algorithmic formulation, probability theory, or geometry
  [SYSTEM OUTCOME]      - State change, persisted artifact, or downstream impact
  [SAFETY INVARIANT]    - Non-negotiable constraint to prevent data leakage/corruption
================================================================================
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Dict, Any, List, Set, Tuple

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    f1_score,
    precision_score,
    recall_score,
    confusion_matrix,
    balanced_accuracy_score
)

# ------------------------------------------------------------------------------
# [STAGE 0: SYSTEM INITIALIZATION & PATH RESOLUTION]
# [OBJECTIVE]: Ensure deterministic access to shared ML service modules across
#              both local developer workstations and containerized environments.
# [SYSTEM OUTCOME]: Python path augmented with /app and service/ml-service.
# ------------------------------------------------------------------------------
PIPELINE_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = PIPELINE_ROOT.parent
sys.path.insert(0, str(PROJECT_ROOT / "service" / "ml-service"))
if "/app" not in sys.path:
    sys.path.insert(0, "/app")

from lib.training import train_ensemble, compute_ece
from lib.scoring import _normalize_raw_score
from api.train_all_models import generate_vessel_data


# ==============================================================================
# [STAGE 1: AUTHORITATIVE ENTITY-GROUPED SPLITTING]
# [OBJECTIVE]: Partition kinematic observations by vessel identifier (MMSI) so that
#              no vessel observed in training or calibration appears in testing.
# [MATHEMATICAL BASIS]:
#   Let G be the set of unique MMSI identifiers, G = G_train ∪ G_val ∪ G_calib ∪ G_test.
#   Mutual Exclusivity: G_i ∩ G_j = ∅, ∀ i ≠ j.
#   Stratified Representation: Ensures anomalous vessels are represented proportionally:
#     |{g ∈ G_k : ∃ y_i = 1}| / |G_k| ≈ |{g ∈ G : ∃ y_i = 1}| / |G|.
# [SYSTEM OUTCOME]: Prevents spatial-temporal memorization and optimistic bias,
#                   guaranteeing true generalization to unseen maritime entities.
# [SAFETY INVARIANT]: Intersection between any partition must be strictly empty (0).
# ==============================================================================
def build_authoritative_split(
    groups: List[str],
    labels: List[int],
    seed: int = 42
) -> Tuple[Dict[str, List[int]], Dict[str, Set[str]]]:
    """
    Construct a single authoritative, stratified entity-grouped split.
    Guarantees mutual exclusivity of MMSIs across train, val, calib, and test partitions.
    """
    rng = np.random.default_rng(seed)
    y_arr = np.array(labels)
    g_arr = np.array(groups)
    
    unique_groups = list(dict.fromkeys(groups))
    
    # Stratification: Segregate vessels that ever exhibited an anomaly from purely nominal ones
    anom_mmsis = [mmsi for mmsi in unique_groups if np.any((g_arr == mmsi) & (y_arr == 1))]
    norm_mmsis = [mmsi for mmsi in unique_groups if mmsi not in set(anom_mmsis)]
    
    rng.shuffle(anom_mmsis)
    rng.shuffle(norm_mmsis)
    
    # 60% Train, 15% Validation, 15% Calibration, 10% Test
    def partition_entities(entities: List[str]):
        n = len(entities)
        n_tr = int(0.60 * n)
        n_v = int(0.15 * n)
        n_c = int(0.15 * n)
        return (
            set(entities[:n_tr]),
            set(entities[n_tr : n_tr + n_v]),
            set(entities[n_tr + n_v : n_tr + n_v + n_c]),
            set(entities[n_tr + n_v + n_c :])
        )
        
    a_tr, a_val, a_cal, a_test = partition_entities(anom_mmsis)
    n_tr, n_val, n_cal, n_test = partition_entities(norm_mmsis)
    
    # Merge stratified subsets
    mmsi_sets = {
        "train": a_tr | n_tr,
        "val": a_val | n_val,
        "calib": a_cal | n_cal,
        "test": a_test | n_test,
    }
    
    # [SAFETY INVARIANT ENFORCEMENT]: Verify zero leakage before proceeding
    assert len(mmsi_sets["train"] & mmsi_sets["test"]) == 0, "FATAL: Train/Test MMSI leakage!"
    assert len(mmsi_sets["calib"] & mmsi_sets["test"]) == 0, "FATAL: Calib/Test MMSI leakage!"
    assert len(mmsi_sets["val"] & mmsi_sets["test"]) == 0, "FATAL: Val/Test MMSI leakage!"
    assert len(mmsi_sets["train"] & mmsi_sets["calib"]) == 0, "FATAL: Train/Calib MMSI leakage!"
    
    # Map entity sets back to sample indices
    idx_dict = {
        "train": [i for i, g in enumerate(groups) if g in mmsi_sets["train"]],
        "val": [i for i, g in enumerate(groups) if g in mmsi_sets["val"]],
        "calib": [i for i, g in enumerate(groups) if g in mmsi_sets["calib"]],
        "test": [i for i, g in enumerate(groups) if g in mmsi_sets["test"]],
    }
    
    return idx_dict, mmsi_sets


# ==============================================================================
# [STAGE 2: STANDARDIZED BENCHMARK EXECUTION ENGINE]
# [OBJECTIVE]: Execute identical, scientifically valid evaluations of Model A
#              (Baseline) and Model B (MLOps Ensemble) over the held-out test split.
# [MATHEMATICAL BASIS]:
#   ECE = ∑_{b=1}^B (|B_b| / N) |acc(B_b) - conf(B_b)|
#   Brier = (1 / N) ∑_{i=1}^N (p_i - y_i)^2
# [SYSTEM OUTCOME]: Generates reproducible metrics and performance delta report.
# ==============================================================================
def run_benchmark() -> Dict[str, Any]:
    print("[1/4] Generating standardized maritime dataset (3,000 observations across 100 MMSIs)...")
    # Synthetic generator: 6.0% anomaly prevalence, 100 vessels, 30 pings per vessel
    data, labels, groups = generate_vessel_data(n_samples=3000, anomaly_frac=0.06, n_vessels=100)
    
    cols = [
        "course_delta", "heading_delta", "speed_delta", "average_speed",
        "speed_variance", "ais_gap_minutes", "dist_restricted_zone",
        "dist_historical_site", "ewma_deviation"
    ]
    X_raw = np.array([[d[c] for c in cols] for d in data], dtype=np.float64)
    y_raw = np.array(labels, dtype=int)
    
    # Build authoritative split
    partitions, mmsi_sets = build_authoritative_split(groups, labels, seed=42)
    
    X_train, y_train = X_raw[partitions["train"]], y_raw[partitions["train"]]
    X_val, y_val = X_raw[partitions["val"]], y_raw[partitions["val"]]
    X_calib, y_calib = X_raw[partitions["calib"]], y_raw[partitions["calib"]]
    X_test, y_test = X_raw[partitions["test"]], y_raw[partitions["test"]]
    
    test_anom_count = int(np.sum(y_test))
    print(f"      Partitions -> Train: {len(X_train)} ({len(mmsi_sets['train'])} vessels), "
          f"Val: {len(X_val)} ({len(mmsi_sets['val'])} vessels), "
          f"Calib: {len(X_calib)} ({len(mmsi_sets['calib'])} vessels), "
          f"Test: {len(X_test)} ({len(mmsi_sets['test'])} vessels)")
    print(f"      Held-out Test Class Distribution: {test_anom_count} anomalies / {len(X_test)} total ({test_anom_count/len(X_test)*100:.1f}%)")
    
    leakage_audit = {
        "train_mmsi_count": len(mmsi_sets["train"]),
        "val_mmsi_count": len(mmsi_sets["val"]),
        "calib_mmsi_count": len(mmsi_sets["calib"]),
        "test_mmsi_count": len(mmsi_sets["test"]),
        "intersections": {
            "train_intersect_test": len(mmsi_sets["train"] & mmsi_sets["test"]),
            "calib_intersect_test": len(mmsi_sets["calib"] & mmsi_sets["test"]),
            "val_intersect_test": len(mmsi_sets["val"] & mmsi_sets["test"]),
            "train_intersect_calib": len(mmsi_sets["train"] & mmsi_sets["calib"]),
        },
        "is_leakage_free": (
            len(mmsi_sets["train"] & mmsi_sets["test"]) == 0 and
            len(mmsi_sets["calib"] & mmsi_sets["test"]) == 0 and
            len(mmsi_sets["val"] & mmsi_sets["test"]) == 0 and
            len(mmsi_sets["train"] & mmsi_sets["calib"]) == 0
        )
    }
    
    # --------------------------------------------------------------------------
    # [SUBSTAGE 2.1: MODEL A EVALUATION - UNTRAINED / RAW BASELINE]
    # [OBJECTIVE]: Benchmark off-the-shelf Isolation Forest with no feature scaling,
    #              no HPO, and uncalibrated min-max normalized pseudo-probabilities.
    # [MATHEMATICAL BASIS]:
    #   s(x) = 2^(-E(h(x)) / c(n))
    #   p_raw = (s_test - s_min(X_train)) / (s_max(X_train) - s_min(X_train))
    # [SAFETY INVARIANT]: Normalization bounds s_min, s_max derived STRICTLY from X_train.
    # --------------------------------------------------------------------------
    print("\n[2/4] Evaluating Model A: Untrained / Raw Baseline (No Feature Scaling, No HPO, No Calibration)...")
    raw_if = IsolationForest(
        n_estimators=100,
        max_samples="auto",
        contamination="auto",
        random_state=123
    )
    raw_if.fit(X_train)
    
    train_raw_scores = -raw_if.decision_function(X_train)
    s_train_min = float(train_raw_scores.min())
    s_train_max = float(train_raw_scores.max())
    
    t0 = time.perf_counter()
    test_raw_scores = -raw_if.decision_function(X_test)
    raw_probs = np.clip((test_raw_scores - s_train_min) / (s_train_max - s_train_min + 1e-8), 0.0, 1.0)
    raw_preds = (raw_if.predict(X_test) == -1).astype(int)
    t_raw_ms = (time.perf_counter() - t0) * 1000.0
    
    roc_a = float(roc_auc_score(y_test, raw_probs))
    pr_auc_a = float(average_precision_score(y_test, raw_probs))
    f1_a = float(f1_score(y_test, raw_preds, zero_division=0))
    prec_a = float(precision_score(y_test, raw_preds, zero_division=0))
    rec_a = float(recall_score(y_test, raw_preds, zero_division=0))
    tn_a, fp_a, fn_a, tp_a = confusion_matrix(y_test, raw_preds).ravel()
    spec_a = float(tn_a / (tn_a + fp_a))
    brier_a = float(brier_score_loss(y_test, raw_probs))
    ece_a = compute_ece(y_test, raw_probs)
    
    # --------------------------------------------------------------------------
    # [SUBSTAGE 2.2: MODEL B EVALUATION - TRAINED & CALIBRATED MLOps ENSEMBLE]
    # [OBJECTIVE]: Benchmark production ensemble architecture combining StandardScaler,
    #              dual IsolationForest (200 trees) + LOF (20 neighbors), score blending,
    #              and Isotonic Regression calibration.
    # [MATHEMATICAL BASIS]:
    #   z = StandardScaler(X)
    #   s_ens = 0.55 * s_IF(z) + 0.45 * s_LOF(z)
    #   p_calib = argmin_m ∑ (y_i - m(s_ens,i))^2, subject to m(u) ≤ m(v) for u ≤ v
    # [SYSTEM OUTCOME]: Substantially reduces calibration error (ECE) while maintaining
    #                   high precision and recall over genuine out-of-distribution vessels.
    # [SAFETY INVARIANT]: Base estimators fit on Train; Calibrator fit on Calib split.
    # --------------------------------------------------------------------------
    print("\n[3/4] Evaluating Model B: Trained & Calibrated MLOps Ensemble (StandardScaler + IF + LOF + Isotonic)...")
    t_train_0 = time.perf_counter()
    version, metrics_dict = train_ensemble(
        domain="vessel",
        data=data,
        labels=labels,
        groups=groups,
        contamination=0.05,
        random_state=42,
        custom_splits=partitions
    )
    t_train_sec = time.perf_counter() - t_train_0
    
    import joblib
    artifact_path = Path("/app/models/vessel_ensemble.joblib") if Path("/app/models/vessel_ensemble.joblib").exists() else (PROJECT_ROOT / "service" / "ml-service" / "models" / "vessel_ensemble.joblib")
    bundle = joblib.load(artifact_path)
    
    scaler = bundle["scaler"]
    iforest = bundle["model_iforest"]
    lof = bundle["model_lof"]
    calibrator = bundle["calibrator"]
    score_bounds = bundle["score_bounds"]
    
    t0 = time.perf_counter()
    X_test_scaled = scaler.transform(X_test)
    raw_if_test = iforest.score_samples(X_test_scaled)
    raw_lof_test = lof.score_samples(X_test_scaled)
    
    norm_if = np.array([_normalize_raw_score(v, *score_bounds["iforest"]) for v in raw_if_test])
    norm_lof = np.array([_normalize_raw_score(v, *score_bounds["lof"]) for v in raw_lof_test])
    ensemble_test = 0.55 * norm_if + 0.45 * norm_lof
    
    trained_probs = np.clip(calibrator.predict(ensemble_test), 0.0, 1.0)
    trained_preds = (trained_probs >= 0.50).astype(int)
    t_trained_ms = (time.perf_counter() - t0) * 1000.0
    
    roc_b = float(roc_auc_score(y_test, trained_probs))
    pr_auc_b = float(average_precision_score(y_test, trained_probs))
    f1_b = float(f1_score(y_test, trained_preds, zero_division=0))
    prec_b = float(precision_score(y_test, trained_preds, zero_division=0))
    rec_b = float(recall_score(y_test, trained_preds, zero_division=0))
    tn_b, fp_b, fn_b, tp_b = confusion_matrix(y_test, trained_preds).ravel()
    spec_b = float(tn_b / (tn_b + fp_b))
    brier_b = float(brier_score_loss(y_test, trained_probs))
    ece_b = compute_ece(y_test, trained_probs)
    
    # --------------------------------------------------------------------------
    # [SUBSTAGE 2.3: AUDIT SYNTHESIS & REPORT PACKAGING]
    # [OBJECTIVE]: Compute absolute and relative deltas across all metrics.
    # --------------------------------------------------------------------------
    print("\n[4/4] Benchmark Run Finished Successfully!")
    results = {
        "dataset_metadata": {
            "total_samples": len(data),
            "total_vessels": len(mmsi_sets["train"]) + len(mmsi_sets["val"]) + len(mmsi_sets["calib"]) + len(mmsi_sets["test"]),
            "held_out_test_samples": len(X_test),
            "held_out_test_vessels": len(mmsi_sets["test"]),
            "test_anomalies_count": test_anom_count,
            "test_anomaly_prevalence": f"{test_anom_count / len(X_test) * 100:.2f}%",
            "anomaly_data_source": "Synthetic parametric kinematic generator (generate_vessel_data)",
            "leakage_audit": leakage_audit
        },
        "model_comparison": {
            "model_a_untrained_baseline": {
                "name": "Untrained / Raw Baseline",
                "pipeline": "Unscaled features -> Default IsolationForest (100 trees, no HPO, no Isotonic calibration)",
                "pr_auc": round(pr_auc_a, 4),
                "roc_auc": round(roc_a, 4),
                "f1_score": round(f1_a, 4),
                "precision": round(prec_a, 4),
                "recall": round(rec_a, 4),
                "specificity": round(spec_a, 4),
                "brier_score": round(brier_a, 4),
                "ece_calibration_error": round(ece_a, 4),
                "latency_per_100_tracks_ms": round((t_raw_ms / len(X_test)) * 100.0, 3),
                "confusion_matrix": {"tp": int(tp_a), "fp": int(fp_a), "tn": int(tn_a), "fn": int(fn_a)}
            },
            "model_b_trained_mlops_ensemble": {
                "name": "Trained & Calibrated MLOps Ensemble",
                "pipeline": "StandardScaler -> Dual IF (200 trees) + LOF (20 neighbors) -> Isotonic Calibration",
                "pr_auc": round(pr_auc_b, 4),
                "roc_auc": round(roc_b, 4),
                "f1_score": round(f1_b, 4),
                "precision": round(prec_b, 4),
                "recall": round(rec_b, 4),
                "specificity": round(spec_b, 4),
                "brier_score": round(brier_b, 4),
                "ece_calibration_error": round(ece_b, 4),
                "latency_per_100_tracks_ms": round((t_trained_ms / len(X_test)) * 100.0, 3),
                "training_time_seconds": round(t_train_sec, 3),
                "confusion_matrix": {"tp": int(tp_b), "fp": int(fp_b), "tn": int(tn_b), "fn": int(fn_b)}
            }
        },
        "performance_delta": {
            "ece_reduction_percent": f"{(ece_a - ece_b) / ece_a * 100:.1f}% ({ece_a:.4f} -> {ece_b:.4f})",
            "brier_improvement_percent": f"{(brier_a - brier_b) / brier_a * 100:.1f}% ({brier_a:.4f} -> {brier_b:.4f})",
            "false_positive_delta": f"{fp_a} -> {fp_b}",
            "precision_delta": f"{prec_a:.4f} -> {prec_b:.4f}",
            "recall_delta": f"{rec_a:.4f} -> {rec_b:.4f}",
            "f1_delta": f"{f1_a:.4f} -> {f1_b:.4f}",
            "roc_auc_delta": f"{roc_a:.4f} -> {roc_b:.4f}",
            "pr_auc_delta": f"{pr_auc_a:.4f} -> {pr_auc_b:.4f}"
        }
    }
    return results


if __name__ == "__main__":
    benchmark_report = run_benchmark()
    print("\n" + "=" * 75)
    print("      CORRECTED HORMUZWATCH ML: UNTRAINED VS. TRAINED POC REPORT      ")
    print("=" * 75)
    print(json.dumps(benchmark_report, indent=2))
