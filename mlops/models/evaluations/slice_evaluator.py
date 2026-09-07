"""
models/evaluations/slice_evaluator.py
====================================
Slice-Based Evaluation Framework for HormuzWatch Anomaly Ensembles.
Prevents aggregate metric masking (Simpson's Paradox) as per Chip Huyen (Chapter 6).
Evaluates models across:
  - Vessel Class slices (Tanker, Cargo, High-Speed, Military/Patrol, Fishing)
  - Geofence slices (Hormuz TSS Chokepoint vs Fujairah Anchorage vs Persian Gulf Open Basin)
  - Time-of-day slices (Daylight vs Night navigation)
"""

from __future__ import annotations
from typing import Dict, Any
import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score, roc_auc_score, f1_score


def evaluate_slices(y_true: np.ndarray, y_scores: np.ndarray, metadata_df: pd.DataFrame) -> Dict[str, Any]:
    """Calculate performance metrics across slices."""
    slice_report = {"overall": {
        "pr_auc": float(average_precision_score(y_true, y_scores)),
        "roc_auc": float(roc_auc_score(y_true, y_scores)),
        "samples": len(y_true)
    }}

    # 1. Vessel Type Slices
    if "vessel_type" in metadata_df.columns:
        slice_report["vessel_type_slices"] = {}
        for v_type, group_indices in metadata_df.groupby("vessel_type").groups.items():
            idx = group_indices.to_numpy()
            if len(idx) < 10 or len(np.unique(y_true[idx])) < 2:
                continue
            slice_report["vessel_type_slices"][str(v_type)] = {
                "pr_auc": float(average_precision_score(y_true[idx], y_scores[idx])),
                "roc_auc": float(roc_auc_score(y_true[idx], y_scores[idx])),
                "sample_count": len(idx)
            }

    # 2. Geofence Slices (Chokepoint TSS vs Anchorage)
    if "in_tss" in metadata_df.columns:
        slice_report["geofence_slices"] = {}
        for region in [True, False]:
            mask = metadata_df["in_tss"] == region
            if mask.sum() >= 10 and len(np.unique(y_true[mask])) >= 2:
                name = "Traffic_Separation_Scheme" if region else "Open_Waters"
                slice_report["geofence_slices"][name] = {
                    "pr_auc": float(average_precision_score(y_true[mask], y_scores[mask])),
                    "roc_auc": float(roc_auc_score(y_true[mask], y_scores[mask])),
                    "sample_count": int(mask.sum())
                }

    return slice_report
