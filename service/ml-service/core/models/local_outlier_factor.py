"""
service/ml-service/core/models/local_outlier_factor.py
=====================================================
Local Outlier Factor (LOF) novelty detector implementation of BaseAnomalyModel.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib
import numpy as np
from sklearn.neighbors import LocalOutlierFactor

from core.base_model import (
    BaseAnomalyModel,
    FeatureAttribution,
    ModelInferenceOutput,
)
from core.registry import ModelRegistry


@ModelRegistry.register("local_outlier_factor")
class LocalOutlierFactorModel(BaseAnomalyModel):
    """Local density-based novelty detector."""

    def __init__(
        self,
        domain: str = "vessel",
        version: str = "v1.0.0",
        n_neighbors: int = 35,
        contamination: float = 0.05,
    ):
        super().__init__(name="local_outlier_factor", domain=domain, version=version)
        self.n_neighbors = n_neighbors
        self.contamination = contamination
        self.model = LocalOutlierFactor(
            n_neighbors=self.n_neighbors,
            contamination=self.contamination,
            novelty=True,
            n_jobs=-1,
        )

    def train(self, X: np.ndarray, y: Optional[np.ndarray] = None, **kwargs) -> Dict[str, Any]:
        self.model.fit(X)
        self.is_fitted = True
        return {"n_samples": len(X), "n_neighbors": self.n_neighbors}

    def predict(self, X: np.ndarray) -> ModelInferenceOutput:
        if not self.is_fitted and not hasattr(self.model, "offset_"):
            return ModelInferenceOutput(0.0, 0.0, 0.0, False, 0.0)

        X_arr = np.atleast_2d(X)
        raw_score = float(self.model.score_samples(X_arr)[0])
        # LOF returns negative scores; larger negative = more isolated
        clamped = max(-2.0, min(0.0, raw_score))
        normalized = float((-clamped / 2.0) * 100.0)

        pred = self.model.predict(X_arr)[0]
        is_anomaly = (pred == -1)
        confidence = float(min(1.0, abs(raw_score) / 1.5))

        return ModelInferenceOutput(
            raw_score=raw_score,
            normalized_score=round(normalized, 2),
            probability=round(normalized / 100.0, 4),
            is_anomaly=is_anomaly,
            confidence=round(confidence, 3),
        )

    def explain(self, X: np.ndarray) -> List[FeatureAttribution]:
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
