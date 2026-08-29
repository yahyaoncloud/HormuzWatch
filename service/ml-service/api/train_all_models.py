"""
api/train_all_models.py
-----------------------
Disciplined synthetic benchmark training of all HormuzWatch ML ensemble models.

Generates synthetic labelled training data for each domain with MMSI/entity grouping
and trains IsolationForest + LocalOutlierFactor + IsotonicRegression ensembles
with strict 4-way partitioning (Train 60%, Val 15%, Calib 15%, Test 10%).

Produces:
    models/{domain}_ensemble.joblib
    models/manifest.json (dataset lineage, schema, split methodology, test metrics, sha256)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Tuple, List, Dict, Any

import numpy as np

# Ensure ml-service root is on sys.path
ML_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ML_ROOT))

from lib.training import train_ensemble
from lib.features import DOMAIN_FEATURE_COLS
from lib.logger import get_logger

logger = get_logger("hormuzwatch.train_all")


# ---------------------------------------------------------------------------
# Synthetic benchmark generators with Group/MMSI identifiers
# ---------------------------------------------------------------------------


def generate_vessel_data(n_samples: int = 2000, anomaly_frac: float = 0.05, n_vessels: int = 100) -> Tuple[List[Dict[str, Any]], List[int], List[str]]:
    """Generate 9-dim vessel feature vectors with MMSI grouping and realistic variance."""
    rng = np.random.default_rng(42)
    vessel_mmsis = [f"MMSI_{211000000 + i}" for i in range(n_vessels)]

    data = []
    labels = []
    groups = []

    samples_per_vessel = n_samples // n_vessels

    for mmsi in vessel_mmsis:
        # Vessel baseline characteristics
        base_speed = float(rng.uniform(8.0, 18.0))
        is_anomalous_vessel = rng.uniform() < (anomaly_frac * 2.0)

        for _ in range(samples_per_vessel):
            if is_anomalous_vessel and rng.uniform() < 0.6:
                # Anomaly observation
                sample = {
                    "course_delta": float(rng.uniform(25.0, 85.0)),
                    "heading_delta": float(rng.uniform(-85.0, 85.0)),
                    "speed_delta": float(rng.choice([-8.0, 8.0, -12.0, 10.0]) + rng.normal(0, 1.5)),
                    "average_speed": float(base_speed + rng.uniform(-3, 3)),
                    "speed_variance": float(rng.uniform(8.0, 30.0)),
                    "ais_gap_minutes": float(rng.uniform(10.0, 45.0)),
                    "dist_restricted_zone": float(rng.uniform(0.0, 0.8)),
                    "dist_historical_site": float(rng.exponential(1.5)),
                    "ewma_deviation": float(rng.uniform(2.0, 5.5)),
                }
                lbl = 1
            else:
                # Normal operational observation
                sample = {
                    "course_delta": float(rng.exponential(4.0)),
                    "heading_delta": float(rng.normal(0.0, 3.5)),
                    "speed_delta": float(rng.normal(0.0, 1.2)),
                    "average_speed": float(base_speed + rng.normal(0.0, 0.8)),
                    "speed_variance": float(rng.exponential(1.5)),
                    "ais_gap_minutes": float(rng.exponential(1.8)),
                    "dist_restricted_zone": float(rng.uniform(1.5, 25.0)),
                    "dist_historical_site": float(rng.uniform(2.0, 25.0)),
                    "ewma_deviation": float(rng.exponential(0.6)),
                }
                lbl = 0

            data.append(sample)
            labels.append(lbl)
            groups.append(mmsi)

    return data, labels, groups


def generate_aviation_data(n_samples: int = 2000, anomaly_frac: float = 0.05, n_aircraft: int = 80) -> Tuple[List[Dict[str, Any]], List[int], List[str]]:
    """Generate 9-dim aviation feature vectors with ICAO hex grouping."""
    rng = np.random.default_rng(43)
    aircraft_icaos = [f"ICAO_{i:06X}" for i in range(n_aircraft)]
    data, labels, groups = [], [], []
    samples_per_ac = n_samples // n_aircraft

    for icao in aircraft_icaos:
        base_speed = float(rng.uniform(250.0, 480.0))
        is_anom_plane = rng.uniform() < (anomaly_frac * 2.0)

        for _ in range(samples_per_ac):
            if is_anom_plane and rng.uniform() < 0.6:
                sample = {
                    "course_delta": float(rng.uniform(45.0, 160.0)),
                    "heading_delta": float(rng.uniform(-160.0, 160.0)),
                    "speed_delta": float(rng.choice([-80.0, 60.0, -120.0]) + rng.normal(0, 15.0)),
                    "average_speed": float(rng.choice([float(rng.uniform(80.0, 150.0)), float(rng.uniform(550.0, 650.0))])),
                    "speed_variance": float(rng.uniform(40.0, 150.0)),
                    "ais_gap_minutes": float(rng.uniform(2.0, 12.0)),
                    "dist_restricted_zone": float(rng.uniform(0.0, 1.5)),
                    "dist_historical_site": float(rng.exponential(2.0)),
                    "ewma_deviation": float(rng.uniform(2.5, 7.0)),
                }
                lbl = 1
            else:
                sample = {
                    "course_delta": float(rng.exponential(2.5)),
                    "heading_delta": float(rng.normal(0.0, 2.0)),
                    "speed_delta": float(rng.normal(0.0, 8.0)),
                    "average_speed": float(base_speed + rng.normal(0.0, 5.0)),
                    "speed_variance": float(rng.exponential(8.0)),
                    "ais_gap_minutes": float(rng.exponential(0.4)),
                    "dist_restricted_zone": float(rng.uniform(4.0, 45.0)),
                    "dist_historical_site": float(rng.uniform(4.0, 45.0)),
                    "ewma_deviation": float(rng.exponential(0.4)),
                }
                lbl = 0
            data.append(sample)
            labels.append(lbl)
            groups.append(icao)

    return data, labels, groups


def generate_news_data(n_samples: int = 2000, anomaly_frac: float = 0.05) -> Tuple[List[Dict[str, Any]], List[int], List[str]]:
    """Generate 18-dim news feature vectors."""
    rng = np.random.default_rng(44)
    sources = [f"source_{i}" for i in range(25)]
    data, labels, groups = [], [], []

    for _ in range(n_samples):
        src = rng.choice(sources)
        if rng.uniform() < anomaly_frac:
            sample = {
                "keyword_count": int(rng.uniform(12, 45)),
                "entity_count": int(rng.uniform(18, 70)),
                "article_length": int(rng.uniform(1500, 12000)),
                "publication_age_hours": float(rng.uniform(0.0, 1.2)),
                "military_term_count": int(rng.uniform(4, 18)),
                "energy_term_count": int(rng.uniform(3, 9)),
                "shipping_term_count": int(rng.uniform(2, 8)),
                "cyber_term_count": int(rng.uniform(1, 4)),
                "country_risk_score": float(rng.beta(4, 2)),
                "source_reliability": float(rng.beta(2, 4)),
                "sentiment_score": float(rng.beta(1, 3)),
                "organization_count": int(rng.uniform(4, 16)),
                "company_count": int(rng.uniform(2, 8)),
                "port_mentions": int(rng.uniform(1, 4)),
                "airport_mentions": int(rng.uniform(0, 2)),
                "ship_mentions": int(rng.uniform(1, 4)),
                "aircraft_mentions": int(rng.uniform(0, 2)),
                "publisher_weight": float(rng.beta(2, 4)),
            }
            lbl = 1
        else:
            sample = {
                "keyword_count": int(rng.poisson(7)),
                "entity_count": int(rng.poisson(10)),
                "article_length": int(rng.uniform(500, 4000)),
                "publication_age_hours": float(rng.exponential(5.0)),
                "military_term_count": int(rng.poisson(1)),
                "energy_term_count": int(rng.poisson(1)),
                "shipping_term_count": int(rng.poisson(1)),
                "cyber_term_count": int(rng.poisson(0.2)),
                "country_risk_score": float(rng.beta(2, 5)),
                "source_reliability": float(rng.beta(5, 2)),
                "sentiment_score": float(rng.beta(3, 3)),
                "organization_count": int(rng.poisson(2)),
                "company_count": int(rng.poisson(1)),
                "port_mentions": int(rng.poisson(0.4)),
                "airport_mentions": int(rng.poisson(0.2)),
                "ship_mentions": int(rng.poisson(0.2)),
                "aircraft_mentions": int(rng.poisson(0.1)),
                "publisher_weight": float(rng.beta(5, 2)),
            }
            lbl = 0
        data.append(sample)
        labels.append(lbl)
        groups.append(src)

    return data, labels, groups


def generate_heatmap_data(n_samples: int = 2000, anomaly_frac: float = 0.05) -> Tuple[List[Dict[str, Any]], List[int], List[str]]:
    """Generate 4-dim heatmap grid-cell feature vectors."""
    rng = np.random.default_rng(45)
    cells = [f"cell_{i}" for i in range(50)]
    data, labels, groups = [], [], []

    for _ in range(n_samples):
        c = rng.choice(cells)
        if rng.uniform() < anomaly_frac:
            sample = {
                "vessel_density": float(rng.exponential(1.8)),
                "anomaly_density": float(rng.exponential(0.8)),
                "event_proximity": float(rng.uniform(0.0, 3.0)),
                "gdel_count": int(rng.poisson(4)),
            }
            lbl = 1
        else:
            sample = {
                "vessel_density": float(rng.exponential(0.5)),
                "anomaly_density": float(rng.exponential(0.1)),
                "event_proximity": float(rng.uniform(4.0, 40.0)),
                "gdel_count": int(rng.poisson(1)),
            }
            lbl = 0
        data.append(sample)
        labels.append(lbl)
        groups.append(c)

    return data, labels, groups


def generate_transit_data(n_samples: int = 1000, anomaly_frac: float = 0.05) -> Tuple[List[Dict[str, Any]], List[int], List[str]]:
    """Generate 7-dim transit anomaly feature vectors."""
    rng = np.random.default_rng(46)
    vessels = [f"vessel_{i}" for i in range(60)]
    data, labels, groups = [], [], []

    for _ in range(n_samples):
        v = rng.choice(vessels)
        if rng.uniform() < anomaly_frac:
            sample = {
                "crossing_speed": float(rng.choice([float(rng.uniform(1.5, 4.5)), float(rng.uniform(22.0, 32.0))])),
                "time_since_last_transit_h": float(rng.exponential(3.0)),
                "crossing_hour": float(rng.choice([0.0, 1.0, 2.0, 3.0, 23.0])),
                "vessel_speed_before": float(rng.uniform(0.0, 3.5)),
                "destination_direction_match": 0.0,
                "gate_dist_from_center_nm": float(rng.uniform(15.0, 28.0)),
                "speed_vs_avg_ratio": float(rng.choice([0.35, 2.2, 2.8])),
            }
            lbl = 1
        else:
            sample = {
                "crossing_speed": float(rng.uniform(9.0, 17.0)),
                "time_since_last_transit_h": float(rng.exponential(45.0)),
                "crossing_hour": float(rng.uniform(5.0, 20.0)),
                "vessel_speed_before": float(rng.uniform(9.0, 17.0)),
                "destination_direction_match": float(rng.choice([0.0, 1.0], p=[0.25, 0.75])),
                "gate_dist_from_center_nm": float(rng.uniform(0.5, 12.0)),
                "speed_vs_avg_ratio": float(rng.uniform(0.85, 1.15)),
            }
            lbl = 0
        data.append(sample)
        labels.append(lbl)
        groups.append(v)

    return data, labels, groups


def generate_blockade_data(n_samples: int = 500, anomaly_frac: float = 0.05) -> Tuple[List[Dict[str, Any]], List[int], List[str]]:
    """Generate 7-dim blockade severity feature vectors."""
    rng = np.random.default_rng(47)
    days = [f"day_{i}" for i in range(40)]
    data, labels, groups = [], [], []

    for _ in range(n_samples):
        d = rng.choice(days)
        if rng.uniform() < anomaly_frac:
            sample = {
                "strait_transits_24h": int(rng.choice([0, 1, 2])),
                "anchored_ratio_pct": float(rng.uniform(55.0, 88.0)),
                "waiting_fleet_6h": int(rng.uniform(25, 90)),
                "waiting_fleet_24h": int(rng.uniform(10, 45)),
                "active_vessels": int(rng.uniform(60, 180)),
                "anchorage_zone_count": int(rng.uniform(6, 11)),
                "flag_entropy": float(rng.beta(2, 4)),
            }
            lbl = 1
        else:
            sample = {
                "strait_transits_24h": int(rng.poisson(18)),
                "anchored_ratio_pct": float(rng.uniform(12.0, 32.0)),
                "waiting_fleet_6h": int(rng.poisson(4)),
                "waiting_fleet_24h": int(rng.poisson(2)),
                "active_vessels": int(rng.uniform(110, 350)),
                "anchorage_zone_count": int(rng.uniform(4, 9)),
                "flag_entropy": float(rng.beta(5, 3)),
            }
            lbl = 0
        data.append(sample)
        labels.append(lbl)
        groups.append(d)

    return data, labels, groups


DOMAIN_GENERATORS = {
    "vessel":   generate_vessel_data,
    "aviation": generate_aviation_data,
    "news":     generate_news_data,
    "heatmap":  generate_heatmap_data,
    "transit":  generate_transit_data,
    "blockade": generate_blockade_data,
}


def compute_sha256(filepath: Path) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


# ---------------------------------------------------------------------------
# Main Training & Manifest Generation
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(description="Train all HormuzWatch ML ensemble models with strict validation")
    parser.add_argument("--domains", nargs="+",
                        default=["vessel", "aviation", "news", "heatmap", "transit", "blockade"],
                        help="Domains to train")
    parser.add_argument("--samples", type=int, default=2000,
                        help="Number of synthetic samples per domain")
    parser.add_argument("--contamination", type=float, default=0.05,
                        help="Expected anomaly fraction (0.01-0.50)")
    parser.add_argument("--output", type=str, default="",
                        help="Models directory (default: ml-service/models/)")
    parser.add_argument("--force", action="store_true",
                        help="Overwrite existing models")
    args = parser.parse_args()

    output_dir = Path(args.output) if args.output else (ML_ROOT / "models")
    output_dir.mkdir(exist_ok=True)

    manifest_path = output_dir / "manifest.json"
    manifest: Dict[str, Any] = {
        "dataset_metadata": {
            "type": "synthetic_benchmark_dataset",
            "validation_status": "LOCALLY_VALIDATED_ON_SYNTHETIC_DATA",
            "operational_maritime_validation": "PENDING_REAL_DATASET_INGESTION",
            "split_methodology": "train_60_val_15_calib_15_test_10_mmsi_grouped",
            "generation_seed": 42,
            "version": "v2.0.0-synthetic-parametric",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
        "models": {},
    }

    trained = []
    skipped = []
    failed = []

    for domain in args.domains:
        if domain not in DOMAIN_GENERATORS:
            logger.warning("Unknown domain '%s' — skipping", domain)
            skipped.append(domain)
            continue

        artifact = output_dir / f"{domain}_ensemble.joblib"
        if artifact.exists() and not args.force:
            logger.info("[%s] Model already exists at %s — skipping (use --force to overwrite)", domain, artifact)
            skipped.append(domain)
            continue

        n = args.samples
        if domain == "blockade":
            n = max(500, n // 4)
        elif domain == "transit":
            n = max(1000, n // 2)

        logger.info("[%s] Generating %d synthetic benchmark samples with entity grouping...", domain, n)
        data, labels, groups = DOMAIN_GENERATORS[domain](n)

        try:
            version, metrics = train_ensemble(
                domain=domain,
                data=data,
                labels=labels,
                groups=groups,
                contamination=args.contamination,
                models_dir=str(output_dir),
            )
            sha256_hash = compute_sha256(artifact)
            manifest["models"][f"{domain}_ensemble"] = {
                "version": version,
                "domain": domain,
                "sha256": sha256_hash,
                "artifact": artifact.name,
                "metrics": metrics,
            }
            logger.info("[%s] Trained successfully! Test F1=%.4f, Prec=%.4f, Rec=%.4f, ROC-AUC=%.4f, ECE=%.4f, SHA256=%s",
                         domain, metrics["test_f1"], metrics["test_precision"], metrics["test_recall"],
                         metrics["test_roc_auc"], metrics["test_ece"], sha256_hash[:12])
            trained.append(domain)
        except Exception as exc:
            logger.error("[%s] Training failed: %s", domain, exc)
            failed.append(domain)

    # Save manifest.json
    with open(manifest_path, "w", encoding="utf-8") as mf:
        json.dump(manifest, mf, indent=2)
    logger.info("Saved dataset manifest -> %s", manifest_path)

    # Summary
    print("\n" + "=" * 60)
    print("TRAINING & BENCHMARK SUMMARY")
    print("=" * 60)
    print(f"Trained:  {len(trained)} domains — {', '.join(trained) if trained else 'none'}")
    print(f"Skipped:  {len(skipped)} domains — {', '.join(skipped) if skipped else 'none'}")
    print(f"Failed:   {len(failed)} domains — {', '.join(failed) if failed else 'none'}")
    print(f"Models:   {output_dir}")
    print(f"Manifest: {manifest_path}")
    print()

    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()

