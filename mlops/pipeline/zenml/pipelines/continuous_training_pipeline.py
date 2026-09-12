"""
mlops/pipeline/zenml/pipelines/continuous_training_pipeline.py
==============================================================
ZenML Continuous Training (CT) and Model Governance Pipeline for HormuzWatch.
Connects:
  [data_loader_step]
         │
         ▼
  [drift_detector_step] ──(Distribution Shift Checked)
         │
         ▼
  [trainer_step]        ──(Bayesian / Ensemble Training + MLflow Tracking)
         │
         ▼
  [evaluator_step]      ──(SLA Gates: ROC-AUC, PR-AUC, ECE, Latency)
         │
         ▼
  [deployer_step]       ──(Production Atomic Hot-Swap & Manifest Registration)
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Any, Dict, Optional

PIPELINES_DIR = Path(__file__).resolve().parent
ZENML_DIR = PIPELINES_DIR.parent
PROJECT_ROOT = ZENML_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(PROJECT_ROOT / "mlops") not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT / "mlops"))

from mlops.pipeline.zenml.zenml_compat import pipeline
from mlops.pipeline.zenml.steps.data_loader_step import data_loader_step
from mlops.pipeline.zenml.steps.drift_detector_step import drift_detector_step
from mlops.pipeline.zenml.steps.trainer_step import trainer_step
from mlops.pipeline.zenml.steps.evaluator_step import evaluator_step
from mlops.pipeline.zenml.steps.deployer_step import deployer_step

logger = logging.getLogger("mlops.zenml.ct_pipeline")


@pipeline(name="hormuz_continuous_training_pipeline")
def hormuz_continuous_training_pipeline(
    domain: str = "vessel",
    dataset_id: Optional[str] = None,
    deploy_on_pass: bool = True,
) -> Dict[str, Any]:
    """
    Continuous Training (CT) Pipeline:
      1. Ingest registered dataset from manifest
      2. Quantify population stability and feature drift
      3. Fit calibrated multi-domain anomaly models
      4. Validate candidate against production SLA gates and sub-population slices
      5. Hot-swap production artifacts upon gate passage
    """
    data = data_loader_step(domain=domain, dataset_id=dataset_id)
    drift_detected, drift_report = drift_detector_step(current_data=data, domain=domain)
    train_results = trainer_step(features=data, domain=domain)
    eval_passed, eval_report = evaluator_step(train_results=train_results, domain=domain)

    deploy_report = {}
    if deploy_on_pass:
        deploy_report = deployer_step(eval_passed=eval_passed, train_results=train_results, domain=domain)

    return {
        "domain": domain,
        "drift_detected": drift_detected,
        "drift_report": drift_report,
        "train_results": train_results,
        "eval_passed": eval_passed,
        "eval_report": eval_report,
        "deploy_report": deploy_report,
    }
