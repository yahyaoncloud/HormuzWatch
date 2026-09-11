"""
exp/scripts/promote_models.py
=============================
Promotes tested and validated candidate models from the /exp laboratory
to production in service/ml-service/models/, updating cryptographic manifests.
"""

import hashlib
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

EXP_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = EXP_ROOT.parent
PROD_MODELS_DIR = PROJECT_ROOT / "service" / "ml-service" / "models"
EXP_MODELS_DIR = EXP_ROOT / "models"
EXP_REPORTS_DIR = EXP_ROOT / "reports"
MANIFEST_PATH = PROD_MODELS_DIR / "registry_manifest.json"


def sha256_file(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def main():
    report_file = EXP_REPORTS_DIR / "model_refinement_report.json"
    if not report_file.exists():
        print("[-] Error: Model refinement report not found. Run refine_models.py first.")
        sys.exit(1)

    with open(report_file, "r") as f:
        report_data = json.load(f)

    if not MANIFEST_PATH.exists():
        print("[-] Error: Production registry_manifest.json not found.")
        sys.exit(1)

    with open(MANIFEST_PATH, "r") as f:
        manifest = json.load(f)

    models_promoted = 0
    for domain, res in report_data["models"].items():
        src_path = EXP_MODELS_DIR / f"{domain}_ensemble.joblib"
        if not src_path.exists():
            print(f"[-] Skipping {domain}: Artifact {src_path} not found.")
            continue

        dst_path = PROD_MODELS_DIR / f"{domain}_ensemble.joblib"
        print(f"[*] Promoting {domain}_ensemble.joblib to production...")
        shutil.copy2(src_path, dst_path)

        # Compute SHA-256 and size
        digest = sha256_file(dst_path)
        size_bytes = dst_path.stat().st_size
        size_mb = round(size_bytes / (1024 * 1024), 2)

        model_key = f"{domain}_ensemble"
        manifest["models"][model_key] = {
            "artifact": f"{domain}_ensemble.joblib",
            "version": "2.4.0",
            "stage": "production",
            "sha256": digest,
            "size_bytes": size_bytes,
            "size_mb": size_mb,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "optimal_threshold": res.get("optimal_threshold", 0.5),
            "metrics": {
                "domain": domain,
                "status": "SUCCESS",
                "n_samples": res.get("n_samples", 0),
                "metrics": res.get("metrics", {}),
            },
        }
        models_promoted += 1

    manifest["last_updated"] = datetime.now(timezone.utc).isoformat()
    manifest["total_models"] = len(manifest["models"])

    with open(MANIFEST_PATH, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"[✓] Successfully promoted {models_promoted} models to production.")
    print(f"[✓] Updated manifest at: {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
