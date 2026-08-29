"""
lib/training.py
---------------
Online ensemble training for the HormuzWatch ML service.

Trains a complete ensemble (IsolationForest + LocalOutlierFactor +
IsotonicRegression calibrator) for a given domain from feature dicts.

Can be called from:
  - POST /api/train (online, via app.py)
  - api/train.py (offline CLI)
  - Any test / notebook workflow

Each call produces a ``{domain}_ensemble.joblib`` artifact under the
configured models directory.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import f1_score, precision_score, recall_score
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


def train_ensemble(
    *,
    domain: str,
    data: list[dict],
    labels: Optional[list[int]] = None,
    contamination: float = 0.05,
    models_dir: str | Path = "",
) -> tuple[str, dict]:
    """
    Train IsolationForest + LocalOutlierFactor + IsotonicRegression ensemble.

    Parameters
    ----------
    domain:
        One of ``"vessel"``, ``"aviation"``, ``"heatmap"``, ``"news"``.
    data:
        List of feature dicts. Each dict must contain at least the columns
        defined in ``DOMAIN_FEATURE_COLS[domain]``. Extra keys are ignored.
    labels:
        Optional binary labels: 1 = anomalous, 0 = normal. When provided,
        the calibrator is fit on real labels and precision/recall/f1 are
        reported. When absent, a sigmoid pseudo-calibration is used.
    contamination:
        Expected proportion of anomalies in the data (0.01–0.50).
        Passed to IsolationForest.
    models_dir:
        Directory where the ``{domain}_ensemble.joblib`` artifact is saved.
        Defaults to ``ml-service/models/``.

    Returns
    -------
    (version, metrics)
        version: ISO-8601 UTC timestamp string.
        metrics: dict with training statistics (n_samples, anomaly_rate, etc.).
    """
    # ── Resolve paths ──────────────────────────────────────────────────────
    if not models_dir:
        models_dir = Path(__file__).resolve().parent.parent / "models"
    else:
        models_dir = Path(models_dir)
    models_dir.mkdir(exist_ok=True)

    feature_cols = DOMAIN_FEATURE_COLS[domain]
    version = datetime.now(timezone.utc).strftime("v1.%Y%m%d%H%M%S")

    # ── Build feature matrix ───────────────────────────────────────────────
    X_raw = np.array([
        [float(d.get(col, 0.0)) for col in feature_cols]
        for d in data
    ], dtype=np.float64)

    n_samples = len(data)
    logger.info(
        "Training %s ensemble: %d samples, %d features, contamination=%.3f",
        domain, n_samples, len(feature_cols), contamination,
    )

    # ── Scale ──────────────────────────────────────────────────────────────
    scaler = StandardScaler()
    X = scaler.fit_transform(X_raw)

    # ── IsolationForest ────────────────────────────────────────────────────
    iforest = IsolationForest(
        n_estimators=200,
        contamination=contamination,
        max_samples="auto",
        random_state=42,
        n_jobs=1,  # Production gRPC: avoid OpenMP CPU thrashing at inference
    )
    iforest.fit(X)

    # ── LocalOutlierFactor (novelty mode for predict) ──────────────────────
    lof = LocalOutlierFactor(
        n_neighbors=min(20, max(1, n_samples - 1)),
        contamination=contamination,
        novelty=True,
        n_jobs=1,  # Production gRPC: avoid OpenMP CPU thrashing at inference
    )
    lof.fit(X)

    # ── Score bounds (for normalisation at inference time) ─────────────────
    if_raw = iforest.score_samples(X)
    lof_raw = lof.score_samples(X)

    # ── Ensemble scores & calibration ──────────────────────────────────────
    norm_if = np.array([_normalize_raw_score(v, *fitted_score_bounds(if_raw)) for v in if_raw])
    norm_lof = np.array([_normalize_raw_score(v, *fitted_score_bounds(lof_raw)) for v in lof_raw])
    ensemble_01 = (norm_if + norm_lof) / 2.0

    calibrator = IsotonicRegression(out_of_bounds="clip", increasing=True)

    if labels is not None and len(labels) == n_samples:
        # Supervised calibration with real labels
        y = np.array(labels, dtype=np.float64)
        calibrator.fit(ensemble_01, y)
        calibrated = calibrator.predict(ensemble_01)

        # Binary metrics at threshold 0.5
        y_pred = (calibrated >= 0.5).astype(int)
        y_true_binary = (y >= 0.5).astype(int)
        metrics_extra = {
            "precision": round(precision_score(y_true_binary, y_pred, zero_division=0), 4),
            "recall": round(recall_score(y_true_binary, y_pred, zero_division=0), 4),
            "f1": round(f1_score(y_true_binary, y_pred, zero_division=0), 4),
        }
        calibrated_label = "supervised (labeled data)"
    else:
        # Pseudo-calibration: map ensemble scores through sigmoid
        # centred on the contamination quantile
        threshold = np.quantile(ensemble_01, 1.0 - contamination)
        pseudo_y = (ensemble_01 >= threshold).astype(np.float64)
        calibrator.fit(ensemble_01, pseudo_y)

        metrics_extra = {}
        calibrated_label = "pseudo-supervised (contamination quantile)"

    # ── Metrics ────────────────────────────────────────────────────────────
    anomaly_rate = float((iforest.predict(X) == -1).sum() / n_samples)
    device_info = detect_hardware_device()

    metrics = {
        "n_samples": n_samples,
        "n_features": len(feature_cols),
        "contamination": contamination,
        "anomaly_rate": round(anomaly_rate, 4),
        "calibration": calibrated_label,
        "mean_ensemble_score": round(float(ensemble_01.mean()), 4),
        "std_ensemble_score": round(float(ensemble_01.std()), 4),
        "iforest_score_range": [round(float(if_raw.min()), 4), round(float(if_raw.max()), 4)],
        "lof_score_range": [round(float(lof_raw.min()), 4), round(float(lof_raw.max()), 4)],
        "hardware_device": device_info,
        **metrics_extra,
    }

    # ── Persist ────────────────────────────────────────────────────────────
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
            "score_bounds": {
                "iforest": fitted_score_bounds(if_raw),
                "lof": fitted_score_bounds(lof_raw),
            },
            "hardware_device": device_info,
        },
        artifact_path,
    )
    logger.info(
        "Saved %s ensemble → %s (%.1f KB, anomaly_rate=%.3f)",
        domain, artifact_path.name, artifact_path.stat().st_size / 1024, anomaly_rate,
    )

    logger.info("Metrics: %s", metrics)
    return version, metrics


def train_ensemble_from_csv(
    domain: str,
    csv_path: str | Path,
    labels_csv: Optional[str | Path] = None,
    contamination: float = 0.05,
    models_dir: str | Path = "",
) -> tuple[str, dict]:
    """
    Convenience wrapper that loads features from a CSV file and calls
    ``train_ensemble``. Used by the offline CLI (api/train.py).

    The CSV must contain all columns defined in ``DOMAIN_FEATURE_COLS[domain]``.
    """
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
