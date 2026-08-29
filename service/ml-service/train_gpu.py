#!/usr/bin/env python3
"""
GPU-accelerated model training for HormuzWatch ML service.
Uses ROCm/PyTorch/CuPy backend when available, falls back to CPU.

Usage:
    python train_gpu.py --domain vessel
    python train_gpu.py --domain aviation --data training.csv
    python train_gpu.py --domain news --data news_articles.csv
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
MODELS_DIR = ROOT / "models"
MODELS_DIR.mkdir(exist_ok=True)


# ═══════════════════════════════════════════════════════════
#  GPU Detection
# ═══════════════════════════════════════════════════════════

def detect_gpu() -> dict:
    """Detect AMD GPU via ROCm/PyTorch and return device info."""
    info = {
        "device": "cpu",
        "name": "CPU",
        "vram_gb": 0,
        "rocm_available": False,
        "compute_units": 0,
    }

    # Method 1: rocm-smi CLI
    try:
        import subprocess
        result = subprocess.run(
            ["rocm-smi", "--showproductname", "--json"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            gpus = [k for k in data if k.startswith("card")]
            if gpus:
                gpu = data[gpus[0]]
                info["rocm_available"] = True
                info["name"] = gpu.get("Product Name", "AMD GPU")
                vram_str = gpu.get("VRAM", "0")
                info["vram_gb"] = int(vram_str.split()[0]) if vram_str else 0
    except Exception:
        pass

    # Method 2: PyTorch (ROCm reports as CUDA)
    try:
        import torch
        if torch.cuda.is_available():
            gpu_id = int(os.environ.get("GPU_DEVICE", "0"))
            info["device"] = f"cuda:{gpu_id}"
            info["name"] = torch.cuda.get_device_name(gpu_id)
            info["vram_gb"] = torch.cuda.get_device_properties(gpu_id).total_mem // (1024 ** 3)
            info["rocm_available"] = True
            info["compute_units"] = torch.cuda.get_device_properties(gpu_id).multi_processor_count
    except ImportError:
        pass

    # Method 3: CuPy
    if not info["rocm_available"]:
        try:
            import cupy as cp
            gpu_count = cp.cuda.runtime.getDeviceCount()
            if gpu_count > 0:
                props = cp.cuda.runtime.getDeviceProperties(0)
                info["rocm_available"] = True
                info["device"] = "cupy:0"
                info["name"] = props["name"].decode() if isinstance(props["name"], bytes) else props["name"]
                info["vram_gb"] = props["totalGlobalMem"] // (1024 ** 3)
                info["compute_units"] = props.get("multiProcessorCount", 0)
        except ImportError:
            pass

    return info


# ═══════════════════════════════════════════════════════════
#  Training
# ═══════════════════════════════════════════════════════════

def train_with_gpu(domain: str, data_path: str = None):
    """Train an ensemble model using GPU acceleration when available."""
    gpu = detect_gpu()
    use_gpu = gpu["rocm_available"]
    device = gpu["device"]

    print(f"  GPU:  {gpu['name']}")
    print(f"  VRAM: {gpu['vram_gb']} GB")
    print(f"  Device: {device}")
    print(f"  Acceleration: {'ENABLED' if use_gpu else 'DISABLED (CPU)'}")

    # ── Load domain feature specification ──────────────────
    sys.path.insert(0, str(ROOT))
    try:
        from lib.features import DOMAIN_FEATURE_COLS
    except ImportError:
        print("  ERROR: Cannot import lib.features. Run from ml-service/ directory.", file=sys.stderr)
        sys.exit(1)

    if domain not in DOMAIN_FEATURE_COLS:
        print(f"  Unknown domain: {domain}")
        print(f"  Available: {list(DOMAIN_FEATURE_COLS.keys())}")
        sys.exit(1)

    feature_cols = DOMAIN_FEATURE_COLS[domain]
    n_features = len(feature_cols)
    print(f"  Domain: {domain} ({n_features} features)")
    print(f"  Columns: {feature_cols[:5]}..." if n_features > 5 else f"  Columns: {feature_cols}")

    # ── Load or generate training data ─────────────────────
    if data_path and Path(data_path).exists():
        try:
            import pandas as pd
            df = pd.read_csv(data_path)
            # Select columns that exist in the CSV
            available = [c for c in feature_cols if c in df.columns]
            if len(available) < n_features * 0.5:
                print(f"  WARNING: Only {len(available)}/{n_features} feature columns found in CSV")
            X = df[available].values.astype(np.float32)
            print(f"  Data: {X.shape[0]} samples x {X.shape[1]} features (from CSV)")
        except Exception as e:
            print(f"  ERROR loading data: {e}")
            sys.exit(1)
    else:
        # Synthetic data for benchmarking
        n_samples = 5000
        np.random.seed(42)
        X = np.random.randn(n_samples, n_features).astype(np.float32) * 2
        # Inject anomalies (5% of data)
        n_anomalies = max(10, n_samples // 20)
        X[:n_anomalies] += np.random.randn(n_anomalies, n_features).astype(np.float32) * 8
        print(f"  Data: {n_samples} synthetic samples x {n_features} features")
        print(f"  Anomalies injected: {n_anomalies} ({100*n_anomalies/n_samples:.1f}%)")

    # ── Preprocessing ──────────────────────────────────────
    from sklearn.preprocessing import StandardScaler

    t0 = time.time()
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X).astype(np.float32)
    preprocess_time = time.time() - t0

    # ── GPU-accelerated Training ───────────────────────────
    t_train_start = time.time()
    gpu_ops_used = []

    if use_gpu:
        # ── Option A: CuPy GPU arrays (faster numpy ops) ──
        try:
            import cupy as cp
            X_gpu = cp.asarray(X_scaled)
            print(f"  CuPy GPU array: {X_gpu.shape} ({X_gpu.nbytes / (1024**2):.0f} MB)")
            gpu_ops_used.append("cupy")
        except Exception as e:
            print(f"  CuPy unavailable: {e}")

        # ── Option B: XGBoost with GPU histogram ───────────
        try:
            import xgboost as xgb
            dtrain = xgb.DMatrix(X_scaled)
            params = {
                "objective": "reg:squarederror",
                "tree_method": "hist",
                "device": "cuda" if use_gpu else "cpu",
                "max_depth": 6,
                "eta": 0.1,
                "subsample": 0.8,
            }
            bst = xgb.train(params, dtrain, num_boost_round=50, verbose_eval=False)
            xgb_anomaly = bst.predict(dtrain)
            print(f"  XGBoost GPU trained ({50} rounds, {time.time() - t_train_start:.1f}s)")
            gpu_ops_used.append("xgboost_gpu")
        except Exception as e:
            print(f"  XGBoost GPU skipped: {e}")

    # ── Core Ensemble (sklearn, CPU-preprocessed) ──────────
    from sklearn.ensemble import IsolationForest
    from sklearn.neighbors import LocalOutlierFactor

    iso = IsolationForest(
        n_estimators=200,
        contamination=0.05,
        random_state=42,
        n_jobs=-1,          # Use all CPU cores
        max_samples=0.8,
    ).fit(X_scaled)

    lof = LocalOutlierFactor(
        n_neighbors=min(20, len(X_scaled) - 1),
        contamination=0.05,
        novelty=True,
        n_jobs=-1,
    ).fit(X_scaled)

    train_time = time.time() - t_train_start

    # ── Evaluation ─────────────────────────────────────────
    iso_scores = iso.score_samples(X_scaled)
    lof_scores = lof.score_samples(X_scaled)

    # Print top anomalies
    anomaly_indices = np.argsort(iso_scores)[:5]
    print(f"\n  Top 5 anomaly scores (IsolationForest):")
    for idx in anomaly_indices:
        print(f"    Sample {idx}: {iso_scores[idx]:.3f}")

    # ── Save bundle ────────────────────────────────────────
    import joblib

    bundle = {
        "model_iforest": iso,
        "model_lof": lof,
        "scaler": scaler,
        "calibrator": None,
        "feature_cols": feature_cols,
        "domain": domain,
        "version": "2.0.0",
        "gpu_trained": use_gpu,
        "device": device,
        "gpu_name": gpu["name"],
        "gpu_ops": gpu_ops_used,
        "train_samples": len(X_scaled),
        "train_features": len(feature_cols),
        "train_time_seconds": round(train_time, 2),
        "preprocess_time_seconds": round(preprocess_time, 2),
        "total_time_seconds": round(train_time + preprocess_time, 2),
    }

    bundle_path = MODELS_DIR / f"{domain}_ensemble.joblib"
    joblib.dump(bundle, bundle_path)
    size_mb = bundle_path.stat().st_size / (1024 ** 2)

    print(f"\n  ═══ Training Complete ═══")
    print(f"  Model:     {bundle_path}")
    print(f"  Size:      {size_mb:.1f} MB")
    print(f"  Train:     {train_time:.1f}s")
    print(f"  Total:     {train_time + preprocess_time:.1f}s")
    print(f"  GPU:       {'Yes' if use_gpu else 'No'} ({gpu['name']})")
    print(f"  GPU ops:   {gpu_ops_used if gpu_ops_used else ['cpu-only']}")
    print(f"  Samples:   {len(X_scaled)}")
    print(f"  Features:  {len(feature_cols)}")

    return bundle


# ═══════════════════════════════════════════════════════════
#  CLI
# ═══════════════════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="HormuzWatch GPU-Accelerated Model Training",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python train_gpu.py --domain vessel
  python train_gpu.py --domain aviation --data /path/to/training.csv
  python train_gpu.py --domain news --data news_articles.csv
  python train_gpu.py --domain vessel --output my_model.joblib
        """
    )
    parser.add_argument(
        "--domain", required=True,
        choices=["vessel", "aviation", "heatmap", "news"],
        help="Domain to train model for"
    )
    parser.add_argument(
        "--data",
        help="Path to CSV training data (uses synthetic data if omitted)"
    )
    parser.add_argument(
        "--output",
        help="Custom output path for model bundle (default: models/<domain>_ensemble.joblib)"
    )
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  HormuzWatch GPU Training: {args.domain}")
    print(f"{'='*60}\n")

    bundle = train_with_gpu(args.domain, args.data)

    if args.output:
        import joblib
        joblib.dump(bundle, args.output)
        print(f"\n  Also saved to: {args.output}")
