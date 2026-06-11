"""
api/predict.py
--------------
Vercel Python serverless function — HormuzWatch ML inference endpoint.

URL: POST /api/predict

This module is the single entry point Vercel invokes. It:
  1. Parses and validates the JSON request body.
  2. Loads the correct domain model bundle from /models/ (module-level cache
     so warm invocations bypass disk reads).
  3. Runs the ensemble scoring pipeline (IsolationForest + LOF + IsotonicRegression).
  4. Optionally computes SHAP explanations.
  5. Returns a structured JSON response.

Vercel handler contract
-----------------------
Vercel's Python runtime calls ``handler(request, context)`` for each
invocation. ``request`` is a ``VercelRequest``-like object with:
  - request.method  : str
  - request.body    : bytes | None
  - request.headers : dict[str, str]

We return a ``VercelResponse`` (or equivalent dict) with ``status`` and ``body``.

Because Vercel does not supply a full WSGI/ASGI stack for Python functions,
we avoid FastAPI/uvicorn here and handle JSON manually.  This keeps the
cold-start footprint small — no ASGI framework import overhead.

Environment variables
---------------------
  MODELS_DIR : Override the default /models directory path (useful in tests).

Performance budget
------------------
Total inference (scaler + IF + LOF + calibrator) typically completes in
30-80ms on warm invocations.  SHAP adds 50-200ms.  Total warm budget: 400ms.
A WARNING is logged if this budget is exceeded.  Cold starts (sklearn import)
take 1-4s — the vercel.json sets maxDuration=15s to accommodate this.
"""

from __future__ import annotations

import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Any

# ── Path setup ────────────────────────────────────────────────────────────────
# When Vercel invokes api/predict.py the working directory is the project root.
# We add the project root to sys.path so that ``lib.*`` imports resolve.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

# ── Lazy heavy imports (kept outside the handler to enable module-level caching)
import joblib  # noqa: E402  (after sys.path fix)
import numpy as np  # noqa: E402

from lib.features import DOMAIN_FEATURE_COLS, parse_features  # noqa: E402
from lib.scoring import ScoringResult, score  # noqa: E402

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("hormuzwatch.predict")

# ---------------------------------------------------------------------------
# Model cache
# ---------------------------------------------------------------------------

# Module-level dict so warm Vercel invocations skip disk reads.
# Key: domain string ("vessel", "aviation", "heatmap")
# Value: deserialized bundle dict from .joblib
_MODEL_CACHE: dict[str, dict[str, Any]] = {}

_MODELS_DIR = Path(os.environ.get("MODELS_DIR", str(_PROJECT_ROOT / "models")))
_INFERENCE_BUDGET_MS = 400.0


def _load_bundle(domain: str) -> dict[str, Any]:
    """
    Load and cache a model bundle for the given domain.

    Raises
    ------
    FileNotFoundError
        If the .joblib artifact does not exist under _MODELS_DIR.
    RuntimeError
        If the bundle is malformed (missing required keys).
    """
    if domain in _MODEL_CACHE:
        return _MODEL_CACHE[domain]

    artifact_path = _MODELS_DIR / f"{domain}_ensemble.joblib"
    if not artifact_path.exists():
        raise FileNotFoundError(
            f"Model artifact not found: {artifact_path}. "
            f"Run api/train.py to generate it."
        )

    logger.info("Loading model bundle: %s", artifact_path)
    bundle = joblib.load(artifact_path)

    required_keys = {"model_iforest", "model_lof", "scaler", "calibrator"}
    missing = required_keys - bundle.keys()
    if missing:
        raise RuntimeError(
            f"Bundle for domain '{domain}' is missing keys: {missing}. "
            f"Re-run train.py to regenerate."
        )

    _MODEL_CACHE[domain] = bundle
    logger.info("Loaded '%s' bundle (version=%s)", domain, bundle.get("version", "?"))
    return bundle


# ---------------------------------------------------------------------------
# Response helpers
# ---------------------------------------------------------------------------


def _json_response(status: int, body: dict) -> dict:
    """Build a Vercel-compatible response dict."""
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def _error(status: int, message: str, detail: str | None = None) -> dict:
    payload: dict[str, Any] = {"error": message}
    if detail:
        payload["detail"] = detail
    return _json_response(status, payload)


# ---------------------------------------------------------------------------
# Vercel handler
# ---------------------------------------------------------------------------


def handler(request: Any, context: Any = None) -> dict:
    """
    Vercel serverless function entry point.

    Expected request body (JSON):
    ::

        {
            "domain":  "vessel" | "aviation" | "heatmap",
            "features": { ... domain-specific key-value pairs ... },
            "explain":  true | false          (optional, default false)
        }

    Successful response body (JSON):
    ::

        {
            "domain":             "vessel",
            "probability":        72.4,          // 0-100 calibrated score
            "is_anomaly":         true,           // true if probability >= 50
            "raw_iforest_score":  -0.18,
            "raw_lof_score":      -0.22,
            "inference_time_ms":  63.4,
            "model_version":      "2026-06-11T...",
            "shap_contributions": [              // only when explain=true
                {
                    "feature":      "course_delta",
                    "value":        52.1,
                    "contribution": -0.034,
                    "direction":    "anomalous"
                },
                ...
            ]
        }
    """
    t_total = time.perf_counter()

    # ── Method guard ──────────────────────────────────────────────────────
    if getattr(request, "method", "POST") != "POST":
        return _error(405, "Method Not Allowed", "Only POST is accepted.")

    # ── Parse body ────────────────────────────────────────────────────────
    try:
        raw_body = request.body
        if isinstance(raw_body, bytes):
            raw_body = raw_body.decode("utf-8")
        payload = json.loads(raw_body or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        return _error(400, "Invalid JSON body", str(exc))

    domain: str = payload.get("domain", "")
    raw_features: dict = payload.get("features", {})
    explain: bool = bool(payload.get("explain", False))

    if not domain:
        return _error(422, "Validation error", "'domain' field is required.")
    if not isinstance(raw_features, dict):
        return _error(422, "Validation error", "'features' must be a JSON object.")

    # ── Validate features against domain schema ───────────────────────────
    try:
        features_model = parse_features(domain, raw_features)
    except ValueError as exc:
        # Unknown domain
        return _error(422, "Validation error", str(exc))
    except Exception as exc:
        # Pydantic ValidationError or unexpected
        return _error(422, "Feature validation failed", str(exc))

    # ── Load model bundle (cached after first invocation) ─────────────────
    try:
        bundle = _load_bundle(domain)
    except FileNotFoundError as exc:
        logger.error("Model not found: %s", exc)
        return _error(500, "Model not available", str(exc))
    except RuntimeError as exc:
        logger.error("Malformed bundle: %s", exc)
        return _error(500, "Model bundle error", str(exc))
    except Exception as exc:
        logger.exception("Unexpected error loading model bundle")
        return _error(500, "Internal error loading model", str(exc))

    # ── Inference ─────────────────────────────────────────────────────────
    try:
        feature_array = features_model.to_array()
        feature_names = DOMAIN_FEATURE_COLS[domain]

        result: ScoringResult = score(
            feature_array=feature_array,
            feature_names=feature_names,
            bundle=bundle,
            explain=explain,
        )
    except Exception as exc:
        logger.exception("Inference error")
        return _error(500, "Inference failed", str(exc))

    # ── Budget check ──────────────────────────────────────────────────────
    total_ms = (time.perf_counter() - t_total) * 1000.0
    if total_ms > _INFERENCE_BUDGET_MS:
        logger.warning(
            "Inference budget exceeded: %.1fms > %.0fms (domain=%s, explain=%s)",
            total_ms,
            _INFERENCE_BUDGET_MS,
            domain,
            explain,
        )

    # ── Build response ────────────────────────────────────────────────────
    response_body: dict[str, Any] = {
        "domain": domain,
        "probability": result.probability,
        "is_anomaly": result.is_anomaly,
        "raw_iforest_score": round(result.raw_iforest_score, 6),
        "raw_lof_score": round(result.raw_lof_score, 6),
        "inference_time_ms": result.inference_time_ms,
        "model_version": result.model_version,
    }

    if explain:
        response_body["shap_contributions"] = [
            {
                "feature": c.feature,
                "value": c.value,
                "contribution": c.contribution,
                "direction": c.direction,
            }
            for c in result.shap_contributions
        ]

    return _json_response(200, response_body)
