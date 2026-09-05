"""
service/ml-service/core/ensemble.py
===================================
Pluggable multi-model ensemble engine. Orchestrates and fuses predictions from
arbitrary registered BaseAnomalyModel instances with configurable weights.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional
import numpy as np
from sklearn.isotonic import IsotonicRegression

from core.base_model import (
    BaseAnomalyModel,
    FeatureAttribution,
    ModelInferenceOutput,
)

logger = logging.getLogger("hormuzwatch.ml.ensemble")


class PluggableEnsemble:
    """Orchestrates an ensemble of registered anomaly models."""

    def __init__(
        self,
        domain: str,
        models: Optional[List[BaseAnomalyModel]] = None,
        weights: Optional[List[float]] = None,
        strategy: str = "weighted_average",
        calibrator: Optional[IsotonicRegression] = None,
        threshold: float = 50.0,
    ):
        self.domain = domain
        self.models: List[BaseAnomalyModel] = models or []
        self.strategy = strategy
        self.calibrator = calibrator
        self.threshold = threshold

        if weights is not None and len(weights) == len(self.models):
            total = sum(weights)
            self.weights = [w / total for w in weights] if total > 0 else [1.0 / len(weights)] * len(weights)
        else:
            n = len(self.models)
            self.weights = [1.0 / n] * n if n > 0 else []

    def add_model(self, model: BaseAnomalyModel, weight: float = 1.0) -> None:
        """Add a model instance to the active ensemble."""
        self.models.append(model)
        raw_weights = [w * (len(self.models) - 1) for w in self.weights] + [weight]
        total = sum(raw_weights)
        self.weights = [w / total for w in raw_weights]

    def predict(self, X: np.ndarray) -> ModelInferenceOutput:
        """Execute ensemble inference across all registered models."""
        t0 = time.perf_counter()
        if not self.models:
            raise RuntimeError(f"No models configured in ensemble for domain '{self.domain}'")

        outputs: List[ModelInferenceOutput] = [m.predict(X) for m in self.models]

        if self.strategy == "max_gating":
            agg_score = max(out.normalized_score for out in outputs)
        elif self.strategy == "voting":
            anomaly_votes = sum(1 for out in outputs if out.is_anomaly)
            agg_score = (anomaly_votes / len(outputs)) * 100.0
        else:  # weighted_average
            agg_score = sum(w * out.normalized_score for w, out in zip(self.weights, outputs))

        if self.calibrator is not None:
            try:
                prob = float(self.calibrator.predict([agg_score])[0])
                prob = max(0.0, min(1.0, prob))
            except Exception:
                prob = max(0.0, min(1.0, agg_score / 100.0))
        else:
            prob = max(0.0, min(1.0, agg_score / 100.0))

        avg_confidence = float(np.mean([out.confidence for out in outputs]))
        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        return ModelInferenceOutput(
            raw_score=round(agg_score, 4),
            normalized_score=round(agg_score, 2),
            probability=round(prob, 4),
            is_anomaly=(agg_score >= self.threshold),
            confidence=round(avg_confidence, 3),
            inference_time_ms=round(elapsed_ms, 2),
            extra={
                "domain": self.domain,
                "strategy": self.strategy,
                "sub_scores": {m.name: round(out.normalized_score, 2) for m, out in zip(self.models, outputs)},
            },
        )

    def explain(self, X: np.ndarray) -> List[FeatureAttribution]:
        """Aggregate feature attributions across models."""
        combined: Dict[str, FeatureAttribution] = {}
        for model, weight in zip(self.models, self.weights):
            try:
                attrs = model.explain(X)
                for a in attrs:
                    if a.feature in combined:
                        existing = combined[a.feature]
                        combined[a.feature] = FeatureAttribution(
                            feature=a.feature,
                            value=a.value,
                            contribution=existing.contribution + (a.contribution * weight),
                            direction=a.direction,
                        )
                    else:
                        combined[a.feature] = FeatureAttribution(
                            feature=a.feature,
                            value=a.value,
                            contribution=a.contribution * weight,
                            direction=a.direction,
                        )
            except Exception as err:
                logger.debug("Explain skipped for model '%s': %s", model.name, err)

        res = list(combined.values())
        res.sort(key=lambda a: abs(a.contribution), reverse=True)
        return res
