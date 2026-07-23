"""
app.py — Unified HormuzWatch ML Service
========================================

Single FastAPI application that merges the former ``ml-service`` (Isolation
Forest + SHAP, 8-feature vessel model) and ``ml-inference`` (Isolation
Forest + LocalOutlierFactor ensemble with Isotonic calibration across the
``vessel`` / ``aviation`` / ``heatmap`` domains).

Exposed endpoints
-----------------
Legacy (ml-service compatibility — used by some clients / tests):
    POST /predict     — single 8-feature vessel prediction (IsolationForest + SHAP)
    POST /train       — (re)train the legacy IsolationForest model
    GET  /health      — service health

Ensemble (ml-inference compatibility — called by the Go backend via
``ML_SERVICE_URL``):
    POST /api/predict — multi-domain ensemble prediction (vessel/aviation/heatmap)
    POST /api/train   — thin wrapper hinting at offline training (documented)
    GET  /api/models  — list loaded ensemble model versions / availability
    GET  /health      — same health endpoint (registered twice for convenience)
"""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any, List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Legacy ml-service imports
# ---------------------------------------------------------------------------
from model import AnomalyModel
from schemas import (
    FeatureExplanation,
    Explanation,
    FeatureInput,
    PredictRequest,
    PredictResponse,
    TrainRequest,
    TrainResponse,
)

# ---------------------------------------------------------------------------
# Ensemble (ml-inference) imports
# ---------------------------------------------------------------------------
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
        "Unified anomaly detection service: legacy IsolationForest + SHAP "
        "(/predict, /train) and the multi-domain ensemble "
        "(/api/predict, /api/train)."
    ),
    version="2.0.0",
)

# ── CORS ───────────────────────────────────────────────────────────────
# Comma-separated allow-list via ALLOWED_ORIGINS. Defaults to "*" so the
# service is reachable from any origin when exposed through an ephemeral
# Colab/ngrok tunnel. In production, set this to your frontend origin(s).
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

# ── Legacy model (8-feature vessel IsolationForest + SHAP) ──────────────────
legacy_model = AnomalyModel()

# ── Ensemble model cache (domain → bundle dict) ────────────────────────────
_MODEL_CACHE: dict[str, dict[str, Any]] = {}
_MODELS_DIR = Path(os.environ.get("MODELS_DIR", str(Path(__file__).resolve().parent / "models")))
_INFERENCE_BUDGET_MS = 400.0


def _load_bundle(domain: str) -> dict[str, Any]:
    """
    Load and cache an ensemble model bundle for the given domain.

    Raises
    ------
    FileNotFoundError
        If the .joblib artifact does not exist under the models directory.
    RuntimeError
        If the bundle is malformed (missing required keys).
    """
    if domain in _MODEL_CACHE:
        return _MODEL_CACHE[domain]

    artifact_path = _MODELS_DIR / f"{domain}_ensemble.joblib"
    if not artifact_path.exists():
        raise FileNotFoundError(
            f"Model artifact not found: {artifact_path}. "
            f"Run: python api/train.py --domain {domain} --input <data.csv>"
        )

    logger.info("Loading model bundle: %s", artifact_path)
    import joblib  # local import keeps cold-start light when unused

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
# Legacy endpoints: /predict, /train, /health
# ---------------------------------------------------------------------------


@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    start = time.perf_counter()
    features = req.features.model_dump()
    score_val, is_anomaly, confidence, explanation = legacy_model.predict(
        features, explain=req.explain
    )
    elapsed_ms = (time.perf_counter() - start) * 1000.0

    return PredictResponse(
        track_id=req.track_id,
        anomaly_score=score_val,
        is_anomaly=is_anomaly,
        confidence=confidence,
        model_version=legacy_model.version,
        inference_time_ms=round(elapsed_ms, 2),
        explanation=explanation,
    )


@app.post("/train", response_model=TrainResponse)
async def train(req: TrainRequest):
    if len(req.data) < 50:
        raise HTTPException(400, "Need at least 50 samples to train")
    version = legacy_model.train(req.data, req.contamination)
    return TrainResponse(
        status="trained",
        model_version=version,
        n_samples=len(req.data),
        contamination=req.contamination,
    )


# ---------------------------------------------------------------------------
# Ensemble endpoints: /api/predict, /api/train, /api/models, /health
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
    # Alias retained for the Go backend's MLClient, which reads `anomaly_score`.
    anomaly_score: float
    is_anomaly: bool
    raw_iforest_score: float
    raw_lof_score: float
    inference_time_ms: float
    model_version: str
    shap_contributions: List[ShapContributionOut] = Field(default_factory=list)


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
    except Exception as exc:  # pydantic ValidationError
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
            total_ms,
            _INFERENCE_BUDGET_MS,
            req.domain,
            req.explain,
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


@app.post("/api/train")
async def api_train(request: Request):
    """
    Training is performed offline via ``python api/train.py``. This endpoint
    documents the expected request shape and returns guidance rather than
    blocking on a long-running fit inside the request path.
    """
    try:
        body = await request.json()
    except Exception:
        body = {}
    domain = body.get("domain", "vessel")
    return JSONResponse(
        status_code=202,
        content={
            "status": "accepted",
            "domain": domain,
            "message": (
                "Training is run offline. Execute: "
                f"python api/train.py --domain {domain} --input <features.csv> "
                "[--labels <labels.csv>]"
            ),
        },
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
        "legacy_model_loaded": legacy_model.model is not None,
        "legacy_model_version": legacy_model.version,
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
        "legacy_model_loaded": legacy_model.model is not None,
        "legacy_model_version": legacy_model.version,
        "models_loaded": models_loaded,
        "models_total": len(DOMAIN_FEATURE_COLS),
        "ensemble_models": {
            domain: (_MODELS_DIR / f"{domain}_ensemble.joblib").exists()
            for domain in DOMAIN_FEATURE_COLS
        },
        "grpc_port": int(os.getenv("GRPC_PORT", "8091")),
        "app_port": int(os.getenv("ML_PORT", "8090")),
    }
