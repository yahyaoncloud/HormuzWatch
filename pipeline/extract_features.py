"""
pipeline/extract_features.py
----------------------------
Extracts normalized feature matrices from database telemetry snapshots
or generates parametric bootstrap samples for continuous model retraining.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Dict, List, Tuple, Any

import numpy as np
import pandas as pd

# Add ml-service and pipeline to sys.path
PIPELINE_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = PIPELINE_ROOT.parent
sys.path.insert(0, str(PROJECT_ROOT / "service" / "ml-service"))

from lib.features import DOMAIN_FEATURE_COLS
from pipeline.config import config


def extract_features_from_db(domain: str = "vessel", limit: int = 10000) -> Tuple[pd.DataFrame, pd.Series, List[str]]:
    """Query PostgreSQL telemetry_history if connected, or fallback to parametric bootstrap."""
    try:
        import psycopg2
        conn = psycopg2.connect(config.db_url)
        table = "vessels" if domain == "vessel" else "aircraft" if domain == "aviation" else "telemetry_history"
        query = f"SELECT * FROM {table} ORDER BY timestamp DESC LIMIT {limit};"
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        feature_cols = DOMAIN_FEATURE_COLS.get(domain, DOMAIN_FEATURE_COLS["vessel"])
        available_cols = [c for c in feature_cols if c in df.columns]
        
        if len(df) >= config.min_samples_for_retrain and len(available_cols) >= 5:
            X = df[available_cols].fillna(0.0)
            y = df["is_anomaly"] if "is_anomaly" in df.columns else pd.Series(np.zeros(len(df), dtype=int))
            groups = df["mmsi"].tolist() if "mmsi" in df.columns else [f"GRP_{i%100}" for i in range(len(df))]
            return X, y, groups
    except Exception as e:
        pass

    return generate_parametric_features(domain=domain, n_samples=3000)


def generate_parametric_features(domain: str = "vessel", n_samples: int = 3000) -> Tuple[pd.DataFrame, pd.Series, List[str]]:
    """Generate high-fidelity domain feature vectors with entity grouping and calibration labels."""
    rng = np.random.default_rng(12345)
    cols = DOMAIN_FEATURE_COLS.get(domain, DOMAIN_FEATURE_COLS["vessel"])
    
    n_entities = 120
    entities = [f"{domain.upper()}_{100000 + i}" for i in range(n_entities)]
    samples_per_entity = n_samples // n_entities
    
    records = []
    labels = []
    groups = []
    
    for entity in entities:
        is_anom_entity = rng.uniform() < 0.08
        base_spd = float(rng.uniform(10.0, 20.0))
        
        for _ in range(samples_per_entity):
            is_anom = is_anom_entity and (rng.uniform() < 0.65)
            row = {}
            
            for col in cols:
                if "delta" in col:
                    row[col] = float(rng.uniform(25.0, 90.0) if is_anom else rng.exponential(3.5))
                elif "speed" in col:
                    row[col] = float(rng.uniform(0.0, 4.0) if is_anom else base_spd + rng.normal(0, 0.8))
                elif "gap" in col:
                    row[col] = float(rng.uniform(15.0, 60.0) if is_anom else rng.exponential(1.5))
                elif "zone" in col or "site" in col:
                    row[col] = float(rng.uniform(0.0, 0.5) if is_anom else rng.uniform(2.0, 30.0))
                else:
                    row[col] = float(rng.uniform(2.0, 6.0) if is_anom else rng.exponential(0.8))
            
            records.append(row)
            labels.append(1 if is_anom else 0)
            groups.append(entity)
            
    return pd.DataFrame(records), pd.Series(labels), groups
