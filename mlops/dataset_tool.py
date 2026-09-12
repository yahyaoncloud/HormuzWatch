"""
mlops/dataset_tool.py
=====================
Comprehensive dataset storage, integrity verification, cataloging,
and lifecycle management tool for HormuzWatch MLOps.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import shutil
import sys
import tarfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("mlops.dataset_tool")

# Locate default server/datasets directory
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DATASETS_DIR = PROJECT_ROOT / "server" / "datasets"
DEFAULT_MANIFEST_PATH = DEFAULT_DATASETS_DIR / "registry_manifest.json"


def compute_sha256(filepath: Union[str, Path]) -> str:
    """Compute SHA-256 cryptographic hash of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(1024 * 1024):
            h.update(chunk)
    return h.hexdigest()


class DatasetManager:
    """Manages versioned dataset artifacts, metadata manifests, and integrity checks."""

    def __init__(
        self,
        datasets_dir: Optional[Union[str, Path]] = None,
        manifest_path: Optional[Union[str, Path]] = None,
    ):
        self.datasets_dir = Path(datasets_dir) if datasets_dir else DEFAULT_DATASETS_DIR
        self.datasets_dir.mkdir(parents=True, exist_ok=True)
        self.manifest_path = Path(manifest_path) if manifest_path else (self.datasets_dir / "registry_manifest.json")

    def load_manifest(self) -> Dict[str, Any]:
        """Load manifest from disk or initialize empty."""
        if self.manifest_path.exists():
            try:
                with open(self.manifest_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Error reading manifest {self.manifest_path}: {e}")
        return {
            "registry_version": "1.0.0",
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "total_datasets": 0,
            "datasets": {},
        }

    def save_manifest(self, manifest: Dict[str, Any]) -> None:
        """Save manifest atomically to disk."""
        manifest["last_updated"] = datetime.now(timezone.utc).isoformat()
        manifest["total_datasets"] = len(manifest.get("datasets", {}))
        tmp_path = self.manifest_path.with_suffix(".tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        tmp_path.replace(self.manifest_path)

    def scan_dataset(self, dataset_path: Path) -> Optional[Dict[str, Any]]:
        """Scans a dataset directory and generates manifest info."""
        meta_file = dataset_path / "metadata.json"
        if not meta_file.exists():
            return None

        with open(meta_file, "r", encoding="utf-8") as f:
            meta = json.load(f)

        dataset_id = meta.get("dataset_id", dataset_path.name)
        domain = meta.get("domain", "unknown")
        version = meta.get("dataset_version", "1.0.0")

        file_hashes = {}
        total_bytes = 0
        for f in sorted(dataset_path.iterdir()):
            if f.is_file() and not f.name.endswith(".tmp"):
                sha = compute_sha256(f)
                size = f.stat().st_size
                file_hashes[f.name] = {"sha256": sha, "size_bytes": size}
                total_bytes += size

        return {
            "dataset_id": dataset_id,
            "domain": domain,
            "version": version,
            "created_at": meta.get("created_at", datetime.now(timezone.utc).isoformat()),
            "total_rows": meta.get("total_rows", 0),
            "train_rows": meta.get("train_rows", 0),
            "val_rows": meta.get("val_rows", 0),
            "test_rows": meta.get("test_rows", 0),
            "schema_version": meta.get("schema_version", "2.0.0"),
            "feature_version": meta.get("feature_version", "v2.0.0"),
            "total_size_bytes": total_bytes,
            "files": file_hashes,
        }

    def build_manifest(self) -> Dict[str, Any]:
        """Discovers and re-indexes all dataset folders in datasets_dir."""
        logger.info(f"Scanning datasets in {self.datasets_dir}...")
        manifest = self.load_manifest()

        for item in sorted(self.datasets_dir.iterdir()):
            if item.is_dir():
                info = self.scan_dataset(item)
                if info:
                    logger.info(f"  + Registered: {info['dataset_id']} ({info['domain']}) | {info['total_rows']} rows")
                    manifest["datasets"][info["dataset_id"]] = info

        self.save_manifest(manifest)
        logger.info(f"Manifest updated with {len(manifest['datasets'])} datasets.")
        return manifest

    def register_dataset(self, dataset_dir: Union[str, Path]) -> Dict[str, Any]:
        """Registers a specific dataset directory into the manifest."""
        ds_path = Path(dataset_dir)
        if not ds_path.is_absolute():
            ds_path = self.datasets_dir / ds_path

        if not ds_path.exists():
            raise FileNotFoundError(f"Dataset directory not found: {ds_path}")

        info = self.scan_dataset(ds_path)
        if not info:
            raise ValueError(f"Directory {ds_path} lacks a valid metadata.json file.")

        manifest = self.load_manifest()
        manifest["datasets"][info["dataset_id"]] = info
        self.save_manifest(manifest)
        logger.info(f"Successfully registered dataset: {info['dataset_id']}")
        return info

    def list_datasets(self) -> List[Dict[str, Any]]:
        """Returns list of all registered datasets."""
        manifest = self.load_manifest()
        if not manifest.get("datasets"):
            manifest = self.build_manifest()
        return list(manifest.get("datasets", {}).values())

    def verify_dataset(self, dataset_id: str) -> Dict[str, Any]:
        """Cryptographically verifies SHA-256 hashes of all files in a dataset."""
        manifest = self.load_manifest()
        if dataset_id not in manifest.get("datasets", {}):
            raise KeyError(f"Dataset '{dataset_id}' not found in registry manifest.")

        info = manifest["datasets"][dataset_id]
        ds_dir = self.datasets_dir / dataset_id
        if not ds_dir.exists():
            raise FileNotFoundError(f"Dataset directory missing on disk: {ds_dir}")

        verification_results = []
        all_passed = True

        for filename, exp in info.get("files", {}).items():
            f_path = ds_dir / filename
            if not f_path.exists():
                verification_results.append({
                    "file": filename,
                    "status": "MISSING",
                    "expected_sha256": exp["sha256"],
                    "actual_sha256": None,
                })
                all_passed = False
                continue

            actual_sha = compute_sha256(f_path)
            if actual_sha == exp["sha256"]:
                verification_results.append({
                    "file": filename,
                    "status": "OK",
                    "sha256": actual_sha,
                    "size_bytes": exp["size_bytes"],
                })
            else:
                verification_results.append({
                    "file": filename,
                    "status": "CORRUPTED",
                    "expected_sha256": exp["sha256"],
                    "actual_sha256": actual_sha,
                })
                all_passed = False

        return {
            "dataset_id": dataset_id,
            "status": "VERIFIED" if all_passed else "FAILED",
            "all_passed": all_passed,
            "files": verification_results,
        }

    def inspect_dataset(self, dataset_id: str) -> Dict[str, Any]:
        """Deep inspection of a dataset's metadata, quality report, and distribution."""
        manifest = self.load_manifest()
        if dataset_id not in manifest.get("datasets", {}):
            raise KeyError(f"Dataset '{dataset_id}' not found in manifest.")

        info = manifest["datasets"][dataset_id]
        ds_dir = self.datasets_dir / dataset_id

        meta_content = {}
        meta_file = ds_dir / "metadata.json"
        if meta_file.exists():
            with open(meta_file, "r", encoding="utf-8") as f:
                meta_content = json.load(f)

        quality_content = {}
        qual_file = ds_dir / "quality_report.json"
        if qual_file.exists():
            with open(qual_file, "r", encoding="utf-8") as f:
                quality_content = json.load(f)

        return {
            "manifest_info": info,
            "metadata": meta_content,
            "quality_report": quality_content,
        }

    def export_tar(self, dataset_id: str, out_dir: Optional[Union[str, Path]] = None) -> Path:
        """Export dataset as a compressed .tar.gz bundle with checksum file."""
        ds_dir = self.datasets_dir / dataset_id
        if not ds_dir.exists():
            raise FileNotFoundError(f"Dataset '{dataset_id}' not found at {ds_dir}")

        dest_dir = Path(out_dir) if out_dir else (PROJECT_ROOT / "dist" / "datasets")
        dest_dir.mkdir(parents=True, exist_ok=True)

        tar_path = dest_dir / f"{dataset_id}.tar.gz"
        logger.info(f"Packaging {dataset_id} into {tar_path}...")
        with tarfile.open(tar_path, "w:gz") as tar:
            tar.add(ds_dir, arcname=dataset_id)

        sha = compute_sha256(tar_path)
        sha_path = dest_dir / f"{dataset_id}.tar.gz.sha256"
        with open(sha_path, "w", encoding="utf-8") as f:
            f.write(f"{sha}  {tar_path.name}\n")

        logger.info(f"Export complete: {tar_path} ({tar_path.stat().st_size / (1024*1024):.2f} MB)")
        return tar_path

    def diff_datasets(self, dataset_id_1: str, dataset_id_2: str) -> Dict[str, Any]:
        """Compare two dataset versions."""
        d1 = self.inspect_dataset(dataset_id_1)
        d2 = self.inspect_dataset(dataset_id_2)

        m1 = d1["manifest_info"]
        m2 = d2["manifest_info"]

        return {
            "dataset_1": dataset_id_1,
            "dataset_2": dataset_id_2,
            "domain_match": m1["domain"] == m2["domain"],
            "row_difference": m2["total_rows"] - m1["total_rows"],
            "d1_rows": m1["total_rows"],
            "d2_rows": m2["total_rows"],
            "size_diff_bytes": m2["total_size_bytes"] - m1["total_size_bytes"],
            "feature_version_1": m1.get("feature_version"),
            "feature_version_2": m2.get("feature_version"),
            "files_d1": list(m1.get("files", {}).keys()),
            "files_d2": list(m2.get("files", {}).keys()),
        }


# ── CLI Interface ─────────────────────────────────────────────────────────

def print_dataset_table(datasets: List[Dict[str, Any]]) -> None:
    """Format and print an aligned dataset inventory table."""
    print("\n" + "=" * 100)
    print(f"{'DATASET ID':<42} | {'DOMAIN':<8} | {'VER':<5} | {'ROWS':<8} | {'SPLIT (TR/VA/TE)':<16} | {'SIZE (MB)':<10}")
    print("=" * 100)
    for ds in datasets:
        ds_id = ds.get("dataset_id", "")
        domain = ds.get("domain", "")
        ver = ds.get("version", "1.0.0")
        rows = ds.get("total_rows", 0)
        tr = ds.get("train_rows", 0)
        va = ds.get("val_rows", 0)
        te = ds.get("test_rows", 0)
        splits = f"{tr}/{va}/{te}"
        size_mb = ds.get("total_size_bytes", 0) / (1024 * 1024)
        print(f"{ds_id:<42} | {domain:<8} | {ver:<5} | {rows:<8} | {splits:<16} | {size_mb:<10.2f}")
    print("=" * 100 + "\n")


def main():
    parser = argparse.ArgumentParser(description="HormuzWatch Dataset Management Tool")
    subparsers = parser.add_subparsers(dest="subcommand", required=True)

    # list
    subparsers.add_parser("list", help="List all cataloged datasets")

    # scan / build-manifest
    subparsers.add_parser("build-manifest", help="Scan and rebuild dataset registry manifest")

    # register
    reg_p = subparsers.add_parser("register", help="Register a dataset directory")
    reg_p.add_argument("dataset_dir", help="Directory of dataset to register")

    # verify
    ver_p = subparsers.add_parser("verify", help="Verify cryptographic SHA-256 checksums")
    ver_p.add_argument("dataset_id", help="Dataset ID to verify (or 'all')")

    # inspect
    ins_p = subparsers.add_parser("inspect", help="Detailed metadata and quality report inspection")
    ins_p.add_argument("dataset_id", help="Dataset ID to inspect")

    # export
    exp_p = subparsers.add_parser("export", help="Export dataset into .tar.gz bundle")
    exp_p.add_argument("dataset_id", help="Dataset ID to export")
    exp_p.add_argument("--out-dir", default=None, help="Output directory")

    # diff
    diff_p = subparsers.add_parser("diff", help="Compare two dataset versions")
    diff_p.add_argument("dataset_1", help="First dataset ID")
    diff_p.add_argument("dataset_2", help="Second dataset ID")

    # zenml-etl
    zenml_p = subparsers.add_parser("zenml-etl", help="Execute ETL pipeline via ZenML orchestrator")
    zenml_p.add_argument("--domain", choices=["vessel", "aviation", "all"], default="vessel", help="Target domain")
    zenml_p.add_argument("--mode", choices=["auto", "api", "snapshot"], default="auto", help="Extraction source mode")
    zenml_p.add_argument("--limit", type=int, default=None, help="Sample count limit")
    zenml_p.add_argument("--dataset-id", type=str, default=None, help="Custom dataset ID")

    args = parser.parse_args()
    mgr = DatasetManager()

    if args.subcommand == "list":
        datasets = mgr.list_datasets()
        print_dataset_table(datasets)

    elif args.subcommand == "build-manifest":
        mgr.build_manifest()
        print_dataset_table(mgr.list_datasets())

    elif args.subcommand == "register":
        info = mgr.register_dataset(args.dataset_dir)
        print(json.dumps(info, indent=2))

    elif args.subcommand == "verify":
        if args.dataset_id == "all":
            all_ok = True
            for ds in mgr.list_datasets():
                res = mgr.verify_dataset(ds["dataset_id"])
                status = "[✓] PASS" if res["all_passed"] else "[x] FAIL"
                print(f"{status} {ds['dataset_id']}")
                if not res["all_passed"]:
                    all_ok = False
            sys.exit(0 if all_ok else 1)
        else:
            res = mgr.verify_dataset(args.dataset_id)
            print(f"\nVerification Results for: {args.dataset_id}")
            print("-" * 75)
            for f in res["files"]:
                st = f["status"]
                name = f["file"]
                sha = f.get("sha256", f.get("expected_sha256", ""))[:16]
                print(f"  [{st:<9}] {name:<25} (SHA256: {sha}...)")
            print("-" * 75)
            print(f"Overall Status: {res['status']}\n")
            sys.exit(0 if res["all_passed"] else 1)

    elif args.subcommand == "inspect":
        info = mgr.inspect_dataset(args.dataset_id)
        print(json.dumps(info, indent=2))

    elif args.subcommand == "export":
        out = mgr.export_tar(args.dataset_id, out_dir=args.out_dir)
        print(f"[✓] Exported to: {out}")

    elif args.subcommand == "diff":
        diff = mgr.diff_datasets(args.dataset_1, args.dataset_2)
        print(json.dumps(diff, indent=2))

    elif args.subcommand == "zenml-etl":
        from mlops.pipeline.zenml.pipelines.etl_pipeline import hormuz_etl_pipeline
        res = hormuz_etl_pipeline(
            domain=args.domain,
            source_mode=args.mode,
            limit=args.limit,
            dataset_id=args.dataset_id,
        )
        print(json.dumps(res, indent=2, default=str))


if __name__ == "__main__":
    main()
