"""
pipeline/train_and_evaluate.py
==============================
Automated Bayesian Hyperparameter Optimization (Optuna) and Leakage-Free
Ensemble Continuous Training (CT) with MLflow Tracking & Production Schema Artifact Logging.

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
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Tuple

import joblib
import mlflow
import numpy as np
import optuna
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import (
    precision_recall_curve,
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    f1_score,
    precision_score,
    recall_score,
    confusion_matrix,
    balanced_accuracy_score
)
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler

# ------------------------------------------------------------------------------
# [STAGE 0: ENVIRONMENT RESOLUTION & DEPENDENCY LINKING]
# [OBJECTIVE]: Resolve pipeline configurations and ensure access to production
#              scoring utilities regardless of invocation location.
# [SYSTEM OUTCOME]: Environment-agnostic path resolution for artifacts and models.
# ------------------------------------------------------------------------------
PIPELINE_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = PIPELINE_ROOT.parent
sys.path.insert(0, str(PROJECT_ROOT / "service" / "ml-service"))
if "/app" not in sys.path:
    sys.path.insert(0, "/app")

from pipeline.config import config, MODELS_DIR, ARTIFACTS_DIR
from pipeline.extract_features import extract_features_from_db
from pipeline.benchmark_poc import build_authoritative_split
from lib.features import DOMAIN_FEATURE_COLS
from lib.scoring import _normalize_raw_score, fitted_score_bounds, detect_hardware_device
from lib.training import compute_ece
from lib.dataset_generator import load_dataset, extract_feature_matrix


# ==============================================================================
# [STAGE 1: BAYESIAN HPO, ENSEMBLE TRAINING, AND HELD-OUT EVALUATION]
# [OBJECTIVE]: Optimize base tree parameters on Train/Val, calibrate on Calib split,
#              and verify candidate performance on an untouched Test split.
# [MATHEMATICAL BASIS]:
#   Tree Splitting: Random axis-aligned cuts in d-dimensional space.
#   Path Length: E(h(x)) represents average depth required to isolate sample x.
#   LOF Score: LOF_k(p) = (∑_{o ∈ N_k(p)} lrd(o) / |N_k(p)|) / lrd(p).
#   Calibration: Monotonic step function minimizing squared loss on Calib partition.
# [SYSTEM OUTCOME]: Persists candidate bundle to ARTIFACTS_DIR ready for gate evaluation.
# [SAFETY INVARIANT]: Zero test-set observations may leak into training, scaling, or calibration.
# ==============================================================================
def train_domain_model(domain: str = "vessel", dataset_dir: Optional[str] = None) -> Dict[str, Any]:
    """Execute Optuna HPO, train calibrated production ensemble, and record in MLflow."""
    mlflow.set_tracking_uri(config.mlflow_tracking_uri)
    mlflow.set_experiment(config.experiment_name)
    
    # --------------------------------------------------------------------------
    # [SUBSTAGE 1.1: FEATURE EXTRACTION & CANONICAL SCHEMA ALIGNMENT]
    # [OBJECTIVE]: Extract telemetry features and strictly align columns with DOMAIN_FEATURE_COLS.
    # [SAFETY INVARIANT]: Feature column ordering must match the production inference contract.
    # --------------------------------------------------------------------------
    feature_cols = DOMAIN_FEATURE_COLS[domain]

    if dataset_dir and os.path.exists(dataset_dir):
        bundle = load_dataset(dataset_dir)
        X_tr_df, y_tr_ser = extract_feature_matrix(bundle.df_train, domain=domain)
        X_val_full_df, y_val_full_ser = extract_feature_matrix(bundle.df_val, domain=domain)
        X_te_df, y_te_ser = extract_feature_matrix(bundle.df_test, domain=domain)
        
        X_train = X_tr_df[feature_cols].to_numpy(dtype=np.float64)
        y_train = y_tr_ser.to_numpy(dtype=int)
        
        # Partition validation into Val (for Optuna HPO) and Calib (for Isotonic Regression)
        n_val_half = max(1, len(X_val_full_df) // 2)
        X_val = X_val_full_df.iloc[:n_val_half][feature_cols].to_numpy(dtype=np.float64)
        y_val = y_val_full_ser.iloc[:n_val_half].to_numpy(dtype=int)
        X_calib = X_val_full_df.iloc[n_val_half:][feature_cols].to_numpy(dtype=np.float64)
        y_calib = y_val_full_ser.iloc[n_val_half:].to_numpy(dtype=int)
        
        X_test = X_te_df[feature_cols].to_numpy(dtype=np.float64)
        y_test = y_te_ser.to_numpy(dtype=int)
    else:
        X_df, y_ser, groups = extract_features_from_db(domain=domain)
        X_raw = X_df[feature_cols].to_numpy(dtype=np.float64)
        y_raw = y_ser.to_numpy(dtype=int)
        
        # ----------------------------------------------------------------------
        # [SUBSTAGE 1.2: AUTHORITATIVE STRATIFIED ENTITY GROUPING]
        # [OBJECTIVE]: Group observations by vessel entity (MMSI) to prevent leakage.
        # [MATHEMATICAL BASIS]: MMSI(Train) ∩ MMSI(Test) = ∅.
        # ----------------------------------------------------------------------
        partitions, mmsi_sets = build_authoritative_split(groups, list(y_raw), seed=42)
        
        X_train, y_train = X_raw[partitions["train"]], y_raw[partitions["train"]]
        X_val, y_val = X_raw[partitions["val"]], y_raw[partitions["val"]]
        X_calib, y_calib = X_raw[partitions["calib"]], y_raw[partitions["calib"]]
        X_test, y_test = X_raw[partitions["test"]], y_raw[partitions["test"]]
    
    # --------------------------------------------------------------------------
    # [SUBSTAGE 1.3: FEATURE NORMALIZATION - FIT STRICTLY ON TRAIN]
    # [OBJECTIVE]: Standardize kinematic features to zero mean and unit variance.
    # [SAFETY INVARIANT]: StandardScaler fitted strictly on X_train; transform only on val/calib/test.
    # --------------------------------------------------------------------------
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_calib_scaled = scaler.transform(X_calib)
    X_test_scaled = scaler.transform(X_test)
    
    # --------------------------------------------------------------------------
    # [SUBSTAGE 1.4: OPTUNA BAYESIAN HYPERPARAMETER OPTIMIZATION]
    # [OBJECTIVE]: Maximize Validation ROC-AUC over n_estimators, max_samples, and contamination.
    # [MATHEMATICAL BASIS]: Tree-structured Parzen Estimator (TPE) algorithm.
    # --------------------------------------------------------------------------
    optuna.logging.set_verbosity(optuna.logging.WARNING)
    
    def objective(trial: optuna.Trial) -> float:
        n_estimators = trial.suggest_int("n_estimators", 100, 200, step=25)
        max_samples = trial.suggest_float("max_samples", 0.70, 1.0)
        contamination = trial.suggest_float("contamination", 0.02, 0.08)
        
        clf = IsolationForest(
            n_estimators=n_estimators,
            max_samples=max_samples,
            contamination=contamination,
            random_state=42,
            n_jobs=-1
        )
        clf.fit(X_train_scaled)
        raw_val = -clf.score_samples(X_val_scaled)
        try:
            return float(roc_auc_score(y_val, raw_val))
        except Exception:
            return 0.5
            
    study = optuna.create_study(direction="maximize")
    study.optimize(objective, n_trials=config.optuna_n_trials)
    best_params = study.best_params
    
    # --------------------------------------------------------------------------
    # [SUBSTAGE 1.5: PRODUCTION ESTIMATOR FITTING & SCORE BOUND DERIVATION]
    # [OBJECTIVE]: Fit final IsolationForest and LocalOutlierFactor on X_train_scaled.
    # [MATHEMATICAL BASIS]: Score bounds [s_min, s_max] established from training distribution.
    # --------------------------------------------------------------------------
    with mlflow.start_run(run_name=f"{domain}_candidate_{int(time.time())}"):
        mlflow.log_params(best_params)
        mlflow.log_param("domain", domain)
        mlflow.log_param("train_entities", len(mmsi_sets["train"]))
        mlflow.log_param("test_entities", len(mmsi_sets["test"]))
        
        best_if = IsolationForest(
            n_estimators=best_params["n_estimators"],
            max_samples=best_params["max_samples"],
            contamination=best_params["contamination"],
            random_state=42,
            n_jobs=-1
        )
        best_if.fit(X_train_scaled)
        
        best_lof = LocalOutlierFactor(
            n_neighbors=min(20, max(1, len(X_train_scaled) - 1)),
            contamination=best_params["contamination"],
            novelty=True,
            n_jobs=1
        )
        best_lof.fit(X_train_scaled)
        
        score_bounds = {
            "iforest": fitted_score_bounds(best_if.score_samples(X_train_scaled)),
            "lof": fitted_score_bounds(best_lof.score_samples(X_train_scaled)),
        }
        
        # ----------------------------------------------------------------------
        # [SUBSTAGE 1.6: INDEPENDENT ISOTONIC CALIBRATION]
        # [OBJECTIVE]: Calibrate raw ensemble scores into empirical anomaly probabilities
        #              using strictly the held-out Calibration partition.
        # [MATHEMATICAL BASIS]: Isotonic Regression fits a non-decreasing step function.
        # [SAFETY INVARIANT]: Calibrator never exposed to training or test data.
        # ----------------------------------------------------------------------
        if_calib = best_if.score_samples(X_calib_scaled)
        lof_calib = best_lof.score_samples(X_calib_scaled)
        norm_if_cal = np.array([_normalize_raw_score(v, *score_bounds["iforest"]) for v in if_calib])
        norm_lof_cal = np.array([_normalize_raw_score(v, *score_bounds["lof"]) for v in lof_calib])
        ensemble_calib = 0.55 * norm_if_cal + 0.45 * norm_lof_cal
        
        calibrator = IsotonicRegression(out_of_bounds="clip", increasing=True)
        if len(np.unique(y_calib)) > 1:
            calibrator.fit(ensemble_calib, y_calib)
        else:
            pseudo_thresh = np.quantile(ensemble_calib, 1.0 - best_params["contamination"])
            calibrator.fit(ensemble_calib, (ensemble_calib >= pseudo_thresh).astype(float))
            
        # ----------------------------------------------------------------------
        # [SUBSTAGE 1.7: HELD-OUT TEST EVALUATION]
        # [OBJECTIVE]: Compute unbiased generalization metrics on held-out Test split.
        # [METRICS COMPUTED]: ROC-AUC, PR-AUC, F1, Precision, Recall, Specificity, Brier, ECE.
        # ----------------------------------------------------------------------
        t0 = time.perf_counter()
        if_test = best_if.score_samples(X_test_scaled)
        lof_test = best_lof.score_samples(X_test_scaled)
        norm_if_te = np.array([_normalize_raw_score(v, *score_bounds["iforest"]) for v in if_test])
        norm_lof_te = np.array([_normalize_raw_score(v, *score_bounds["lof"]) for v in lof_test])
        ensemble_test = 0.55 * norm_if_te + 0.45 * norm_lof_te
        
        test_probs = np.clip(calibrator.predict(ensemble_test), 0.0, 1.0)
        t_infer_ms_per_sample = ((time.perf_counter() - t0) * 1000.0) / len(X_test)
        
        test_preds = (test_probs >= 0.50).astype(int)
        
        try:
            roc_auc = float(roc_auc_score(y_test, test_probs))
        except Exception:
            roc_auc = 0.5
        try:
            pr_auc = float(average_precision_score(y_test, test_probs))
        except Exception:
            pr_auc = 0.5
            
        prec = float(precision_score(y_test, test_preds, zero_division=0))
        rec = float(recall_score(y_test, test_preds, zero_division=0))
        f1 = float(f1_score(y_test, test_preds, zero_division=0))
        tn, fp, fn, tp = confusion_matrix(y_test, test_preds).ravel()
        spec = float(tn / (tn + fp))
        brier = float(brier_score_loss(y_test, test_probs))
        ece = compute_ece(y_test, test_probs)
        
        metrics = {
            "test_roc_auc": round(roc_auc, 4),
            "test_pr_auc": round(pr_auc, 4),
            "test_f1": round(f1, 4),
            "test_precision": round(prec, 4),
            "test_recall": round(rec, 4),
            "test_specificity": round(spec, 4),
            "test_brier_score": round(brier, 4),
            "test_ece": round(ece, 4),
            "latency_ms_per_sample": round(t_infer_ms_per_sample, 4),
            "confusion_matrix": {"tp": int(tp), "fp": int(fp), "tn": int(tn), "fn": int(fn)}
        }
        mlflow.log_metrics({k: v for k, v in metrics.items() if isinstance(v, (int, float))})
        
        version_str = f"candidate_v{int(time.time())}"
        device_info = detect_hardware_device()
        
        # ----------------------------------------------------------------------
        # [SUBSTAGE 1.8: CANONICAL PRODUCTION ARTIFACT BUNDLE CREATION]
        # [OBJECTIVE]: Pack all trained components into exact dictionary format expected
        #              by lib/scoring.py and grpc_server.py.
        # [SYSTEM OUTCOME]: Persisted artifact at ARTIFACTS_DIR/{domain}_candidate.joblib.
        # ----------------------------------------------------------------------
        candidate_bundle = {
            "model_iforest": best_if,
            "model_lof": best_lof,
            "scaler": scaler,
            "calibrator": calibrator,
            "feature_cols": feature_cols,
            "domain": domain,
            "version": version_str,
            "score_bounds": score_bounds,
            "hardware_device": device_info,
            "metrics": metrics,
            "best_params": best_params,
        }
        
        ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
        candidate_path = ARTIFACTS_DIR / f"{domain}_candidate.joblib"
        joblib.dump(candidate_bundle, candidate_path)
        mlflow.log_artifact(str(candidate_path))
        
        return {
            "domain": domain,
            "status": "SUCCESS",
            "metrics": metrics,
            "candidate_path": str(candidate_path),
            "best_params": best_params,
            "version": version_str,
        }


def train_all_models() -> Dict[str, Any]:
    """Train full suite of multi-domain models sequentially."""
    domains = ["vessel", "aviation", "transit", "heatmap", "blockade"]
    results = {}
    for d in domains:
        results[d] = train_domain_model(domain=d)
    return results


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Continuous Training Pipeline")
    parser.add_argument("domain", nargs="?", default="vessel", help="Domain to train (vessel, aviation, all)")
    parser.add_argument("--dataset-dir", default=None, help="Optional path to versioned dataset directory")
    args = parser.parse_args()

    if args.domain == "all":
        res = train_all_models()
        print(json.dumps(res, indent=2))
    else:
        res = train_domain_model(domain=args.domain, dataset_dir=args.dataset_dir)
        print(json.dumps(res, indent=2))
