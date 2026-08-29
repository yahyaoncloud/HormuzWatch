"""
api/train_all_models.py
-----------------------
One-shot training of all HormuzWatch ML ensemble models.

Generates synthetic labelled training data for each domain based on
real-world patterns (anomalies account for ~5% of samples) and trains
IsolationForest + LocalOutlierFactor + IsotonicRegression ensembles.

Usage:
    cd ml-service
    python api/train_all_models.py [--domains vessel,aviation,news,heatmap,transit,blockade]
                                   [--samples 2000]
                                   [--contamination 0.05]
                                   [--output models/]

Models saved:
    models/vessel_ensemble.joblib     (if not already present or --force)
    models/aviation_ensemble.joblib
    models/news_ensemble.joblib
    models/heatmap_ensemble.joblib
    models/transit_ensemble.joblib
    models/blockade_ensemble.joblib

After running, the ML service's GET /api/models should report all
domains as available, and POST /api/predict will work for all.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np

# Ensure ml-service root is on sys.path
ML_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ML_ROOT))

from lib.training import train_ensemble
from lib.features import DOMAIN_FEATURE_COLS
from lib.logger import get_logger

logger = get_logger("hormuzwatch.train_all")


# ---------------------------------------------------------------------------
# Synthetic data generators — one per domain
# ---------------------------------------------------------------------------

def generate_vessel_data(n_samples: int = 2000, anomaly_frac: float = 0.05):
    """Generate 9-dim vessel feature vectors with realistic patterns."""
    np.random.seed(42)
    n_anomaly = int(n_samples * anomaly_frac)
    n_normal = n_samples - n_anomaly

    normal = [
        {
            "course_delta": np.random.exponential(5.0),
            "heading_delta": np.random.exponential(4.0),
            "speed_delta": np.random.normal(0.0, 1.5),
            "average_speed": np.random.uniform(8.0, 22.0),
            "speed_variance": np.random.exponential(2.0),
            "ais_gap_minutes": np.random.exponential(2.0),
            "dist_restricted_zone": np.random.uniform(2.0, 20.0),
            "dist_historical_site": np.random.uniform(2.0, 20.0),
            "ewma_deviation": np.random.exponential(0.5),
        }
        for _ in range(n_normal)
    ]

    anomaly = [
        {
            "course_delta": np.random.uniform(30.0, 90.0),
            "heading_delta": np.random.uniform(30.0, 90.0),
            "speed_delta": np.random.choice([-10.0, 10.0, 0.0, 0.0]) + np.random.uniform(-2, 2),
            "average_speed": np.random.choice([np.random.uniform(0.0, 3.0), np.random.uniform(25.0, 35.0)]),
            "speed_variance": np.random.uniform(10.0, 40.0),
            "ais_gap_minutes": np.random.uniform(15.0, 60.0),
            "dist_restricted_zone": np.random.uniform(0.0, 0.5),
            "dist_historical_site": np.random.exponential(0.5),
            "ewma_deviation": np.random.uniform(2.0, 6.0),
        }
        for _ in range(n_anomaly)
    ]

    labels = [0] * n_normal + [1] * n_anomaly
    data = normal + anomaly
    # Shuffle
    idx = np.random.permutation(n_samples)
    return [data[i] for i in idx], [labels[i] for i in idx]


def generate_aviation_data(n_samples: int = 2000, anomaly_frac: float = 0.05):
    """Generate 9-dim aviation feature vectors (same schema as vessel)."""
    np.random.seed(43)
    n_anomaly = int(n_samples * anomaly_frac)
    n_normal = n_samples - n_anomaly

    normal = [
        {
            "course_delta": np.random.exponential(3.0),       # aircraft turn sharper
            "heading_delta": np.random.exponential(2.0),
            "speed_delta": np.random.normal(0.0, 10.0),       # knots variation
            "average_speed": np.random.uniform(200.0, 500.0), # typical cruise
            "speed_variance": np.random.exponential(15.0),
            "ais_gap_minutes": np.random.exponential(0.5),    # ADS-B updates frequent
            "dist_restricted_zone": np.random.uniform(5.0, 50.0),
            "dist_historical_site": np.random.uniform(5.0, 50.0),
            "ewma_deviation": np.random.exponential(0.3),
        }
        for _ in range(n_normal)
    ]

    anomaly = [
        {
            "course_delta": np.random.uniform(60.0, 180.0),   # sharp turn / U-turn
            "heading_delta": np.random.uniform(60.0, 180.0),
            "speed_delta": np.random.choice([-100.0, 50.0, -50.0]) + np.random.uniform(-20, 20),
            "average_speed": np.random.choice([np.random.uniform(50.0, 120.0), np.random.uniform(550.0, 700.0)]),
            "speed_variance": np.random.uniform(50.0, 200.0),
            "ais_gap_minutes": np.random.uniform(1.0, 10.0),  # ADS-B dropout
            "dist_restricted_zone": np.random.uniform(0.0, 2.0),
            "dist_historical_site": np.random.exponential(2.0),
            "ewma_deviation": np.random.uniform(3.0, 8.0),
        }
        for _ in range(n_anomaly)
    ]

    labels = [0] * n_normal + [1] * n_anomaly
    data = normal + anomaly
    idx = np.random.permutation(n_samples)
    return [data[i] for i in idx], [labels[i] for i in idx]


def generate_news_data(n_samples: int = 2000, anomaly_frac: float = 0.05):
    """Generate 18-dim news feature vectors."""
    np.random.seed(44)
    n_anomaly = int(n_samples * anomaly_frac)
    n_normal = n_samples - n_anomaly

    normal = [
        {
            "keyword_count": int(np.random.poisson(8)),
            "entity_count": int(np.random.poisson(12)),
            "article_length": int(np.random.uniform(500, 5000)),
            "publication_age_hours": np.random.exponential(6.0),
            "military_term_count": int(np.random.poisson(2)),
            "energy_term_count": int(np.random.poisson(2)),
            "shipping_term_count": int(np.random.poisson(1)),
            "cyber_term_count": int(np.random.poisson(0.3)),
            "country_risk_score": np.random.beta(2, 5),
            "source_reliability": np.random.beta(5, 2),
            "sentiment_score": np.random.beta(3, 3),
            "organization_count": int(np.random.poisson(2)),
            "company_count": int(np.random.poisson(1)),
            "port_mentions": int(np.random.poisson(0.5)),
            "airport_mentions": int(np.random.poisson(0.3)),
            "ship_mentions": int(np.random.poisson(0.3)),
            "aircraft_mentions": int(np.random.poisson(0.1)),
            "publisher_weight": np.random.beta(5, 2),
        }
        for _ in range(n_normal)
    ]

    anomaly = [
        {
            "keyword_count": int(np.random.uniform(15, 50)),
            "entity_count": int(np.random.uniform(20, 80)),
            "article_length": int(np.random.uniform(2000, 20000)),
            "publication_age_hours": np.random.uniform(0.0, 1.0),  # very fresh
            "military_term_count": int(np.random.uniform(5, 20)),
            "energy_term_count": int(np.random.uniform(3, 10)),
            "shipping_term_count": int(np.random.uniform(2, 10)),
            "cyber_term_count": int(np.random.uniform(1, 5)),
            "country_risk_score": np.random.beta(5, 2),  # high risk
            "source_reliability": np.random.beta(2, 5),  # less reliable
            "sentiment_score": np.random.beta(1, 3),      # negative
            "organization_count": int(np.random.uniform(5, 20)),
            "company_count": int(np.random.uniform(3, 10)),
            "port_mentions": int(np.random.uniform(1, 5)),
            "airport_mentions": int(np.random.uniform(0, 3)),
            "ship_mentions": int(np.random.uniform(1, 5)),
            "aircraft_mentions": int(np.random.uniform(0, 3)),
            "publisher_weight": np.random.beta(2, 5),
        }
        for _ in range(n_anomaly)
    ]

    labels = [0] * n_normal + [1] * n_anomaly
    data = normal + anomaly
    idx = np.random.permutation(n_samples)
    return [data[i] for i in idx], [labels[i] for i in idx]


def generate_heatmap_data(n_samples: int = 2000, anomaly_frac: float = 0.05):
    """Generate 4-dim heatmap grid-cell feature vectors."""
    np.random.seed(45)
    n_anomaly = int(n_samples * anomaly_frac)
    n_normal = n_samples - n_anomaly

    normal = [
        {
            "vessel_density": np.random.exponential(0.5),
            "anomaly_density": np.random.exponential(0.1),
            "event_proximity": np.random.uniform(5.0, 50.0),
            "gdel_count": np.random.poisson(1),
        }
        for _ in range(n_normal)
    ]

    anomaly = [
        {
            "vessel_density": np.random.exponential(2.0),
            "anomaly_density": np.random.exponential(1.0),
            "event_proximity": np.random.uniform(0.0, 2.0),
            "gdel_count": np.random.poisson(5),
        }
        for _ in range(n_anomaly)
    ]

    labels = [0] * n_normal + [1] * n_anomaly
    data = normal + anomaly
    idx = np.random.permutation(n_samples)
    return [data[i] for i in idx], [labels[i] for i in idx]


def generate_transit_data(n_samples: int = 1000, anomaly_frac: float = 0.05):
    """Generate 7-dim transit anomaly feature vectors."""
    np.random.seed(46)
    n_anomaly = int(n_samples * anomaly_frac)
    n_normal = n_samples - n_anomaly

    normal = [
        {
            "crossing_speed": np.random.uniform(8.0, 18.0),
            "time_since_last_transit_h": np.random.exponential(50.0),
            "crossing_hour": np.random.uniform(4.0, 20.0),  # daylight
            "vessel_speed_before": np.random.uniform(8.0, 18.0),
            "destination_direction_match": np.random.choice([0.0, 1.0], p=[0.3, 0.7]),
            "gate_dist_from_center_nm": np.random.uniform(0.0, 15.0),
            "speed_vs_avg_ratio": np.random.uniform(0.8, 1.2),
        }
        for _ in range(n_normal)
    ]

    anomaly = [
        {
            "crossing_speed": np.random.choice([np.random.uniform(1.0, 4.0), np.random.uniform(22.0, 35.0)]),
            "time_since_last_transit_h": np.random.exponential(2.0),  # recently crossed
            "crossing_hour": np.random.choice([0.0, 1.0, 2.0, 3.0, 22.0, 23.0]),  # night
            "vessel_speed_before": np.random.uniform(0.0, 3.0),  # was anchored
            "destination_direction_match": 0.0,  # mismatch
            "gate_dist_from_center_nm": np.random.uniform(20.0, 30.0),  # far from center
            "speed_vs_avg_ratio": np.random.choice([0.3, 2.5, 3.0]),
        }
        for _ in range(n_anomaly)
    ]

    labels = [0] * n_normal + [1] * n_anomaly
    data = normal + anomaly
    idx = np.random.permutation(n_samples)
    return [data[i] for i in idx], [labels[i] for i in idx]


def generate_blockade_data(n_samples: int = 500, anomaly_frac: float = 0.05):
    """Generate 7-dim blockade severity feature vectors."""
    np.random.seed(47)
    n_anomaly = int(n_samples * anomaly_frac)
    n_normal = n_samples - n_anomaly

    normal = [
        {
            "strait_transits_24h": int(np.random.poisson(20)),
            "anchored_ratio_pct": np.random.uniform(10.0, 35.0),
            "waiting_fleet_6h": int(np.random.poisson(5)),
            "waiting_fleet_24h": int(np.random.poisson(2)),
            "active_vessels": int(np.random.uniform(100, 400)),
            "anchorage_zone_count": int(np.random.uniform(4, 10)),
            "flag_entropy": np.random.beta(5, 3),
        }
        for _ in range(n_normal)
    ]

    # Critical blockade pattern: 0 transits, high anchored, many waiting
    anomaly = [
        {
            "strait_transits_24h": int(np.random.choice([0, 0, 0, 1, 2])),
            "anchored_ratio_pct": np.random.uniform(50.0, 90.0),
            "waiting_fleet_6h": int(np.random.uniform(30, 120)),
            "waiting_fleet_24h": int(np.random.uniform(10, 50)),
            "active_vessels": int(np.random.uniform(50, 200)),
            "anchorage_zone_count": int(np.random.uniform(6, 11)),
            "flag_entropy": np.random.beta(2, 5),
        }
        for _ in range(n_anomaly)
    ]

    labels = [0] * n_normal + [1] * n_anomaly
    data = normal + anomaly
    idx = np.random.permutation(n_samples)
    return [data[i] for i in idx], [labels[i] for i in idx]


# ---------------------------------------------------------------------------
# Domain-specific generators
# ---------------------------------------------------------------------------

DOMAIN_GENERATORS = {
    "vessel":   generate_vessel_data,
    "aviation": generate_aviation_data,
    "news":     generate_news_data,
    "heatmap":  generate_heatmap_data,
    "transit":  generate_transit_data,
    "blockade": generate_blockade_data,
}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Train all HormuzWatch ML ensemble models")
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
            logger.info("[%s] Model already exists at %s — skipping (use --force to overwrite)",
                         domain, artifact)
            skipped.append(domain)
            continue

        # Adjust sample count for smaller domains
        n = args.samples
        if domain in ("blockade",):
            n = max(500, n // 4)
        elif domain == "transit":
            n = max(1000, n // 2)

        logger.info("[%s] Generating %d synthetic samples...", domain, n)
        data, labels = DOMAIN_GENERATORS[domain](n)

        try:
            version, metrics = train_ensemble(
                domain=domain,
                data=data,
                labels=labels,
                contamination=args.contamination,
                models_dir=str(output_dir),
            )
            logger.info("[%s] Trained successfully! version=%s anomaly_rate=%.3f",
                         domain, version, metrics.get("anomaly_rate", 0))
            if "f1" in metrics:
                logger.info("[%s] Metrics: f1=%.4f precision=%.4f recall=%.4f",
                             domain, metrics["f1"], metrics.get("precision", 0), metrics.get("recall", 0))
            trained.append(domain)
        except Exception as exc:
            logger.error("[%s] Training failed: %s", domain, exc)
            failed.append(domain)

    # Summary
    print("\n" + "=" * 60)
    print("TRAINING SUMMARY")
    print("=" * 60)
    print(f"Trained:  {len(trained)} domains — {', '.join(trained) if trained else 'none'}")
    print(f"Skipped:  {len(skipped)} domains — {', '.join(skipped) if skipped else 'none'}")
    print(f"Failed:   {len(failed)} domains — {', '.join(failed) if failed else 'none'}")
    print(f"Models:   {output_dir}")
    print()

    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
