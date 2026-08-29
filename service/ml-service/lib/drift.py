"""
lib/drift.py
------------
Statistical drift detection and feature distribution monitoring for HormuzWatch ML models.

Implements:
  - Population Stability Index (PSI)
  - Kolmogorov-Smirnov (KS) two-sample test
  - In-memory rolling window drift monitor per feature and domain
"""

from __future__ import annotations

import logging
import threading
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger("hormuzwatch.drift")


def calculate_psi(
    expected: np.ndarray,
    actual: np.ndarray,
    num_buckets: int = 10,
    epsilon: float = 1e-4,
) -> float:
    """
    Calculate the Population Stability Index (PSI) between baseline (expected)
    and current (actual) feature samples.

    Interpretation:
      - PSI < 0.1: No significant shift (Stable)
      - 0.1 <= PSI < 0.2: Moderate shift (Warning)
      - PSI >= 0.2: Significant distribution drift (Alarm / Retrain needed)
    """
    if len(expected) < 10 or len(actual) < 10:
        return 0.0

    # Determine quantile bins from baseline
    quantiles = np.linspace(0, 100, num_buckets + 1)
    bins = np.percentile(expected, quantiles)
    bins[0] = -np.inf
    bins[-1] = np.inf

    # Bucket counts
    expected_counts, _ = np.histogram(expected, bins=bins)
    actual_counts, _ = np.histogram(actual, bins=bins)

    # Fractions with epsilon smoothing
    expected_pct = (expected_counts + epsilon) / (len(expected) + epsilon * num_buckets)
    actual_pct = (actual_counts + epsilon) / (len(actual) + epsilon * num_buckets)

    # PSI summation: sum((actual% - expected%) * ln(actual% / expected%))
    psi_values = (actual_pct - expected_pct) * np.log(actual_pct / expected_pct)
    return float(np.sum(psi_values))


def calculate_ks_statistic(expected: np.ndarray, actual: np.ndarray) -> float:
    """
    Calculate maximum vertical distance between empirical CDFs (Kolmogorov-Smirnov statistic).
    """
    if len(expected) == 0 or len(actual) == 0:
        return 0.0
    data_all = np.sort(np.concatenate([expected, actual]))
    cdf_exp = np.searchsorted(np.sort(expected), data_all, side="right") / len(expected)
    cdf_act = np.searchsorted(np.sort(actual), data_all, side="right") / len(actual)
    return float(np.max(np.abs(cdf_exp - cdf_act)))


@dataclass
class FeatureDriftReport:
    feature_name: str
    psi: float
    ks_statistic: float
    status: str  # "STABLE" | "WARNING" | "DRIFT_DETECTED"
    sample_count: int


@dataclass
class DomainDriftReport:
    domain: str
    overall_status: str
    max_psi: float
    drifted_features_count: int
    total_features_count: int
    features: List[FeatureDriftReport] = field(default_factory=list)
    evaluated_at: float = field(default_factory=time.time)


class DriftMonitor:
    """
    Thread-safe rolling buffer monitor tracking live feature vectors against baselines.
    """

    def __init__(self, window_size: int = 1000, baseline_size: int = 500) -> None:
        self.window_size = window_size
        self.baseline_size = baseline_size
        self._lock = threading.Lock()
        # domain -> deque of np.ndarray
        self._recent_observations: Dict[str, deque[np.ndarray]] = defaultdict(
            lambda: deque(maxlen=window_size)
        )
        # domain -> np.ndarray (fixed baseline matrix)
        self._baselines: Dict[str, np.ndarray] = {}

    def set_baseline(self, domain: str, feature_matrix: np.ndarray) -> None:
        with self._lock:
            self._baselines[domain] = np.asarray(feature_matrix, dtype=float)
            logger.info("Set drift baseline for domain '%s' with shape %s", domain, feature_matrix.shape)

    def record_observation(self, domain: str, feature_vector: np.ndarray) -> None:
        vec = np.asarray(feature_vector, dtype=float).ravel()
        with self._lock:
            self._recent_observations[domain].append(vec)
            # Auto-seed baseline from initial observations if none loaded
            if domain not in self._baselines and len(self._recent_observations[domain]) >= self.baseline_size:
                self._baselines[domain] = np.array(list(self._recent_observations[domain]))
                logger.info("Auto-initialized drift baseline for domain '%s' with %d samples", domain, self.baseline_size)

    def evaluate_domain(self, domain: str, feature_names: List[str]) -> DomainDriftReport:
        with self._lock:
            baseline = self._baselines.get(domain)
            recent = list(self._recent_observations.get(domain, []))

        if baseline is None or len(recent) < 20:
            return DomainDriftReport(
                domain=domain,
                overall_status="INSUFFICIENT_DATA",
                max_psi=0.0,
                drifted_features_count=0,
                total_features_count=len(feature_names),
                features=[],
            )

        recent_matrix = np.array(recent)
        num_cols = min(baseline.shape[1], recent_matrix.shape[1], len(feature_names))

        feature_reports: List[FeatureDriftReport] = []
        max_psi = 0.0
        drifted_count = 0

        for col_idx in range(num_cols):
            feat_name = feature_names[col_idx]
            base_col = baseline[:, col_idx]
            rec_col = recent_matrix[:, col_idx]

            psi = calculate_psi(base_col, rec_col)
            ks = calculate_ks_statistic(base_col, rec_col)

            if psi >= 0.2:
                status = "DRIFT_DETECTED"
                drifted_count += 1
            elif psi >= 0.1:
                status = "WARNING"
            else:
                status = "STABLE"

            if psi > max_psi:
                max_psi = psi

            feature_reports.append(
                FeatureDriftReport(
                    feature_name=feat_name,
                    psi=round(psi, 4),
                    ks_statistic=round(ks, 4),
                    status=status,
                    sample_count=len(rec_col),
                )
            )

        overall_status = "STABLE"
        if drifted_count > 0 or max_psi >= 0.2:
            overall_status = "DRIFT_DETECTED"
        elif max_psi >= 0.1:
            overall_status = "WARNING"

        return DomainDriftReport(
            domain=domain,
            overall_status=overall_status,
            max_psi=round(max_psi, 4),
            drifted_features_count=drifted_count,
            total_features_count=num_cols,
            features=feature_reports,
        )


# Global drift monitor instance
global_drift_monitor = DriftMonitor()
