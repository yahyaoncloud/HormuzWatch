"""
pipeline/drift_monitor.py
-------------------------
Real-time Data Drift and Feature Distribution shift monitor using
Population Stability Index (PSI) and Kolmogorov-Smirnov 2-sample tests.
"""

from __future__ import annotations

import json
from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd
from scipy.stats import ks_2samp

from pipeline.config import config


def calculate_psi(expected: np.ndarray, actual: np.ndarray, num_buckets: int = 10) -> float:
    """Calculate Population Stability Index (PSI) between baseline and production distributions."""
    expected = expected[~np.isnan(expected)]
    actual = actual[~np.isnan(actual)]
    
    if len(expected) == 0 or len(actual) == 0:
        return 0.0
        
    percentiles = np.linspace(0, 100, num_buckets + 1)
    bucket_edges = np.percentile(expected, percentiles)
    bucket_edges[0] -= 1e-5
    bucket_edges[-1] += 1e-5
    
    expected_counts = np.histogram(expected, bins=bucket_edges)[0]
    actual_counts = np.histogram(actual, bins=bucket_edges)[0]
    
    expected_pct = (expected_counts + 1e-5) / (len(expected) + 1e-5 * num_buckets)
    actual_pct = (actual_counts + 1e-5) / (len(actual) + 1e-5 * num_buckets)
    
    psi_val = np.sum((actual_pct - expected_pct) * np.log(actual_pct / expected_pct))
    return float(psi_val)


def evaluate_feature_drift(baseline_df: pd.DataFrame, current_df: pd.DataFrame) -> Dict[str, Any]:
    """Evaluate drift across all canonical feature columns."""
    drift_report = {}
    triggered_retrain = False
    
    for col in baseline_df.columns:
        if col not in current_df.columns:
            continue
            
        b_vals = baseline_df[col].to_numpy(dtype=float)
        c_vals = current_df[col].to_numpy(dtype=float)
        
        psi = calculate_psi(b_vals, c_vals)
        ks_stat, ks_pval = ks_2samp(b_vals, c_vals)
        
        status = "NOMINAL"
        if psi >= config.psi_critical_threshold or ks_pval < config.ks_alpha:
            status = "CRITICAL_DRIFT"
            triggered_retrain = True
        elif psi >= config.psi_warning_threshold:
            status = "WARNING_SHIFT"
            
        drift_report[col] = {
            "psi": round(psi, 4),
            "ks_statistic": round(float(ks_stat), 4),
            "ks_pvalue": round(float(ks_pval), 6),
            "status": status,
        }
        
    return {
        "drift_detected": triggered_retrain,
        "feature_metrics": drift_report,
    }


if __name__ == "__main__":
    # Test execution
    rng = np.random.default_rng(42)
    b_df = pd.DataFrame({"course_delta": rng.exponential(3.5, 1000), "speed_delta": rng.normal(0, 1, 1000)})
    c_df = pd.DataFrame({"course_delta": rng.exponential(7.0, 1000), "speed_delta": rng.normal(0, 1, 1000)})
    
    res = evaluate_feature_drift(b_df, c_df)
    print(json.dumps(res, indent=2))
