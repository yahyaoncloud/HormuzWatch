#!/usr/bin/env python3
import argparse
import json
import logging
import os
import sys
from pathlib import Path

ML_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ML_ROOT))

import numpy as np
from lib.dataset_generator import load_dataset
from lib.features import DOMAIN_FEATURE_COLS
from lib.training import train_ensemble

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [Trainer] %(message)s")
logger = logging.getLogger("train_from_dataset")

def run_training_job(dataset_dir: str, domain: str = "vessel", models_dir: str = "", contamination: float = 0.04) -> dict:
    logger.info("=" * 70)
    logger.info(f"HormuzWatch Continuous Training Job - Domain: {domain}")
    logger.info(f"Dataset Source: {dataset_dir}")
    logger.info("=" * 70)

    bundle = load_dataset(dataset_dir)
    df_full = bundle.df_full
    logger.info(f"Loaded dataset: {len(df_full)} total observations, {bundle.metadata.get('unique_tracks', 0)} tracks.")

    feature_cols = DOMAIN_FEATURE_COLS.get(domain)
    if not feature_cols:
        raise ValueError(f"Unknown domain: {domain}. Available: {list(DOMAIN_FEATURE_COLS.keys())}")

    train_mask = (df_full["dataset_split"] == "train").to_numpy()
    val_mask = (df_full["dataset_split"] == "val").to_numpy()
    test_mask = (df_full["dataset_split"] == "test").to_numpy()

    idx_train = np.where(train_mask)[0].tolist()
    idx_val_all = np.where(val_mask)[0].tolist()
    idx_test = np.where(test_mask)[0].tolist()

    half = max(1, len(idx_val_all) // 2)
    idx_val = idx_val_all[:half]
    idx_calib = idx_val_all[half:]

    logger.info(f"Partition Sizes -> Train: {len(idx_train)}, Val: {len(idx_val)}, Calib: {len(idx_calib)}, Test: {len(idx_test)}")

    for col in feature_cols:
        if col not in df_full.columns:
            df_full[col] = 0.0

    data_records = df_full[feature_cols].to_dict(orient="records")
    labels = df_full["is_anomaly"].fillna(0).astype(int).tolist()
    groups = df_full["track_id"].astype(str).tolist() if "track_id" in df_full.columns else None

    custom_splits = {"train": idx_train, "val": idx_val, "calib": idx_calib, "test": idx_test}
    if not models_dir:
        models_dir = str(ML_ROOT / "models")

    model_path, metrics = train_ensemble(
        domain=domain,
        data=data_records,
        labels=labels,
        groups=groups,
        contamination=contamination,
        models_dir=models_dir,
        custom_splits=custom_splits,
    )

    logger.info("=" * 70)
    logger.info("TRAINING & CALIBRATION COMPLETED SUCCESSFULLY")
    logger.info(f"Model Artifact:    {model_path}")
    logger.info(f"Test PR-AUC:       {metrics.get('test_pr_auc', 0):.4f}")
    logger.info(f"Test ROC-AUC:      {metrics.get('test_roc_auc', 0):.4f}")
    logger.info(f"Test ECE:          {metrics.get('test_ece', 0):.4f}")
    logger.info(f"Test Brier Score:  {metrics.get('test_brier_score', 0):.4f}")
    logger.info(f"Inference Latency: {metrics.get('latency_ms_per_sample', 0):.3f} ms/sample")
    logger.info("=" * 70)

    result = {
        "status": "SUCCESS",
        "domain": domain,
        "dataset": os.path.basename(dataset_dir),
        "model_path": model_path,
        "metrics": metrics,
    }

    report_path = os.path.join(models_dir, f"{domain}_training_report.json")
    with open(report_path, "w") as f:
        json.dump(result, f, indent=2)
    logger.info(f"Training report saved to: {report_path}")
    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train HormuzWatch ensemble model from dataset")
    parser.add_argument("--dataset-dir", required=True, help="Path to versioned dataset directory")
    parser.add_argument("--domain", default="vessel", choices=list(DOMAIN_FEATURE_COLS.keys()))
    parser.add_argument("--models-dir", default="", help="Target output directory for trained models")
    parser.add_argument("--contamination", type=float, default=0.04, help="Prior expected anomaly contamination rate")
    args = parser.parse_args()

    res = run_training_job(
        dataset_dir=args.dataset_dir,
        domain=args.domain,
        models_dir=args.models_dir,
        contamination=args.contamination,
    )
    print(json.dumps(res, indent=2))
