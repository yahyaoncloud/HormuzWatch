"""
ZenML Step: Drift Detector
Evaluates distribution divergence (KS-test / Wasserstein) between training baseline and fresh telemetry.
"""
from zenml import step
import pandas as pd
from typing import Tuple

@step
def drift_detector_step(current_data: pd.DataFrame) -> Tuple[bool, float]:
    """Check for data drift against reference baseline."""
    from pipeline.drift_monitor import evaluate_feature_drift
    drift_result = evaluate_feature_drift(current_data)
    drift_detected = drift_result.get("drift_detected", False)
    drift_score = drift_result.get("max_p_value", 1.0)
    return drift_detected, drift_score
