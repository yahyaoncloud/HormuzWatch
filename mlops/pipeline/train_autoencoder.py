"""
mlops/pipeline/train_autoencoder.py
===================================
Semi-Supervised Reconstruction Autoencoder Training Pipeline for Maritime Transit Corridors.
Trains an SVD/PCA bottleneck projection autoencoder on nominal (non-anomalous) vessel transit observations,
evaluates reconstruction residual loss ||x - x_hat||^2 on held-out test sets, and serializes the model artifact.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Dict, Any

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score, average_precision_score

PIPELINE_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = PIPELINE_ROOT.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "service" / "ml-service"))

from core.models.autoencoder import AutoencoderAnomalyModel
from lib.features import DOMAIN_FEATURE_COLS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [AutoencoderTrainer] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("train_autoencoder")


def train_corridor_autoencoder(
    domain: str = "vessel",
    dataset_dir: str = "server/datasets/dataset_vessel_20260902_2200_20260903_2200",
    latent_dim: int = 4,
    output_model_path: str = "service/ml-service/models/vessel_autoencoder.joblib",
) -> Dict[str, Any]:
    """Train semi-supervised autoencoder on nominal corridor telemetry."""
    dataset_path = PROJECT_ROOT / dataset_dir
    train_csv = dataset_path / "train.csv"
    val_csv = dataset_path / "val.csv"
    test_csv = dataset_path / "test.csv"

    if not train_csv.exists():
        raise FileNotFoundError(f"Training dataset not found: {train_csv}")

    logger.info("Loading training partitions from %s...", dataset_path.name)
    df_train = pd.read_csv(train_csv)
    df_val = pd.read_csv(val_csv)
    df_test = pd.read_csv(test_csv)

    feature_cols = DOMAIN_FEATURE_COLS.get(domain, [
        "course_delta", "heading_delta", "speed_delta",
        "average_speed", "speed_variance", "ais_gap_minutes",
        "dist_restricted_zone", "dist_historical_site", "ewma_deviation"
    ])

    # Filter nominal (uncontaminated) transit corridor samples for semi-supervised training
    label_col = "is_anomaly" if "is_anomaly" in df_train.columns else "anomaly"
    if label_col in df_train.columns:
        df_train_nominal = df_train[df_train[label_col] == 0]
    else:
        df_train_nominal = df_train

    logger.info("Training on %d nominal corridor samples (features=%d, latent_dim=%d)",
                len(df_train_nominal), len(feature_cols), latent_dim)

    X_train = df_train_nominal[feature_cols].fillna(0).to_numpy(dtype=float)
    X_val = df_val[feature_cols].fillna(0).to_numpy(dtype=float)
    y_val = df_val[label_col].to_numpy(dtype=int) if label_col in df_val.columns else np.zeros(len(df_val))
    X_test = df_test[feature_cols].fillna(0).to_numpy(dtype=float)
    y_test = df_test[label_col].to_numpy(dtype=int) if label_col in df_test.columns else np.zeros(len(df_test))

    # Standardize data
    mean_vec = np.mean(X_train, axis=0)
    std_vec = np.std(X_train, axis=0)
    std_vec[std_vec < 1e-6] = 1.0  # avoid divide by zero

    X_train_scaled = (X_train - mean_vec) / std_vec
    X_val_scaled = (X_val - mean_vec) / std_vec
    X_test_scaled = (X_test - mean_vec) / std_vec

    # Instantiate and fit AutoencoderAnomalyModel
    ae_model = AutoencoderAnomalyModel(
        domain=domain,
        version="v1.0.0",
        latent_dim=latent_dim,
    )
    ae_model.feature_names = feature_cols

    fit_stats = ae_model.train(X_train_scaled)
    logger.info("Autoencoder fitted. Stats: %s", fit_stats)

    # Compute validation & test reconstruction errors
    val_preds = [ae_model.predict(row).raw_score for row in X_val_scaled]
    test_preds = [ae_model.predict(row).raw_score for row in X_test_scaled]

    metrics = {
        "domain": domain,
        "latent_dim": latent_dim,
        "n_train_nominal": len(X_train),
        "n_test": len(X_test),
        "p95_threshold_mse": ae_model.threshold_mse,
    }

    if len(np.unique(y_test)) > 1:
        test_roc_auc = float(roc_auc_score(y_test, test_preds))
        test_pr_auc = float(average_precision_score(y_test, test_preds))
        metrics["test_roc_auc"] = round(test_roc_auc, 4)
        metrics["test_pr_auc"] = round(test_pr_auc, 4)
        logger.info("Test Evaluation: ROC-AUC=%.4f, PR-AUC=%.4f", test_roc_auc, test_pr_auc)

    # Package trained bundle with scaling vectors
    target_path = PROJECT_ROOT / output_model_path
    target_path.parent.mkdir(parents=True, exist_ok=True)

    bundle = {
        "model": ae_model,
        "mean": mean_vec,
        "std": std_vec,
        "feature_names": feature_cols,
        "metrics": metrics,
        "trained_at": time.time(),
    }
    joblib.dump(bundle, target_path)
    logger.info("Autoencoder bundle saved to: %s (%d KB)", target_path, target_path.stat().st_size // 1024)

    # Write training report JSON
    report_path = target_path.parent / f"{domain}_autoencoder_training_report.json"
    with open(report_path, "w") as f:
        json.dump(metrics, f, indent=2)
    logger.info("Training report saved to: %s", report_path)

    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Semi-Supervised Reconstruction Autoencoder")
    parser.add_argument("--domain", default="vessel", help="Telemetry domain")
    parser.add_argument("--latent-dim", type=int, default=4, help="Bottleneck latent dimension")
    args = parser.parse_args()

    res = train_corridor_autoencoder(domain=args.domain, latent_dim=args.latent_dim)
    print(json.dumps(res, indent=2))

