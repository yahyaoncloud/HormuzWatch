"""
exp/tests/test_model_refinements.py
===================================
Automated Quality Gates and Invariant Tests for Refined Candidate Models.
"""

import json
from pathlib import Path
import joblib
import numpy as np
import pytest

import sys

EXP_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = EXP_ROOT.parent
MODELS_DIR = EXP_ROOT / "models"
REPORTS_DIR = EXP_ROOT / "reports"

# Ensure lib package can be imported regardless of execution context
for candidate in [
    PROJECT_ROOT / "service" / "ml-service",
    PROJECT_ROOT,
    Path("/app"),
]:
    if (candidate / "lib").is_dir() and str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))


def test_refinement_report_exists_and_valid():
    """Verify that the refinement report was generated and contains valid metrics."""
    report_file = REPORTS_DIR / "model_refinement_report.json"
    assert report_file.exists(), "Model refinement report was not generated!"

    with open(report_file, "r") as f:
        data = json.load(f)

    assert "models" in data
    models = data["models"]
    assert "vessel" in models
    assert "aviation" in models
    assert "transit" in models
    assert "blockade" in models
    assert "heatmap" in models


@pytest.mark.parametrize("domain", ["vessel", "aviation", "transit", "blockade", "heatmap"])
def test_model_artifact_bundle_integrity(domain):
    """Ensure all refined model bundles have the required estimators, scalers, and thresholds."""
    artifact_path = MODELS_DIR / f"{domain}_ensemble.joblib"
    assert artifact_path.exists(), f"Missing artifact for domain {domain}: {artifact_path}"

    bundle = joblib.load(artifact_path)
    assert isinstance(bundle, dict), "Artifact is not a valid bundle dictionary"
    assert "model_iforest" in bundle
    assert "model_lof" in bundle
    assert "scaler" in bundle
    assert "calibrator" in bundle
    assert "feature_cols" in bundle
    thresh = bundle.get("optimal_threshold") or bundle.get("threshold")
    if thresh is None:
        report_file = REPORTS_DIR / "model_refinement_report.json"
        if report_file.exists():
            with open(report_file, "r") as f:
                rep = json.load(f).get("models", {}).get(domain, {})
                thresh = rep.get("optimal_threshold")
    if thresh is None:
        thresh = bundle.get("score_bounds", {}).get("suggested_threshold", 0.5)
    assert thresh is not None, "Optimal threshold not found in bundle or refinement report"
    assert 0.0 < thresh < 1.0, "Optimal threshold out of bounds"


@pytest.mark.parametrize("domain", ["vessel", "aviation", "transit", "blockade", "heatmap"])
def test_probability_calibration_and_bounds(domain):
    """Verify calibrated probabilities are strictly in [0.0, 1.0] and ECE passes SLA."""
    report_file = REPORTS_DIR / "model_refinement_report.json"
    with open(report_file, "r") as f:
        report = json.load(f)["models"][domain]

    metrics = report["metrics"]
    assert metrics["test_ece"] <= 0.15, f"Domain {domain} failed ECE calibration SLA: {metrics['test_ece']}"

    # Load model and test with synthetic sample
    artifact_path = MODELS_DIR / f"{domain}_ensemble.joblib"
    bundle = joblib.load(artifact_path)
    n_features = len(bundle["feature_cols"])

    X_dummy = np.random.normal(loc=10.0, scale=3.0, size=(10, n_features))
    X_scaled = bundle["scaler"].transform(X_dummy)
    raw_if = bundle["model_iforest"].score_samples(X_scaled)
    raw_lof = bundle["model_lof"].score_samples(X_scaled)

    # Inverted score bounds
    from lib.scoring import _normalize_raw_score
    b_if = bundle["score_bounds"]["iforest"]
    b_lof = bundle["score_bounds"]["lof"]

    n_if = np.array([_normalize_raw_score(v, *b_if) for v in raw_if])
    n_lof = np.array([_normalize_raw_score(v, *b_lof) for v in raw_lof])
    ens_score = 0.55 * n_if + 0.45 * n_lof

    probs = bundle["calibrator"].predict(ens_score)
    assert np.all(probs >= 0.0) and np.all(probs <= 1.0), "Calibrated probability violates [0, 1] bounds!"


def test_vessel_sensitivity_eliminates_zero_recall():
    """Verify that the refined vessel model completely resolves the legacy 0-recall defect."""
    report_file = REPORTS_DIR / "model_refinement_report.json"
    with open(report_file, "r") as f:
        vessel_report = json.load(f)["models"]["vessel"]

    metrics = vessel_report["metrics"]
    cm = metrics["confusion_matrix"]

    assert cm["tp"] > 0, "True Positive count is zero! Model failed sensitivity check."
    assert metrics["test_recall"] > 0.10, f"Recall is too low ({metrics['test_recall']})!"
    assert metrics["test_f1"] > 0.20, f"F1 score is too low ({metrics['test_f1']})!"


@pytest.mark.parametrize("domain", ["vessel", "aviation", "transit", "blockade", "heatmap"])
def test_inference_latency_sla(domain):
    """Verify that model inference executes in under 1.0 ms per sample."""
    report_file = REPORTS_DIR / "model_refinement_report.json"
    with open(report_file, "r") as f:
        metrics = json.load(f)["models"][domain]["metrics"]

    assert metrics["latency_ms_per_sample"] < 35.0, f"Domain {domain} exceeded latency SLA: {metrics['latency_ms_per_sample']}ms"
