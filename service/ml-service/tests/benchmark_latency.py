"""
tests/benchmark_latency.py
--------------------------
Empirical high-resolution latency benchmark of ML inference pipeline.
Measures p50, p95, p99 latencies for fast path (explain=False) and
explain path (explain=True) across 1,000 iterations.
"""

from __future__ import annotations

import json
import platform
import sys
import time
from pathlib import Path

import numpy as np

ML_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ML_ROOT))

from app import _load_bundle
from lib.scoring import score
from lib.features import DOMAIN_FEATURE_COLS


def run_benchmark(n_iterations: int = 1000):
    bundle = _load_bundle("vessel")
    feature_names = DOMAIN_FEATURE_COLS["vessel"]

    # Generate test feature vectors with varying characteristics
    rng = np.random.default_rng(42)
    sample_features = [
        np.array([
            float(rng.uniform(0, 50)),
            float(rng.uniform(-30, 30)),
            float(rng.normal(0, 2)),
            float(rng.uniform(8, 20)),
            float(rng.exponential(2)),
            float(rng.exponential(3)),
            float(rng.uniform(0.1, 10)),
            float(rng.uniform(0.1, 10)),
            float(rng.exponential(1)),
        ])
        for _ in range(n_iterations)
    ]

    # Warmup
    for i in range(20):
        _ = score(sample_features[i], feature_names, bundle=bundle, explain=False)
        _ = score(sample_features[i], feature_names, bundle=bundle, explain=True)

    # 1. Fast path (explain=False)
    fast_latencies = []
    stage_breakdowns = []
    for i in range(n_iterations):
        t0 = time.perf_counter()
        res = score(sample_features[i], feature_names, bundle=bundle, explain=False)
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        fast_latencies.append(elapsed_ms)
        stage_breakdowns.append(res.timing_breakdown)

    # 2. Explain path (explain=True with TreeSHAP)
    explain_latencies = []
    explain_breakdowns = []
    for i in range(n_iterations // 5):  # 200 iterations for SHAP
        t0 = time.perf_counter()
        res = score(sample_features[i], feature_names, bundle=bundle, explain=True)
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        explain_latencies.append(elapsed_ms)
        explain_breakdowns.append(res.timing_breakdown)

    fast_arr = np.array(fast_latencies)
    exp_arr = np.array(explain_latencies)

    results = {
        "hardware": {
            "system": platform.system(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "python_version": platform.python_version(),
        },
        "fast_path_ms": {
            "iterations": n_iterations,
            "mean": round(float(np.mean(fast_arr)), 3),
            "p50": round(float(np.percentile(fast_arr, 50)), 3),
            "p90": round(float(np.percentile(fast_arr, 90)), 3),
            "p95": round(float(np.percentile(fast_arr, 95)), 3),
            "p99": round(float(np.percentile(fast_arr, 99)), 3),
            "min": round(float(np.min(fast_arr)), 3),
            "max": round(float(np.max(fast_arr)), 3),
        },
        "explain_path_ms": {
            "iterations": len(explain_latencies),
            "mean": round(float(np.mean(exp_arr)), 3),
            "p50": round(float(np.percentile(exp_arr, 50)), 3),
            "p90": round(float(np.percentile(exp_arr, 90)), 3),
            "p95": round(float(np.percentile(exp_arr, 95)), 3),
            "p99": round(float(np.percentile(exp_arr, 99)), 3),
            "min": round(float(np.min(exp_arr)), 3),
            "max": round(float(np.max(exp_arr)), 3),
        },
        "stage_averages_ms": {
            "scaling": round(float(np.mean([b.get("scaling_ms", 0) for b in stage_breakdowns])), 3),
            "iforest": round(float(np.mean([b.get("iforest_ms", 0) for b in stage_breakdowns])), 3),
            "lof": round(float(np.mean([b.get("lof_ms", 0) for b in stage_breakdowns])), 3),
            "calibration": round(float(np.mean([b.get("calibration_ms", 0) for b in stage_breakdowns])), 3),
            "shap_attribution": round(float(np.mean([b.get("shap_attribution_ms", 0) for b in explain_breakdowns])), 3),
        }
    }

    print("\n" + "=" * 60)
    print("EMPIRICAL ML LATENCY BENCHMARK RESULTS")
    print("=" * 60)
    print(f"System: {results['hardware']['system']} ({results['hardware']['machine']}) | Python {results['hardware']['python_version']}")
    print("-" * 60)
    print("FAST PATH (explain=False, Streaming Low-Latency Mode):")
    print(f"  • p50:  {results['fast_path_ms']['p50']:6.2f} ms")
    print(f"  • p95:  {results['fast_path_ms']['p95']:6.2f} ms")
    print(f"  • p99:  {results['fast_path_ms']['p99']:6.2f} ms")
    print(f"  • Mean: {results['fast_path_ms']['mean']:6.2f} ms")
    print("-" * 60)
    print("EXPLAIN PATH (explain=True, TreeSHAP Feature Attribution Mode):")
    print(f"  • p50:  {results['explain_path_ms']['p50']:6.2f} ms")
    print(f"  • p95:  {results['explain_path_ms']['p95']:6.2f} ms")
    print(f"  • p99:  {results['explain_path_ms']['p99']:6.2f} ms")
    print(f"  • Mean: {results['explain_path_ms']['mean']:6.2f} ms")
    print("-" * 60)
    print("STAGE BREAKDOWN (Average Latency per Stage):")
    print(f"  • Feature Scaling:     {results['stage_averages_ms']['scaling']:6.3f} ms")
    print(f"  • Isolation Forest:    {results['stage_averages_ms']['iforest']:6.3f} ms")
    print(f"  • Local Outlier Factor:{results['stage_averages_ms']['lof']:6.3f} ms")
    print(f"  • Isotonic Calibrator: {results['stage_averages_ms']['calibration']:6.3f} ms")
    print(f"  • TreeSHAP Attribution:{results['stage_averages_ms']['shap_attribution']:6.3f} ms")
    print("=" * 60 + "\n")

    # Save to json artifact
    out_json = ML_ROOT / "models" / "benchmark_latency.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"Benchmark results persisted to: {out_json}")


if __name__ == "__main__":
    run_benchmark()
