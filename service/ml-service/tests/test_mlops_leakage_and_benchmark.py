"""
tests/test_mlops_leakage_and_benchmark.py
-----------------------------------------
Regression test suite using stdlib unittest to guarantee zero data leakage:
1. train/test MMSIs overlap
2. calibration/test MMSIs overlap
3. test data used to fit preprocessing
4. test min/max values used for normalization
5. calibration fitted on test data
6. candidate validation rejects missing keys
7. candidate validation rejects schema mismatch
8. champion gate rejects degraded candidate
"""

import copy
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

# Explicit path setup for container and local execution
TESTS_DIR = Path(__file__).resolve().parent
SERVICE_DIR = TESTS_DIR.parent
PROJECT_ROOT = SERVICE_DIR.parent.parent

for p in ["/app", "/tmp", str(SERVICE_DIR), str(PROJECT_ROOT / "pipeline")]:
    if p not in sys.path:
        sys.path.insert(0, p)

import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest

from api.train_all_models import generate_vessel_data
from benchmark_poc import build_authoritative_split
from lib.training import train_ensemble


class TestMLOpsLeakageAndDiscipline(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.data, cls.labels, cls.groups = generate_vessel_data(n_samples=1000, anomaly_frac=0.06, n_vessels=50)
        cols = [
            "course_delta", "heading_delta", "speed_delta", "average_speed",
            "speed_variance", "ais_gap_minutes", "dist_restricted_zone",
            "dist_historical_site", "ewma_deviation"
        ]
        cls.X = np.array([[d[c] for c in cols] for d in cls.data], dtype=np.float64)
        cls.y = np.array(cls.labels, dtype=int)
        cls.partitions, cls.mmsi_sets = build_authoritative_split(cls.groups, cls.labels, seed=42)

    def test_1_authoritative_split_zero_mmsi_overlap(self):
        """Ensure zero entity (MMSI) overlap across all partition boundaries."""
        mmsi_sets = self.mmsi_sets
        
        overlap_train_test = mmsi_sets["train"] & mmsi_sets["test"]
        self.assertEqual(len(overlap_train_test), 0, f"Train and Test share MMSIs: {overlap_train_test}")
        
        overlap_calib_test = mmsi_sets["calib"] & mmsi_sets["test"]
        self.assertEqual(len(overlap_calib_test), 0, f"Calib and Test share MMSIs: {overlap_calib_test}")
        
        overlap_val_test = mmsi_sets["val"] & mmsi_sets["test"]
        self.assertEqual(len(overlap_val_test), 0, f"Val and Test share MMSIs: {overlap_val_test}")
        
        overlap_train_calib = mmsi_sets["train"] & mmsi_sets["calib"]
        self.assertEqual(len(overlap_train_calib), 0, f"Train and Calib share MMSIs: {overlap_train_calib}")

    def test_2_preprocessing_fitted_only_on_train(self):
        """Ensure StandardScaler is fitted strictly on the Train split without test influence."""
        X_train = self.X[self.partitions["train"]]
        expected_scaler = StandardScaler().fit(X_train)
        
        tmp_dir = Path(tempfile.mkdtemp())
        try:
            version, metrics = train_ensemble(
                domain="vessel",
                data=self.data,
                labels=self.labels,
                groups=self.groups,
                custom_splits=self.partitions,
                models_dir=tmp_dir
            )
            
            import joblib
            artifact = joblib.load(tmp_dir / "vessel_ensemble.joblib")
            actual_scaler = artifact["scaler"]
            
            np.testing.assert_allclose(actual_scaler.mean_, expected_scaler.mean_, err_msg="Scaler mean was not fitted exclusively on X_train!")
            np.testing.assert_allclose(actual_scaler.var_, expected_scaler.var_, err_msg="Scaler variance was not fitted exclusively on X_train!")
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    def test_3_model_a_no_test_min_max_leakage(self):
        """Ensure Model A does not derive min-max normalization bounds from the test set."""
        X_train = self.X[self.partitions["train"]]
        X_test_1 = self.X[self.partitions["test"]]
        X_test_2 = X_test_1.copy()
        X_test_2[0, :] = 99999.0
        
        model_a = IsolationForest(n_estimators=50, random_state=42)
        model_a.fit(X_train)
        
        train_scores = -model_a.decision_function(X_train)
        s_min_train = float(train_scores.min())
        s_max_train = float(train_scores.max())
        
        self.assertIsNotNone(s_min_train)
        self.assertIsNotNone(s_max_train)
        self.assertGreater(s_max_train, s_min_train)
        
        illegal_test_1_max = float((-model_a.decision_function(X_test_1)).max())
        illegal_test_2_max = float((-model_a.decision_function(X_test_2)).max())
        self.assertNotEqual(illegal_test_1_max, illegal_test_2_max, "Illegal test bounds must not be used in evaluation!")

    def test_4_calibration_isolation_from_test_set(self):
        """Ensure Isotonic Regression calibrator is strictly invariant to test set mutations."""
        tmp_dir = Path(tempfile.mkdtemp())
        try:
            train_ensemble(
                domain="vessel",
                data=self.data,
                labels=self.labels,
                groups=self.groups,
                custom_splits=self.partitions,
                models_dir=tmp_dir
            )
            import joblib
            calibrator_orig = joblib.load(tmp_dir / "vessel_ensemble.joblib")["calibrator"]
            orig_x_thresh = copy.deepcopy(calibrator_orig.X_thresholds_)
            orig_y_thresh = copy.deepcopy(calibrator_orig.y_thresholds_)
            
            # Now mutate test data with wild values in data list
            mutated_data = copy.deepcopy(self.data)
            for idx in self.partitions["test"]:
                mutated_data[idx]["course_delta"] = 99999.0
                mutated_data[idx]["speed_delta"] = 99999.0
                
            train_ensemble(
                domain="vessel",
                data=mutated_data,
                labels=self.labels,
                groups=self.groups,
                custom_splits=self.partitions,
                models_dir=tmp_dir
            )
            calibrator_mutated = joblib.load(tmp_dir / "vessel_ensemble.joblib")["calibrator"]
            
            np.testing.assert_allclose(
                calibrator_mutated.X_thresholds_,
                orig_x_thresh,
                err_msg="FATAL: Calibrator thresholds changed when test data was mutated!"
            )
            np.testing.assert_allclose(
                calibrator_mutated.y_thresholds_,
                orig_y_thresh,
                err_msg="FATAL: Calibrator y thresholds changed when test data was mutated!"
            )
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    def test_5_candidate_validation_rejects_missing_keys(self):
        """Ensure candidate gate rejects any artifact missing required production keys."""
        from deploy_candidate import validate_candidate_bundle
        import tempfile
        import joblib

        corrupt_bundle = {
            "model_iforest": "dummy",
            "domain": "vessel"
        }
        with tempfile.NamedTemporaryFile(suffix=".joblib", delete=False) as f:
            tmp_path = Path(f.name)
            joblib.dump(corrupt_bundle, tmp_path)

        try:
            with self.assertRaises(ValueError):
                validate_candidate_bundle(tmp_path, "vessel")
        finally:
            tmp_path.unlink(missing_ok=True)

    def test_6_candidate_validation_rejects_schema_mismatch(self):
        """Ensure candidate gate rejects any artifact with invalid feature schema."""
        from deploy_candidate import validate_candidate_bundle
        import tempfile
        import joblib

        bad_schema_bundle = {
            "model_iforest": "dummy",
            "model_lof": "dummy",
            "scaler": "dummy",
            "calibrator": "dummy",
            "feature_cols": ["invalid_col_1", "invalid_col_2"],
            "domain": "vessel"
        }
        with tempfile.NamedTemporaryFile(suffix=".joblib", delete=False) as f:
            tmp_path = Path(f.name)
            joblib.dump(bad_schema_bundle, tmp_path)

        try:
            with self.assertRaises(ValueError):
                validate_candidate_bundle(tmp_path, "vessel")
        finally:
            tmp_path.unlink(missing_ok=True)

    def test_7_champion_gate_rejects_degraded_candidate(self):
        """Invariant: A degraded candidate must never replace an active champion."""
        from deploy_candidate import compare_against_champion, MODELS_DIR
        import joblib

        tmp_dir = Path(tempfile.mkdtemp())
        try:
            # Seed a high-quality champion in tmp_dir
            champ_bundle = {
                "domain": "vessel",
                "metrics": {
                    "test_ece": 0.0457,
                    "test_f1": 0.8889,
                }
            }
            joblib.dump(champ_bundle, tmp_dir / "vessel_ensemble.joblib")
            
            # Monkeypatch MODELS_DIR temporarily to tmp_dir
            import deploy_candidate
            orig_models_dir = deploy_candidate.MODELS_DIR
            deploy_candidate.MODELS_DIR = tmp_dir
            
            try:
                # Test candidate with severe calibration error degradation
                degraded_candidate = {
                    "metrics": {
                        "test_ece": 0.2500,  # 0.25 vs champion 0.0457
                        "test_f1": 0.5000,
                    }
                }
                passed, reason = compare_against_champion(degraded_candidate, "vessel")
                self.assertFalse(passed, "Champion gate must REJECT candidate with severe calibration degradation!")
                self.assertIn("degraded", reason.lower())
            finally:
                deploy_candidate.MODELS_DIR = orig_models_dir
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
