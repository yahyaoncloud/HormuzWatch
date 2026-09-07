"""
pipeline/config.py
------------------
Central MLOps configuration, evaluation gates, and drift thresholds.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

PIPELINE_ROOT = Path(__file__).resolve().parent
current = PIPELINE_ROOT
while current.parent != current:
    if (current / 'service' / 'ml-service' / 'lib').exists():
        PROJECT_ROOT = current
        break
    current = current.parent
else:
    PROJECT_ROOT = PIPELINE_ROOT.parent

# Detect container vs local filesystem
if Path("/app/models").exists():
    MODELS_DIR = Path("/app/models")
    ARTIFACTS_DIR = Path("/tmp/artifacts")
else:
    MODELS_DIR = PROJECT_ROOT / "service" / "ml-service" / "models"
    ARTIFACTS_DIR = PIPELINE_ROOT / "artifacts"

MODELS_DIR.mkdir(parents=True, exist_ok=True)
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)


@dataclass(frozen=True)
class MLOpsConfig:
    # ── Evaluation Gate Thresholds ────────────────────────────────
    min_pr_auc: float = 0.85
    min_roc_auc: float = 0.90
    max_ece: float = 0.08
    max_latency_ms: float = 12.0
    
    # ── Data Drift Thresholds (Evidently / SciPy) ──────────────────
    psi_warning_threshold: float = 0.10
    psi_critical_threshold: float = 0.20
    ks_test_alpha: float = 0.01
    ks_alpha: float = 0.01  # Alias for backward compatibility

    # ── Database & Training Extraction ────────────────────────────
    db_url: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/hormuzwatch")
    min_samples_for_retrain: int = 500
    
    # ── Bayesian Optimization (Optuna) ────────────────────────────
    optuna_n_trials: int = 15
    optuna_timeout_sec: int = 120
    
    # ── Tracking & Registry ───────────────────────────────────────
    mlflow_tracking_uri: str = os.getenv("MLFLOW_TRACKING_URI", f"file://{ARTIFACTS_DIR}/mlruns")
    experiment_name: str = "HormuzWatch-ContinuousTraining"
    
    # ── Service Endpoints ─────────────────────────────────────────
    ml_service_rest_url: str = os.getenv("ML_SERVICE_REST_URL", "http://localhost:8090")
    ml_service_grpc_addr: str = os.getenv("ML_SERVICE_GRPC_ADDR", "localhost:8091")


config = MLOpsConfig()
