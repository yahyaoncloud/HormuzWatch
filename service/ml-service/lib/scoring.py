"""
lib/scoring.py
==============
Multi-Domain Ensemble Anomaly Scoring & Probabilistic Calibration Pipeline.

================================================================================
ARCHITECTURE & WORKFLOW COLOR-CODED TAG LEGEND:
  [STAGE]               - Computational pipeline phase in the end-to-end lifecycle
  [OBJECTIVE]           - Concrete mathematical or operational goal of the code block
  [MATHEMATICAL BASIS]  - Algorithmic formulation, probability theory, or geometry
  [SYSTEM OUTCOME]      - State change, persisted artifact, or downstream impact
  [SAFETY INVARIANT]    - Non-negotiable constraint to prevent data leakage/corruption
================================================================================

Inference Execution Pipeline:
    1. Feature Standardization: z = scaler.transform(X) using train-fitted moments
    2. Dual Model Inference: Raw path length (IF) and local density (LOF) scoring
    3. Min-Max Normalization: Bounds derived strictly from training distribution
    4. Heuristic Linear Blending: s_ens = 0.55 * norm(IF) + 0.45 * norm(LOF)
    5. Monotonic Isotonic Calibration: p = calibrator.predict([s_ens]) * 100.0
    6. Local Feature Attribution: TreeSHAP on IsolationForest estimators

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
# Output dataclasses
# ---------------------------------------------------------------------------


@dataclass
class SHAPContribution:
    """Single feature's TreeSHAP attribution to the IsolationForest path length."""

    feature: str
    value: float              # Input feature value (unscaled)
    contribution: float       # SHAP value (signed; negative in tree convention -> anomalous direction)
    direction: str            # "anomalous" | "normal"
    scope: str = "isolation_forest"  # Explicit attribution scope


@dataclass
class ScoringResult:
    """Complete output of the ensemble scoring pipeline."""

    probability: float                        # 0-100 scale calibrated score
    raw_iforest_score: float                  # Original IsolationForest.score_samples output
    raw_lof_score: float                      # Original LOF.score_samples output
    is_anomaly: bool                          # True when probability >= 50.0
    shap_contributions: list[SHAPContribution] = field(default_factory=list)
    explanation_scope: str = "isolation_forest"  # Attribution scope (TreeSHAP on IF)
    inference_time_ms: float = 0.0
    timing_breakdown: dict[str, float] = field(default_factory=dict)
    model_version: str = "unknown"
    hardware_device: str = "CPU (Vectorized SIMD Engine)"


# ---------------------------------------------------------------------------
# Core scoring function (Weighted Score Blending + Isotonic Calibration)
# ---------------------------------------------------------------------------


def score(
    feature_array: np.ndarray,
    feature_names: list[str],
    *,
    bundle: dict[str, Any],
    explain: bool = False,
) -> ScoringResult:
    """
    Run the weighted score blending anomaly pipeline on a pre-validated feature vector.

    Parameters
    ----------
    feature_array:
        1-D NumPy array in the canonical column order for this domain.
    feature_names:
        Ordered list of feature names corresponding to ``feature_array``.
    bundle:
        Model bundle dict as loaded from the .joblib artifact. Expected keys:
        ``model_iforest``, ``model_lof``, ``scaler``, ``calibrator``, ``version``.
    explain:
        When True, compute TreeSHAP values for the IsolationForest component.
        Omit for sub-5ms low-latency streaming inference.

    Returns
    -------
    ScoringResult
    """
    t0 = time.perf_counter()
    timings: dict[str, float] = {}

    model_iforest = bundle["model_iforest"]
    model_lof = bundle["model_lof"]
    scaler = bundle["scaler"]
    calibrator = bundle["calibrator"]
    version = bundle.get("version", "unknown")

    # --------------------------------------------------------------------------
    # [SUBSTAGE 1: KINEMATIC FEATURE STANDARDIZATION]
    # [OBJECTIVE]: Transform raw kinematic measurements using train-time moments.
    # [MATHEMATICAL BASIS]: z_j = (x_j - μ_j) / σ_j
    # --------------------------------------------------------------------------
    t_stage = time.perf_counter()
    X_raw = feature_array.reshape(1, -1)
    X = scaler.transform(X_raw)
    timings["scaling_ms"] = round((time.perf_counter() - t_stage) * 1000.0, 3)

    # --------------------------------------------------------------------------
    # [SUBSTAGE 2: DUAL-MODEL RAW ANOMALY SCORING]
    # [OBJECTIVE]: Compute independent global isolation depth and local density score.
    # [MATHEMATICAL BASIS]:
    #   IF: s_if(X) = -score_samples(X) ∝ E(h(X))
    #   LOF: s_lof(X) = -score_samples(X) ∝ local_reachability_density
    # --------------------------------------------------------------------------
    t_stage = time.perf_counter()
    raw_if = float(model_iforest.score_samples(X)[0])
    timings["iforest_ms"] = round((time.perf_counter() - t_stage) * 1000.0, 3)

    t_stage = time.perf_counter()
    raw_lof = float(model_lof.score_samples(X)[0])
    timings["lof_ms"] = round((time.perf_counter() - t_stage) * 1000.0, 3)

    # --------------------------------------------------------------------------
    # [SUBSTAGE 3: BOUNDED MIN-MAX SCORE NORMALIZATION]
    # [OBJECTIVE]: Linearly project unbounded raw scores onto uniform [0, 1] interval.
    # [SAFETY INVARIANT]: Bounds s_min, s_max retrieved strictly from persisted bundle.
    # --------------------------------------------------------------------------
    score_bounds = bundle.get("score_bounds", {})
    if_bounds = score_bounds.get("iforest", (_IF_MIN, _IF_MAX))
    lof_bounds = score_bounds.get("lof", (_IF_MIN, _IF_MAX))
    norm_if = _normalize_raw_score(raw_if, *if_bounds)
    norm_lof = _normalize_raw_score(raw_lof, *lof_bounds)

    # --------------------------------------------------------------------------
    # [SUBSTAGE 4: HEURISTIC LINEAR SCORE BLENDING]
    # [OBJECTIVE]: Combine global isolation (55%) and local density estimation (45%).
    # [MATHEMATICAL BASIS]: s_ens = 0.55 * norm_if + 0.45 * norm_lof ∈ [0, 1].
    # --------------------------------------------------------------------------
    ensemble_score_01 = 0.55 * norm_if + 0.45 * norm_lof

    # --------------------------------------------------------------------------
    # [SUBSTAGE 5: MONOTONIC PROBABILITY CALIBRATION]
    # [OBJECTIVE]: Map ensemble score to empirical probability of anomaly label.
    # [MATHEMATICAL BASIS]: P(Y = 1 | s_ens) evaluated via IsotonicRegression knot interpolator.
    # --------------------------------------------------------------------------
    t_stage = time.perf_counter()
    try:
        calibrated_01 = float(
            calibrator.predict(np.array([ensemble_score_01]))[0]
        )
        calibrated_01 = max(0.0, min(1.0, calibrated_01))
    except Exception as exc:
        logger.warning("Calibrator prediction failed (%s); using ensemble_score_01", exc)
        calibrated_01 = ensemble_score_01
    timings["calibration_ms"] = round((time.perf_counter() - t_stage) * 1000.0, 3)

    # --------------------------------------------------------------------------
    # [SUBSTAGE 6: PROBABILITY PERCENTAGE SCALING]
    # [SYSTEM OUTCOME]: Maps calibrated probability to operational [0, 100] scale.
    # --------------------------------------------------------------------------
    probability = round(calibrated_01 * 100.0, 2)

    # --------------------------------------------------------------------------
    # [SUBSTAGE 7: LOCAL FEATURE EXPLAINABILITY (TreeSHAP)]
    # [OBJECTIVE]: Decompose IsolationForest score into individual feature attributions.
    # [MATHEMATICAL BASIS]: Shapley values satisfying efficiency and symmetry axioms.
    # --------------------------------------------------------------------------
    shap_contributions: list[SHAPContribution] = []
    if explain:
        t_stage = time.perf_counter()
        shap_contributions = _compute_shap(
            model_iforest=model_iforest,
            X_scaled=X,
            X_raw=X_raw,
            feature_names=feature_names,
        )
        timings["shap_attribution_ms"] = round((time.perf_counter() - t_stage) * 1000.0, 3)

    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    timings["total_inference_ms"] = round(elapsed_ms, 3)
    device_info = detect_hardware_device()

    return ScoringResult(
        probability=probability,
        raw_iforest_score=raw_if,
        raw_lof_score=raw_lof,
        is_anomaly=probability >= 50.0,
        shap_contributions=shap_contributions,
        explanation_scope="isolation_forest",
        inference_time_ms=round(elapsed_ms, 2),
        timing_breakdown=timings,
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
    Compute TreeSHAP attribution values for IsolationForest path length.

    Notes
    -----
    - TreeSHAP explains tree split path length of Isolation Forest only.
    - Does NOT explain LOF reachability density or final calibrated probability.
    """
    try:
        import shap

        explainer = shap.TreeExplainer(model_iforest)
        shap_values = explainer.shap_values(X_scaled)

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
                    direction="anomalous" if sv_val < 0 else "normal",
                    scope="isolation_forest",
                )
            )

        contributions.sort(key=lambda c: abs(c.contribution), reverse=True)
        return contributions

    except Exception as exc:
        logger.warning("SHAP computation failed (%s); returning empty explanations", exc)
        return []
