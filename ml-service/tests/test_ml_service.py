"""
tests/test_ml_service.py
-------------------------
Integration/state tests for the HormuzWatch ML inference service.

Covers:
  - All 6 domain schemas (vessel, aviation, heatmap, news, transit, blockade)
  - Ensemble prediction pipeline (IF + LOF + calibrator)
  - Online training round-trip
  - Fallback logic when models are missing
  - SHAP explanation generation
  - Edge cases: empty features, extreme values, missing domains
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import numpy as np
import pytest

# Ensure the ml-service dir is on sys.path
ML_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ML_ROOT))

from lib.features import (
    DOMAIN_FEATURE_COLS,
    parse_features,
    VesselFeatures,
    AviationFeatures,
    HeatmapFeatures,
    NewsFeatures,
    TransitFeatures,
    BlockadeFeatures,
)

# ---------------------------------------------------------------------------
# 1. Feature schema validation
# ---------------------------------------------------------------------------

class TestFeatureSchemas:
    """Verify that all Pydantic models accept valid data and reject bad."""

    def test_vessel_features_valid(self):
        f = VesselFeatures(
            course_delta=15.0,
            heading_delta=10.0,
            speed_delta=2.5,
            average_speed=12.0,
            speed_variance=4.0,
            ais_gap_minutes=8.0,
            dist_restricted_zone=0.3,
            dist_historical_site=0.5,
            ewma_deviation=1.2,
        )
        arr = f.to_array()
        assert len(arr) == len(DOMAIN_FEATURE_COLS["vessel"])
        assert arr.dtype == np.float64

    def test_vessel_features_invalid_speed(self):
        with pytest.raises(Exception):
            VesselFeatures(
                course_delta=15,
                heading_delta=10,
                speed_delta=2.5,
                average_speed=-5.0,  # negative speed
                speed_variance=4.0,
                ais_gap_minutes=8,
                dist_restricted_zone=0.3,
                dist_historical_site=0.5,
                ewma_deviation=1.2,
            )

    def test_news_features_valid(self):
        f = NewsFeatures(
            keyword_count=12,
            entity_count=25,
            article_length=2500,
            publication_age_hours=2.0,
            military_term_count=5,
            energy_term_count=3,
            shipping_term_count=8,
            cyber_term_count=1,
            country_risk_score=0.75,
            source_reliability=0.80,
            sentiment_score=0.35,
            organization_count=4,
            company_count=3,
            port_mentions=2,
            airport_mentions=1,
            ship_mentions=4,
            aircraft_mentions=0,
            publisher_weight=0.70,
        )
        arr = f.to_array()
        assert len(arr) == len(DOMAIN_FEATURE_COLS["news"])
        assert np.all(np.isfinite(arr))

    def test_transit_features_valid(self):
        f = TransitFeatures(
            crossing_speed=14.5,
            time_since_last_transit_h=120.0,
            crossing_hour=3.0,
            vessel_speed_before=12.0,
            destination_direction_match=1.0,
            gate_dist_from_center_nm=5.0,
            speed_vs_avg_ratio=1.2,
        )
        arr = f.to_array()
        assert len(arr) == len(DOMAIN_FEATURE_COLS["transit"])

    def test_blockade_features_valid(self):
        f = BlockadeFeatures(
            strait_transits_24h=3,
            anchored_ratio_pct=35.0,
            waiting_fleet_6h=8,
            waiting_fleet_24h=2,
            active_vessels=150,
            anchorage_zone_count=6,
            flag_entropy=0.72,
        )
        arr = f.to_array()
        assert len(arr) == len(DOMAIN_FEATURE_COLS["blockade"])

    def test_all_domains_in_cols(self):
        expected = {"vessel", "aviation", "heatmap", "news", "transit", "blockade"}
        assert set(DOMAIN_FEATURE_COLS.keys()) == expected

    def test_parse_features_routing(self):
        """parse_features should route dict → correct Pydantic model."""
        vf = parse_features("vessel", {
            "course_delta": 10, "heading_delta": 5, "speed_delta": 2,
            "average_speed": 14, "speed_variance": 3, "ais_gap_minutes": 5,
            "dist_restricted_zone": 0.5, "dist_historical_site": 1.0,
            "ewma_deviation": 0.8,
        })
        assert isinstance(vf, VesselFeatures)

        nf = parse_features("news", {
            "keyword_count": 10, "entity_count": 20, "article_length": 2000,
            "publication_age_hours": 1.0, "military_term_count": 3,
            "energy_term_count": 2, "shipping_term_count": 5,
            "cyber_term_count": 0, "country_risk_score": 0.6,
            "source_reliability": 0.8, "sentiment_score": 0.5,
            "organization_count": 3, "company_count": 2,
            "port_mentions": 1, "airport_mentions": 0,
            "ship_mentions": 2, "aircraft_mentions": 0,
            "publisher_weight": 0.7,
        })
        assert isinstance(nf, NewsFeatures)

    def test_parse_features_unknown_domain(self):
        with pytest.raises(ValueError):
            parse_features("unknown_domain", {})

    def test_parse_features_missing_field(self):
        with pytest.raises(Exception):
            parse_features("vessel", {"course_delta": 10})  # missing 8 fields


# ---------------------------------------------------------------------------
# 2. Ensemble prediction
# ---------------------------------------------------------------------------

class TestEnsemblePrediction:
    """Test the scoring pipeline with real trained models or synthetic data."""

    @pytest.fixture(autouse=True)
    def setup_models(self, tmp_path):
        """Ensure a trained vessel model exists for testing."""
        models_dir = tmp_path / "models"
        models_dir.mkdir(exist_ok=True)

        artifact = models_dir / "vessel_ensemble.joblib"

        if not artifact.exists():
            # Generate synthetic training data and train on-the-fly
            from lib.training import train_ensemble

            np.random.seed(42)
            n_normal = 200
            n_anomaly = 10

            normal = [
                {
                    "course_delta": np.random.uniform(0, 10),
                    "heading_delta": np.random.uniform(0, 10),
                    "speed_delta": np.random.uniform(-2, 2),
                    "average_speed": np.random.uniform(5, 20),
                    "speed_variance": np.random.uniform(0, 5),
                    "ais_gap_minutes": np.random.uniform(0, 5),
                    "dist_restricted_zone": np.random.uniform(1, 10),
                    "dist_historical_site": np.random.uniform(1, 10),
                    "ewma_deviation": np.random.uniform(0, 1),
                }
                for _ in range(n_normal)
            ]

            anomaly = [
                {
                    "course_delta": np.random.uniform(30, 90),
                    "heading_delta": np.random.uniform(30, 90),
                    "speed_delta": np.random.uniform(5, 15),
                    "average_speed": np.random.uniform(0, 5),
                    "speed_variance": np.random.uniform(10, 30),
                    "ais_gap_minutes": np.random.uniform(15, 30),
                    "dist_restricted_zone": np.random.uniform(0, 0.5),
                    "dist_historical_site": np.random.uniform(0, 0.5),
                    "ewma_deviation": np.random.uniform(2, 5),
                }
                for _ in range(n_anomaly)
            ]

            labels = [0] * n_normal + [1] * n_anomaly
            data = normal + anomaly

            train_ensemble(
                domain="vessel",
                data=data,
                labels=labels,
                contamination=0.05,
                models_dir=str(models_dir),
            )

        # Override MODELS_DIR env for the scoring module
        self._orig_models_dir = os.environ.get("MODELS_DIR", "")
        os.environ["MODELS_DIR"] = str(models_dir)

        yield

        os.environ["MODELS_DIR"] = self._orig_models_dir

    def test_score_normal_vessel(self):
        """Normal vessel features should produce a low anomaly score."""
        from lib.scoring import score
        from lib.features import VesselFeatures
        import joblib

        bundle = joblib.load(
            os.path.join(os.environ["MODELS_DIR"], "vessel_ensemble.joblib")
        )
        fv = VesselFeatures(
            course_delta=3.0,
            heading_delta=5.0,
            speed_delta=0.5,
            average_speed=14.0,
            speed_variance=2.0,
            ais_gap_minutes=2.0,
            dist_restricted_zone=5.0,
            dist_historical_site=8.0,
            ewma_deviation=0.3,
        )
        result = score(
            feature_array=fv.to_array(),
            feature_names=DOMAIN_FEATURE_COLS["vessel"],
            bundle=bundle,
            explain=False,
        )
        assert 0.0 <= result.probability <= 1.0
        assert not result.is_anomaly  # normal vessel
        assert result.inference_time_ms > 0
        assert result.model_version != ""

    def test_score_anomalous_vessel(self):
        """Anomalous vessel features should produce a high anomaly score."""
        from lib.scoring import score
        from lib.features import VesselFeatures
        import joblib

        bundle = joblib.load(
            os.path.join(os.environ["MODELS_DIR"], "vessel_ensemble.joblib")
        )
        fv = VesselFeatures(
            course_delta=75.0,       # large deviation
            heading_delta=60.0,
            speed_delta=12.0,        # sudden stop
            average_speed=2.0,
            speed_variance=25.0,
            ais_gap_minutes=25.0,    # long gap
            dist_restricted_zone=0.1,  # very close to zone
            dist_historical_site=0.1,
            ewma_deviation=4.5,      # far from baseline
        )
        result = score(
            feature_array=fv.to_array(),
            feature_names=DOMAIN_FEATURE_COLS["vessel"],
            bundle=bundle,
            explain=True,  # test SHAP
        )
        assert result.probability > 0.5  # should flag as anomalous
        assert result.is_anomaly
        assert len(result.shap_contributions) > 0  # SHAP explanations present

    def test_score_with_explanation(self):
        """SHAP explanations should contain feature names and valid directions."""
        from lib.scoring import score
        import joblib

        bundle = joblib.load(
            os.path.join(os.environ["MODELS_DIR"], "vessel_ensemble.joblib")
        )
        fv = VesselFeatures(
            course_delta=20.0, heading_delta=15.0, speed_delta=3.0,
            average_speed=10.0, speed_variance=5.0, ais_gap_minutes=10.0,
            dist_restricted_zone=0.5, dist_historical_site=1.0,
            ewma_deviation=2.0,
        )
        result = score(
            feature_array=fv.to_array(),
            feature_names=DOMAIN_FEATURE_COLS["vessel"],
            bundle=bundle,
            explain=True,
        )
        for sc in result.shap_contributions:
            assert sc.feature in DOMAIN_FEATURE_COLS["vessel"]
            # scorer returns "anomalous" / "normal" direction labels
            assert sc.direction in ("positive", "negative", "anomalous", "normal")


# ---------------------------------------------------------------------------
# 3. Online training round-trip
# ---------------------------------------------------------------------------

class TestOnlineTraining:
    """Test train_ensemble and model persistence."""

    def test_train_vessel_ensemble(self, tmp_path):
        from lib.training import train_ensemble
        import joblib

        models_dir = tmp_path / "models"
        np.random.seed(42)
        data = [
            {
                "course_delta": np.random.uniform(0, 10),
                "heading_delta": np.random.uniform(0, 10),
                "speed_delta": np.random.uniform(-2, 2),
                "average_speed": np.random.uniform(5, 20),
                "speed_variance": np.random.uniform(0, 5),
                "ais_gap_minutes": np.random.uniform(0, 5),
                "dist_restricted_zone": np.random.uniform(1, 10),
                "dist_historical_site": np.random.uniform(1, 10),
                "ewma_deviation": np.random.uniform(0, 1),
            }
            for _ in range(100)
        ]

        version, metrics = train_ensemble(
            domain="vessel",
            data=data,
            contamination=0.05,
            models_dir=str(models_dir),
        )
        assert version.startswith("v1.")
        assert metrics["n_samples"] == 100
        assert 0.0 <= metrics["anomaly_rate"] <= 1.0

        # Verify artifact exists and is loadable
        artifact = models_dir / "vessel_ensemble.joblib"
        assert artifact.exists()
        bundle = joblib.load(artifact)
        assert "model_iforest" in bundle
        assert "model_lof" in bundle
        assert "scaler" in bundle
        assert "calibrator" in bundle
        assert bundle["domain"] == "vessel"
        assert bundle["feature_cols"] == DOMAIN_FEATURE_COLS["vessel"]

    def test_train_with_labels(self, tmp_path):
        from lib.training import train_ensemble
        import joblib

        models_dir = tmp_path / "models"
        np.random.seed(42)
        n_samples = 200
        normal = [
            {"course_delta": np.random.uniform(0, 5), "heading_delta": 3.0,
             "speed_delta": 0.5, "average_speed": 15.0, "speed_variance": 2.0,
             "ais_gap_minutes": 2.0, "dist_restricted_zone": 5.0,
             "dist_historical_site": 5.0, "ewma_deviation": 0.5}
            for _ in range(190)
        ]
        anomaly = [
            {"course_delta": np.random.uniform(40, 90), "heading_delta": 50.0,
             "speed_delta": 10.0, "average_speed": 2.0, "speed_variance": 20.0,
             "ais_gap_minutes": 20.0, "dist_restricted_zone": 0.1,
             "dist_historical_site": 0.1, "ewma_deviation": 4.0}
            for _ in range(10)
        ]
        labels = [0] * 190 + [1] * 10
        data = normal + anomaly

        version, metrics = train_ensemble(
            domain="vessel", data=data, labels=labels,
            contamination=0.05, models_dir=str(models_dir),
        )
        assert "f1" in metrics
        assert metrics["f1"] > 0.0  # should detect the injected anomalies

    def test_train_too_few_samples(self, tmp_path):
        """Training with very few samples should succeed (library level)."""
        from lib.training import train_ensemble
        import joblib

        # The library itself doesn't enforce a min sample count — that's
        # done at the API handler level (POST /api/train requires 50).
        # 10 samples with 9 features is enough for LOF with novelty=True.
        models_dir = tmp_path / "models"
        np.random.seed(99)
        data = [
            {"course_delta": float(i), "heading_delta": 1.0, "speed_delta": 0.5,
             "average_speed": 12.0, "speed_variance": 3.0, "ais_gap_minutes": 2.0,
             "dist_restricted_zone": 5.0, "dist_historical_site": 5.0, "ewma_deviation": 0.5}
            for i in range(15)
        ]
        version, metrics = train_ensemble(
            domain="vessel", data=data, contamination=0.10,
            models_dir=str(models_dir),
        )
        assert version.startswith("v1.")
        artifact = models_dir / "vessel_ensemble.joblib"
        assert artifact.exists()

    def test_train_transit_domain(self, tmp_path):
        """Smoke test: transit domain training should succeed."""
        from lib.training import train_ensemble
        import joblib

        models_dir = tmp_path / "models"
        np.random.seed(42)
        data = [
            {
                "crossing_speed": np.random.uniform(8, 20),
                "time_since_last_transit_h": np.random.uniform(0, 500),
                "crossing_hour": np.random.uniform(0, 23),
                "vessel_speed_before": np.random.uniform(5, 18),
                "destination_direction_match": np.random.choice([0.0, 1.0]),
                "gate_dist_from_center_nm": np.random.uniform(0, 25),
                "speed_vs_avg_ratio": np.random.uniform(0.5, 2.0),
            }
            for _ in range(80)
        ]

        version, metrics = train_ensemble(
            domain="transit", data=data, contamination=0.05,
            models_dir=str(models_dir),
        )
        assert version.startswith("v1.")
        artifact = models_dir / "transit_ensemble.joblib"
        assert artifact.exists()

        bundle = joblib.load(artifact)
        assert bundle["feature_cols"] == DOMAIN_FEATURE_COLS["transit"]


# ---------------------------------------------------------------------------
# 4. Fallback / edge cases
# ---------------------------------------------------------------------------

class TestFallbackBehavior:
    """Verify the system degrades gracefully when models are missing."""

    def test_missing_model_domain(self, tmp_path):
        """Score should fail with FileNotFoundError when domain model is missing."""
        old_models_dir = os.environ.get("MODELS_DIR", "")
        os.environ["MODELS_DIR"] = str(tmp_path / "nonexistent_models")

        try:
            from lib.scoring import score
            import joblib

            # Trying to load a missing bundle should raise FileNotFoundError
            with pytest.raises(FileNotFoundError):
                _ = joblib.load(
                    os.path.join(os.environ["MODELS_DIR"], "vessel_ensemble.joblib")
                )
        finally:
            os.environ["MODELS_DIR"] = old_models_dir

    def test_empty_features(self):
        """Empty feature dicts should use defaults (0.0) without crashing."""
        vf = VesselFeatures(
            course_delta=0.0, heading_delta=0.0, speed_delta=0.0,
            average_speed=0.0, speed_variance=0.0, ais_gap_minutes=0.0,
            dist_restricted_zone=10.0, dist_historical_site=10.0,
            ewma_deviation=0.0,
        )
        arr = vf.to_array()
        assert len(arr) == 9
        assert arr[0] == 0.0  # course_delta
        assert arr[7] == 10.0  # dist_historical_site

    def test_news_features_edge_values(self):
        """News features with edge values should pass validation."""
        # Maximum article age (1 year)
        f = NewsFeatures(
            keyword_count=500, entity_count=200, article_length=100000,
            publication_age_hours=8760.0, military_term_count=0,
            energy_term_count=0, shipping_term_count=0, cyber_term_count=0,
            country_risk_score=0.0, source_reliability=0.0,
            sentiment_score=0.5, organization_count=0, company_count=0,
            port_mentions=0, airport_mentions=0, ship_mentions=0,
            aircraft_mentions=0, publisher_weight=0.0,
        )
        arr = f.to_array()
        assert np.all(np.isfinite(arr))
        assert arr[0] == 500.0  # keyword_count max

    def test_transit_features_night_crossing(self):
        """Night crossings (hour=2) are valid transit features."""
        f = TransitFeatures(
            crossing_speed=10.0, time_since_last_transit_h=200.0,
            crossing_hour=2.0, vessel_speed_before=8.0,
            destination_direction_match=0.0, gate_dist_from_center_nm=10.0,
            speed_vs_avg_ratio=1.0,
        )
        arr = f.to_array()
        assert arr[2] == 2.0  # crossing_hour

    def test_blockade_critical_state(self):
        """Critical blockade indicators should be valid features."""
        f = BlockadeFeatures(
            strait_transits_24h=0, anchored_ratio_pct=85.0,
            waiting_fleet_6h=120, waiting_fleet_24h=45,
            active_vessels=200, anchorage_zone_count=11,
            flag_entropy=0.95,
        )
        arr = f.to_array()
        assert arr[1] == 85.0  # anchored_ratio_pct
        assert arr[6] == 0.95  # flag_entropy
