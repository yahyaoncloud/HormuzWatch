"""
mlops/pipeline/zenml/pipelines/e2e_pipeline.py
==============================================
Unified End-to-End ZenML Pipeline: ETL -> Drift -> Training -> Gating -> Deployment.
Executes the full automated MLOps cycle in a single orchestrated graph.
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
from mlops.pipeline.zenml.steps.etl_steps import (
    extract_telemetry_step,
    validate_contracts_step,
    transform_features_step,
    load_dataset_step,
)
from mlops.pipeline.zenml.steps.drift_detector_step import drift_detector_step
from mlops.pipeline.zenml.steps.trainer_step import trainer_step
from mlops.pipeline.zenml.steps.evaluator_step import evaluator_step
from mlops.pipeline.zenml.steps.deployer_step import deployer_step

logger = logging.getLogger("mlops.zenml.e2e_pipeline")


@pipeline(name="hormuz_e2e_pipeline")
def hormuz_e2e_pipeline(
    domain: str = "vessel",
    source_mode: str = "auto",
    limit: Optional[int] = None,
    dataset_id: Optional[str] = None,
    deploy_on_pass: bool = True,
) -> Dict[str, Any]:
    """
    Unified end-to-end MLOps pipeline:
      Phase 1: Telemetry ETL (Extract -> Contract Validate -> Transform -> Persist & Hash)
      Phase 2: Drift Detection (Evaluate feature distribution shift)
      Phase 3: Model Training (Train candidate ensemble with calibration)
      Phase 4: Gate Evaluation (Validate against production SLA thresholds and slices)
      Phase 5: Automated Promotion (Hot-swap production artifact if gates pass)
    """
    # Phase 1: ETL
    raw_df = extract_telemetry_step(
        domain=domain,
        source_mode=source_mode,
        limit=limit,
    )
    validated_df, quality_report = validate_contracts_step(df=raw_df, domain=domain)
    transformed_df, summary_stats = transform_features_step(df=validated_df, domain=domain)
    load_result = load_dataset_step(
        transformed_df=transformed_df,
        domain=domain,
        summary_stats=summary_stats,
        dataset_id=dataset_id,
    )

    # Phase 2: Drift Detection
    drift_detected, drift_report = drift_detector_step(current_data=transformed_df, domain=domain)

    # Phase 3: Candidate Model Training
    train_results = trainer_step(features=transformed_df, domain=domain)

    # Phase 4: SLA Gate & Slice Evaluation
    eval_passed, eval_report = evaluator_step(train_results=train_results, domain=domain)

    # Phase 5: Production Deployment
    deploy_report = {}
    if deploy_on_pass:
        deploy_report = deployer_step(eval_passed=eval_passed, train_results=train_results, domain=domain)

    return {
        "domain": domain,
        "etl": load_result,
        "drift": {
            "drift_detected": drift_detected,
            "report": drift_report,
        },
        "train": train_results,
        "evaluation": eval_report,
        "deployment": deploy_report,
    }
