"""
api/train.py
------------
Offline training script for HormuzWatch ensemble anomaly models.

Run this locally or in a CI job to produce model artifacts.  It is NOT
deployed to Vercel — only the saved .joblib files are consumed by predict.py.

Usage
-----
::

    # Vessel model — no labels (unsupervised; calibrator uses sigmoid fallback)
    python api/train.py --domain vessel --input data/vessel_tracks.csv

    # Vessel model — with labels for calibrated isotonic regression + evaluation
    python api/train.py --domain vessel --input data/vessel_tracks.csv \\
        --labels data/vessel_labels.csv

    # Aviation model
    python api/train.py --domain aviation --input data/aviation_tracks.json

    # Heatmap model
    python api/train.py --domain heatmap --input data/heatmap_cells.csv

Input format
------------
CSV or JSON (auto-detected by extension):
  - Each row / object must contain at least the feature columns for the chosen domain.
  - Extra columns are silently ignored.

Label format (CSV, optional):
  - A single column "label" with integer values: 1 = anomalous, 0 = normal.
  - Row count must match the feature input.

Outputs
-------
Writes ``models/{domain}_ensemble.joblib`` containing::

    {
        "model_iforest": IsolationForest,
        "model_lof":     LocalOutlierFactor (novelty=True),
        "scaler":        StandardScaler,
        "calibrator":    IsotonicRegression,
        "feature_cols":  list[str],
        "domain":        str,
        "version":       str,   # ISO-8601 UTC timestamp
    }
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import warnings
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.isotonic import IsotonicRegression
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler

# ── Path setup ────────────────────────────────────────────────────────────────
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from lib.features import DOMAIN_FEATURE_COLS  # noqa: E402
from lib.scoring import _normalize_raw_score  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("hormuzwatch.train")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

IF_N_ESTIMATORS = 200
IF_CONTAMINATION = 0.05
IF_RANDOM_STATE = 42
LOF_N_NEIGHBORS = 20
EVAL_THRESHOLDS = [0.3, 0.5, 0.7, 0.9]


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------


def _load_data(path: Path, feature_cols: list[str]) -> np.ndarray:
    """
    Load feature vectors from a CSV or JSON file.

    Only the columns listed in ``feature_cols`` are retained, in that order.
    Missing columns raise a ``ValueError`` with a clear message.

    Returns
    -------
    np.ndarray
        Shape ``(n_samples, n_features)``.

    Note: pandas is used here (train.py only) and is NOT bundled into the
    Vercel function.  Install it with: ``pip install pandas`` locally.
    """
    try:
        import pandas as pd  # type: ignore
    except ImportError:
        raise ImportError(
            "pandas is required for train.py but not installed.\n"
            "Install it locally with: pip install pandas\n"
            "(It is NOT bundled into the Vercel deployment.)"
        )

    suffix = path.suffix.lower()
    if suffix == ".csv":
        df = pd.read_csv(path)
    elif suffix in (".json", ".jsonl"):
        df = pd.read_json(path, lines=(suffix == ".jsonl"))
    else:
        raise ValueError(f"Unsupported file extension: {suffix}. Use .csv or .json.")

    missing_cols = [c for c in feature_cols if c not in df.columns]
    if missing_cols:
        raise ValueError(
            f"Input data is missing required columns: {missing_cols}\n"
            f"Available columns: {list(df.columns)}"
        )

    X = df[feature_cols].values.astype(np.float64)
    logger.info("Loaded %d samples with %d features from %s", *X.shape, path)
    return X


def _load_labels(path: Path, n_expected: int) -> np.ndarray:
    """Load binary labels (0/1) from a single-column CSV."""
    try:
        import pandas as pd  # type: ignore
    except ImportError:
        raise ImportError("pandas required — see train.py header.")

    df = pd.read_csv(path)
    if "label" not in df.columns:
        raise ValueError(
            f"Label file must have a 'label' column. Found: {list(df.columns)}"
        )
    labels = df["label"].values.astype(int)
    if len(labels) != n_expected:
        raise ValueError(
            f"Label count ({len(labels)}) does not match feature count ({n_expected})."
        )
    return labels


# ---------------------------------------------------------------------------
# Sigmoid fallback calibrator (no ground-truth labels)
# ---------------------------------------------------------------------------


def _sigmoid_calibrator(ensemble_scores_01: np.ndarray) -> IsotonicRegression:
    """
    Fit an IsotonicRegression on a sigmoid-mapped pseudo-label set.

    This is used when no ground-truth labels are provided so that the
    calibration object still exists and transforms scores monotonically.
    The output is NOT statistically calibrated and should be treated as
    a monotone rank transform only.

    A warning is always printed when this path is taken.
    """
    warnings.warn(
        "No labels provided — using UNCALIBRATED sigmoid fallback for isotonic "
        "regression. The probability output will be monotone but NOT statistically "
        "calibrated. Provide labelled data for meaningful probabilities.",
        UserWarning,
        stacklevel=2,
    )
    # Use the ensemble scores themselves as pseudo-labels via a sigmoid squeeze
    pseudo_labels = 1.0 / (1.0 + np.exp(-6.0 * (ensemble_scores_01 - 0.5)))
    calibrator = IsotonicRegression(out_of_bounds="clip", increasing=True)
    calibrator.fit(ensemble_scores_01.reshape(-1, 1), pseudo_labels)
    return calibrator


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------


def _evaluate(
    calibrated_probs: np.ndarray,
    labels: np.ndarray,
    thresholds: list[float],
) -> None:
    """Print AUC-ROC and precision/recall at each threshold to stdout."""
    try:
        from sklearn.metrics import (
            roc_auc_score,
            precision_score,
            recall_score,
            f1_score,
        )
    except ImportError:
        logger.warning("sklearn.metrics not available; skipping evaluation.")
        return

    try:
        auc = roc_auc_score(labels, calibrated_probs)
        logger.info("AUC-ROC: %.4f", auc)
    except Exception as exc:
        logger.warning("AUC-ROC computation failed: %s", exc)

    logger.info("%-10s  %-10s  %-10s  %-10s", "Threshold", "Precision", "Recall", "F1")
    logger.info("-" * 46)
    for t in thresholds:
        preds = (calibrated_probs >= t).astype(int)
        prec = precision_score(labels, preds, zero_division=0)
        rec = recall_score(labels, preds, zero_division=0)
        f1 = f1_score(labels, preds, zero_division=0)
        logger.info("%-10.2f  %-10.4f  %-10.4f  %-10.4f", t, prec, rec, f1)


# ---------------------------------------------------------------------------
# Training pipeline
# ---------------------------------------------------------------------------


def train(
    domain: str,
    input_path: Path,
    labels_path: Optional[Path],
    output_dir: Path,
) -> None:
    """
    Full training pipeline for one domain.

    Steps:
        1. Load feature data.
        2. Fit StandardScaler.
        3. Train IsolationForest.
        4. Train LocalOutlierFactor (novelty=True).
        5. Compute normalised ensemble scores on training data.
        6. Fit IsotonicRegression calibrator (labels or sigmoid fallback).
        7. If labels provided: evaluate at multiple thresholds.
        8. Save bundle to output_dir/{domain}_ensemble.joblib.
    """
    feature_cols = DOMAIN_FEATURE_COLS.get(domain)
    if feature_cols is None:
        raise ValueError(
            f"Unknown domain '{domain}'. Valid domains: "
            f"{sorted(DOMAIN_FEATURE_COLS.keys())}"
        )

    logger.info("=== Training domain: %s ===", domain.upper())

    # ── 1. Load data ──────────────────────────────────────────────────────
    X_raw = _load_data(input_path, feature_cols)
    labels: Optional[np.ndarray] = None
    if labels_path is not None:
        labels = _load_labels(labels_path, n_expected=len(X_raw))
        anomaly_rate = labels.mean() * 100
        logger.info(
            "Labels loaded: %d samples, %.1f%% anomalous",
            len(labels),
            anomaly_rate,
        )

    # ── 2. Fit scaler ─────────────────────────────────────────────────────
    logger.info("Fitting StandardScaler...")
    scaler = StandardScaler()
    X = scaler.fit_transform(X_raw)

    # ── 3. IsolationForest ────────────────────────────────────────────────
    logger.info(
        "Training IsolationForest (n_estimators=%d, contamination=%.2f)...",
        IF_N_ESTIMATORS,
        IF_CONTAMINATION,
    )
    iforest = IsolationForest(
        n_estimators=IF_N_ESTIMATORS,
        contamination=IF_CONTAMINATION,
        max_samples="auto",
        random_state=IF_RANDOM_STATE,
        n_jobs=-1,
    )
    iforest.fit(X)
    raw_if_scores = iforest.score_samples(X)
    logger.info(
        "IsolationForest score_samples stats: min=%.4f, mean=%.4f, max=%.4f",
        raw_if_scores.min(),
        raw_if_scores.mean(),
        raw_if_scores.max(),
    )

    # ── 4. LocalOutlierFactor ─────────────────────────────────────────────
    logger.info("Training LocalOutlierFactor (n_neighbors=%d, novelty=True)...", LOF_N_NEIGHBORS)
    lof = LocalOutlierFactor(
        n_neighbors=LOF_N_NEIGHBORS,
        novelty=True,
        n_jobs=-1,
    )
    lof.fit(X)
    raw_lof_scores = lof.score_samples(X)
    logger.info(
        "LOF score_samples stats: min=%.4f, mean=%.4f, max=%.4f",
        raw_lof_scores.min(),
        raw_lof_scores.mean(),
        raw_lof_scores.max(),
    )

    # ── 5. Ensemble normalised scores ─────────────────────────────────────
    logger.info("Computing normalised ensemble scores on training data...")
    norm_if = np.vectorize(_normalize_raw_score)(raw_if_scores)
    norm_lof = np.vectorize(_normalize_raw_score)(raw_lof_scores)
    ensemble_01 = (norm_if + norm_lof) / 2.0
    logger.info(
        "Ensemble score [0,1] stats: min=%.4f, mean=%.4f, max=%.4f",
        ensemble_01.min(),
        ensemble_01.mean(),
        ensemble_01.max(),
    )

    # ── 6. Calibrator ─────────────────────────────────────────────────────
    if labels is not None:
        logger.info("Fitting IsotonicRegression calibrator on labelled data...")
        calibrator = IsotonicRegression(out_of_bounds="clip", increasing=True)
        calibrator.fit(ensemble_01.reshape(-1, 1), labels.astype(float))
    else:
        calibrator = _sigmoid_calibrator(ensemble_01)

    # ── 7. Evaluate ───────────────────────────────────────────────────────
    if labels is not None:
        calibrated = calibrator.predict(ensemble_01.reshape(-1, 1))
        _evaluate(calibrated, labels, EVAL_THRESHOLDS)

    # ── 8. Save ───────────────────────────────────────────────────────────
    output_dir.mkdir(parents=True, exist_ok=True)
    artifact_path = output_dir / f"{domain}_ensemble.joblib"

    version = datetime.now(tz=timezone.utc).isoformat()
    bundle = {
        "model_iforest": iforest,
        "model_lof": lof,
        "scaler": scaler,
        "calibrator": calibrator,
        "feature_cols": feature_cols,
        "domain": domain,
        "version": version,
    }
    joblib.dump(bundle, artifact_path, compress=3)
    size_mb = artifact_path.stat().st_size / (1024 * 1024)
    logger.info(
        "Saved '%s' bundle → %s (%.2f MB, version=%s)",
        domain,
        artifact_path,
        size_mb,
        version,
    )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "HormuzWatch ML training script. "
            "Produces ensemble .joblib artifacts for Vercel inference."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python api/train.py --domain vessel --input data/vessel_tracks.csv
  python api/train.py --domain aviation --input data/aviation.json \\
      --labels data/aviation_labels.csv
  python api/train.py --domain heatmap --input data/heatmap.csv \\
      --output-dir models/
""",
    )
    parser.add_argument(
        "--domain",
        required=True,
        choices=list(DOMAIN_FEATURE_COLS.keys()),
        help="Target domain model to train.",
    )
    parser.add_argument(
        "--input",
        required=True,
        type=Path,
        help="Path to feature data file (.csv or .json).",
    )
    parser.add_argument(
        "--labels",
        type=Path,
        default=None,
        help="Optional: path to binary label CSV (column 'label', 0=normal, 1=anomalous).",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=_PROJECT_ROOT / "models",
        help="Directory to write .joblib artifacts (default: ./models/).",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    train(
        domain=args.domain,
        input_path=args.input,
        labels_path=args.labels,
        output_dir=args.output_dir,
    )
