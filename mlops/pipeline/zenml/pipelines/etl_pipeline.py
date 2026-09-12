"""
mlops/pipeline/zenml/pipelines/etl_pipeline.py
==============================================
ZenML Pipeline for Telemetry Data Ingestion and ETL.
Coordinates:
  [extract_telemetry_step] -> [validate_contracts_step] -> [transform_features_step] -> [load_dataset_step]
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Any, Dict, Optional

# Path resolution
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

logger = logging.getLogger("mlops.zenml.etl_pipeline")


@pipeline(name="hormuz_etl_pipeline")
def hormuz_etl_pipeline(
    domain: str = "vessel",
    source_mode: str = "auto",
    limit: Optional[int] = None,
    dataset_id: Optional[str] = None,
    snapshot_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Executes end-to-end ZenML ETL pipeline for maritime or aviation telemetry:
      1. Ingest raw streams or historical batches
      2. Verify schema and spatial bounds against Telemetry Contract
      3. Compute kinematic anomalies, TSS chokepoints, and temporal splits
      4. Store partitioned Parquet artifacts and register into manifest
    """
    raw_df = extract_telemetry_step(
        domain=domain,
        source_mode=source_mode,
        limit=limit,
        snapshot_id=snapshot_id,
    )
    validated_df, quality_report = validate_contracts_step(df=raw_df, domain=domain)
    transformed_df, summary_stats = transform_features_step(df=validated_df, domain=domain)
    load_result = load_dataset_step(
        transformed_df=transformed_df,
        domain=domain,
        summary_stats=summary_stats,
        dataset_id=dataset_id,
    )
    return load_result
