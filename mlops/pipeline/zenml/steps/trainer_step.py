"""
mlops/pipeline/zenml/steps/trainer_step.py
=========================================
ZenML Step: Model Trainer
Trains calibrated multi-domain anomaly ensembles (Isolation Forest, LOF, Isotonic Regression)
with MLflow experiment tracking and artifact serialization.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd

STEP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = STEP_DIR.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(PROJECT_ROOT / "mlops") not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT / "mlops"))

from mlops.pipeline.zenml.zenml_compat import step

logger = logging.getLogger("mlops.zenml.trainer")


@step(name="trainer_step", experiment_tracker="mlflow-tracker")
def trainer_step(
    features: pd.DataFrame,
    domain: str = "vessel",
    dataset_dir: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Train candidate model ensemble and log metrics to MLflow and ZenML artifact store.
    """
    logger.info(f"Training ensemble model candidate for domain='{domain}' with {len(features)} samples...")

    has_mlflow = False
    try:
        import mlflow
        has_mlflow = True
    except ImportError:
        logger.info("MLflow not installed in runtime. Skipping remote MLflow tracking.")

    from mlops.pipeline.train_and_evaluate import train_domain_model

    if has_mlflow:
        try:
            mlflow.set_experiment("HormuzWatch-Continuous-Training")
            with mlflow.start_run(run_name=f"zenml_{domain}_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}"):
                results = train_domain_model(domain=domain, dataset_dir=dataset_dir)
                for metric_key, val in results.get("metrics", {}).items():
                    if isinstance(val, (int, float)):
                        mlflow.log_metric(f"{domain}_{metric_key}", float(val))
                if "artifact_path" in results:
                    mlflow.log_param(f"{domain}_artifact_path", str(results["artifact_path"]))
                return results
        except Exception as e:
            logger.warning(f"MLflow run failed ({e}), executing training locally without MLflow.")

    results = train_domain_model(domain=domain, dataset_dir=dataset_dir)
    return results
