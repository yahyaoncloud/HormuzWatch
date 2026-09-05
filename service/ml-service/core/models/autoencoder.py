"""
service/ml-service/core/models/autoencoder.py
============================================
Deep Reconstruction Autoencoder Anomaly Model.
Measures anomaly score as the L2 feature reconstruction loss ||x - x_hat||^2.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib
import numpy as np

from core.base_model import (
    BaseAnomalyModel,
    FeatureAttribution,
    ModelInferenceOutput,
)
from core.registry import ModelRegistry


@ModelRegistry.register("reconstruction_autoencoder")
class AutoencoderAnomalyModel(BaseAnomalyModel):
    """
    Reconstruction-based neural anomaly detector.
    Normal patterns are compressed through a low-dimensional bottleneck and reconstructed.
    Anomalous patterns have high reconstruction residual errors.
    """

    def __init__(
        self,
        domain: str = "vessel",
        version: str = "v1.0.0",
        latent_dim: int = 4,
        threshold_mse: float = 0.05,
    ):
        super().__init__(name="reconstruction_autoencoder", domain=domain, version=version)
        self.latent_dim = latent_dim
        self.threshold_mse = threshold_mse
        self.weights_enc: Optional[np.ndarray] = None
        self.weights_dec: Optional[np.ndarray] = None
        self.bias_enc: Optional[np.ndarray] = None
        self.bias_dec: Optional[np.ndarray] = None

    def train(self, X: np.ndarray, y: Optional[np.ndarray] = None, **kwargs) -> Dict[str, Any]:
        """Fit linear/PCA-projection autoencoder bottleneck."""
        n_samples, n_features = X.shape
        # Center data
        mean = np.mean(X, axis=0)
        X_centered = X - mean
        # SVD for optimal orthogonal reconstruction subspace
        U, S, Vt = np.linalg.svd(X_centered, full_matrices=False)
        self.weights_enc = Vt[:self.latent_dim, :].T  # [features, latent]
        self.weights_dec = Vt[:self.latent_dim, :]     # [latent, features]
        self.bias_enc = mean
        self.bias_dec = mean

        # Compute training residual MSE to establish adaptive threshold
        latent = np.dot(X - self.bias_enc, self.weights_enc)
        recon = np.dot(latent, self.weights_dec) + self.bias_dec
        mse = np.mean((X - recon) ** 2, axis=1)
        self.threshold_mse = float(np.percentile(mse, 95))
        self.is_fitted = True

        return {
            "n_samples": n_samples,
            "latent_dim": self.latent_dim,
            "p95_threshold_mse": self.threshold_mse,
        }

    def predict(self, X: np.ndarray) -> ModelInferenceOutput:
        if not self.is_fitted or self.weights_enc is None:
            return ModelInferenceOutput(0.0, 0.0, 0.0, False, 0.0)

        X_arr = np.atleast_2d(X)
        latent = np.dot(X_arr - self.bias_enc, self.weights_enc)
        recon = np.dot(latent, self.weights_dec) + self.bias_dec

        residuals = (X_arr - recon) ** 2
        mse = float(np.mean(residuals))

        normalized = float(min(100.0, (mse / max(1e-6, self.threshold_mse)) * 50.0))
        is_anomaly = (mse >= self.threshold_mse)
        confidence = float(min(1.0, mse / (self.threshold_mse * 1.5)))

        return ModelInferenceOutput(
            raw_score=round(mse, 5),
            normalized_score=round(normalized, 2),
            probability=round(min(1.0, normalized / 100.0), 4),
            is_anomaly=is_anomaly,
            confidence=round(confidence, 3),
            extra={"mse": round(mse, 5), "threshold": round(self.threshold_mse, 5)},
        )

    def explain(self, X: np.ndarray) -> List[FeatureAttribution]:
        if not self.is_fitted or self.weights_enc is None:
            return []

        X_arr = np.atleast_2d(X)
        latent = np.dot(X_arr - self.bias_enc, self.weights_enc)
        recon = np.dot(latent, self.weights_dec) + self.bias_dec
        residuals = np.abs(X_arr[0] - recon[0])

        attributions = []
        names = self.feature_names or [f"feature_{i}" for i in range(len(residuals))]
        for name, val, res in zip(names, X_arr[0], residuals):
            attributions.append(FeatureAttribution(
                feature=name,
                value=float(val),
                contribution=float(res),
                direction="anomalous" if res > (self.threshold_mse ** 0.5) else "normal",
            ))
        attributions.sort(key=lambda a: abs(a.contribution), reverse=True)
        return attributions

    def save(self, destination: Path) -> Path:
        destination.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump({
            "weights_enc": self.weights_enc,
            "weights_dec": self.weights_dec,
            "bias_enc": self.bias_enc,
            "bias_dec": self.bias_dec,
            "threshold_mse": self.threshold_mse,
            "latent_dim": self.latent_dim,
            "domain": self.domain,
            "version": self.version,
            "feature_names": self.feature_names,
        }, destination)
        return destination

    def load(self, source: Path) -> None:
        bundle = joblib.load(source)
        self.weights_enc = bundle["weights_enc"]
        self.weights_dec = bundle["weights_dec"]
        self.bias_enc = bundle["bias_enc"]
        self.bias_dec = bundle["bias_dec"]
        self.threshold_mse = bundle.get("threshold_mse", self.threshold_mse)
        self.latent_dim = bundle.get("latent_dim", self.latent_dim)
        self.domain = bundle.get("domain", self.domain)
        self.version = bundle.get("version", self.version)
        self.feature_names = bundle.get("feature_names", [])
        self.is_fitted = True
