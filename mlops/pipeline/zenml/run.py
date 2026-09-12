"""
mlops/pipeline/zenml/run.py
===========================
Unified CLI Runner for HormuzWatch ZenML Pipelines.
Supports:
  - ETL Pipeline:          python -m mlops.pipeline.zenml.run --pipeline etl --domain vessel
  - Continuous Training:   python -m mlops.pipeline.zenml.run --pipeline train --domain vessel
  - End-to-End Orchestrator: python -m mlops.pipeline.zenml.run --pipeline e2e --domain vessel
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Any

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(PROJECT_ROOT / "mlops") not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT / "mlops"))

from mlops.pipeline.zenml.zenml_compat import is_zenml_available
from mlops.pipeline.zenml.pipelines.etl_pipeline import hormuz_etl_pipeline
from mlops.pipeline.zenml.pipelines.continuous_training_pipeline import (
    hormuz_continuous_training_pipeline,
)
from mlops.pipeline.zenml.pipelines.e2e_pipeline import hormuz_e2e_pipeline
from mlops.etl.loader import json_default

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("mlops.zenml.cli")


def print_banner(pipeline_type: str, domain: str) -> None:
    native_status = "ACTIVE (Native Stack)" if is_zenml_available() else "STANDALONE SHIM (Zero-Dependency)"
    print("\n" + "=" * 80)
    print(f"⚡ HORMEZWATCH MLOps & ETL ORCHESTRATION ENGINE [ZenML]")
    print(f"   Pipeline: {pipeline_type.upper()} | Domain: {domain.upper()} | Engine: {native_status}")
    print("=" * 80 + "\n")


def run() -> None:
    parser = argparse.ArgumentParser(
        description="HormuzWatch ZenML Pipeline Orchestrator",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--pipeline",
        choices=["etl", "train", "ct", "e2e"],
        default="etl",
        help="Target ZenML pipeline to execute",
    )
    parser.add_argument(
        "--domain",
        choices=["vessel", "aviation", "all"],
        default="vessel",
        help="Target operational telemetry domain",
    )
    parser.add_argument(
        "--mode",
        choices=["auto", "api", "snapshot"],
        default="auto",
        help="Extraction source mode for ETL",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Sample count limit for extraction",
    )
    parser.add_argument(
        "--dataset-id",
        type=str,
        default=None,
        help="Custom dataset ID for persistence or loading",
    )
    parser.add_argument(
        "--snapshot-id",
        type=str,
        default=None,
        help="Specific curated snapshot ID to extract from",
    )
    parser.add_argument(
        "--deploy",
        dest="deploy",
        action="store_true",
        default=True,
        help="Promote model candidate upon passing SLA gates",
    )
    parser.add_argument(
        "--no-deploy",
        dest="deploy",
        action="store_false",
        help="Skip deployment step even if gates pass",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output raw JSON results",
    )
    args = parser.parse_args()

    domains = ["vessel", "aviation"] if args.domain == "all" else [args.domain]
    results = {}

    for d in domains:
        print_banner(args.pipeline, d)
        if args.pipeline == "etl":
            res = hormuz_etl_pipeline(
                domain=d,
                source_mode=args.mode,
                limit=args.limit,
                dataset_id=args.dataset_id,
                snapshot_id=args.snapshot_id,
            )
        elif args.pipeline in ("train", "ct"):
            res = hormuz_continuous_training_pipeline(
                domain=d,
                dataset_id=args.dataset_id,
                deploy_on_pass=args.deploy,
            )
        elif args.pipeline == "e2e":
            res = hormuz_e2e_pipeline(
                domain=d,
                source_mode=args.mode,
                limit=args.limit,
                dataset_id=args.dataset_id,
                deploy_on_pass=args.deploy,
            )
        else:
            raise ValueError(f"Unknown pipeline: {args.pipeline}")
        results[d] = res

    if args.json:
        print(json.dumps(results, indent=2, default=json_default))
    else:
        print("\n" + "=" * 80)
        print("🎯 EXECUTION SUMMARY")
        print("=" * 80)
        for dom, out in results.items():
            print(f"Domain: {dom.upper()}")
            if args.pipeline == "etl":
                print(f"  Dataset ID:   {out.get('dataset_id')}")
                print(f"  Total Rows:   {out.get('total_rows')}")
                print(f"  Size:         {out.get('total_bytes', 0) / (1024*1024):.2f} MB")
                print(f"  Manifest:     {out.get('manifest_path')}")
            elif args.pipeline in ("train", "ct"):
                print(f"  Drift:        {'DETECTED' if out.get('drift_detected') else 'NOMINAL'}")
                print(f"  SLA Passed:   {out.get('eval_passed')}")
                deploy_info = out.get('deploy_report', {})
                print(f"  Deployed:     {deploy_info.get('deployed', False)}")
            elif args.pipeline == "e2e":
                etl_res = out.get("etl", {})
                eval_res = out.get("evaluation", {})
                deploy_res = out.get("deployment", {})
                print(f"  ETL Dataset:  {etl_res.get('dataset_id')} ({etl_res.get('total_rows')} rows)")
                print(f"  Drift:        {'DETECTED' if out.get('drift', {}).get('drift_detected') else 'NOMINAL'}")
                print(f"  SLA Passed:   {eval_res.get('overall_passed')}")
                print(f"  Deployed:     {deploy_res.get('deployed', False)}")
        print("=" * 80 + "\n")


if __name__ == "__main__":
    run()
