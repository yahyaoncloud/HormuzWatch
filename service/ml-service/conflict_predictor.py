"""
conflict_predictor.py — Conflict-Vessel Correlation & Prediction Engine
========================================================================

Ingests conflict intelligence from the HormuzWatch /public/conflicts endpoint
and vessel/aircraft telemetry from the backend, then trains predictive models
for:

  1. **Conflict Severity Prediction** — given vessel behavior + temporal
     features, predict the severity of the nearest active conflict.
  2. **Risk Escalation Forecasting** — predict whether a region will enter
     a 'critical' or 'high' alert state within the next 6/12/24 hours.
  3. **Vessel Exposure Scoring** — score each active vessel by its proximity
     (spatial + temporal) to known conflict sites.

Models used:
  - XGBoost (gradient boosting) for severity classification
  - Random Forest for escalation binary classification
  - k-NN + haversine for nearest-conflict spatial joins

Usage:
    python conflict_predictor.py
      --api-base http://localhost:10020
      --train
      --predict
      --export-model models/conflict_model.joblib

Dependencies (add to requirements.txt):
    pip install xgboost scikit-learn joblib requests numpy pandas

Author: HormuzWatch ML Team
Date: 2026-07-21
"""

from __future__ import annotations

import argparse
import json
import logging
import math
import os
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional

import joblib
import numpy as np
import pandas as pd
import requests
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from xgboost import XGBClassifier

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("conflict_predictor")


# ── Constants ─────────────────────────────────────────────────────────────────

EARTH_RADIUS_NM = 3440.065  # nautical miles
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)

# Gulf region bounding box for filtering
GULF_BBOX = {
    "lat_min": 10.0, "lat_max": 33.0,
    "lon_min": 35.0, "lon_max": 73.0,
}

# Severity ordering
SEVERITY_ORDER = {"low": 0, "medium": 1, "high": 2, "critical": 3}


# ── Spatial Utilities ─────────────────────────────────────────────────────────

def haversine_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in nautical miles."""
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return 2 * EARTH_RADIUS_NM * math.asin(math.sqrt(a))


def bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Initial bearing from point 1 to point 2 (degrees, 0–360)."""
    dlon = math.radians(lon2 - lon1)
    y = math.sin(dlon) * math.cos(math.radians(lat2))
    x = (math.cos(math.radians(lat1)) * math.sin(math.radians(lat2)) -
         math.sin(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.cos(dlon))
    return (math.degrees(math.atan2(y, x)) + 360) % 360


# ── Data Fetching ─────────────────────────────────────────────────────────────

class DataFetcher:
    """Fetches conflict and telemetry data from the HormuzWatch API."""

    def __init__(self, api_base: str = "http://localhost:10020"):
        self.api_base = api_base.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json"})

    def fetch_conflicts(self) -> list[dict]:
        """Fetch conflict intelligence feed."""
        url = f"{self.api_base}/public/conflicts"
        log.info("Fetching conflicts from %s", url)
        resp = self.session.get(url, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        conflicts = data.get("conflicts", [])
        log.info("Fetched %d conflict events (source: %s)", len(conflicts), data.get("source"))
        return conflicts

    def fetch_top_traces(self) -> list[dict]:
        """Fetch top anomalous traces (vessels + aircraft)."""
        url = f"{self.api_base}/public/top-traces"
        resp = self.session.get(url, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        traces = data.get("traces", [])
        log.info("Fetched %d top traces", len(traces))
        return traces

    def fetch_public_metrics(self) -> dict:
        """Fetch public platform metrics."""
        url = f"{self.api_base}/public/metrics"
        resp = self.session.get(url, timeout=15)
        resp.raise_for_status()
        return resp.json()


# ── Feature Engineering ───────────────────────────────────────────────────────

@dataclass
class ConflictVesselSample:
    """One training sample: a vessel observation paired with the nearest conflict."""
    # Vessel features (from telemetry)
    track_id: str
    asset_name: str
    vessel_lat: float
    vessel_lon: float
    vessel_speed: float
    vessel_heading: float
    vessel_score: float  # anomaly score
    vessel_severity: str

    # Nearest conflict features
    conflict_id: str
    conflict_lat: float
    conflict_lon: float
    conflict_type: str
    conflict_severity: str
    conflict_region: str
    conflict_verified: bool

    # Engineered features
    distance_to_conflict_nm: float = 0.0
    bearing_to_conflict_deg: float = 0.0
    time_delta_minutes: float = 0.0  # vessel observation time vs conflict time
    hour_of_day: int = 0
    day_of_week: int = 0
    is_nighttime: bool = False
    vessel_heading_toward_conflict: bool = False

    # Label
    label_severity: int = 0  # SEVERITY_ORDER mapping


class FeatureEngineer:
    """Engineers predictive features from vessel-conflict pairs."""

    @staticmethod
    def build_samples(
        traces: list[dict],
        conflicts: list[dict],
    ) -> pd.DataFrame:
        """
        For each vessel trace, find the nearest conflict and compute
        spatio-temporal features. Returns a DataFrame ready for training.
        """
        if not traces or not conflicts:
            log.warning("Empty traces (%d) or conflicts (%d)", len(traces), len(conflicts))
            return pd.DataFrame()

        rows: list[dict] = []

        for t in traces:
            t_lat = t.get("lat", 0)
            t_lon = t.get("lon", 0)
            t_score = float(t.get("score", 50))
            t_speed = float(t.get("speed", 0))
            t_heading = float(t.get("heading", 0))
            t_ts = _parse_timestamp(t.get("timestamp"))

            # Find nearest conflict
            min_dist = float("inf")
            nearest: Optional[dict] = None
            for c in conflicts:
                c_lat = c.get("lat", 0)
                c_lon = c.get("lon", 0)
                dist = haversine_nm(t_lat, t_lon, c_lat, c_lon)
                if dist < min_dist:
                    min_dist = dist
                    nearest = c

            if nearest is None:
                continue

            c_ts = _parse_timestamp(nearest.get("timestamp"))
            time_delta = abs((t_ts - c_ts).total_seconds() / 60.0) if t_ts and c_ts else 0.0

            bearing = bearing_deg(t_lat, t_lon, nearest["lat"], nearest["lon"])
            heading_diff = abs((bearing - t_heading + 180) % 360 - 180)
            toward_conflict = heading_diff < 45.0  # within 45° of pointing at conflict

            hour = t_ts.hour if t_ts else 0
            dow = t_ts.weekday() if t_ts else 0

            rows.append({
                "track_id": t.get("trackId", ""),
                "asset_name": t.get("assetName", "unknown"),
                "vessel_lat": t_lat,
                "vessel_lon": t_lon,
                "vessel_speed": t_speed,
                "vessel_heading": t_heading,
                "vessel_score": t_score,
                "vessel_severity": t.get("severity", "low"),
                "conflict_id": nearest["id"],
                "conflict_lat": nearest["lat"],
                "conflict_lon": nearest["lon"],
                "conflict_type": nearest.get("conflictType", "unknown"),
                "conflict_severity": nearest.get("severity", "low"),
                "conflict_region": nearest.get("region", "unknown"),
                "conflict_verified": nearest.get("verified", False),
                "distance_to_conflict_nm": min_dist,
                "bearing_to_conflict_deg": bearing,
                "time_delta_minutes": time_delta,
                "hour_of_day": hour,
                "day_of_week": dow,
                "is_nighttime": 1 if (hour < 6 or hour >= 20) else 0,
                "vessel_heading_toward_conflict": 1 if toward_conflict else 0,
                "label_severity": SEVERITY_ORDER.get(nearest.get("severity", "low"), 0),
            })

        df = pd.DataFrame(rows)
        log.info("Built %d vessel-conflict samples", len(df))
        return df


# ── Model Training ────────────────────────────────────────────────────────────

class ConflictPredictor:
    """
    Multi-model predictor for conflict intelligence.

    Models:
      - severity_clf: XGBoost — predicts conflict severity (0-3) from vessel features
      - escalation_clf: RandomForest — binary prediction: will region escalate in next 24h?
    """

    FEATURE_COLS = [
        "vessel_speed", "vessel_heading", "vessel_score",
        "distance_to_conflict_nm", "bearing_to_conflict_deg",
        "time_delta_minutes", "hour_of_day", "day_of_week",
        "is_nighttime", "vessel_heading_toward_conflict",
    ]

    CATEGORICAL_COLS = [
        "conflict_type", "conflict_region", "vessel_severity",
    ]

    def __init__(self):
        self.severity_clf: Optional[XGBClassifier] = None
        self.escalation_clf: Optional[RandomForestClassifier] = None
        self.scaler: Optional[StandardScaler] = None
        self.type_encoder: Optional[LabelEncoder] = None
        self.region_encoder: Optional[LabelEncoder] = None
        self.severity_encoder: Optional[LabelEncoder] = None
        self.trained = False

    def preprocess(self, df: pd.DataFrame, fit: bool = False) -> np.ndarray:
        """Encode categoricals, scale numerics, return feature matrix."""
        df = df.copy()

        # Encode categoricals
        for col, encoder_attr in [
            ("conflict_type", "type_encoder"),
            ("conflict_region", "region_encoder"),
            ("vessel_severity", "severity_encoder"),
        ]:
            encoder: Optional[LabelEncoder] = getattr(self, encoder_attr, None)
            if fit:
                encoder = LabelEncoder()
                df[col] = encoder.fit_transform(df[col].astype(str))
                setattr(self, encoder_attr, encoder)
            elif encoder is not None and hasattr(encoder, 'classes_'):
                # Handle unseen labels — map unknown values to -1
                known = set(encoder.classes_)
                df[col] = df[col].astype(str).apply(
                    lambda x: encoder.transform([x])[0] if x in known else -1
                )
            else:
                # No encoder yet — use a simple hash fallback
                df[col] = df[col].astype(str).apply(lambda x: abs(hash(x)) % 100)

        # Select numeric features
        num_cols = [c for c in self.FEATURE_COLS if c in df.columns]
        X_num = df[num_cols].fillna(0).values.astype(np.float32)

        # Add encoded categoricals
        cat_arrs = []
        for col in self.CATEGORICAL_COLS:
            if col in df.columns:
                cat_arrs.append(df[col].fillna(0).values.reshape(-1, 1).astype(np.float32))

        X = np.hstack([X_num] + cat_arrs) if cat_arrs else X_num

        if fit:
            self.scaler = StandardScaler()
            X = self.scaler.fit_transform(X)
        elif self.scaler is not None:
            X = self.scaler.transform(X)

        return X

    def train(self, df: pd.DataFrame) -> dict:
        """Train both models and return metrics."""
        if len(df) < 5:
            log.warning("Only %d samples — insufficient for training", len(df))
            return {"status": "skipped", "n_samples": len(df)}

        X = self.preprocess(df, fit=True)
        y_severity = df["label_severity"].values.astype(int)

        # Create escalation label: severity >= 2 (high/critical)
        y_escalation = (y_severity >= 2).astype(int)

        # Train/test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_severity, test_size=0.25, random_state=42, stratify=y_severity
        )
        _, Xe_test, ye_train, ye_test = train_test_split(
            X, y_escalation, test_size=0.25, random_state=42, stratify=y_escalation
        )

        # ── Severity Classifier (XGBoost) ─────────────────────────────────
        n_classes = len(set(y_severity))
        log.info("Training XGBoost severity classifier (%d classes: %s)...", n_classes, set(y_severity))
        xgb_args: dict = dict(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=-1,
        )
        if n_classes > 2:
            xgb_args["objective"] = "multi:softmax"
            xgb_args["num_class"] = n_classes
        else:
            xgb_args["objective"] = "binary:logistic"
        self.severity_clf = XGBClassifier(**xgb_args)
        # XGBoost requires labels to be 0-indexed contiguous integers.
        # Re-encode y_train / y_test to [0, 1, 2, ...] from the original labels.
        unique_labels = sorted(set(y_train))
        label_map = {orig: i for i, orig in enumerate(unique_labels)}
        y_train_enc = np.array([label_map[lbl] for lbl in y_train])
        y_test_enc = np.array([label_map[lbl] for lbl in y_test])
        self.severity_label_map = label_map  # stored for prediction decode
        self.severity_clf.fit(X_train, y_train_enc)
        y_sev_pred = self.severity_clf.predict(X_test)
        y_sev_pred_decoded = np.array([unique_labels[p] for p in y_sev_pred])
        sev_f1 = f1_score(y_test, y_sev_pred_decoded, average="weighted")

        # ── Escalation Classifier (RandomForest) ──────────────────────────
        log.info("Training RandomForest escalation classifier...")
        self.escalation_clf = RandomForestClassifier(
            n_estimators=150,
            max_depth=10,
            min_samples_split=5,
            random_state=42,
            n_jobs=-1,
        )
        self.escalation_clf.fit(X_train, ye_train)
        ye_pred = self.escalation_clf.predict(Xe_test)
        esc_f1 = f1_score(ye_test, ye_pred)
        esc_auc = roc_auc_score(ye_test, self.escalation_clf.predict_proba(Xe_test)[:, 1])

        # Cross-validation with encoded labels
        y_sev_enc_all = np.array([label_map[lbl] for lbl in y_severity])
        cv_scores = cross_val_score(self.severity_clf, X, y_sev_enc_all, cv=min(5, len(df)), scoring="f1_weighted")
        cv_scores_esc = cross_val_score(self.escalation_clf, X, y_escalation, cv=min(5, len(df)), scoring="roc_auc")

        self.trained = True

        metrics = {
            "severity_f1_weighted": round(sev_f1, 4),
            "severity_cv_mean": round(float(cv_scores.mean()), 4),
            "severity_cv_std": round(float(cv_scores.std()), 4),
            "escalation_f1": round(esc_f1, 4),
            "escalation_roc_auc": round(esc_auc, 4),
            "escalation_cv_mean": round(float(cv_scores_esc.mean()), 4),
            "escalation_cv_std": round(float(cv_scores_esc.std()), 4),
            "n_samples": len(df),
            "n_features": X.shape[1],
        }

        log.info("Severity F1 (weighted): %.4f | Escalation ROC-AUC: %.4f", sev_f1, esc_auc)
        return metrics

    def predict(self, sample: dict, conflict: dict) -> dict:
        """
        Predict conflict severity and escalation risk for a vessel-conflict pair.
        """
        if not self.trained or self.severity_clf is None or self.escalation_clf is None:
            # Fallback: rule-based heuristic when model isn't available
            dist = haversine_nm(
                sample.get("lat", 0), sample.get("lon", 0),
                conflict.get("lat", 0), conflict.get("lon", 0),
            )
            exposure = max(0, min(100, 100 * math.exp(-dist / 50)))
            conflict_sev = conflict.get("severity", "low")
            sev_order = {"critical": 3, "high": 2, "medium": 1, "low": 0}
            esc_risk = sev_order.get(conflict_sev, 0) / 3.0
            return {
                "predicted_severity": conflict_sev,
                "severity_confidence": 0.5,
                "escalation_risk": round(esc_risk, 4),
                "escalation_warning": conflict_sev in ("critical", "high"),
                "exposure_score": round(exposure, 1),
                "distance_nm": round(dist, 1),
                "heading_toward_conflict": False,
                "fallback": True,
            }

        # Build feature row
        t_ts = _parse_timestamp(sample.get("timestamp"))
        c_ts = _parse_timestamp(conflict.get("timestamp"))
        time_delta = abs((t_ts - c_ts).total_seconds() / 60.0) if t_ts and c_ts else 0.0

        dist = haversine_nm(
            sample.get("lat", 0), sample.get("lon", 0),
            conflict.get("lat", 0), conflict.get("lon", 0),
        )
        bearing = bearing_deg(
            sample.get("lat", 0), sample.get("lon", 0),
            conflict.get("lat", 0), conflict.get("lon", 0),
        )
        heading_diff = abs((bearing - sample.get("heading", 0) + 180) % 360 - 180)
        toward = heading_diff < 45.0
        hour = t_ts.hour if t_ts else 0

        row = {
            "vessel_speed": sample.get("speed", 0),
            "vessel_heading": sample.get("heading", 0),
            "vessel_score": sample.get("score", 50),
            "distance_to_conflict_nm": dist,
            "bearing_to_conflict_deg": bearing,
            "time_delta_minutes": time_delta,
            "hour_of_day": hour,
            "day_of_week": t_ts.weekday() if t_ts else 0,
            "is_nighttime": 1 if (hour < 6 or hour >= 20) else 0,
            "vessel_heading_toward_conflict": 1 if toward else 0,
            "conflict_type": conflict.get("conflictType", "unknown"),
            "conflict_region": conflict.get("region", "unknown"),
            "vessel_severity": sample.get("severity", "low"),
        }
        df = pd.DataFrame([row])
        X = self.preprocess(df, fit=False)

        # Severity prediction
        sev_pred = int(self.severity_clf.predict(X)[0])
        sev_proba = self.severity_clf.predict_proba(X)[0]
        sev_confidence = float(sev_proba[sev_pred])
        # Decode back to original labels using stored label map
        if hasattr(self, 'severity_label_map'):
            reverse_map = {v: k for k, v in self.severity_label_map.items()}
            original_sev = reverse_map.get(sev_pred, sev_pred)
        else:
            original_sev = sev_pred
        sev_label = {0: "low", 1: "medium", 2: "high", 3: "critical"}.get(original_sev, "medium")

        # Escalation prediction
        esc_proba = self.escalation_clf.predict_proba(X)[0][1]
        esc_warning = bool(esc_proba >= 0.6)

        # Exposure score (distance-based, normalized 0-100)
        exposure = max(0, min(100, 100 * math.exp(-dist / 50)))

        return {
            "predicted_severity": sev_label,
            "severity_confidence": round(sev_confidence, 4),
            "escalation_risk": round(float(esc_proba), 4),
            "escalation_warning": esc_warning,
            "exposure_score": round(exposure, 1),
            "distance_nm": round(dist, 1),
            "heading_toward_conflict": toward,
        }

    def save(self, path: str) -> None:
        """Persist trained models to disk."""
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        joblib.dump({
            "severity_clf": self.severity_clf,
            "escalation_clf": self.escalation_clf,
            "scaler": self.scaler,
            "type_encoder": self.type_encoder,
            "region_encoder": self.region_encoder,
            "severity_encoder": self.severity_encoder,
            "severity_label_map": getattr(self, 'severity_label_map', None),
            "feature_cols": self.FEATURE_COLS,
            "categorical_cols": self.CATEGORICAL_COLS,
        }, path)
        log.info("Model saved to %s", path)

    @classmethod
    def load(cls, path: str) -> "ConflictPredictor":
        """Load a previously saved model."""
        data = joblib.load(path)
        inst = cls()
        inst.severity_clf = data["severity_clf"]
        inst.escalation_clf = data["escalation_clf"]
        inst.scaler = data["scaler"]
        inst.type_encoder = data.get("type_encoder")
        inst.region_encoder = data.get("region_encoder")
        inst.severity_encoder = data.get("severity_encoder")
        inst.FEATURE_COLS = data.get("feature_cols", inst.FEATURE_COLS)
        inst.CATEGORICAL_COLS = data.get("categorical_cols", inst.CATEGORICAL_COLS)
        inst.trained = True
        log.info("Model loaded from %s", path)
        return inst


# ── Scoring Helpers ───────────────────────────────────────────────────────────

def score_all_vessels(
    predictor: ConflictPredictor,
    traces: list[dict],
    conflicts: list[dict],
) -> list[dict]:
    """Score every active vessel against all conflicts; return ranked results."""
    results = []
    for t in traces:
        t_lat = t.get("lat", 0)
        t_lon = t.get("lon", 0)
        # Find nearest conflict
        nearest = None
        min_dist = float("inf")
        for c in conflicts:
            d = haversine_nm(t_lat, t_lon, c.get("lat", 0), c.get("lon", 0))
            if d < min_dist:
                min_dist = d
                nearest = c
        if nearest is None:
            continue

        pred = predictor.predict(t, nearest)

        results.append({
            "track_id": t.get("trackId", ""),
            "asset_name": t.get("assetName", "unknown"),
            "vessel_severity": t.get("severity", "low"),
            "nearest_conflict": nearest.get("title", ""),
            "conflict_type": nearest.get("conflictType", ""),
            "conflict_severity": nearest.get("severity", ""),
            **pred,
        })

    # Sort by exposure score (highest risk first)
    results.sort(key=lambda r: r["exposure_score"], reverse=True)
    return results


def compute_regional_risk(
    predictor: ConflictPredictor,
    traces: list[dict],
    conflicts: list[dict],
) -> dict:
    """Compute aggregate risk per region."""
    regions: dict[str, dict] = {}
    for c in conflicts:
        region = c.get("region", "unknown")
        if region not in regions:
            regions[region] = {
                "region": region,
                "conflict_count": 0,
                "vessels_exposed": 0,
                "avg_exposure": 0.0,
                "escalation_risk": 0.0,
                "critical_vessels": 0,
            }
        regions[region]["conflict_count"] += 1

    for t in traces:
        t_lat = t.get("lat", 0)
        t_lon = t.get("lon", 0)
        nearest = None
        min_d = float("inf")
        for c in conflicts:
            d = haversine_nm(t_lat, t_lon, c.get("lat", 0), c.get("lon", 0))
            if d < min_d:
                min_d = d
                nearest = c
        if nearest is None:
            continue

        region = nearest.get("region", "unknown")
        if region not in regions:
            regions[region] = {"region": region, "conflict_count": 0, "vessels_exposed": 0, "avg_exposure": 0.0, "escalation_risk": 0.0, "critical_vessels": 0}

        r = regions[region]
        pred = predictor.predict(t, nearest)
        exp = pred.get("exposure_score", 0)
        r["vessels_exposed"] += 1
        r["avg_exposure"] = (r["avg_exposure"] * (r["vessels_exposed"] - 1) + exp) / r["vessels_exposed"]
        r["escalation_risk"] = max(r["escalation_risk"], pred.get("escalation_risk", 0))
        if pred.get("escalation_warning"):
            r["critical_vessels"] += 1

    # Sort by escalation risk
    return dict(sorted(regions.items(), key=lambda x: x[1]["escalation_risk"], reverse=True))


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_timestamp(ts: Optional[str]) -> Optional[datetime]:
    """Parse ISO8601 or Unix timestamp to datetime."""
    if ts is None:
        return None
    try:
        if isinstance(ts, (int, float)):
            return datetime.fromtimestamp(ts, tz=timezone.utc)
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Conflict-Vessel ML Predictor")
    parser.add_argument("--api-base", default="http://localhost:10020",
                        help="HormuzWatch API base URL")
    parser.add_argument("--train", action="store_true",
                        help="Fetch data and train models")
    parser.add_argument("--predict", action="store_true",
                        help="Score all active vessels against conflicts")
    parser.add_argument("--export-model", default=None,
                        help="Save trained model to path (e.g., models/conflict_model.joblib)")
    parser.add_argument("--load-model", default=None,
                        help="Load a pre-trained model for prediction")
    parser.add_argument("--output", default=None,
                        help="Write prediction results to JSON file")
    args = parser.parse_args()

    fetcher = DataFetcher(args.api_base)

    if args.train:
        log.info("=== Training Mode ===")
        conflicts = fetcher.fetch_conflicts()
        traces = fetcher.fetch_top_traces()

        if len(traces) < 10:
            log.warning("Only %d traces — model may be unreliable", len(traces))

        engineer = FeatureEngineer()
        df = engineer.build_samples(traces, conflicts)

        if len(df) == 0:
            log.error("No samples generated — check data availability")
            sys.exit(1)

        predictor = ConflictPredictor()
        metrics = predictor.train(df)

        print("\n" + "=" * 60)
        print(" Training Results")
        print("=" * 60)
        for k, v in metrics.items():
            print(f"  {k:.<40s} {v}")
        print("=" * 60 + "\n")

        if args.export_model:
            predictor.save(args.export_model)
            print(f"Model exported → {args.export_model}")

    if args.predict:
        log.info("=== Prediction Mode ===")

        if args.load_model and os.path.exists(args.load_model):
            predictor = ConflictPredictor.load(args.load_model)
        else:
            log.error("No trained model available. Train first with --train or provide --load-model")
            sys.exit(1)

        conflicts = fetcher.fetch_conflicts()
        traces = fetcher.fetch_top_traces()

        # Per-vessel scoring
        vessel_scores = score_all_vessels(predictor, traces, conflicts)

        # Regional risk
        regional = compute_regional_risk(predictor, traces, conflicts)

        output = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "conflict_count": len(conflicts),
            "vessel_count": len(traces),
            "top_10_exposed_vessels": vessel_scores[:10],
            "regional_risk": regional,
        }

        print("\n" + "=" * 60)
        print(" Top 10 Most Exposed Vessels")
        print("=" * 60)
        for i, v in enumerate(vessel_scores[:10], 1):
            print(f"  {i:2d}. {v['asset_name']:<20s} | exp={v['exposure_score']:5.1f} | "
                  f"pred_sev={v['predicted_severity']:<8s} | esc={v['escalation_risk']:.3f}")
        print("=" * 60)

        print("\n" + "=" * 60)
        print(" Regional Escalation Risk")
        print("=" * 60)
        for region, data in list(regional.items())[:8]:
            print(f"  {region:<25s} risk={data['escalation_risk']:.3f}  "
                  f"critical={data['critical_vessels']}  conflicts={data['conflict_count']}")
        print("=" * 60 + "\n")

        if args.output:
            with open(args.output, "w") as f:
                json.dump(output, f, indent=2)
            print(f"Results written → {args.output}")


if __name__ == "__main__":
    main()
