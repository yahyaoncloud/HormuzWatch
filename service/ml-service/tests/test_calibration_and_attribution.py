"""
tests/test_calibration_and_attribution.py
-----------------------------------------
Unit tests for calibration metrics (ECE, Brier score),
weighted blending, and TreeSHAP attribution scope.
"""

from __future__ import annotations

import sys
from pathlib import Path
import numpy as np
import pytest

ML_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ML_ROOT))

from lib.training import compute_ece, train_ensemble
from lib.scoring import score, ScoringResult, SHAPContribution
from app import _load_bundle


def test_compute_ece_perfect_calibration():
    # Perfectly calibrated probabilities
    y_true = np.array([0, 0, 0, 0, 1, 1, 1, 1])
    y_prob = np.array([0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0])
    ece = compute_ece(y_true, y_prob, n_bins=10)
    assert abs(ece - 0.0) < 1e-6


def test_compute_ece_miscalibrated():
    # Completely miscalibrated (confident wrong predictions)
    y_true = np.array([0, 0, 0, 0])
    y_prob = np.array([1.0, 1.0, 1.0, 1.0])
    ece = compute_ece(y_true, y_prob, n_bins=10)
    assert abs(ece - 1.0) < 1e-6


def test_scoring_attribution_scope_and_timing():
    bundle = _load_bundle("vessel")
    assert bundle is not None, "Vessel ensemble model bundle must be loaded"

    # Sample vessel feature vector (9 features)
    feature_names = [
        "course_delta", "heading_delta", "speed_delta", "average_speed",
        "speed_variance", "ais_gap_minutes", "dist_restricted_zone",
        "dist_historical_site", "ewma_deviation"
    ]
    features = np.array([35.0, 20.0, -8.0, 12.0, 15.0, 25.0, 0.2, 0.5, 3.5])

    # Run with explain=True
    res = score(features, feature_names, bundle=bundle, explain=True)

    assert isinstance(res, ScoringResult)
    assert 0.0 <= res.probability <= 100.0
    assert res.explanation_scope == "isolation_forest"

    # Verify timing breakdown dictionary
    assert "scaling_ms" in res.timing_breakdown
    assert "iforest_ms" in res.timing_breakdown
    assert "lof_ms" in res.timing_breakdown
    assert "calibration_ms" in res.timing_breakdown
    assert "shap_attribution_ms" in res.timing_breakdown
    assert "total_inference_ms" in res.timing_breakdown

    # Verify SHAP contributions
    assert len(res.shap_contributions) == 9
    for c in res.shap_contributions:
        assert isinstance(c, SHAPContribution)
        assert c.scope == "isolation_forest"
        assert c.direction in ("anomalous", "normal")
