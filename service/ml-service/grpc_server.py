"""
grpc_server.py — Production gRPC transport for the HormuzWatch ML service.

Serves the same MLInferenceService contract the Go backend calls over gRPC
(replacing the legacy REST /api/predict and /api/train). Reuses the existing
ensemble: ``_load_bundle`` (on-demand joblib load) and ``score`` (IF + LOF +
isotonic calibration + SHAP).

Run alongside (or instead of) the FastAPI app:
    python grpc_server.py --port 8090 --tls-cert server.crt --tls-key server.key

Env overrides (production, aburcloud.com):
    GRPC_PORT            (default 8090)
    GRPC_TLS_CERT        PEM server certificate (enables TLS)
    GRPC_TLS_KEY         PEM server private key
    GRPC_MAX_WORKERS     (default 16)

The Go client verifies the server certificate against ML_SERVICE_CA_CERT (or
system roots) and may present a client cert for mTLS via ML_SERVICE_TLS_CERT /
ML_SERVICE_TLS_KEY.
"""

from __future__ import annotations

import argparse
import os
import time
from concurrent import futures
from typing import Any, Dict

import grpc

import ml_service_pb2
import ml_service_pb2_grpc

from lib.features import DOMAIN_FEATURE_COLS, parse_features
from lib.scoring import score

from lib.logger import get_logger

logger = get_logger("hormuzwatch.grpc")

_MODELS_DIR = os.environ.get(
    "MODELS_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
)

# In-memory cache of loaded ensemble bundles, keyed by domain. Without this the
# handler re-reads the joblib from disk on EVERY Predict call, which is far
# slower than the Go client's per-call deadline and forces the local fallback.
_BUNDLE_CACHE: Dict[str, Dict[str, Any]] = {}
_BUNDLE_MTIMES: Dict[str, float] = {}


def reload_bundle(domain: str | None = None) -> None:
    """Evict cached model bundles so the next inference loads the new champion artifact."""
    if domain:
        _BUNDLE_CACHE.pop(domain, None)
        _BUNDLE_MTIMES.pop(domain, None)
        logger.info("Evicted gRPC model cache for domain '%s'", domain)
    else:
        _BUNDLE_CACHE.clear()
        _BUNDLE_MTIMES.clear()
        logger.info("Evicted entire gRPC model cache for all domains")


def _load_bundle(domain: str) -> Dict[str, Any]:
    """Load and cache an ensemble model bundle for the given domain with integrity check and mtime detection."""
    artifact_path = os.path.join(_MODELS_DIR, f"{domain}_ensemble.joblib")
    if not os.path.exists(artifact_path):
        raise FileNotFoundError(
            f"Model artifact not found: {artifact_path}. "
            f"Run: python api/train.py --domain {domain} --input <data.csv>"
        )

    current_mtime = os.path.getmtime(artifact_path)
    cached = _BUNDLE_CACHE.get(domain)
    if cached is not None and _BUNDLE_MTIMES.get(domain) == current_mtime:
        return cached

    import joblib  # local import keeps cold-start light
    import hashlib
    import json

    # Verify SHA-256 integrity against manifest.json
    manifest_path = os.path.join(_MODELS_DIR, "manifest.json")
    if os.path.exists(manifest_path):
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

    logger.info("Loading model bundle: %s (mtime=%.2f)", artifact_path, current_mtime)
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
    _BUNDLE_CACHE[domain] = bundle
    _BUNDLE_MTIMES[domain] = current_mtime
    return bundle


def _to_feature_dict(fv: "ml_service_pb2.FeatureVector") -> Dict[str, float]:
    """Map the canonical gRPC FeatureVector to the dict parse_features expects."""
    return {
        "course_delta": fv.course_delta,
        "heading_delta": fv.heading_delta,
        "speed_delta": fv.speed_delta,
        "average_speed": fv.average_speed,
        "speed_variance": fv.speed_variance,
        "ais_gap_minutes": fv.ais_gap_minutes,
        "dist_restricted_zone": fv.dist_restricted_zone,
        "dist_historical_site": fv.dist_historical_site,
        "ewma_deviation": fv.ewma_deviation,
        "in_restricted_zone": float(fv.in_restricted_zone),
        "near_historical_attack": float(fv.near_historical_attack),
    }


class MLInferenceServicer(ml_service_pb2_grpc.MLInferenceServiceServicer):
    """Implements Predict + Train over gRPC."""

    def Predict(self, request: "ml_service_pb2.PredictRequest", context):
        domain = request.domain or "vessel"
        if domain not in DOMAIN_FEATURE_COLS:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details(f"unknown domain: {domain}")
            return ml_service_pb2.PredictResponse()

        try:
            bundle = _load_bundle(domain)
        except FileNotFoundError as exc:
            context.set_code(grpc.StatusCode.UNAVAILABLE)
            context.set_details(f"model not available: {exc}")
            return ml_service_pb2.PredictResponse()
        except RuntimeError as exc:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"model bundle error: {exc}")
            return ml_service_pb2.PredictResponse()

        try:
            features_dict = _to_feature_dict(request.features) if request.HasField("features") else {}
            features_model = parse_features(domain, features_dict)
            feature_array = features_model.to_array()
            feature_names = DOMAIN_FEATURE_COLS[domain]
            result = score(
                feature_array=feature_array,
                feature_names=feature_names,
                bundle=bundle,
                explain=request.explain,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("Inference error")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"inference failed: {exc}")
            return ml_service_pb2.PredictResponse()

        contributions = [
            ml_service_pb2.ShapContribution(
                feature=c.feature,
                value=c.value,
                contribution=c.contribution,
                direction=c.direction,
            )
            for c in result.shap_contributions
        ]

        # result.probability is already a 0..100 score (the ensemble composite);
        # the Go client and composite scoring both expect anomaly_score in 0..100.
        anomaly_score = result.probability

        return ml_service_pb2.PredictResponse(
            domain=domain,
            track_id=request.track_id,
            probability=anomaly_score / 100.0,
            anomaly_score=anomaly_score,
            is_anomaly=result.is_anomaly,
            raw_iforest_score=result.raw_iforest_score,
            raw_lof_score=result.raw_lof_score,
            inference_time_ms=result.inference_time_ms,
            model_version=result.model_version,
            shap_contributions=contributions,
        )

    def Train(self, request: "ml_service_pb2.TrainRequest", context):
        domain = request.domain or "vessel"
        # Training runs offline (api/train.py). Acknowledge the request.
        return ml_service_pb2.TrainResponse(
            status="accepted",
            model_version="",
            n_samples=len(request.feature_rows),
            contamination=request.contamination or 0.05,
            message=(
                "Training is run offline. Execute: "
                f"python api/train.py --domain {domain} --input <features.csv> "
                "[--labels <labels.csv>]"
            ),
        )


def _server_credentials() -> grpc.ServerCredentials | None:
    cert = os.environ.get("GRPC_TLS_CERT") or getattr(_args, "tls_cert", None)
    key = os.environ.get("GRPC_TLS_KEY") or getattr(_args, "tls_key", None)
    if not cert or not key:
        return None
    with open(cert, "rb") as cf, open(key, "rb") as kf:
        return grpc.ssl_server_credentials([(kf.read(), cf.read())])


_args = argparse.Namespace()


class LoggingInterceptor(grpc.ServerInterceptor):
    """Logs each incoming RPC together with the client peer address.

    This is the server-side counterpart to the Go backend's "[ML] gRPC
    connected" startup log: it makes client activity visible without relying on
    grpc.StatsHandler (unavailable in some grpcio builds).
    """

    def intercept_service(self, continuation, handler_call_details):
        handler = continuation(handler_call_details)
        if handler is None or not handler.unary_unary:
            return handler

        behavior = handler.unary_unary

        def _logged(request, context):
            logger.info(
                "gRPC RPC %s from %s", handler_call_details.method, context.peer()
            )
            return behavior(request, context)

        return grpc.unary_unary_rpc_method_handler(
            _logged,
            request_deserializer=handler.request_deserializer,
            response_serializer=handler.response_serializer,
        )


def serve() -> None:
    global _args
    parser = argparse.ArgumentParser(description="HormuzWatch ML gRPC server")
    parser.add_argument("--port", type=int, default=int(os.environ.get("GRPC_PORT", "8090")))
    parser.add_argument("--tls-cert", default=os.environ.get("GRPC_TLS_CERT"))
    parser.add_argument("--tls-key", default=os.environ.get("GRPC_TLS_KEY"))
    parser.add_argument("--max-workers", type=int, default=int(os.environ.get("GRPC_MAX_WORKERS", "4")))
    _args = parser.parse_args()

    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=_args.max_workers),
        interceptors=(LoggingInterceptor(),),
    )
    ml_service_pb2_grpc.add_MLInferenceServiceServicer_to_server(
        MLInferenceServicer(), server
    )

    creds = _server_credentials()
    if creds is not None:
        server.add_secure_port(f"[::]:{_args.port}", creds)
        logger.info("gRPC server (TLS) listening on :%d", _args.port)
    else:
        server.add_insecure_port(f"[::]:{_args.port}")
        logger.warning("gRPC server (INSECURE) listening on :%d", _args.port)

    # Optional reflection (helps debugging with grpcurl); ignore if unavailable.
    try:
        from grpc_reflection.v1alpha import reflection

        service_names = (
            ml_service_pb2.DESCRIPTOR.services_by_name.keys()
            | {reflection.SERVICE_NAME}
        )
        reflection.enable_server_reflection(list(service_names), server)
    except Exception:  # noqa: BLE001
        pass

    # Warm the default (vessel) bundle at startup so the first Predict isn't
    # delayed by a cold disk load — the Go client enforces a tight per-call
    # deadline, and reloading the joblib on the hot path would trip it.
    try:
        _load_bundle("vessel")
        logger.info("Preloaded 'vessel' model bundle")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not preload 'vessel' bundle (will load lazily): %s", exc)

    # Warm the scoring path (sklearn/numpy lazy init) so the first real Predict
    # from the Go backend isn't delayed by a cold import/threadpool spike that
    # would otherwise trip the client deadline. Mirrors the bundle preload above.
    try:
        _dummy = {
            k: 0.0
            for k in (
                "course_delta",
                "heading_delta",
                "speed_delta",
                "average_speed",
                "speed_variance",
                "ais_gap_minutes",
                "dist_restricted_zone",
                "dist_historical_site",
                "ewma_deviation",
            )
        }
        _features = parse_features("vessel", _dummy)
        score(
            feature_array=_features.to_array(),
            feature_names=DOMAIN_FEATURE_COLS["vessel"],
            bundle=_load_bundle("vessel"),
            explain=False,
        )
        logger.info("Warmed scoring path for 'vessel'")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Scoring warmup failed (will init on first call): %s", exc)

    server.start()
    logger.info("ML gRPC service ready")
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
