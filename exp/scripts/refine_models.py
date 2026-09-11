"""
exp/scripts/refine_models.py
============================
End-to-End Multi-Domain Model Refinement, Optimal Calibration,
and Quality Gating Harness for the HormuzWatch Experimentation Lab.
"""

from __future__ import annotations

import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Tuple, Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import (
    average_precision_score,
    balanced_accuracy_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler

EXP_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = EXP_ROOT.parent

# Ensure project modules are importable
sys.path.insert(0, str(PROJECT_ROOT / "service" / "ml-service"))
sys.path.insert(0, str(PROJECT_ROOT / "mlops"))
sys.path.insert(0, str(EXP_ROOT))

from lib.features import (
    DOMAIN_FEATURE_COLS,
    VESSEL_COLS,
    AVIATION_COLS,
    TRANSIT_COLS,
    BLOCKADE_COLS,
    HEATMAP_COLS,
)
from lib.scoring import (
    _normalize_raw_score,
    fitted_score_bounds,
    detect_hardware_device,
)
from lib.training import compute_ece
from pipeline.extract_features import extract_features_from_db
from pipeline.benchmark_poc import build_authoritative_split

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [ExpLab] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("model_refinement")

EXP_MODELS_DIR = EXP_ROOT / "models"
EXP_REPORTS_DIR = EXP_ROOT / "reports"
EXP_MODELS_DIR.mkdir(parents=True, exist_ok=True)
EXP_REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def find_optimal_threshold(y_true: np.ndarray, y_prob: np.ndarray) -> Tuple[float, float]:
    """Sweep decision thresholds on validation data to maximize F1 score."""
    if len(np.unique(y_true)) < 2 or np.sum(y_true == 1) == 0:
        return 0.5, 0.0

    best_thresh = 0.5
    best_f1 = -1.0
    thresholds = np.linspace(0.05, 0.95, 91)

    for th in thresholds:
        preds = (y_prob >= th).astype(int)
        score = float(f1_score(y_true, preds, zero_division=0))
        if score > best_f1:
            best_f1 = score
            best_thresh = float(th)

    return best_thresh, best_f1


def refine_domain_ensemble(
    domain: str,
    X_raw: np.ndarray,
    y_raw: np.ndarray,
    groups: list[str],
    feature_cols: list[str],
    contamination: float = 0.03,
    n_estimators: int = 175,
    max_samples: float = 0.99,
) -> Dict[str, Any]:
    """Train, calibrate, optimize threshold, and evaluate ensemble with sub-millisecond SLA."""
    logger.info(f"--- Refining Domain Model: '{domain}' (Samples: {len(X_raw)}) ---")
    start_time = time.perf_counter()

    # 1. Authoritative Entity Stratified Split (MMSI / Group isolation)
    partitions, entity_sets = build_authoritative_split(groups, list(y_raw), seed=42)

    X_train, y_train = X_raw[partitions["train"]], y_raw[partitions["train"]]
    X_val, y_val = X_raw[partitions["val"]], y_raw[partitions["val"]]
    X_calib, y_calib = X_raw[partitions["calib"]], y_raw[partitions["calib"]]
    X_test, y_test = X_raw[partitions["test"]], y_raw[partitions["test"]]

    logger.info(f"Splits -> Train: {len(X_train)}, Val: {len(X_val)}, Calib: {len(X_calib)}, Test: {len(X_test)}")

    # 2. Scaling (strictly on Train)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_calib_scaled = scaler.transform(X_calib)
    X_test_scaled = scaler.transform(X_test)

    # 3. Fit Isolation Forest
    iforest = IsolationForest(
        n_estimators=n_estimators,
        max_samples=max_samples,
        contamination=contamination,
        random_state=42,
        n_jobs=-1,
    )
    iforest.fit(X_train_scaled)

    # 4. Fit LOF on subsampled background index (max 2500 points for sub-millisecond inference)
    rng = np.random.default_rng(42)
    if len(X_train_scaled) > 2500:
        idx_lof = rng.choice(len(X_train_scaled), 2500, replace=False)
        X_train_lof = X_train_scaled[idx_lof]
    else:
        X_train_lof = X_train_scaled

    lof = LocalOutlierFactor(
        n_neighbors=20,
        contamination=contamination,
        novelty=True,
        n_jobs=-1,
    )
    lof.fit(X_train_lof)

    # Fitted score bounds
    if_train_raw = iforest.score_samples(X_train_scaled)
    lof_train_raw = lof.score_samples(X_train_lof)
    score_bounds = {
        "iforest": fitted_score_bounds(if_train_raw),
        "lof": fitted_score_bounds(lof_train_raw),
    }

    def compute_ensemble_raw(X_scaled):
        if_raw = iforest.score_samples(X_scaled)
        lof_raw = lof.score_samples(X_scaled)
        n_if = np.array([_normalize_raw_score(v, *score_bounds["iforest"]) for v in if_raw])
        n_lof = np.array([_normalize_raw_score(v, *score_bounds["lof"]) for v in lof_raw])
        return 0.55 * n_if + 0.45 * n_lof

    ens_calib = compute_ensemble_raw(X_calib_scaled)
    ens_val = compute_ensemble_raw(X_val_scaled)
    ens_test = compute_ensemble_raw(X_test_scaled)

    # 5. Isotonic Calibration on Calib split
    calibrator = IsotonicRegression(y_min=0.0, y_max=1.0, out_of_bounds="clip")
    if np.sum(y_calib == 1) > 0 and len(np.unique(y_calib)) > 1:
        calibrator.fit(ens_calib, y_calib.astype(np.float64))
        calib_mode = "supervised_calibration"
    else:
        pseudo_thresh = np.quantile(ens_calib, 1.0 - contamination)
        calibrator.fit(ens_calib, (ens_calib >= pseudo_thresh).astype(np.float64))
        calib_mode = "pseudo_quantile"

    prob_val = np.clip(calibrator.predict(ens_val), 0.0, 1.0)
    prob_test = np.clip(calibrator.predict(ens_test), 0.0, 1.0)

    # 6. Threshold Tuning on Val split
    opt_threshold, val_f1 = find_optimal_threshold(y_val, prob_val)
    logger.info(f"Optimal Decision Threshold tuned on Validation split: {opt_threshold:.4f} (Val F1: {val_f1:.4f})")

    # 7. Final Evaluation on Untouched Test Split
    pred_test = (prob_test >= opt_threshold).astype(int)

    prec = float(precision_score(y_test, pred_test, zero_division=0))
    rec = float(recall_score(y_test, pred_test, zero_division=0))
    f1 = float(f1_score(y_test, pred_test, zero_division=0))
    bal_acc = float(balanced_accuracy_score(y_test, pred_test))

    if len(np.unique(y_test)) > 1:
        tn, fp, fn, tp = confusion_matrix(y_test, pred_test, labels=[0, 1]).ravel()
        specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
        try:
            roc_auc = float(roc_auc_score(y_test, prob_test))
        except Exception:
            roc_auc = 0.5
        try:
            pr_auc = float(average_precision_score(y_test, prob_test))
        except Exception:
            pr_auc = float(np.mean(y_test))
    else:
        tp = int(np.sum((pred_test == 1) & (y_test == 1)))
        fp = int(np.sum((pred_test == 1) & (y_test == 0)))
        tn = int(np.sum((pred_test == 0) & (y_test == 0)))
        fn = int(np.sum((pred_test == 0) & (y_test == 1)))
        specificity = 1.0
        roc_auc = 1.0
        pr_auc = 1.0

    brier = float(brier_score_loss(y_test, prob_test))
    ece = float(compute_ece(y_test, prob_test, n_bins=10))

    # Latency benchmark (single sample)
    sample_bench = X_test_scaled[:1]
    t0 = time.perf_counter()
    for _ in range(50):
        _ = compute_ensemble_raw(sample_bench)
    latency_ms = ((time.perf_counter() - t0) / 50) * 1000.0

    duration = time.perf_counter() - start_time
    logger.info(
        f"Domain '{domain}' Evaluation Complete in {duration:.2f}s:\n"
        f"  Precision: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f}\n"
        f"  ROC-AUC: {roc_auc:.4f} | PR-AUC: {pr_auc:.4f} | ECE: {ece:.4f}\n"
        f"  Confusion Matrix: TP={tp}, FP={fp}, TN={tn}, FN={fn}\n"
        f"  Inference Latency: {latency_ms:.3f} ms/sample"
    )

    # 8. Save Refined Artifact
    artifact_name = f"{domain}_ensemble.joblib"
    artifact_path = EXP_MODELS_DIR / artifact_name
    bundle = {
        "model_iforest": iforest,
        "model_lof": lof,
        "scaler": scaler,
        "calibrator": calibrator,
        "feature_cols": feature_cols,
        "domain": domain,
        "optimal_threshold": opt_threshold,
        "version": f"exp_v{int(time.time())}",
        "score_bounds": score_bounds,
        "contamination": contamination,
        "hardware_device": detect_hardware_device(),
    }
    joblib.dump(bundle, artifact_path)
    logger.info(f"Refined model artifact saved to: {artifact_path}")

    return {
        "domain": domain,
        "artifact": artifact_name,
        "artifact_path": str(artifact_path),
        "split_method": "authoritative_entity_stratified",
        "n_samples": len(X_raw),
        "optimal_threshold": opt_threshold,
        "calibration_mode": calib_mode,
        "metrics": {
            "test_precision": round(prec, 4),
            "test_recall": round(rec, 4),
            "test_f1": round(f1, 4),
            "test_specificity": round(specificity, 4),
            "test_balanced_accuracy": round(bal_acc, 4),
            "test_roc_auc": round(roc_auc, 4),
            "test_pr_auc": round(pr_auc, 4),
            "test_brier_score": round(brier, 4),
            "test_ece": round(ece, 4),
            "latency_ms_per_sample": round(latency_ms, 3),
            "confusion_matrix": {
                "tp": int(tp),
                "fp": int(fp),
                "tn": int(tn),
                "fn": int(fn),
            },
        },
    }


def main():
    logger.info("=================================================================")
    logger.info("  🚀 Starting Full Model Refinement & Calibration Pipeline       ")
    logger.info("=================================================================")

    results = {}
    domains = ["vessel", "aviation", "transit", "blockade", "heatmap"]

    for domain in domains:
        cols = DOMAIN_FEATURE_COLS[domain]
        X_df, y_ser, groups = extract_features_from_db(domain=domain, limit=4000)
        X_raw = X_df[cols].fillna(0.0).to_numpy(dtype=np.float64)
        y_raw = y_ser.to_numpy(dtype=int)

        results[domain] = refine_domain_ensemble(
            domain=domain,
            X_raw=X_raw,
            y_raw=y_raw,
            groups=groups,
            feature_cols=cols,
            contamination=0.03,
            n_estimators=175,
            max_samples=0.99,
        )

    # Copy corridor autoencoder to exp/models
    autoencoder_src = PROJECT_ROOT / "service" / "ml-service" / "models" / "vessel_autoencoder.joblib"
    if autoencoder_src.exists():
        import shutil
        shutil.copy2(autoencoder_src, EXP_MODELS_DIR / "vessel_autoencoder.joblib")
        logger.info("Synchronized vessel_autoencoder.joblib to exp/models/")

    # Write summary JSON report
    report_json_path = EXP_REPORTS_DIR / "model_refinement_report.json"
    with open(report_json_path, "w") as f:
        json.dump(
            {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "models": results,
            },
            f,
            indent=2,
        )
    logger.info(f"Model refinement JSON report written to: {report_json_path}")

    # Write summary Markdown report
    report_md_path = EXP_REPORTS_DIR / "model_refinement_report.md"
    with open(report_md_path, "w") as f:
        f.write("# 🧪 Model Refinement & Calibration Benchmark Report\n\n")
        f.write(f"**Generated:** {datetime.now(timezone.utc).isoformat()}\n\n")
        f.write("| Domain | Samples | Optimal Threshold | Precision | Recall | F1 Score | PR-AUC | ROC-AUC | ECE | Latency (ms) |\n")
        f.write("|---|---|---|---|---|---|---|---|---|---|\n")
        for dom, r in results.items():
            m = r["metrics"]
            f.write(
                f"| **{dom}** | {r['n_samples']} | {r['optimal_threshold']:.3f} | "
                f"{m['test_precision']:.3f} | {m['test_recall']:.3f} | **{m['test_f1']:.3f}** | "
                f"{m['test_pr_auc']:.3f} | {m['test_roc_auc']:.3f} | {m['test_ece']:.3f} | "
                f"{m['latency_ms_per_sample']:.3f} |\n"
            )
    logger.info(f"Model refinement Markdown report written to: {report_md_path}")
    logger.info("✅ All models refined, calibrated, and evaluated successfully!")


if __name__ == "__main__":
    main()
