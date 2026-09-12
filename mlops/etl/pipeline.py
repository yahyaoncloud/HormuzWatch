"""
mlops/etl/pipeline.py
=====================
End-to-end MLOps ETL pipeline orchestrator for HormuzWatch.
Connects Extraction -> Transformation & Contract Validation -> Loading & Manifest Registration.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Union

# Ensure mlops is on sys.path
PIPELINE_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = PIPELINE_ROOT.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(PROJECT_ROOT / "mlops") not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT / "mlops"))

from mlops.etl.extractor import TelemetryExtractor
from mlops.etl.transformer import TelemetryTransformer
from mlops.etl.loader import DatasetLoader, json_default

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("mlops.etl.pipeline")


class ETLPipeline:
    """Orchestrates extraction, transformation, contract validation, and persistence of telemetry datasets."""

    def __init__(
        self,
        api_base_url: str = "http://192.168.1.40:10020",
        datasets_dir: Optional[Union[str, Path]] = None,
    ):
        self.extractor = TelemetryExtractor(api_base_url=api_base_url, datasets_dir=datasets_dir)
        self.loader = DatasetLoader(output_root=datasets_dir)

    def run(
        self,
        domain: str = "vessel",
        source_mode: str = "auto",
        limit: Optional[int] = None,
        dataset_id: Optional[str] = None,
        snapshot_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Executes full ETL cycle:
          1. Extract raw telemetry records
          2. Transform, validate data contracts, engineer kinematic & zone features
          3. Load, compute cryptographic SHA-256 hashes, and register into manifest
        """
        start_time = time.perf_counter()
        logger.info(f"=== Starting ETL Pipeline for Domain: {domain} (Mode: {source_mode}) ===")

        # 1. Extraction Phase
        logger.info("[Stage 1/3] Extracting telemetry...")
        t0 = time.perf_counter()
        raw_df = self.extractor.extract(
            domain=domain,
            source_mode=source_mode,
            limit=limit,
            snapshot_id=snapshot_id,
        )
        extract_duration = time.perf_counter() - t0
        logger.info(f"[Stage 1/3] Extracted {len(raw_df)} raw records in {extract_duration:.2f}s")

        # 2. Transformation & Validation Phase
        logger.info("[Stage 2/3] Transforming features and evaluating data contracts...")
        t0 = time.perf_counter()
        transformer = TelemetryTransformer(domain=domain)
        transformed_df, summary_stats = transformer.transform(raw_df)
        transform_duration = time.perf_counter() - t0
        logger.info(
            f"[Stage 2/3] Transformation complete in {transform_duration:.2f}s: "
            f"{len(transformed_df)} records (Normal: {summary_stats['normal_count']}, Anomaly: {summary_stats['anomaly_count']})"
        )

        # 3. Loading & Registry Manifest Phase
        logger.info("[Stage 3/3] Persisting dataset artifacts and computing cryptographic hashes...")
        t0 = time.perf_counter()
        load_result = self.loader.persist(
            df=transformed_df,
            domain=domain,
            dataset_id=dataset_id,
            summary_stats=summary_stats,
        )
        load_duration = time.perf_counter() - t0
        logger.info(
            f"[Stage 3/3] Persisted dataset '{load_result['dataset_id']}' ({load_result['total_bytes'] / (1024*1024):.2f} MB) in {load_duration:.2f}s"
        )

        total_duration = time.perf_counter() - start_time
        logger.info(f"=== ETL Pipeline Complete in {total_duration:.2f}s ===")

        return {
            "status": "SUCCESS",
            "domain": domain,
            "dataset_id": load_result["dataset_id"],
            "target_dir": load_result["target_dir"],
            "manifest_path": load_result["manifest_path"],
            "total_rows": load_result["total_rows"],
            "total_bytes": load_result["total_bytes"],
            "train_rows": summary_stats["train_rows"],
            "val_rows": summary_stats["val_rows"],
            "test_rows": summary_stats["test_rows"],
            "anomaly_pct": summary_stats["anomaly_pct"],
            "quality_contract": summary_stats["contract_quality"],
            "durations": {
                "extract_sec": round(extract_duration, 3),
                "transform_sec": round(transform_duration, 3),
                "load_sec": round(load_duration, 3),
                "total_sec": round(total_duration, 3),
            },
        }


def run_etl(domain: str = "vessel", source_mode: str = "auto", limit: Optional[int] = None) -> Dict[str, Any]:
    """Convenience helper for executing ETL."""
    pipeline = ETLPipeline()
    return pipeline.run(domain=domain, source_mode=source_mode, limit=limit)


def main():
    parser = argparse.ArgumentParser(description="HormuzWatch MLOps ETL Pipeline")
    parser.add_argument("--domain", choices=["vessel", "aviation", "all"], default="vessel", help="Target domain")
    parser.add_argument("--mode", choices=["auto", "api", "snapshot"], default="auto", help="Extraction source mode")
    parser.add_argument("--limit", type=int, default=None, help="Sample count limit")
    parser.add_argument("--dataset-id", type=str, default=None, help="Custom dataset ID")
    parser.add_argument("--snapshot-id", type=str, default=None, help="Curated snapshot ID to extract from")
    parser.add_argument("--zenml", action="store_true", help="Execute ETL using ZenML pipeline orchestrator")
    args = parser.parse_args()

    if args.zenml:
        from mlops.pipeline.zenml.pipelines.etl_pipeline import hormuz_etl_pipeline
        if args.domain == "all":
            results = {}
            for d in ["vessel", "aviation"]:
                res = hormuz_etl_pipeline(
                    domain=d,
                    source_mode=args.mode,
                    limit=args.limit,
                    snapshot_id=args.snapshot_id,
                )
                results[d] = res
            print(json.dumps(results, indent=2, default=json_default))
        else:
            res = hormuz_etl_pipeline(
                domain=args.domain,
                source_mode=args.mode,
                limit=args.limit,
                dataset_id=args.dataset_id,
                snapshot_id=args.snapshot_id,
            )
            print(json.dumps(res, indent=2, default=json_default))
        return

    pipeline = ETLPipeline()
    if args.domain == "all":
        results = {}
        for d in ["vessel", "aviation"]:
            res = pipeline.run(domain=d, source_mode=args.mode, limit=args.limit)
            results[d] = res
        print(json.dumps(results, indent=2, default=json_default))
    else:
        res = pipeline.run(
            domain=args.domain,
            source_mode=args.mode,
            limit=args.limit,
            dataset_id=args.dataset_id,
            snapshot_id=args.snapshot_id,
        )
        print(json.dumps(res, indent=2, default=json_default))


if __name__ == "__main__":
    main()
