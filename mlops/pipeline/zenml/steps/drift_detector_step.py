"""
mlops/pipeline/zenml/steps/drift_detector_step.py
================================================
ZenML Step: Drift Detector
Evaluates feature distribution divergence (Population Stability Index / Kolmogorov-Smirnov)
between historical training baseline and current telemetry streaming batches.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import numpy as np
import pandas as pd

STEP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = STEP_DIR.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(PROJECT_ROOT / "mlops") not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT / "mlops"))

from mlops.pipeline.zenml.zenml_compat import step
from mlops.pipeline.drift_monitor import evaluate_feature_drift

logger = logging.getLogger("mlops.zenml.drift_detector")


@step(name="drift_detector_step")
def drift_detector_step(
    current_data: pd.DataFrame,
    baseline_data: Optional[pd.DataFrame] = None,
    domain: str = "vessel",
) -> Tuple[bool, Dict[str, Any]]:
    """
    Check for feature distribution drift against a reference baseline.
    If no separate baseline is provided, the earlier temporal segment is used as reference.
    Returns (drift_detected: bool, report: Dict[str, Any]).
    """
    logger.info(f"Evaluating telemetry distribution drift across {len(current_data)} samples...")

    # Filter out non-numeric and metadata columns
    numeric_cols = current_data.select_dtypes(include=[np.number]).columns.tolist()
    filter_cols = [c for c in numeric_cols if c not in ("mmsi", "group_id", "is_anomaly", "label", "timestamp")]

    if baseline_data is None:
        # Split current data: 50% baseline reference, 50% current
        n = len(current_data)
        split_idx = max(int(n * 0.5), 1)
        ref_df = current_data.iloc[:split_idx][filter_cols]
        cur_df = current_data.iloc[split_idx:][filter_cols]
    else:
        ref_cols = [c for c in filter_cols if c in baseline_data.columns]
        ref_df = baseline_data[ref_cols]
        cur_df = current_data[ref_cols]

    if len(ref_df) == 0 or len(cur_df) == 0:
        logger.warning("Insufficient data for drift detection. Marking as nominal.")
        return False, {"drift_detected": False, "reason": "insufficient_data"}

    drift_result = evaluate_feature_drift(ref_df, cur_df)
    drift_detected = drift_result.get("drift_detected", False)

    logger.info(f"Drift detection complete: drift_detected={drift_detected}")
    return drift_detected, drift_result
