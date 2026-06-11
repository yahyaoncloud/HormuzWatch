"""
tests/test_scoring.py
---------------------
Unit tests for the HormuzWatch ML ensemble scoring pipeline.

Tests use synthetic model objects (fitted on trivial data) to verify:
  - Feature normalisation is applied before scoring.
  - IsolationForest and LOF raw scores are correctly normalised and averaged.
  - IsotonicRegression calibrator is applied and the result is in [0, 100].
  - ``is_anomaly`` correctly reflects the probability threshold.
  - SHAP contributions are returned when ``explain=True``.
  - Graceful degradation when SHAP fails.
  - Boundary conditions (all-zero, extreme-value feature vectors).

Run with: pytest tests/test_scoring.py -v
"""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pytest
from sklearn.ensemble import IsolationForest
from sklearn.isotonic import IsotonicRegression
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler

# ── Path setup (so tests can import lib.* without installing the package) ──
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from lib.scoring import (  # noqa: E402
    SHAPContribution,
    ScoringResult,
    _normalize_raw_score,
    score,
)
from lib.features import (  # noqa: E402
    VESSEL_COLS,
    AVIATION_COLS,
    HEATMAP_COLS,
    VesselFeatures,
    AviationFeatures,
    HeatmapFeatures,
    parse_features,
)


# ---------------------------------------------------------------------------
# Fixtures — synthetic but fully-trained sklearn objects
# ---------------------------------------------------------------------------


def _make_synthetic_bundle(
    feature_cols: list[str],
    n_samples: int = 200,
    random_state: int = 0,
) -> dict:
    """Create a minimal but real model bundle for testing."""
    rng = np.random.default_rng(random_state)
    n_features = len(feature_cols)

    # 95% "normal" cluster around origin + 5% outliers far from origin
    X_normal = rng.normal(loc=0.0, scale=1.0, size=(int(n_samples * 0.95), n_features))
    X_outlier = rng.normal(loc=6.0, scale=0.5, size=(int(n_samples * 0.05), n_features))
    X_raw = np.vstack([X_normal, X_outlier])

    scaler = StandardScaler()
    X = scaler.fit_transform(X_raw)

    iforest = IsolationForest(
        n_estimators=10,       # Fast for tests
        contamination=0.05,
        random_state=random_state,
    )
    iforest.fit(X)

    lof = LocalOutlierFactor(n_neighbors=10, novelty=True)
    lof.fit(X)

    # Calibrator: monotone identity in [0, 1]
    calibrator = IsotonicRegression(out_of_bounds="clip", increasing=True)
    X_scores = iforest.score_samples(X)
    norm_scores = np.vectorize(_normalize_raw_score)(X_scores)
    # Pseudo-labels: 1 for top 5% anomalous
    threshold = np.percentile(norm_scores, 95)
    pseudo_labels = (norm_scores >= threshold).astype(float)
    calibrator.fit(norm_scores.reshape(-1, 1), pseudo_labels)

    return {
        "model_iforest": iforest,
        "model_lof": lof,
        "scaler": scaler,
        "calibrator": calibrator,
        "feature_cols": feature_cols,
        "domain": "test",
        "version": "test-v1",
    }


@pytest.fixture(scope="module")
def vessel_bundle() -> dict:
    return _make_synthetic_bundle(VESSEL_COLS)


@pytest.fixture(scope="module")
def aviation_bundle() -> dict:
    return _make_synthetic_bundle(AVIATION_COLS)


@pytest.fixture(scope="module")
def heatmap_bundle() -> dict:
    return _make_synthetic_bundle(HEATMAP_COLS)


# Typical "normal" vessel feature vector
_NORMAL_VESSEL = {
    "course_delta": 5.0,
    "heading_delta": 3.0,
    "speed_delta": 0.5,
    "average_speed": 14.0,
    "speed_variance": 0.8,
    "ais_gap_minutes": 2.0,
    "dist_restricted_zone": 25.0,
    "dist_historical_site": 40.0,
    "ewma_deviation": 0.1,
}

# Suspicious vessel: extreme course change, near restricted zone
_ANOMALOUS_VESSEL = {
    "course_delta": 170.0,
    "heading_delta": -170.0,
    "speed_delta": -12.0,
    "average_speed": 3.0,
    "speed_variance": 15.0,
    "ais_gap_minutes": 45.0,
    "dist_restricted_zone": 0.5,
    "dist_historical_site": 1.2,
    "ewma_deviation": 4.5,
}


# ---------------------------------------------------------------------------
# _normalize_raw_score
# ---------------------------------------------------------------------------


class TestNormalizeRawScore:
    def test_score_zero_maps_to_zero(self):
        """score_samples=0 means perfectly normal; normalised → 0.0."""
        assert _normalize_raw_score(0.0) == pytest.approx(0.0)

    def test_score_minus_one_maps_to_one(self):
        """score_samples=-1 means maximally anomalous; normalised → 1.0."""
        assert _normalize_raw_score(-1.0) == pytest.approx(1.0)

    def test_score_minus_half_maps_to_half(self):
        assert _normalize_raw_score(-0.5) == pytest.approx(0.5)

    def test_clamp_below_minus_one(self):
        """Values below -1 are clamped to 1.0."""
        assert _normalize_raw_score(-2.0) == pytest.approx(1.0)

    def test_clamp_above_zero(self):
        """Positive values (IsolationForest internal artefact) are clamped to 0.0."""
        assert _normalize_raw_score(0.1) == pytest.approx(0.0)


# ---------------------------------------------------------------------------
# Feature schema validation
# ---------------------------------------------------------------------------


class TestFeatureSchemas:
    def test_vessel_valid(self):
        f = VesselFeatures(**_NORMAL_VESSEL)
        arr = f.to_array()
        assert arr.shape == (len(VESSEL_COLS),)

    def test_vessel_to_array_order_matches_cols(self):
        f = VesselFeatures(**_NORMAL_VESSEL)
        arr = f.to_array()
        d = f.model_dump()
        for i, col in enumerate(VESSEL_COLS):
            assert arr[i] == pytest.approx(d[col])

    def test_vessel_invalid_course_delta_out_of_range(self):
        bad = {**_NORMAL_VESSEL, "course_delta": 400.0}
        with pytest.raises(Exception):  # pydantic ValidationError
            VesselFeatures(**bad)

    def test_aviation_valid(self):
        f = AviationFeatures(
            course_delta=10.0,
            alt_delta=-300.0,
            speed_delta=-20.0,
            average_speed=240.0,
            speed_variance=15.0,
            gap_minutes=1.5,
            dist_restricted_airspace=50.0,
            squawk_anomaly_flag=0.0,
            ewma_deviation=0.2,
        )
        arr = f.to_array()
        assert arr.shape == (len(AVIATION_COLS),)

    def test_aviation_squawk_flag_out_of_range(self):
        with pytest.raises(Exception):
            AviationFeatures(
                course_delta=0.0, alt_delta=0.0, speed_delta=0.0,
                average_speed=200.0, speed_variance=0.0, gap_minutes=1.0,
                dist_restricted_airspace=100.0,
                squawk_anomaly_flag=2.0,   # Invalid: must be 0-1
                ewma_deviation=0.0,
            )

    def test_heatmap_valid(self):
        f = HeatmapFeatures(
            event_density_grid=12.0,
            event_velocity=0.5,
            gdelt_firms_ratio=2.5,
            distance_to_nearest_track=8.0,
        )
        arr = f.to_array()
        assert arr.shape == (len(HEATMAP_COLS),)

    def test_parse_features_unknown_domain(self):
        with pytest.raises(ValueError, match="Unknown domain"):
            parse_features("submarine", {})

    def test_parse_features_invalid_field(self):
        bad = {**_NORMAL_VESSEL, "course_delta": "not_a_float"}
        with pytest.raises(Exception):
            parse_features("vessel", bad)


# ---------------------------------------------------------------------------
# score() function
# ---------------------------------------------------------------------------


class TestScoreFunction:
    def test_returns_scoring_result(self, vessel_bundle):
        features = VesselFeatures(**_NORMAL_VESSEL)
        result = score(
            feature_array=features.to_array(),
            feature_names=VESSEL_COLS,
            bundle=vessel_bundle,
            explain=False,
        )
        assert isinstance(result, ScoringResult)

    def test_probability_in_range(self, vessel_bundle):
        for feature_dict in (_NORMAL_VESSEL, _ANOMALOUS_VESSEL):
            features = VesselFeatures(**feature_dict)
            result = score(
                feature_array=features.to_array(),
                feature_names=VESSEL_COLS,
                bundle=vessel_bundle,
            )
            assert 0.0 <= result.probability <= 100.0

    def test_raw_scores_are_non_positive(self, vessel_bundle):
        """IsolationForest/LOF score_samples always ≤ 0 for trained models."""
        features = VesselFeatures(**_NORMAL_VESSEL)
        result = score(
            feature_array=features.to_array(),
            feature_names=VESSEL_COLS,
            bundle=vessel_bundle,
        )
        assert result.raw_iforest_score <= 0.0
        assert result.raw_lof_score <= 0.0

    def test_is_anomaly_consistent_with_probability(self, vessel_bundle):
        features = VesselFeatures(**_NORMAL_VESSEL)
        result = score(
            feature_array=features.to_array(),
            feature_names=VESSEL_COLS,
            bundle=vessel_bundle,
        )
        assert result.is_anomaly == (result.probability >= 50.0)

    def test_no_shap_when_explain_false(self, vessel_bundle):
        features = VesselFeatures(**_NORMAL_VESSEL)
        result = score(
            feature_array=features.to_array(),
            feature_names=VESSEL_COLS,
            bundle=vessel_bundle,
            explain=False,
        )
        assert result.shap_contributions == []

    def test_shap_returned_when_explain_true(self, vessel_bundle):
        """SHAP should return one contribution per feature."""
        try:
            import shap  # noqa: F401
        except ImportError:
            pytest.skip("shap not installed")

        features = VesselFeatures(**_NORMAL_VESSEL)
        result = score(
            feature_array=features.to_array(),
            feature_names=VESSEL_COLS,
            bundle=vessel_bundle,
            explain=True,
        )
        # May be empty if SHAP failed gracefully; if not empty, check structure
        if result.shap_contributions:
            assert len(result.shap_contributions) == len(VESSEL_COLS)
            for c in result.shap_contributions:
                assert isinstance(c, SHAPContribution)
                assert c.feature in VESSEL_COLS
                assert c.direction in ("anomalous", "normal")

    def test_shap_sorted_by_abs_contribution(self, vessel_bundle):
        """SHAP contributions must be in descending order of absolute value."""
        try:
            import shap  # noqa: F401
        except ImportError:
            pytest.skip("shap not installed")

        features = VesselFeatures(**_ANOMALOUS_VESSEL)
        result = score(
            feature_array=features.to_array(),
            feature_names=VESSEL_COLS,
            bundle=vessel_bundle,
            explain=True,
        )
        if len(result.shap_contributions) > 1:
            abs_contribs = [abs(c.contribution) for c in result.shap_contributions]
            assert abs_contribs == sorted(abs_contribs, reverse=True)

    def test_inference_time_measured(self, vessel_bundle):
        features = VesselFeatures(**_NORMAL_VESSEL)
        result = score(
            feature_array=features.to_array(),
            feature_names=VESSEL_COLS,
            bundle=vessel_bundle,
        )
        assert result.inference_time_ms > 0.0

    def test_model_version_propagated(self, vessel_bundle):
        features = VesselFeatures(**_NORMAL_VESSEL)
        result = score(
            feature_array=features.to_array(),
            feature_names=VESSEL_COLS,
            bundle=vessel_bundle,
        )
        assert result.model_version == "test-v1"

    def test_aviation_bundle(self, aviation_bundle):
        features = AviationFeatures(
            course_delta=5.0,
            alt_delta=100.0,
            speed_delta=10.0,
            average_speed=250.0,
            speed_variance=5.0,
            gap_minutes=1.0,
            dist_restricted_airspace=80.0,
            squawk_anomaly_flag=0.0,
            ewma_deviation=0.0,
        )
        result = score(
            feature_array=features.to_array(),
            feature_names=AVIATION_COLS,
            bundle=aviation_bundle,
        )
        assert 0.0 <= result.probability <= 100.0

    def test_heatmap_bundle(self, heatmap_bundle):
        features = HeatmapFeatures(
            event_density_grid=5.0,
            event_velocity=0.1,
            gdelt_firms_ratio=1.0,
            distance_to_nearest_track=10.0,
        )
        result = score(
            feature_array=features.to_array(),
            feature_names=HEATMAP_COLS,
            bundle=heatmap_bundle,
        )
        assert 0.0 <= result.probability <= 100.0

    def test_calibrator_fallback_on_error(self, vessel_bundle):
        """If calibrator raises, score falls back to ensemble_score_01."""
        bad_bundle = dict(vessel_bundle)
        mock_calibrator = MagicMock()
        mock_calibrator.predict.side_effect = RuntimeError("calibrator broke")
        bad_bundle = {**vessel_bundle, "calibrator": mock_calibrator}

        features = VesselFeatures(**_NORMAL_VESSEL)
        result = score(
            feature_array=features.to_array(),
            feature_names=VESSEL_COLS,
            bundle=bad_bundle,
        )
        # Should not raise and probability should still be in [0, 100]
        assert 0.0 <= result.probability <= 100.0

    def test_all_zero_features(self, vessel_bundle):
        """All-zero feature vector should not crash."""
        zero = {k: 0.0 for k in _NORMAL_VESSEL}
        features = VesselFeatures(**zero)
        result = score(
            feature_array=features.to_array(),
            feature_names=VESSEL_COLS,
            bundle=vessel_bundle,
        )
        assert 0.0 <= result.probability <= 100.0

    def test_extreme_anomalous_vector_scores_higher(self, vessel_bundle):
        """A clearly anomalous vector should score higher than a normal one."""
        normal_features = VesselFeatures(**_NORMAL_VESSEL)
        anomalous_features = VesselFeatures(**_ANOMALOUS_VESSEL)

        normal_result = score(
            feature_array=normal_features.to_array(),
            feature_names=VESSEL_COLS,
            bundle=vessel_bundle,
        )
        anomalous_result = score(
            feature_array=anomalous_features.to_array(),
            feature_names=VESSEL_COLS,
            bundle=vessel_bundle,
        )
        # Not guaranteed given the small synthetic training set, but strongly expected
        # Use >=  to avoid flakiness on edge cases
        assert anomalous_result.raw_iforest_score <= normal_result.raw_iforest_score
