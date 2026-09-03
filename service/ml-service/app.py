"""
app.py — HormuzWatch ML Inference Service
==========================================

FastAPI application serving the multi-domain ensemble anomaly detection
pipeline (IsolationForest + LocalOutlierFactor + Isotonic calibration)
across the ``vessel`` / ``aviation`` / ``heatmap`` / ``news`` domains.

Endpoints
---------
    POST /api/predict          — multi-domain ensemble prediction
    POST /api/train            — online ensemble training (IF+LOF+calibrator)
    GET  /api/models           — list loaded ensemble model versions / availability
    GET  /drift/status         — statistical drift evaluation across all domains
    GET  /drift/evaluate/{dom} — statistical drift evaluation for a single domain
    GET  /health               — service health

Called by the Go backend via ``ML_SERVICE_URL`` (REST) or via gRPC on
``GRPC_PORT``.
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from pathlib import Path
from typing import Any, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from lib.features import DOMAIN_FEATURE_COLS, parse_features
from lib.scoring import score, ScoringResult
from lib.drift import global_drift_monitor, DomainDriftReport
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
    """Load and cache an ensemble model bundle for the given domain with integrity check."""
    if domain in _MODEL_CACHE:
        return _MODEL_CACHE[domain]

    artifact_path = _MODELS_DIR / f"{domain}_ensemble.joblib"
    if not artifact_path.exists():
        raise FileNotFoundError(
            f"Model artifact not found: {artifact_path}. "
            f"Run: python api/train.py --domain {domain} --input <data.csv>"
        )

    # Verify SHA-256 integrity against manifest.json if present
    manifest_path = _MODELS_DIR / "manifest.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            model_key = f"{domain}_ensemble"
            if model_key in manifest.get("models", {}):
                expected_sha = manifest["models"][model_key].get("sha256")
                if expected_sha:
                    hasher = hashlib.sha256()
                    with open(artifact_path, "rb") as bf:
                        while chunk := bf.read(65536):
                            hasher.update(chunk)
                    actual_sha = hasher.hexdigest()
                    if actual_sha == expected_sha:
                        logger.info("Verified SHA-256 integrity for '%s' ensemble (%s)", domain, actual_sha[:12])
                    else:
                        logger.warning("SHA-256 mismatch for '%s' (expected %s, got %s)", domain, expected_sha, actual_sha)
        except Exception as err:
            logger.warning("Manifest verification notice: %s", err)

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
    anomaly_score: float
    is_anomaly: bool
    raw_iforest_score: float
    raw_lof_score: float
    inference_time_ms: float
    model_version: str
    shap_contributions: List[ShapContributionOut] = Field(default_factory=list)


class ApiTrainRequest(BaseModel):
    domain: str
    data: List[dict]
    labels: Optional[List[int]] = None
    contamination: float = 0.05


class ApiTrainResponse(BaseModel):
    status: str
    domain: str
    model_version: str
    n_samples: int
    contamination: float
    metrics: dict
    message: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/predict", response_model=ApiPredictResponse)
async def api_predict(req: ApiPredictRequest):
    """
    Multi-domain ensemble inference endpoint. Runs IsolationForest +
    LocalOutlierFactor + Isotonic calibration, with optional SHAP explanations.
    """
    t0 = time.perf_counter()

    if req.domain not in DOMAIN_FEATURE_COLS:
        raise HTTPException(400, f"Unknown domain '{req.domain}'. Valid: {sorted(DOMAIN_FEATURE_COLS)}")

    try:
        bundle = _load_bundle(req.domain)
    except FileNotFoundError as exc:
        raise HTTPException(503, str(exc))
    except Exception as exc:
        logger.exception("Failed to load bundle for domain=%s", req.domain)
        raise HTTPException(500, f"Model load error: {exc}")

    try:
        x_arr = parse_features(req.domain, req.features)
    except (ValueError, KeyError) as exc:
        raise HTTPException(422, f"Feature validation failed for domain '{req.domain}': {exc}")

    # Track feature observations for statistical drift analysis
    global_drift_monitor.record_observation(req.domain, x_arr)

    try:
        result: ScoringResult = score(
            x=x_arr,
            bundle=bundle,
            explain=req.explain,
            track_id=req.track_id,
        )
    except Exception as exc:
        logger.exception("Scoring failed for domain=%s, track_id=%s", req.domain, req.track_id)
        raise HTTPException(500, f"Inference error: {exc}")

    total_ms = (time.perf_counter() - t0) * 1000.0
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


@app.post("/models/reload")
@app.post("/api/models/reload")
async def models_reload(domain: Optional[str] = None):
    """
    Evict cached model bundles across both FastAPI and gRPC inference engines,
    forcing zero-downtime atomic reload of updated champion artifacts on next prediction.
    """
    if domain:
        _MODEL_CACHE.pop(domain, None)
    else:
        _MODEL_CACHE.clear()

    try:
        import grpc_server
        grpc_server.reload_bundle(domain)
    except Exception as exc:
        logger.warning("Could not signal grpc_server directly: %s", exc)

    return {
        "status": "reloaded",
        "domain": domain or "all",
        "timestamp": time.time(),
    }


@app.get("/models/champion")
async def models_champion(domain: Optional[str] = "vessel"):
    """
    Inspect the currently active Champion model artifact, metadata, and metrics.
    """
    manifest_path = _MODELS_DIR / "manifest.json"
    manifest = {}
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
        except Exception:
            manifest = {}

    artifact_path = _MODELS_DIR / f"{domain}_ensemble.joblib"
    if not artifact_path.exists():
        raise HTTPException(404, f"No champion model exists for domain '{domain}'")

    import joblib
    try:
        bundle = joblib.load(artifact_path)
    except Exception as exc:
        raise HTTPException(500, f"Champion model artifact corrupt: {exc}")

    return {
        "domain": domain,
        "version": bundle.get("version", "unknown"),
        "metrics": bundle.get("metrics", {}),
        "score_bounds": bundle.get("score_bounds", {}),
        "feature_cols": bundle.get("feature_cols", []),
        "manifest_entry": manifest.get("models", {}).get(f"{domain}_ensemble", {}),
    }


@app.get("/drift/status")
async def drift_status():
    """Evaluate and report feature drift status across all active domains."""
    reports = {}
    for domain, cols in DOMAIN_FEATURE_COLS.items():
        reports[domain] = global_drift_monitor.evaluate_domain(domain, cols)
    return {
        "status": "ok",
        "domains": reports,
    }


@app.get("/drift/evaluate/{domain}")
async def drift_evaluate(domain: str):
    """Evaluate statistical drift for a specific domain."""
    if domain not in DOMAIN_FEATURE_COLS:
        raise HTTPException(400, f"Unknown domain '{domain}'")
    return global_drift_monitor.evaluate_domain(domain, DOMAIN_FEATURE_COLS[domain])


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
    pass
