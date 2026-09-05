#!/usr/bin/env python3
"""
HormuzWatch Dataset Registry & Versioning Utility
Provides cryptographic hashing, schema validation, artifact cataloging,
and portability synchronization for maritime and aviation training datasets.
"""

import os
import sys
import json
import hashlib
import argparse
import tarfile
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_DATASET_DIR = Path(__file__).resolve().parent.parent / "server" / "datasets"
DEFAULT_MANIFEST_PATH = DEFAULT_DATASET_DIR / "registry_manifest.json"

def compute_sha256(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(1024 * 1024):
            h.update(chunk)
    return h.hexdigest()

def scan_dataset(dataset_path: Path) -> dict:
    meta_file = dataset_path / "metadata.json"
    if not meta_file.exists():
        return None

    with open(meta_file, "r") as f:
        meta = json.load(f)

    dataset_id = meta.get("dataset_id", dataset_path.name)
    domain = meta.get("domain", "unknown")
    version = meta.get("dataset_version", "1.0.0")

    file_hashes = {}
    total_bytes = 0
    for f in dataset_path.iterdir():
        if f.is_file() and not f.name.endswith(".tmp"):
            sha = compute_sha256(f)
            size = f.stat().st_size
            file_hashes[f.name] = {
                "sha256": sha,
                "size_bytes": size
            }
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
        "files": file_hashes
    }

def build_manifest(datasets_dir: Path = DEFAULT_DATASET_DIR, output_file: Path = DEFAULT_MANIFEST_PATH):
    print(f"[*] Scanning datasets in: {datasets_dir}")
    registry = {
        "registry_version": "1.0.0",
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "total_datasets": 0,
        "datasets": {}
    }

    if not datasets_dir.exists():
        print(f"[-] Datasets directory {datasets_dir} does not exist.")
        return registry

    for item in datasets_dir.iterdir():
        if item.is_dir():
            ds_info = scan_dataset(item)
            if ds_info:
                print(f"  + Registered: {ds_info['dataset_id']} (v{ds_info['version']} - {ds_info['domain']}) | {ds_info['total_rows']} rows")
                registry["datasets"][ds_info["dataset_id"]] = ds_info

    registry["total_datasets"] = len(registry["datasets"])

    with open(output_file, "w") as f:
        json.dump(registry, f, indent=2)

    print(f"[✓] Manifest saved to: {output_file}")
    return registry

def verify_dataset(dataset_id: str, datasets_dir: Path = DEFAULT_DATASET_DIR, manifest_file: Path = DEFAULT_MANIFEST_PATH):
    if not manifest_file.exists():
        print(f"[-] Manifest not found: {manifest_file}. Run build-manifest first.")
        sys.exit(1)

    with open(manifest_file, "r") as f:
        manifest = json.load(f)

    if dataset_id not in manifest["datasets"]:
        print(f"[-] Dataset {dataset_id} not in manifest.")
        sys.exit(1)

    info = manifest["datasets"][dataset_id]
    ds_dir = datasets_dir / dataset_id
    if not ds_dir.exists():
        print(f"[-] Dataset directory missing: {ds_dir}")
        sys.exit(1)

    print(f"[*] Verifying SHA256 cryptographic hashes for {dataset_id}...")
    errors = 0
    for filename, expected in info["files"].items():
        filepath = ds_dir / filename
        if not filepath.exists():
            print(f"  [MISSING] {filename}")
            errors += 1
            continue
        actual_sha = compute_sha256(filepath)
        if actual_sha == expected["sha256"]:
            print(f"  [OK] {filename} (sha256: {actual_sha[:12]}...)")
        else:
            print(f"  [FAIL] {filename} HASH MISMATCH!\n    Expected: {expected['sha256']}\n    Actual:   {actual_sha}")
            errors += 1

    if errors == 0:
        print(f"[✓] All files verified successfully for {dataset_id}!")
    else:
        print(f"[x] Verification failed with {errors} errors.")
        sys.exit(1)

def export_tar(dataset_id: str, output_dir: Path, datasets_dir: Path = DEFAULT_DATASET_DIR):
    ds_path = datasets_dir / dataset_id
    if not ds_path.exists():
        print(f"[-] Dataset {dataset_id} not found at {ds_path}")
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)
    tar_path = output_dir / f"{dataset_id}.tar.gz"
    print(f"[*] Packaging {dataset_id} into {tar_path}...")
    with tarfile.open(tar_path, "w:gz") as tar:
        tar.add(ds_path, arcname=dataset_id)
    sha = compute_sha256(tar_path)
    print(f"[✓] Exported: {tar_path} ({tar_path.stat().st_size / (1024*1024):.2f} MB)")
    print(f"    SHA256: {sha}")

def list_datasets(manifest_file: Path = DEFAULT_MANIFEST_PATH):
    if not manifest_file.exists():
        build_manifest()
    with open(manifest_file, "r") as f:
        manifest = json.load(f)

    print("\n" + "="*85)
    print(f"{'DATASET ID':<45} | {'DOMAIN':<8} | {'VER':<5} | {'ROWS':<8} | {'SIZE (MB)':<10}")
    print("="*85)
    for ds_id, meta in manifest.get("datasets", {}).items():
        size_mb = meta.get("total_size_bytes", 0) / (1024 * 1024)
        print(f"{ds_id:<45} | {meta.get('domain',''):<8} | {meta.get('version',''):<5} | {meta.get('total_rows',0):<8} | {size_mb:<10.2f}")
    print("="*85 + "\n")

def main():
    parser = argparse.ArgumentParser(description="HormuzWatch Dataset Registry")
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("build-manifest", help="Build/Update registry manifest")
    subparsers.add_parser("list", help="List registered datasets")

    verify_p = subparsers.add_parser("verify", help="Verify dataset integrity")
    verify_p.add_argument("dataset_id", help="ID of dataset to verify")

    export_p = subparsers.add_parser("export-tar", help="Export dataset as tar.gz")
    export_p.add_argument("dataset_id", help="ID of dataset to export")
    export_p.add_argument("--out-dir", default="./dist/datasets", help="Output directory")

    args = parser.parse_args()

    if args.command == "build-manifest":
        build_manifest()
    elif args.command == "list":
        list_datasets()
    elif args.command == "verify":
        verify_dataset(args.dataset_id)
    elif args.command == "export-tar":
        export_tar(args.dataset_id, Path(args.out_dir))
    else:
        list_datasets()

if __name__ == "__main__":
    main()
