"""
mlops/pipeline/zenml/steps/etl_steps.py
=======================================
ZenML steps encapsulating the complete HormuzWatch Telemetry ETL Lifecycle:
  1. Extract Telemetry (Live API / Curated Historical Snapshots)
  2. Validate Data Quality Contracts (Huyen Ch. 3 / AIS Boundary Assertions)
  3. Feature Engineering & Spatial Transformations (TSS, Chokepoints, Kinematics)
  4. Dataset Loading, Cryptographic Hashing & Registry Registration
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import pandas as pd

# Path resolution
STEP_DIR = Path(__file__).resolve().parent
ZENML_DIR = STEP_DIR.parent
PROJECT_ROOT = ZENML_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(PROJECT_ROOT / "mlops") not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT / "mlops"))

from mlops.pipeline.zenml.zenml_compat import step
from mlops.etl.extractor import TelemetryExtractor
from mlops.etl.transformer import TelemetryTransformer
from mlops.etl.loader import DatasetLoader
from mlops.data.contracts.telemetry_contract import TelemetryDataQualityReport

logger = logging.getLogger("mlops.zenml.etl_steps")


@step(name="extract_telemetry_step")
def extract_telemetry_step(
    domain: str = "vessel",
    source_mode: str = "auto",
    limit: Optional[int] = None,
    snapshot_id: Optional[str] = None,
) -> pd.DataFrame:
    """
    Extract raw AIS vessel or ADS-B aviation telemetry records from live backend REST endpoints
    or curated local snapshot files in server/datasets/.
    """
    logger.info(f"Extracting telemetry for domain='{domain}', mode='{source_mode}', limit={limit}")
    extractor = TelemetryExtractor()
    df = extractor.extract(
        domain=domain,
        source_mode=source_mode,
        limit=limit,
        snapshot_id=snapshot_id,
    )
    logger.info(f"Extraction step produced {len(df)} records with columns: {list(df.columns)}")
    return df


@step(name="validate_contracts_step")
def validate_contracts_step(
    df: pd.DataFrame,
    domain: str = "vessel",
    min_quality_score: float = 0.80,
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Enforce runtime schema validation and geographical bounding box assertions.
    Assesses coordinate compliance, speed limits, and missingness against TelemetryDataQualityReport.
    """
    logger.info(f"Evaluating data contracts for {len(df)} records...")
    report = TelemetryDataQualityReport.validate_batch(df)
    quality_score = report.get("quality_score", 0.0)
    logger.info(
        f"Contract validation: Score={quality_score:.4f} | "
        f"Coord Compliance={report.get('coord_compliance_pct', 0)}% | "
        f"Speed Compliance={report.get('speed_compliance_pct', 0)}%"
    )

    if quality_score < min_quality_score:
        logger.warning(
            f"Dataset quality score {quality_score:.4f} is below minimum threshold {min_quality_score}. "
            "Data contains out-of-bounds coordinates or invalid telemetry values."
        )

    return df, report


@step(name="transform_features_step")
def transform_features_step(
    df: pd.DataFrame,
    domain: str = "vessel",
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Apply feature engineering:
      - Kinematic anomaly indicators (speed drops, high rate of turn, dead-reckoning divergence)
      - Geospatial zones (Traffic Separation Scheme corridors, Iranian territorial waters, bottleneck chokepoints)
      - Distance to historical maritime incident sites
      - Stratified temporal splits (train: 70%, val: 15%, test: 15%)
    """
    logger.info(f"Transforming features for domain='{domain}' on {len(df)} raw records...")
    transformer = TelemetryTransformer(domain=domain)
    transformed_df, summary_stats = transformer.transform(df)
    logger.info(
        f"Transformed {len(transformed_df)} records: "
        f"Normal={summary_stats['normal_count']}, Anomaly={summary_stats['anomaly_count']} "
        f"({summary_stats['anomaly_pct']:.2f}% base rate)"
    )
    return transformed_df, summary_stats


@step(name="load_dataset_step")
def load_dataset_step(
    transformed_df: pd.DataFrame,
    domain: str = "vessel",
    summary_stats: Optional[Dict[str, Any]] = None,
    dataset_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Persist partitioned train/val/test Parquet files, compute SHA-256 cryptographic hashes,
    generate quality metadata reports, and register into the dataset registry manifest.
    """
    logger.info(f"Persisting dataset artifact for domain='{domain}'...")
    loader = DatasetLoader()
    result = loader.persist(
        df=transformed_df,
        domain=domain,
        dataset_id=dataset_id,
        summary_stats=summary_stats or {},
    )
    logger.info(
        f"Persisted dataset '{result['dataset_id']}' with SHA-256 validation. "
        f"Total rows: {result['total_rows']}, Size: {result['total_bytes'] / (1024*1024):.2f} MB"
    )
    return result
