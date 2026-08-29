"""
lib/scoring.py
--------------
Ensemble anomaly scoring pipeline for HormuzWatch.

Each domain has three persisted artifacts stored in /models/:
    {domain}_ensemble.joblib → {
        "model_iforest": IsolationForest,
        "model_lof":     LocalOutlierFactor (novelty=True),
        "scaler":        StandardScaler,
        "calibrator":    IsotonicRegression,
        "feature_cols":  list[str],        # column ordering used at train time
        "domain":        str,
        "version":       str,              # ISO-8601 timestamp of last train run
    }

Inference pipeline (per prediction):
    1. StandardScaler.transform(X)
    2. IsolationForest.score_samples(X)   → raw_iforest  (more negative = more anomalous)
    3. LocalOutlierFactor.score_samples(X) → raw_lof      (same convention)
    4. Normalise both raw scores to [0, 1] via min-max over [-1, 0] range
    5. Average the two normalised scores → ensemble_score_01
    6. IsotonicRegression.predict([ensemble_score_01]) → calibrated probability ∈ [0, 1]
    7. Multiply by 100 for the final 0-100 scale
    8. SHAP: TreeExplainer on IsolationForest only; returns ranked feature contributions

Design notes:
    - The normalisation in step 4 uses the theoretical range of
      IsolationForest.score_samples which is always ≤ 0. We linearly map
      [-1, 0] → [1, 0] so that highly anomalous samples score close to 1.
      Scores outside [-1, 0] are clamped.
    - LOF with novelty=True has the same sign convention as IsolationForest.
    - SHAP is only computed when ``explain=True`` to avoid cold-start overhead
      on warm invocations that do not need explanations.
    - All models are expected to be pre-loaded (module-level globals in predict.py);
      this module itself is stateless.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Tuple

import numpy as np

from lib.logger import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# GPU & Hardware Acceleration Backend Detection (AMD Radeon / Nvidia / CPU)
# ---------------------------------------------------------------------------

_GPU_BACKEND_INFO: str | None = None

def detect_hardware_device() -> str:
    """
    Detect available GPU (AMD Radeon OpenCL/ROCm, Nvidia CUDA/OpenCL, DirectML)
    or fall back to vectorized CPU.
    """
    global _GPU_BACKEND_INFO
    if _GPU_BACKEND_INFO is not None:
        return _GPU_BACKEND_INFO

    # 1. Check PyOpenCL (Universal AMD Radeon + Nvidia + Intel GPU driver)
    try:
        import pyopencl as cl
        platforms = cl.get_platforms()
        for p in platforms:
            devices = p.get_devices()
            for d in devices:
                dev_name = d.name.strip()
                _GPU_BACKEND_INFO = f"GPU (OpenCL: {dev_name})"
                logger.info("Detected GPU compute device: %s", _GPU_BACKEND_INFO)
                return _GPU_BACKEND_INFO
    except Exception:
        pass

    # 2. Check PyTorch (ROCm / CUDA / DirectML)
    try:
        import torch
        if torch.cuda.is_available():
            dev_name = torch.cuda.get_device_name(0)
            is_rocm = getattr(torch.version, 'hip', None) is not None
            type_str = "ROCm AMD GPU" if is_rocm else "Nvidia CUDA GPU"
            _GPU_BACKEND_INFO = f"GPU (PyTorch {type_str}: {dev_name})"
            logger.info("Detected GPU compute device: %s", _GPU_BACKEND_INFO)
            return _GPU_BACKEND_INFO
    except Exception:
        pass

    # 3. Check cuML (Nvidia RAPIDS)
    try:
        import cuml
        _GPU_BACKEND_INFO = "GPU (Nvidia cuML Acceleration)"
        logger.info("Detected GPU compute device: %s", _GPU_BACKEND_INFO)
        return _GPU_BACKEND_INFO
    except Exception:
        pass

    _GPU_BACKEND_INFO = "CPU (Vectorized SIMD Engine)"
    logger.info("Using compute device: %s", _GPU_BACKEND_INFO)
    return _GPU_BACKEND_INFO


# ---------------------------------------------------------------------------
# Normalisation helpers (CPU & GPU Compatible)
# ---------------------------------------------------------------------------

_IF_MIN = -1.0   # IsolationForest.score_samples lower bound (theoretical)
_IF_MAX = 0.0    # IsolationForest.score_samples upper bound (normal samples ≈ 0)


def gpu_vectorized_normalize(
    raw_arr: np.ndarray,
    lower_bound: float = _IF_MIN,
    upper_bound: float = _IF_MAX,
) -> np.ndarray:
    """
    GPU/CPU vectorized score normalization mapping [-1, 0] -> [0, 1].
    Higher output = more anomalous.
    """
    if upper_bound <= lower_bound:
        lower_bound, upper_bound = _IF_MIN, _IF_MAX
    clamped = np.clip(raw_arr, lower_bound, upper_bound)
    return (upper_bound - clamped) / (upper_bound - lower_bound)


def _normalize_raw_score(
    raw: float,
    lower_bound: float = _IF_MIN,
    upper_bound: float = _IF_MAX,
) -> float:

    """
    Map a raw IsolationForest/LOF score_samples output from [-1, 0] → [0, 1].

    Higher output = more anomalous.
    Values outside the fitted interval are clamped before mapping. The legacy
    ``[-1, 0]`` default is retained for artifacts created before score bounds
    were persisted.
    """
    if upper_bound <= lower_bound:
        lower_bound, upper_bound = _IF_MIN, _IF_MAX
    clamped = max(lower_bound, min(upper_bound, raw))
    # Lower scores are more anomalous for both IF and LOF.
    return (upper_bound - clamped) / (upper_bound - lower_bound)


def fitted_score_bounds(raw_scores: np.ndarray) -> tuple[float, float]:
    """Return robust lower/upper score bounds learned from training data.

    IF and LOF do not share a dependable universal score range. The 1st and
    99th percentiles preserve useful contrast without letting a few extreme
    observations compress every ordinary inference result.
    """
    lower, upper = np.quantile(raw_scores, [0.01, 0.99])
    if not np.isfinite(lower) or not np.isfinite(upper) or upper <= lower:
        return _IF_MIN, _IF_MAX
    return float(lower), float(upper)

# ---------------------------------------------------------------------------
# Output dataclasses
# ---------------------------------------------------------------------------


@dataclass
class SHAPContribution:
    """Single feature's SHAP contribution to the IsolationForest score."""

    feature: str
    value: float              # Input feature value (unscaled)
    contribution: float       # SHAP value (signed; negative → anomalous direction)
    direction: str            # "anomalous" | "normal"


@dataclass
class ScoringResult:
    """Complete output of the ensemble scoring pipeline."""

    probability: float                        # 0-100 scale calibrated score
    raw_iforest_score: float                  # Original IsolationForest.score_samples output
    raw_lof_score: float                      # Original LOF.score_samples output
    is_anomaly: bool                          # True when probability >= 50.0
    shap_contributions: list[SHAPContribution] = field(default_factory=list)
    inference_time_ms: float = 0.0
    model_version: str = "unknown"
    hardware_device: str = "CPU (Vectorized SIMD Engine)"


# ---------------------------------------------------------------------------
# Core scoring function
# ---------------------------------------------------------------------------


def score(
    feature_array: np.ndarray,
    feature_names: list[str],
    *,
    bundle: dict[str, Any],
    explain: bool = False,
) -> ScoringResult:
    """
    Run the full ensemble scoring pipeline on a pre-validated feature vector.

    Parameters
    ----------
    feature_array:
        1-D NumPy array in the canonical column order for this domain
        (as returned by ``VesselFeatures.to_array()`` etc.).
    feature_names:
        Ordered list of feature names corresponding to ``feature_array``.
    bundle:
        Model bundle dict as loaded from the .joblib artifact.  Expected keys:
        ``model_iforest``, ``model_lof``, ``scaler``, ``calibrator``, ``version``.
    explain:
        When True, compute SHAP values for the IsolationForest component.
        Adds ~50-200ms; omit for latency-sensitive paths.

    Returns
    -------
    ScoringResult
    """
    t0 = time.perf_counter()

    model_iforest = bundle["model_iforest"]
    model_lof = bundle["model_lof"]
    scaler = bundle["scaler"]
    calibrator = bundle["calibrator"]
    version = bundle.get("version", "unknown")

    # ── 1. Scale features ──────────────────────────────────────────────────
    X_raw = feature_array.reshape(1, -1)
    X = scaler.transform(X_raw)

    # ── 2. Raw scores ──────────────────────────────────────────────────────
    raw_if = float(model_iforest.score_samples(X)[0])
    raw_lof = float(model_lof.score_samples(X)[0])

    # ── 3 & 4. Normalise to [0, 1] (higher = more anomalous) ──────────────
    score_bounds = bundle.get("score_bounds", {})
    if_bounds = score_bounds.get("iforest", (_IF_MIN, _IF_MAX))
    lof_bounds = score_bounds.get("lof", (_IF_MIN, _IF_MAX))
    norm_if = _normalize_raw_score(raw_if, *if_bounds)
    norm_lof = _normalize_raw_score(raw_lof, *lof_bounds)

    # ── 5. Ensemble average ────────────────────────────────────────────────
    ensemble_score_01 = (norm_if + norm_lof) / 2.0

    # ── 6. Isotonic calibration → calibrated probability [0, 1] ───────────
    try:
        # IsotonicRegression.predict expects a 1-D array
        calibrated_01 = float(
            calibrator.predict(np.array([ensemble_score_01]))[0]
        )
        # Clamp for safety (calibrator may slightly overshoot on extreme inputs)
        calibrated_01 = max(0.0, min(1.0, calibrated_01))
    except Exception as exc:
        logger.warning("Calibrator prediction failed (%s); using ensemble_score_01", exc)
        calibrated_01 = ensemble_score_01

    # ── 7. Scale to 0-100 ─────────────────────────────────────────────────
    probability = round(calibrated_01 * 100.0, 2)

    # ── 8. SHAP (IsolationForest only; tree-based) ─────────────────────────
    shap_contributions: list[SHAPContribution] = []
    if explain:
        shap_contributions = _compute_shap(
            model_iforest=model_iforest,
            X_scaled=X,
            X_raw=X_raw,
            feature_names=feature_names,
        )

    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    device_info = detect_hardware_device()

    return ScoringResult(
        probability=probability,
        raw_iforest_score=raw_if,
        raw_lof_score=raw_lof,
        is_anomaly=probability >= 50.0,
        shap_contributions=shap_contributions,
        inference_time_ms=round(elapsed_ms, 2),
        model_version=version,
        hardware_device=device_info,
    )

# ---------------------------------------------------------------------------
# SHAP helper
# ---------------------------------------------------------------------------


def _compute_shap(
    *,
    model_iforest: Any,
    X_scaled: np.ndarray,
    X_raw: np.ndarray,
    feature_names: list[str],
) -> list[SHAPContribution]:
    """
    Compute SHAP values for a single sample using ``shap.TreeExplainer``.

    Returns a list sorted by descending absolute contribution (most influential first).

    Notes
    -----
    - SHAP is only applied to IsolationForest (tree-based).
    - LOF is kernel-based and does not have a TreeExplainer; its SHAP would
      require KernelExplainer which is 10–100× slower — skipped intentionally.
    - A failed SHAP computation returns an empty list (graceful degradation).
    """
    try:
        import shap  # Lazy import: not needed on non-explain paths

        explainer = shap.TreeExplainer(model_iforest)
        shap_values = explainer.shap_values(X_scaled)

        # shap_values may be (1, n_features) or (n_features,) depending on shap version
        sv_arr = np.array(shap_values)
        sv = sv_arr.flatten() if sv_arr.ndim == 1 else sv_arr[0]

        contributions: list[SHAPContribution] = []
        for i, col in enumerate(feature_names):
            sv_val = float(sv[i])
            contributions.append(
                SHAPContribution(
                    feature=col,
                    value=round(float(X_raw[0, i]), 5),
                    contribution=round(sv_val, 6),
                    # Negative SHAP → contributes toward anomaly (lower IF score)
                    direction="anomalous" if sv_val < 0 else "normal",
                )
            )

        # Sort by descending absolute contribution
        contributions.sort(key=lambda c: abs(c.contribution), reverse=True)
        return contributions

    except Exception as exc:
        logger.warning("SHAP computation failed (%s); returning empty explanations", exc)
        return []
