"""
app.py — HormuzWatch ML Inference Service
==========================================

FastAPI application serving the multi-domain ensemble anomaly detection
pipeline (IsolationForest + LocalOutlierFactor + Isotonic calibration)
across the ``vessel`` / ``aviation`` / ``heatmap`` / ``news`` domains.

Endpoints
---------
    POST /api/predict   — multi-domain ensemble prediction
    POST /api/train     — online ensemble training (IF+LOF+calibrator)
    GET  /api/models    — list loaded ensemble model versions / availability
    GET  /health        — service health

Called by the Go backend via ``ML_SERVICE_URL`` (REST) or via gRPC on
``GRPC_PORT``. The legacy single-IF endpoints (/predict, /train) have
been removed — the Go backend uses /api/predict exclusively.
"""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from lib.features import DOMAIN_FEATURE_COLS, parse_features
from lib.scoring import score, ScoringResult
from lib.logger import get_logger

logger = get_logger("hormuzwatch.app")

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="HormuzWatch ML Service",
    description=(
        "Multi-domain ensemble anomaly detection: "
        "IF + LOF + Isotonic calibration across vessel / aviation / heatmap / news."
    ),
    version="2.1.0",
)

_allowed_raw = os.environ.get("ALLOWED_ORIGINS", "*")
_allowed_origins = [o.strip() for o in _allowed_raw.split(",") if o.strip()]
if _allowed_origins == ["*"]:
    _allowed_origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

START_TIME = time.time()

# ── Ensemble model cache (domain → bundle dict) ────────────────────────────
_MODEL_CACHE: dict[str, dict[str, Any]] = {}
_MODELS_DIR = Path(os.environ.get("MODELS_DIR", str(Path(__file__).resolve().parent / "models")))
_INFERENCE_BUDGET_MS = 400.0


def _load_bundle(domain: str) -> dict[str, Any]:
    """Load and cache an ensemble model bundle for the given domain."""
    if domain in _MODEL_CACHE:
        return _MODEL_CACHE[domain]

    artifact_path = _MODELS_DIR / f"{domain}_ensemble.joblib"
    if not artifact_path.exists():
        raise FileNotFoundError(
            f"Model artifact not found: {artifact_path}. "
            f"Run: python api/train.py --domain {domain} --input <data.csv>"
        )

    logger.info("Loading model bundle: %s", artifact_path)
    import joblib

    bundle = joblib.load(artifact_path)

    required_keys = {
        "model_iforest", "model_lof", "scaler", "calibrator",
        "feature_cols", "domain",
    }
    missing = required_keys - bundle.keys()
    if missing:
        raise RuntimeError(
            f"Bundle for domain '{domain}' is missing keys: {missing}. "
            f"Re-run train.py to regenerate."
        )
    if bundle["domain"] != domain or bundle["feature_cols"] != DOMAIN_FEATURE_COLS[domain]:
        raise RuntimeError(
            f"Bundle schema for domain '{domain}' does not match the active feature contract. "
            "Re-run api/train.py with the current service version."
        )

    _MODEL_CACHE[domain] = bundle
    logger.info("Loaded '%s' bundle (version=%s)", domain, bundle.get("version", "?"))
    return bundle


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ApiPredictRequest(BaseModel):
    domain: str
    features: dict = Field(default_factory=dict)
    explain: bool = False
    track_id: Optional[str] = None


class ShapContributionOut(BaseModel):
    feature: str
    value: float
    contribution: float
    direction: str


class ApiPredictResponse(BaseModel):
    domain: str
    track_id: Optional[str] = None
    probability: float
    anomaly_score: float  # Alias for Go backend compatibility
    is_anomaly: bool
    raw_iforest_score: float
    raw_lof_score: float
    inference_time_ms: float
    model_version: str
    shap_contributions: List[ShapContributionOut] = Field(default_factory=list)


class ApiTrainRequest(BaseModel):
    domain: str = "vessel"
    data: List[dict] = Field(default_factory=list)
    labels: Optional[List[int]] = None  # 1 = anomalous, 0 = normal
    contamination: float = Field(default=0.05, ge=0.01, le=0.5)


class ApiTrainResponse(BaseModel):
    status: str
    domain: str
    model_version: str
    n_samples: int
    contamination: float
    metrics: dict = Field(default_factory=dict)
    message: str = ""


# ---------------------------------------------------------------------------
# Ensemble endpoints
# ---------------------------------------------------------------------------

@app.post("/api/predict", response_model=ApiPredictResponse)
async def api_predict(req: ApiPredictRequest):
    if not req.domain:
        raise HTTPException(422, "'domain' field is required.")
    if not isinstance(req.features, dict):
        raise HTTPException(422, "'features' must be a JSON object.")

    try:
        features_model = parse_features(req.domain, req.features)
    except ValueError as exc:
        raise HTTPException(422, f"Validation error: {exc}")
    except Exception as exc:
        raise HTTPException(422, f"Feature validation failed: {exc}")

    try:
        bundle = _load_bundle(req.domain)
    except FileNotFoundError as exc:
        logger.error("Model not found: %s", exc)
        raise HTTPException(500, f"Model not available: {exc}")
    except RuntimeError as exc:
        logger.error("Malformed bundle: %s", exc)
        raise HTTPException(500, f"Model bundle error: {exc}")

    try:
        feature_array = features_model.to_array()
        feature_names = DOMAIN_FEATURE_COLS[req.domain]
        result: ScoringResult = score(
            feature_array=feature_array,
            feature_names=feature_names,
            bundle=bundle,
            explain=req.explain,
        )
    except Exception as exc:
        logger.exception("Inference error")
        raise HTTPException(500, f"Inference failed: {exc}")

    total_ms = result.inference_time_ms
    if total_ms > _INFERENCE_BUDGET_MS:
        logger.warning(
            "Inference budget exceeded: %.1fms > %.0fms (domain=%s, explain=%s)",
            total_ms, _INFERENCE_BUDGET_MS, req.domain, req.explain,
        )

    return ApiPredictResponse(
        domain=req.domain,
        track_id=req.track_id,
        probability=result.probability,
        anomaly_score=result.probability,
        is_anomaly=result.is_anomaly,
        raw_iforest_score=result.raw_iforest_score,
        raw_lof_score=result.raw_lof_score,
        inference_time_ms=result.inference_time_ms,
        model_version=result.model_version,
        shap_contributions=[
            ShapContributionOut(
                feature=c.feature,
                value=c.value,
                contribution=c.contribution,
                direction=c.direction,
            )
            for c in result.shap_contributions
        ],
    )


@app.post("/api/train", response_model=ApiTrainResponse)
async def api_train(req: ApiTrainRequest):
    """
    Online ensemble training. Trains IsolationForest + LocalOutlierFactor +
    Isotonic calibration for the requested domain and saves the artifact.
    """
    from lib.training import train_ensemble

    if len(req.data) < 50:
        raise HTTPException(400, f"Need at least 50 samples to train (got {len(req.data)})")

    if req.domain not in DOMAIN_FEATURE_COLS:
        raise HTTPException(400, f"Unknown domain '{req.domain}'. Valid: {sorted(DOMAIN_FEATURE_COLS)}")

    try:
        version, metrics = train_ensemble(
            domain=req.domain,
            data=req.data,
            labels=req.labels,
            contamination=req.contamination,
            models_dir=str(_MODELS_DIR),
        )
    except Exception as exc:
        logger.exception("Training failed for domain=%s", req.domain)
        raise HTTPException(500, f"Training failed: {exc}")

    # Clear cache so next predict loads the new model
    _MODEL_CACHE.pop(req.domain, None)

    return ApiTrainResponse(
        status="trained",
        domain=req.domain,
        model_version=version,
        n_samples=len(req.data),
        contamination=req.contamination,
        metrics=metrics,
        message=f"Model saved to {req.domain}_ensemble.joblib",
    )


@app.get("/api/models")
async def api_models():
    """Report which ensemble domains have artifacts available on disk."""
    available = {}
    for domain in DOMAIN_FEATURE_COLS:
        artifact = _MODELS_DIR / f"{domain}_ensemble.joblib"
        available[domain] = artifact.exists()
    return {
        "models_dir": str(_MODELS_DIR),
        "domains": available,
        "cached_domains": list(_MODEL_CACHE.keys()),
    }


@app.get("/health")
async def health():
    import time as _time
    models_loaded = sum(
        1 for domain in DOMAIN_FEATURE_COLS
        if (_MODELS_DIR / f"{domain}_ensemble.joblib").exists()
    )
    return {
        "status": "healthy",
        "version": os.getenv("APP_VERSION", "dev"),
        "uptime_seconds": round(_time.time() - START_TIME, 1),
        "models_loaded": models_loaded,
        "models_total": len(DOMAIN_FEATURE_COLS),
        "ensemble_models": {
            domain: (_MODELS_DIR / f"{domain}_ensemble.joblib").exists()
            for domain in DOMAIN_FEATURE_COLS
        },
        "grpc_port": int(os.getenv("GRPC_PORT", "8091")),
        "app_port": int(os.getenv("ML_PORT", "8090")),
    }


# ── Dataset Analysis Router (admin portal charts) ──────────────────────────
try:
    from analysis import create_router as create_analysis_router
    app.include_router(create_analysis_router())
except ImportError:
    pass  # analysis.py is optional (requires matplotlib)
