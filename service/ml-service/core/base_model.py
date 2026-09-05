"""
service/ml-service/core/base_model.py
======================================
Core abstract base class and standardized contracts for HormuzWatch anomaly detection models.
Any new model paradigm (deep learning, tree-based, statistical, or geometric) must inherit
from BaseAnomalyModel to ensure seamless plug-and-play operation across REST and gRPC pipelines.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np


@dataclass(frozen=True)
class ModelMetadata:
    """Immutable metadata describing a trained anomaly model."""
    name: str
    version: str
    domain: str
    feature_names: List[str]
    created_at: str
    model_type: str
    sha256: Optional[str] = None
    parameters: Dict[str, Any] = field(default_factory=dict)
    metrics: Dict[str, float] = field(default_factory=dict)


@dataclass
class ModelInferenceOutput:
    """Standardized prediction output returned by all anomaly models."""
    raw_score: float             # Unbounded native score (e.g. tree path length, reconstruction loss)
    normalized_score: float      # Score normalized to [0.0, 100.0] (higher = more anomalous)
    probability: float           # Monotonically calibrated probability in [0.0, 1.0]
    is_anomaly: bool             # Binary classification flag based on decision threshold
    confidence: float            # Model confidence score in [0.0, 1.0]
    inference_time_ms: float = 0.0
    extra: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FeatureAttribution:
    """Local feature attribution explanation for why an observation is flagged anomalous."""
    feature: str
    value: float
    contribution: float          # Impact on anomaly score (positive = drives anomaly)
    direction: str               # 'anomalous' or 'normal'


class BaseAnomalyModel(ABC):
    """
    Abstract Base Class for all HormuzWatch Anomaly Detection Models.
    
    Subclasses must implement:
      - `train(X, y=None, **kwargs)`: Fits the model on standardized features.
      - `predict(X)`: Returns a standardized ModelInferenceOutput.
      - `explain(X)`: Returns feature attributions (SHAP, gradients, or residuals).
      - `save(destination)`: Serializes model artifacts.
      - `load(source)`: Deserializes model artifacts.
    """

    def __init__(self, name: str, domain: str = "vessel", version: str = "v1.0.0"):
        self.name = name
        self.domain = domain
        self.version = version
        self.is_fitted = False
        self.feature_names: List[str] = []

    @abstractmethod
    def train(self, X: np.ndarray, y: Optional[np.ndarray] = None, **kwargs) -> Dict[str, Any]:
        """Fit model weights on feature matrix X. Optional y for semi-supervised algorithms."""
        pass

    @abstractmethod
    def predict(self, X: np.ndarray) -> ModelInferenceOutput:
        """
        Execute inference on feature array X (shape: [1, d] or [d]).
        Returns ModelInferenceOutput.
        """
        pass

    @abstractmethod
    def explain(self, X: np.ndarray) -> List[FeatureAttribution]:
        """Compute feature attributions explaining the prediction."""
        pass

    @abstractmethod
    def save(self, destination: Path) -> Path:
        """Persist model weights and artifacts to disk."""
        pass

    @abstractmethod
    def load(self, source: Path) -> None:
        """Load model weights and artifacts from disk."""
        pass

    def get_metadata(self) -> ModelMetadata:
        """Return structured model metadata."""
        return ModelMetadata(
            name=self.name,
            version=self.version,
            domain=self.domain,
            feature_names=self.feature_names,
            created_at=datetime.now(timezone.utc).isoformat(),
            model_type=self.__class__.__name__,
        )
