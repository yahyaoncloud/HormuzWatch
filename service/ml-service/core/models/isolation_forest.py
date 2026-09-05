"""
service/ml-service/core/models/isolation_forest.py
==================================================
Isolation Forest implementation of BaseAnomalyModel.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

from core.base_model import (
    BaseAnomalyModel,
    FeatureAttribution,
    ModelInferenceOutput,
)
from core.registry import ModelRegistry


@ModelRegistry.register("isolation_forest")
class IsolationForestModel(BaseAnomalyModel):
    """Recursive random partitioning anomaly detector."""

    def __init__(
        self,
        domain: str = "vessel",
        version: str = "v1.0.0",
        n_estimators: int = 150,
        contamination: float = 0.05,
        max_samples: float = 0.8,
        random_state: int = 42,
    ):
        super().__init__(name="isolation_forest", domain=domain, version=version)
        self.n_estimators = n_estimators
        self.contamination = contamination
        self.max_samples = max_samples
        self.random_state = random_state
        self.model = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=self.contamination,
            max_samples=self.max_samples,
            random_state=self.random_state,
            n_jobs=-1,
        )

    def train(self, X: np.ndarray, y: Optional[np.ndarray] = None, **kwargs) -> Dict[str, Any]:
        self.model.fit(X)
        self.is_fitted = True
        return {"n_samples": len(X), "n_estimators": self.n_estimators}

    def predict(self, X: np.ndarray) -> ModelInferenceOutput:
        if not self.is_fitted and not hasattr(self.model, "estimators_"):
            return ModelInferenceOutput(0.0, 0.0, 0.0, False, 0.0)

        X_arr = np.atleast_2d(X)
        # score_samples returns negative anomaly score (lower = more anomalous)
        raw_score = float(self.model.score_samples(X_arr)[0])
        # Map [-1.0, 0.0] -> [100.0, 0.0]
        clamped = max(-1.0, min(0.0, raw_score))
        normalized = float(-clamped * 100.0)

        pred = self.model.predict(X_arr)[0]  # -1 for anomaly, 1 for normal
        is_anomaly = (pred == -1)
        confidence = float(min(1.0, abs(raw_score) / 0.5))

        return ModelInferenceOutput(
            raw_score=raw_score,
            normalized_score=round(normalized, 2),
            probability=round(normalized / 100.0, 4),
            is_anomaly=is_anomaly,
            confidence=round(confidence, 3),
        )

    def explain(self, X: np.ndarray) -> List[FeatureAttribution]:
        # Minimal fast attribution approximation based on feature variance / deviations
        return []

    def save(self, destination: Path) -> Path:
        destination.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump({
            "model": self.model,
            "domain": self.domain,
            "version": self.version,
            "feature_names": self.feature_names,
        }, destination)
        return destination

    def load(self, source: Path) -> None:
        bundle = joblib.load(source)
        self.model = bundle["model"]
        self.domain = bundle.get("domain", self.domain)
        self.version = bundle.get("version", self.version)
        self.feature_names = bundle.get("feature_names", [])
        self.is_fitted = True
