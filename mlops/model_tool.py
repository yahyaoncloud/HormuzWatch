"""
mlops/model_tool.py
===================
Comprehensive ML model registry, SLA evaluation gating, stage promotion,
cryptographic verification, and atomic rollback tool for HormuzWatch MLOps.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import shutil
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

try:
    import joblib
except ImportError:
    joblib = None

try:
    import numpy as np
except ImportError:
    np = None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("mlops.model_tool")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ML_SERVICE_DIR = PROJECT_ROOT / "service" / "ml-service"
if str(ML_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(ML_SERVICE_DIR))
DEFAULT_MODELS_DIR = ML_SERVICE_DIR / "models"
DEFAULT_MANIFEST_PATH = DEFAULT_MODELS_DIR / "registry_manifest.json"
DEFAULT_BACKUPS_DIR = DEFAULT_MODELS_DIR / "backups"

# Production SLA Gate Thresholds
DEFAULT_GATES = {
    "min_roc_auc": 0.90,
    "min_pr_auc": 0.40,  # Highly imbalanced anomaly feeds have realistic base rates
    "max_ece": 0.08,
    "max_latency_ms": 30.0,
}


def compute_sha256(filepath: Union[str, Path]) -> str:
    """Compute SHA-256 cryptographic hash of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(1024 * 1024):
            h.update(chunk)
    return h.hexdigest()


class ModelManager:
    """Manages versioned model artifacts, stage transitions, evaluation gates, and rollbacks."""

    def __init__(
        self,
        models_dir: Optional[Union[str, Path]] = None,
        manifest_path: Optional[Union[str, Path]] = None,
        backups_dir: Optional[Union[str, Path]] = None,
    ):
        self.models_dir = Path(models_dir) if models_dir else DEFAULT_MODELS_DIR
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.manifest_path = Path(manifest_path) if manifest_path else (self.models_dir / "registry_manifest.json")
        self.backups_dir = Path(backups_dir) if backups_dir else DEFAULT_BACKUPS_DIR
        self.backups_dir.mkdir(parents=True, exist_ok=True)

    def load_manifest(self) -> Dict[str, Any]:
        """Load manifest from disk or initialize empty."""
        if self.manifest_path.exists():
            try:
                with open(self.manifest_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Error reading model manifest {self.manifest_path}: {e}")
        return {
            "registry_version": "2.4.0",
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "total_models": 0,
            "models": {},
        }

    def save_manifest(self, manifest: Dict[str, Any]) -> None:
        """Save manifest atomically to disk."""
        manifest["last_updated"] = datetime.now(timezone.utc).isoformat()
        manifest["total_models"] = len(manifest.get("models", {}))
        tmp_path = self.manifest_path.with_suffix(".tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        tmp_path.replace(self.manifest_path)

    def scan_models(self) -> Dict[str, Any]:
        """Scans models directory for all .joblib files and indexes them."""
        manifest = self.load_manifest()
        existing_models = manifest.get("models", {})

        for f in sorted(self.models_dir.glob("*.joblib")):
            model_name = f.stem
            sha = compute_sha256(f)
            sz = f.stat().st_size
            mtime = datetime.fromtimestamp(f.stat().st_mtime, timezone.utc).isoformat()

            # Preserve existing metadata if valid
            prev = existing_models.get(model_name, {})
            stage = prev.get("stage", "production")
            version = prev.get("version", "2.4.0")
            metrics = prev.get("metrics", {})
            opt_thresh = prev.get("optimal_threshold", 0.5)

            # Check for training report file
            report_file = self.models_dir / f"{model_name.replace('_ensemble', '')}_training_report.json"
            if report_file.exists() and not metrics:
                try:
                    with open(report_file, "r", encoding="utf-8") as rf:
                        metrics = json.load(rf)
                except Exception:
                    pass

            existing_models[model_name] = {
                "artifact": f.name,
                "version": version,
                "stage": stage,
                "sha256": sha,
                "size_bytes": sz,
                "size_mb": round(sz / (1024 * 1024), 2),
                "updated_at": mtime,
                "optimal_threshold": opt_thresh,
                "metrics": metrics,
            }

        manifest["models"] = existing_models
        self.save_manifest(manifest)
        return manifest

    def list_models(self) -> List[Dict[str, Any]]:
        """List all models registered in the manifest."""
        manifest = self.load_manifest()
        if not manifest.get("models"):
            manifest = self.scan_models()
        res = []
        for name, meta in sorted(manifest.get("models", {}).items()):
            meta_copy = dict(meta)
            meta_copy["model_name"] = name
            res.append(meta_copy)
        return res

    def verify_model(self, model_name: str) -> Dict[str, Any]:
        """Cryptographically verifies SHA-256 and validates joblib model structure."""
        manifest = self.load_manifest()
        if model_name not in manifest.get("models", {}):
            raise KeyError(f"Model '{model_name}' not found in registry manifest.")

        meta = manifest["models"][model_name]
        artifact_file = self.models_dir / meta["artifact"]
        if not artifact_file.exists():
            return {
                "model_name": model_name,
                "artifact": meta["artifact"],
                "status": "MISSING",
                "sha256_match": False,
                "loadable": False,
                "error": "File does not exist on disk",
            }

        actual_sha = compute_sha256(artifact_file)
        sha_match = actual_sha == meta["sha256"]

        # Attempt joblib load to verify integrity
        loadable = False
        load_error = None
        structure_keys = []
        try:
            bundle = joblib.load(artifact_file)
            loadable = True
            if isinstance(bundle, dict):
                structure_keys = list(bundle.keys())
        except Exception as e:
            load_error = str(e)

        overall_status = "VERIFIED" if (sha_match and loadable) else "FAILED"

        return {
            "model_name": model_name,
            "artifact": meta["artifact"],
            "status": overall_status,
            "sha256_match": sha_match,
            "expected_sha256": meta["sha256"],
            "actual_sha256": actual_sha,
            "loadable": loadable,
            "keys": structure_keys,
            "error": load_error,
        }

    def inspect_model(self, model_name: str) -> Dict[str, Any]:
        """Deep inspection of model metadata, training metrics, and bundle structure."""
        manifest = self.load_manifest()
        if model_name not in manifest.get("models", {}):
            raise KeyError(f"Model '{model_name}' not found in registry manifest.")

        meta = manifest["models"][model_name]
        artifact_file = self.models_dir / meta["artifact"]

        bundle_details = {}
        if artifact_file.exists():
            try:
                bundle = joblib.load(artifact_file)
                if isinstance(bundle, dict):
                    bundle_details = {
                        "keys": list(bundle.keys()),
                        "feature_cols": bundle.get("feature_cols"),
                        "domain": bundle.get("domain"),
                        "version": bundle.get("version"),
                        "score_bounds": bundle.get("score_bounds"),
                        "best_params": bundle.get("best_params"),
                        "hardware_device": bundle.get("hardware_device"),
                    }
            except Exception as e:
                bundle_details = {"error": f"Failed to load bundle: {e}"}

        return {
            "model_name": model_name,
            "manifest_meta": meta,
            "bundle_details": bundle_details,
        }

    def register_candidate(
        self,
        candidate_path: Union[str, Path],
        model_name: str,
        version: str,
        stage: str = "staging",
        metrics: Optional[Dict[str, Any]] = None,
        optimal_threshold: float = 0.5,
    ) -> Dict[str, Any]:
        """Registers a newly trained candidate model into the registry."""
        src_file = Path(candidate_path)
        if not src_file.exists():
            raise FileNotFoundError(f"Candidate file not found: {src_file}")

        # Destination filename in models dir
        dest_filename = f"{model_name}.joblib"
        dest_path = self.models_dir / dest_filename

        # If dest is not src, copy candidate
        if src_file.resolve() != dest_path.resolve():
            shutil.copy2(src_file, dest_path)

        sha = compute_sha256(dest_path)
        sz = dest_path.stat().st_size
        now = datetime.now(timezone.utc).isoformat()

        manifest = self.load_manifest()
        manifest["models"][model_name] = {
            "artifact": dest_filename,
            "version": version,
            "stage": stage,
            "sha256": sha,
            "size_bytes": sz,
            "size_mb": round(sz / (1024 * 1024), 2),
            "updated_at": now,
            "optimal_threshold": optimal_threshold,
            "metrics": metrics or {},
        }
        self.save_manifest(manifest)
        logger.info(f"Registered candidate model '{model_name}' (v{version}) in stage '{stage}'")
        return manifest["models"][model_name]

    def evaluate_sla_gates(self, model_name: str) -> Dict[str, Any]:
        """Evaluates SLA gates (PR-AUC, ROC-AUC, ECE, Latency) for production promotion."""
        manifest = self.load_manifest()
        if model_name not in manifest.get("models", {}):
            raise KeyError(f"Model '{model_name}' not found in registry.")

        meta = manifest["models"][model_name]
        m = meta.get("metrics", {})
        if "metrics" in m and isinstance(m["metrics"], dict):
            m = m["metrics"]

        roc_auc = float(m.get("test_roc_auc", 0.0) or 0.0)
        pr_auc = float(m.get("test_pr_auc", 0.0) or 0.0)
        ece = float(m.get("test_ece", 1.0) or 1.0)
        lat = float(m.get("latency_ms_per_sample", 999.0) or 999.0)

        checks = {
            "roc_auc_check": {
                "value": roc_auc,
                "threshold": DEFAULT_GATES["min_roc_auc"],
                "passed": roc_auc >= DEFAULT_GATES["min_roc_auc"],
            },
            "pr_auc_check": {
                "value": pr_auc,
                "threshold": DEFAULT_GATES["min_pr_auc"],
                "passed": pr_auc >= DEFAULT_GATES["min_pr_auc"],
            },
            "ece_check": {
                "value": ece,
                "threshold": DEFAULT_GATES["max_ece"],
                "passed": ece <= DEFAULT_GATES["max_ece"],
            },
            "latency_check": {
                "value": lat,
                "threshold": DEFAULT_GATES["max_latency_ms"],
                "passed": lat <= DEFAULT_GATES["max_latency_ms"],
            },
        }

        all_passed = all(c["passed"] for c in checks.values())
        return {
            "model_name": model_name,
            "version": meta.get("version"),
            "all_gates_passed": all_passed,
            "checks": checks,
        }

    def promote_model(self, model_name: str, target_stage: str = "production", force: bool = False) -> Dict[str, Any]:
        """
        Promotes a model stage ('development' -> 'staging' -> 'production' -> 'archived').
        When promoting to production:
          1. Evaluates SLA gates (blocks if gates fail unless force=True)
          2. Backs up active production model to backups/ for zero-downtime rollback
          3. Promotes candidate and updates registry manifest
        """
        manifest = self.load_manifest()
        if model_name not in manifest.get("models", {}):
            raise KeyError(f"Model '{model_name}' not found.")

        meta = manifest["models"][model_name]
        current_stage = meta.get("stage", "development")

        if target_stage == "production" and not force:
            gates = self.evaluate_sla_gates(model_name)
            if not gates["all_gates_passed"]:
                raise PermissionError(
                    f"SLA Evaluation Gate Failed for {model_name}: {json.dumps(gates['checks'], indent=2)}. "
                    "Use --force to override."
                )

        # If currently in production and replacing, or promoting to production, backup existing
        prod_file = self.models_dir / meta["artifact"]
        if prod_file.exists():
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            backup_name = f"{model_name}_{meta.get('version', 'v1')}_{timestamp}.joblib"
            backup_path = self.backups_dir / backup_name
            shutil.copy2(prod_file, backup_path)
            logger.info(f"Created rollback backup: {backup_path}")

        meta["stage"] = target_stage
        meta["updated_at"] = datetime.now(timezone.utc).isoformat()
        manifest["models"][model_name] = meta
        self.save_manifest(manifest)

        logger.info(f"Successfully promoted '{model_name}' from '{current_stage}' -> '{target_stage}'")
        return meta

    def rollback_model(self, model_name: str, backup_filename: Optional[str] = None) -> Dict[str, Any]:
        """
        Rolls back a model from the backups directory.
        If backup_filename is not specified, selects the latest backup for that model.
        """
        pattern = f"{model_name}_*.joblib"
        backups = sorted(self.backups_dir.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)

        if not backups:
            raise FileNotFoundError(f"No rollback backups found for model '{model_name}' in {self.backups_dir}")

        chosen_backup = None
        if backup_filename:
            candidate = self.backups_dir / backup_filename
            if candidate.exists():
                chosen_backup = candidate
            else:
                raise FileNotFoundError(f"Specified backup file not found: {candidate}")
        else:
            chosen_backup = backups[0]

        dest_file = self.models_dir / f"{model_name}.joblib"
        logger.info(f"Rolling back '{model_name}' to backup: {chosen_backup.name}")
        shutil.copy2(chosen_backup, dest_file)

        sha = compute_sha256(dest_file)
        manifest = self.load_manifest()
        meta = manifest["models"].get(model_name, {})
        meta["sha256"] = sha
        meta["stage"] = "production"
        meta["updated_at"] = datetime.now(timezone.utc).isoformat()
        meta["rolled_back_from"] = chosen_backup.name
        manifest["models"][model_name] = meta
        self.save_manifest(manifest)

        logger.info(f"Rollback complete: '{model_name}' restored and set to stage 'production'")
        return meta


# ── CLI Interface ─────────────────────────────────────────────────────────

def print_model_table(models: List[Dict[str, Any]]) -> None:
    """Format and print an aligned model inventory table."""
    print("\n" + "=" * 105)
    print(f"{'MODEL NAME':<24} | {'VERSION':<7} | {'STAGE':<12} | {'ROC-AUC':<8} | {'PR-AUC':<8} | {'SIZE (MB)':<10} | {'SHA256 PREFIX':<16}")
    print("=" * 105)
    for m in models:
        name = m.get("model_name", "")
        ver = m.get("version", "2.4.0")
        stage = m.get("stage", "production")
        sz = m.get("size_mb", 0.0)
        sha = m.get("sha256", "")[:16]

        metrics = m.get("metrics", {})
        if "metrics" in metrics and isinstance(metrics["metrics"], dict):
            metrics = metrics["metrics"]
        roc = f"{metrics.get('test_roc_auc', 0.0):.4f}" if "test_roc_auc" in metrics else "N/A"
        pr = f"{metrics.get('test_pr_auc', 0.0):.4f}" if "test_pr_auc" in metrics else "N/A"

        print(f"{name:<24} | {ver:<7} | {stage:<12} | {roc:<8} | {pr:<8} | {sz:<10.2f} | {sha:<16}...")
    print("=" * 105 + "\n")


def main():
    parser = argparse.ArgumentParser(description="HormuzWatch ML Model Management Tool")
    subparsers = parser.add_subparsers(dest="subcommand", required=True)

    # list
    subparsers.add_parser("list", help="List all cataloged ML models")

    # scan
    subparsers.add_parser("scan", help="Scan and rebuild model registry manifest")

    # verify
    ver_p = subparsers.add_parser("verify", help="Verify model artifact integrity and checksums")
    ver_p.add_argument("model_name", help="Model name to verify (or 'all')")

    # inspect
    ins_p = subparsers.add_parser("inspect", help="Inspect model metadata and parameters")
    ins_p.add_argument("model_name", help="Model name to inspect")

    # promote
    pro_p = subparsers.add_parser("promote", help="Promote model stage (development -> staging -> production)")
    pro_p.add_argument("model_name", help="Model name to promote")
    pro_p.add_argument("--stage", choices=["development", "staging", "production", "archived"], default="production")
    pro_p.add_argument("--force", action="store_true", help="Bypass SLA gate checks")

    # rollback
    rb_p = subparsers.add_parser("rollback", help="Atomic rollback to prior production backup")
    rb_p.add_argument("model_name", help="Model name to rollback")
    rb_p.add_argument("--backup", default=None, help="Specific backup file to restore")

    # gate
    gate_p = subparsers.add_parser("gate", help="Evaluate SLA gates for model promotion")
    gate_p.add_argument("model_name", help="Model name to evaluate")

    # zenml-train
    ztrain_p = subparsers.add_parser("zenml-train", help="Execute Continuous Training pipeline via ZenML")
    ztrain_p.add_argument("--domain", choices=["vessel", "aviation", "all"], default="vessel", help="Domain")
    ztrain_p.add_argument("--dataset-id", default=None, help="Dataset ID")
    ztrain_p.add_argument("--deploy", action="store_true", default=False, help="Deploy on pass")

    # zenml-e2e
    ze2e_p = subparsers.add_parser("zenml-e2e", help="Execute End-to-End MLOps pipeline via ZenML")
    ze2e_p.add_argument("--domain", choices=["vessel", "aviation", "all"], default="vessel", help="Domain")
    ze2e_p.add_argument("--limit", type=int, default=None, help="Extraction limit")
    ze2e_p.add_argument("--deploy", action="store_true", default=False, help="Deploy on pass")

    args = parser.parse_args()
    mgr = ModelManager()

    if args.subcommand == "list":
        models = mgr.list_models()
        print_model_table(models)

    elif args.subcommand == "scan":
        mgr.scan_models()
        print_model_table(mgr.list_models())

    elif args.subcommand == "verify":
        if args.model_name == "all":
            all_ok = True
            for m in mgr.list_models():
                res = mgr.verify_model(m["model_name"])
                status = "[✓] PASS" if res["status"] == "VERIFIED" else "[x] FAIL"
                print(f"{status} {m['model_name']:<24} (SHA256: {res['actual_sha256'][:16]}...)")
                if res["status"] != "VERIFIED":
                    all_ok = False
            sys.exit(0 if all_ok else 1)
        else:
            res = mgr.verify_model(args.model_name)
            print(json.dumps(res, indent=2))
            sys.exit(0 if res["status"] == "VERIFIED" else 1)

    elif args.subcommand == "inspect":
        info = mgr.inspect_model(args.model_name)
        print(json.dumps(info, indent=2))

    elif args.subcommand == "gate":
        gates = mgr.evaluate_sla_gates(args.model_name)
        print(json.dumps(gates, indent=2))
        sys.exit(0 if gates["all_gates_passed"] else 1)

    elif args.subcommand == "promote":
        try:
            res = mgr.promote_model(args.model_name, target_stage=args.stage, force=args.force)
            print(f"[✓] Promoted {args.model_name} to {args.stage}")
            print(json.dumps(res, indent=2))
        except Exception as e:
            print(f"[-] Promotion failed: {e}")
            sys.exit(1)

    elif args.subcommand == "rollback":
        try:
            res = mgr.rollback_model(args.model_name, backup_filename=args.backup)
            print(f"[✓] Rolled back {args.model_name} to production")
            print(json.dumps(res, indent=2))
        except Exception as e:
            print(f"[-] Rollback failed: {e}")
            sys.exit(1)

    elif args.subcommand == "zenml-train":
        from mlops.pipeline.zenml.pipelines.continuous_training_pipeline import (
            hormuz_continuous_training_pipeline,
        )
        res = hormuz_continuous_training_pipeline(
            domain=args.domain,
            dataset_id=args.dataset_id,
            deploy_on_pass=args.deploy,
        )
        print(json.dumps(res, indent=2, default=str))

    elif args.subcommand == "zenml-e2e":
        from mlops.pipeline.zenml.pipelines.e2e_pipeline import hormuz_e2e_pipeline
        res = hormuz_e2e_pipeline(
            domain=args.domain,
            limit=args.limit,
            deploy_on_pass=args.deploy,
        )
        print(json.dumps(res, indent=2, default=str))


if __name__ == "__main__":
    main()
