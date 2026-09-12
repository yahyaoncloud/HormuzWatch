"""
mlops/pipeline/zenml/steps/data_loader_step.py
=============================================
ZenML Step: Data Loader
Ingests telemetry feature datasets from server/datasets/, DVC-managed local storage,
or directly from the dataset registry manifest.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Optional, Tuple

import pandas as pd

STEP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = STEP_DIR.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(PROJECT_ROOT / "mlops") not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT / "mlops"))

from mlops.pipeline.zenml.zenml_compat import step
from mlops.dataset_tool import DatasetManager

logger = logging.getLogger("mlops.zenml.data_loader")


@step(name="data_loader_step")
def data_loader_step(
    domain: str = "vessel",
    dataset_id: Optional[str] = None,
    split: str = "train",
) -> pd.DataFrame:
    """
    Load latest telemetry feature set for continuous training and drift monitoring.
    First looks up the active dataset from the dataset registry manifest;
    if no parquet is available, generates parametric calibration features.
    """
    manager = DatasetManager()
    manifest = manager.load_manifest()
    datasets = manifest.get("datasets", {})

    target_entry = None
    if dataset_id and dataset_id in datasets:
        target_entry = datasets[dataset_id]
    else:
        # Find latest dataset matching domain
        matching = [
            (d_id, meta) for d_id, meta in datasets.items()
            if meta.get("domain") in (domain, f"{domain}s")
        ]
        if matching:
            # Sort by created_at desc
            matching.sort(key=lambda x: x[1].get("created_at", ""), reverse=True)
            target_entry = matching[0][1]

    if target_entry:
        file_key = f"{split}_file"
        file_path_rel = target_entry.get("files", {}).get(file_key)
        if file_path_rel:
            full_path = manager.datasets_dir / file_path_rel
            if full_path.exists():
                logger.info(f"Loaded {split} split from registered dataset: {full_path}")
                return pd.read_parquet(full_path)

    # Fallback to feature extractor
    logger.info(f"No cached parquet found for domain='{domain}'. Extracting via pipeline...")
    from mlops.pipeline.extract_features import extract_features_from_db
    X, y, groups = extract_features_from_db(domain=domain, limit=5000)
    df = pd.DataFrame(X)
    df["is_anomaly"] = y.values if hasattr(y, "values") else y
    df["group_id"] = groups
    return df
