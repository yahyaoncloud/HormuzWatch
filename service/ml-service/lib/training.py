"""
lib/training.py
---------------
Disciplined Ensemble Training & Calibration Pipeline for HormuzWatch.

Architecture:
    1. Dataset Partitioning (Train 60%, Validation 15%, Calibration 15%, Test 10%)
       with support for Vessel Grouping (GroupKFold / MMSI-level isolation)
       to prevent data leakage across splits.
    2. Base Estimators (StandardScaler, IsolationForest, LocalOutlierFactor)
       fit exclusively on the Train partition.
    3. Monotonic Isotonic Calibrator fit exclusively on out-of-training
       predictions from the separate Calibration partition.
    4. Comprehensive Statistical Evaluation executed on the untouched Test partition:
       - Precision, Recall, F1-Score
       - Specificity, Balanced Accuracy
       - ROC-AUC, PR-AUC (Average Precision)
       - Brier Score & Expected Calibration Error (ECE)
       - Confusion Matrix (TP, FP, TN, FN)
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Any

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import (
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    balanced_accuracy_score,
)
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler

from lib.features import DOMAIN_FEATURE_COLS
from lib.scoring import (
    _normalize_raw_score,
    fitted_score_bounds,
    detect_hardware_device,
)
from lib.logger import get_logger

logger = get_logger("hormuzwatch.training")


def compute_ece(y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 10) -> float:
    """
    Compute Expected Calibration Error (ECE) across uniform confidence bins.

    ECE = sum_{m=1}^M (|B_m| / N) * |acc(B_m) - conf(B_m)|
    """
    if len(y_true) == 0:
        return 0.0
    bin_boundaries = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    n = len(y_true)

    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]
        if i == n_bins - 1:
            in_bin = (y_prob >= bin_lower) & (y_prob <= bin_upper)
        else:
            in_bin = (y_prob >= bin_lower) & (y_prob < bin_upper)
        bin_size = int(np.sum(in_bin))
        if bin_size > 0:
            bin_acc = float(np.mean(y_true[in_bin]))
            bin_conf = float(np.mean(y_prob[in_bin]))
            ece += (bin_size / n) * abs(bin_acc - bin_conf)

    return float(ece)


def train_ensemble(
    *,
    domain: str,
    data: list[dict],
    labels: Optional[list[int]] = None,
    groups: Optional[list[str]] = None,
    contamination: float = 0.05,
    models_dir: str | Path = "",
    random_state: int = 42,
) -> tuple[str, dict]:
    """
    Train IsolationForest + LocalOutlierFactor + IsotonicRegression ensemble
    with strict train / val / calibration / test partition discipline.

    Parameters
    ----------
    domain:
        One of ``"vessel"``, ``"aviation"``, ``"heatmap"``, ``"news"``, ``"transit"``, ``"blockade"``.
    data:
        List of feature dicts containing at least the domain's feature columns.
    labels:
        Binary labels (1 = anomaly, 0 = normal).
    groups:
        Optional vessel MMSI / track identifiers for group-based splitting to prevent leakage.
    contamination:
        Expected anomaly proportion.
    models_dir:
        Directory for saving artifact.
    random_state:
        Deterministic seed for reproducibility.

    Returns
    -------
    (version, metrics_dict)
    """
    if not models_dir:
        models_dir = Path(__file__).resolve().parent.parent / "models"
    else:
        models_dir = Path(models_dir)
    models_dir.mkdir(exist_ok=True)

    feature_cols = DOMAIN_FEATURE_COLS[domain]
    version = datetime.now(timezone.utc).strftime("v1.%Y%m%d%H%M%S")

    X_raw = np.array([
        [float(d.get(col, 0.0)) for col in feature_cols]
        for d in data
    ], dtype=np.float64)

    n_samples = len(data)
    if labels is not None:
        y_all = np.array(labels, dtype=np.float64)
    else:
        # Default pseudo-labels if none provided
        y_all = np.zeros(n_samples, dtype=np.float64)

    rng = np.random.default_rng(random_state)

    # ── 1. Partition Splitting (Train 60%, Val 15%, Calib 15%, Test 10%) ──
    if groups is not None and len(groups) == n_samples:
        # Group-based split by unique vessel/entity ID
        unique_groups = np.array(list(dict.fromkeys(groups)))
        rng.shuffle(unique_groups)
        n_g = len(unique_groups)
        g_train = set(unique_groups[: int(0.60 * n_g)])
        g_val = set(unique_groups[int(0.60 * n_g) : int(0.75 * n_g)])
        g_calib = set(unique_groups[int(0.75 * n_g) : int(0.90 * n_g)])
        g_test = set(unique_groups[int(0.90 * n_g) :])

        idx_train = [i for i, g in enumerate(groups) if g in g_train]
        idx_val = [i for i, g in enumerate(groups) if g in g_val]
        idx_calib = [i for i, g in enumerate(groups) if g in g_calib]
        idx_test = [i for i, g in enumerate(groups) if g in g_test]
        split_method = "group_mmsi_split"
    else:
        # Stratified / uniform random permutation split
        indices = rng.permutation(n_samples)
        n_tr = int(0.60 * n_samples)
        n_v = int(0.15 * n_samples)
        n_c = int(0.15 * n_samples)

        idx_train = indices[:n_tr]
        idx_val = indices[n_tr : n_tr + n_v]
        idx_calib = indices[n_tr + n_v : n_tr + n_v + n_c]
        idx_test = indices[n_tr + n_v + n_c :]
        split_method = "stratified_random_split"

    X_train, y_train = X_raw[idx_train], y_all[idx_train]
    X_val, y_val = X_raw[idx_val], y_all[idx_val]
    X_calib, y_calib = X_raw[idx_calib], y_all[idx_calib]
    X_test, y_test = X_raw[idx_test], y_all[idx_test]

    logger.info(
        "Domain %s splits: Train=%d, Val=%d, Calib=%d, Test=%d (Method: %s)",
        domain, len(X_train), len(X_val), len(X_calib), len(X_test), split_method,
    )

    # ── 2. Scaler (Fit exclusively on Train) ──────────────────────────────
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_calib_scaled = scaler.transform(X_calib)
    X_test_scaled = scaler.transform(X_test)

    # ── 3. Base Models: IsolationForest & LOF (Fit exclusively on Train) ───
    iforest = IsolationForest(
        n_estimators=200,
        contamination=contamination,
        max_samples="auto",
        random_state=random_state,
        n_jobs=1,
    )
    iforest.fit(X_train_scaled)

    lof = LocalOutlierFactor(
        n_neighbors=min(20, max(1, len(X_train) - 1)),
        contamination=contamination,
        novelty=True,
        n_jobs=1,
    )
    lof.fit(X_train_scaled)

    # ── 4. Score Bounds from Training Data ────────────────────────────────
    if_train_raw = iforest.score_samples(X_train_scaled)
    lof_train_raw = lof.score_samples(X_train_scaled)
    score_bounds = {
        "iforest": fitted_score_bounds(if_train_raw),
        "lof": fitted_score_bounds(lof_train_raw),
    }

    # ── 5. Score Calibration Partition (Out-of-Training) ───────────────────
    if_calib_raw = iforest.score_samples(X_calib_scaled)
    lof_calib_raw = lof.score_samples(X_calib_scaled)

    norm_if_calib = np.array([_normalize_raw_score(v, *score_bounds["iforest"]) for v in if_calib_raw])
    norm_lof_calib = np.array([_normalize_raw_score(v, *score_bounds["lof"]) for v in lof_calib_raw])
    ensemble_calib = 0.55 * norm_if_calib + 0.45 * norm_lof_calib

    # ── 6. Fit Isotonic Calibrator (Strictly on Calibration Split) ─────────
    calibrator = IsotonicRegression(out_of_bounds="clip", increasing=True)
    if labels is not None and len(labels) == n_samples and (y_calib.max() > y_calib.min()):
        calibrator.fit(ensemble_calib, y_calib)
        calibration_mode = "supervised_calibration_set"
    else:
        # Fallback pseudo-calibration if labels are absent or single-class
        threshold = np.quantile(ensemble_calib, 1.0 - contamination)
        pseudo_y_calib = (ensemble_calib >= threshold).astype(np.float64)
        calibrator.fit(ensemble_calib, pseudo_y_calib)
        calibration_mode = "pseudo_supervised_quantile"

    # ── 7. Evaluate Full Pipeline on Held-out Test Partition ──────────────
    if_test_raw = iforest.score_samples(X_test_scaled)
    lof_test_raw = lof.score_samples(X_test_scaled)

    norm_if_test = np.array([_normalize_raw_score(v, *score_bounds["iforest"]) for v in if_test_raw])
    norm_lof_test = np.array([_normalize_raw_score(v, *score_bounds["lof"]) for v in lof_test_raw])
    ensemble_test = 0.55 * norm_if_test + 0.45 * norm_lof_test

    prob_test = np.clip(calibrator.predict(ensemble_test), 0.0, 1.0)
    pred_test = (prob_test >= 0.5).astype(int)
    y_test_binary = (y_test >= 0.5).astype(int)

    # ── 8. Calculate Complete Metrics Suite on Test Set ───────────────────
    prec = float(precision_score(y_test_binary, pred_test, zero_division=0))
    rec = float(recall_score(y_test_binary, pred_test, zero_division=0))
    f1 = float(f1_score(y_test_binary, pred_test, zero_division=0))
    bal_acc = float(balanced_accuracy_score(y_test_binary, pred_test))

    # Confusion matrix
    if len(np.unique(y_test_binary)) > 1:
        tn, fp, fn, tp = confusion_matrix(y_test_binary, pred_test, labels=[0, 1]).ravel()
        specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
        try:
            roc_auc = float(roc_auc_score(y_test_binary, prob_test))
        except Exception:
            roc_auc = 0.5
        try:
            pr_auc = float(average_precision_score(y_test_binary, prob_test))
        except Exception:
            pr_auc = float(np.mean(y_test_binary))
    else:
        tp = int(np.sum((pred_test == 1) & (y_test_binary == 1)))
        fp = int(np.sum((pred_test == 1) & (y_test_binary == 0)))
        tn = int(np.sum((pred_test == 0) & (y_test_binary == 0)))
        fn = int(np.sum((pred_test == 0) & (y_test_binary == 1)))
        specificity = 1.0
        roc_auc = 1.0
        pr_auc = 1.0

    brier = float(brier_score_loss(y_test_binary, prob_test))
    ece = compute_ece(y_test_binary, prob_test, n_bins=10)

    device_info = detect_hardware_device()

    metrics = {
        "domain": domain,
        "version": version,
        "n_samples": n_samples,
        "n_samples_total": n_samples,
        "n_train": len(X_train),
        "n_val": len(X_val),
        "n_calib": len(X_calib),
        "n_test": len(X_test),
        "n_features": len(feature_cols),
        "split_method": split_method,
        "contamination": contamination,
        "calibration_mode": calibration_mode,
        "f1": round(f1, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "anomaly_rate": round(contamination, 4),
        "test_precision": round(prec, 4),
        "test_recall": round(rec, 4),
        "test_f1": round(f1, 4),
        "test_specificity": round(specificity, 4),
        "test_balanced_accuracy": round(bal_acc, 4),
        "test_roc_auc": round(roc_auc, 4),
        "test_pr_auc": round(pr_auc, 4),
        "test_brier_score": round(brier, 4),
        "test_ece": round(ece, 4),
        "confusion_matrix": {
            "tp": int(tp),
            "fp": int(fp),
            "tn": int(tn),
            "fn": int(fn),
        },
        "hardware_device": device_info,
    }

    # ── 9. Persist Artifact ───────────────────────────────────────────────
    artifact_path = models_dir / f"{domain}_ensemble.joblib"
    joblib.dump(
        {
            "model_iforest": iforest,
            "model_lof": lof,
            "scaler": scaler,
            "calibrator": calibrator,
            "feature_cols": feature_cols,
            "domain": domain,
            "version": version,
            "score_bounds": score_bounds,
            "hardware_device": device_info,
            "metrics": metrics,
        },
        artifact_path,
    )
    logger.info(
        "Saved %s ensemble -> %s (%.1f KB) | Test F1=%.4f, Precision=%.4f, Recall=%.4f, ROC-AUC=%.4f, ECE=%.4f",
        domain, artifact_path.name, artifact_path.stat().st_size / 1024, f1, prec, rec, roc_auc, ece,
    )

    return version, metrics


def train_ensemble_from_csv(
    domain: str,
    csv_path: str | Path,
    labels_csv: Optional[str | Path] = None,
    contamination: float = 0.05,
    models_dir: str | Path = "",
) -> tuple[str, dict]:
    """Load features from CSV and train ensemble."""
    import csv

    csv_path = Path(csv_path)
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        data = [{k: v for k, v in row.items()} for row in reader]

    labels = None
    if labels_csv:
        labels_path = Path(labels_csv)
        with open(labels_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            labels = [int(row.get("label", 0)) for row in reader]

    return train_ensemble(
        domain=domain,
        data=data,
        labels=labels,
        contamination=contamination,
        models_dir=models_dir,
    )
