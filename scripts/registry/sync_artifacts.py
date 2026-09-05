#!/usr/bin/env python3
"""
HormuzWatch MinIO Model & Dataset Synchronizer
Uploads or downloads versioned models and datasets to/from the S3/MinIO registry.
Uses urllib/requests or minio SDK if available, with zero-dependency HTTP fallback.
"""

import os
import sys
import json
import urllib.request
import urllib.error
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = ROOT_DIR / "service" / "ml-service" / "models"
DATASETS_DIR = ROOT_DIR / "server" / "datasets"

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://127.0.0.1:9000")
BUCKET_MODELS = "hormuzwatch-models"
BUCKET_DATASETS = "hormuzwatch-datasets"

def upload_file(local_path: Path, bucket: str, object_name: str):
    url = f"{MINIO_ENDPOINT}/{bucket}/{object_name}"
    print(f"[*] Uploading {local_path.name} -> {url}...")
    try:
        with open(local_path, "rb") as data:
            req = urllib.request.Request(url, data=data, method="PUT")
            with urllib.request.urlopen(req) as resp:
                if resp.status in (200, 201):
                    print(f"  [✓] Uploaded: {object_name}")
                else:
                    print(f"  [-] Status: {resp.status}")
    except Exception as e:
        print(f"  [-] Error uploading {object_name}: {e}")

def download_file(bucket: str, object_name: str, local_path: Path):
    url = f"{MINIO_ENDPOINT}/{bucket}/{object_name}"
    print(f"[*] Downloading {url} -> {local_path}...")
    try:
        urllib.request.urlretrieve(url, str(local_path))
        print(f"  [✓] Downloaded: {local_path.name}")
    except Exception as e:
        print(f"  [-] Error downloading {object_name}: {e}")

def sync_models_to_registry():
    print(f"=== Syncing Models from {MODELS_DIR} to {BUCKET_MODELS} ===")
    for model_file in sorted(MODELS_DIR.glob("*.joblib")):
        upload_file(model_file, BUCKET_MODELS, model_file.name)
    manifest = MODELS_DIR / "registry_manifest.json"
    if manifest.exists():
        upload_file(manifest, BUCKET_MODELS, "registry_manifest.json")

def sync_models_from_registry():
    print(f"=== Pulling Models from {BUCKET_MODELS} to {MODELS_DIR} ===")
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    # Download manifest first
    manifest_path = MODELS_DIR / "registry_manifest.json"
    download_file(BUCKET_MODELS, "registry_manifest.json", manifest_path)
    if manifest_path.exists():
        with open(manifest_path) as f:
            meta = json.load(f)
        for name, info in meta.get("models", {}).items():
            art = info["artifact"]
            download_file(BUCKET_MODELS, art, MODELS_DIR / art)

def main():
    action = sys.argv[1] if len(sys.argv) > 1 else "help"
    if action == "push-models":
        sync_models_to_registry()
    elif action == "pull-models":
        sync_models_from_registry()
    else:
        print("Usage: sync_artifacts.py {push-models|pull-models}")

if __name__ == "__main__":
    main()
