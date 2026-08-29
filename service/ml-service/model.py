import numpy as np
import joblib
import os
import time
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import shap
from datetime import datetime
from typing import Tuple

FEATURE_COLS = [
    "course_delta", "heading_delta", "speed_delta",
    "average_speed", "speed_variance", "ais_gap_minutes",
    "dist_restricted_zone", "dist_historical_site",
]

MODEL_DIR = "models"
MODEL_PATH = os.path.join(MODEL_DIR, "isolation_forest.joblib")

class AnomalyModel:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.version = "v0.0.0"
        self._load()

    def _load(self):
        if os.path.exists(MODEL_PATH):
            data = joblib.load(MODEL_PATH)
            self.model = data.get("model")
            self.scaler = data.get("scaler")
            self.version = data.get("version", "v0.0.0")

    def train(self, data: list[dict], contamination: float = 0.05) -> str:
        """Train a new Isolation Forest on the provided feature data."""
        X_raw = np.array([[d[col] for col in FEATURE_COLS] for d in data])
        
        self.scaler = StandardScaler()
        X = self.scaler.fit_transform(X_raw)

        self.model = IsolationForest(
            n_estimators=200,
            contamination=contamination,
            max_samples="auto",
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(X)

        self.version = f"v1.{datetime.now().strftime('%Y%m%d%H%M%S')}"
        os.makedirs(MODEL_DIR, exist_ok=True)
        joblib.dump({
            "model": self.model, 
            "scaler": self.scaler, 
            "version": self.version
        }, MODEL_PATH)
        return self.version

    def predict(self, features: dict, explain: bool = False) -> Tuple[float, bool, float, dict]:
        """
        Returns (anomaly_score_0_100, is_anomaly, confidence, explanation_dict).
        If no model is trained, returns a neutral score.
        """
        if self.model is None or self.scaler is None:
            return 0.0, False, 0.0, None

        X_raw = np.array([[features.get(col, 0.0) for col in FEATURE_COLS]])
        X = self.scaler.transform(X_raw)

        # decision_function: negative = anomaly, positive = normal
        raw_score = self.model.decision_function(X)[0]
        prediction = self.model.predict(X)[0]  # 1 = normal, -1 = anomaly

        # Normalize raw_score to 0-100 (more negative = higher anomaly score)
        # Typical range is [-0.5, 0.5]; we map [-0.3, 0.3] → [100, 0]
        normalized = max(0, min(100, (0.3 - raw_score) / 0.6 * 100))
        is_anomaly = bool(prediction == -1)
        confidence = min(1.0, float(abs(raw_score) / 0.3))

        explanation = None
        if explain:
            try:
                explainer = shap.TreeExplainer(self.model)
                shap_values = explainer.shap_values(X)
                
                feature_importance = []
                for i, col in enumerate(FEATURE_COLS):
                    val = float(shap_values[0][i])
                    # Isolation forest scores: lower values mean more anomalous.
                    # Negative SHAP value contributes to lower score -> "anomalous" direction
                    direction = "anomalous" if val < 0 else "normal"
                    feature_importance.append({
                        "feature": col,
                        "shap_value": round(val, 4),
                        "direction": direction
                    })
                
                # Sort by absolute SHAP value
                feature_importance.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
                
                explanation = {
                    "top_features": feature_importance,
                    "isolation_depth": round(float(abs(raw_score) * 10), 2)
                }
            except Exception as e:
                print(f"SHAP explanation failed: {e}")

        return round(float(normalized), 2), is_anomaly, round(confidence, 3), explanation
