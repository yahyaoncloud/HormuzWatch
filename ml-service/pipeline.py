"""
pipeline.py — Robust ML Training & Inference Pipeline
======================================================

Orchestrates the full HormuzWatch ML lifecycle:

  1. Data Ingestion    — pulls telemetry + conflict data from the Go backend
  2. Feature Engineering — builds vessel, aviation, and conflict-vessel features
  3. Model Training     — IsolationForest (anomaly) + XGBoost/RF (conflict)
  4. Validation         — cross-validation, threshold tuning, holdout scoring
  5. Model Promotion    — saves to models/ with versioning, updates registry
  6. Notification       — reports metrics, promotes or rolls back

Can be run as a one-shot CLI or scheduled via cron / Task Scheduler.

Usage:
    # Full pipeline
    python pipeline.py --api-base http://localhost:10020 --full

    # Train only anomaly model
    python pipeline.py --api-base http://localhost:10020 --train-anomaly

    # Train only conflict model
    python pipeline.py --api-base http://localhost:10020 --train-conflict

    # Validate existing models
    python pipeline.py --api-base http://localhost:10020 --validate

    # Promote best model to production
    python pipeline.py --promote anomaly --version v1.20260721120000

Dependencies: pip install xgboost scikit-learn joblib pandas requests

Author: HormuzWatch ML Team
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import shutil
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd
import requests
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.metrics import (
    classification_report,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from xgboost import XGBClassifier

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("pipeline")

# ── Paths ─────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)
REGISTRY_PATH = MODEL_DIR / "model_registry.json"

ANOMALY_FEATURE_COLS = [
    "course_delta", "heading_delta", "speed_delta",
    "average_speed", "speed_variance", "ais_gap_minutes",
    "dist_restricted_zone", "dist_historical_site",
]
SEVERITY_ORDER = {"low": 0, "medium": 1, "high": 2, "critical": 3}


# ── Data Fetcher ──────────────────────────────────────────────────────────────

class DataFetcher:
    def __init__(self, api_base: str = "http://localhost:10020"):
        self.api_base = api_base.rstrip("/")
        self.s = requests.Session()
        self.s.headers["Accept"] = "application/json"

    def get(self, path: str) -> Optional[dict]:
        try:
            r = self.s.get(f"{self.api_base}{path}", timeout=30)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            log.error("GET %s failed: %s", path, e)
            return None

    def get_conflicts(self) -> list[dict]:
        return self.get("/public/conflicts") or {}

    def get_traces(self) -> list[dict]:
        data = self.get("/public/top-traces")
        return (data or {}).get("traces", [])

    def get_metrics(self) -> dict:
        return self.get("/public/metrics") or {}


# ── Model Registry ────────────────────────────────────────────────────────────

@dataclass
class ModelVersion:
    name: str
    version: str
    path: str
    metrics: dict = field(default_factory=dict)
    created_at: str = ""
    promoted: bool = False


class ModelRegistry:
    def __init__(self, path: Path = REGISTRY_PATH):
        self.path = path
        self.versions: dict[str, list[ModelVersion]] = self._load()

    def _load(self) -> dict[str, list[ModelVersion]]:
        if self.path.exists():
            data = json.loads(self.path.read_text())
            return {
                k: [ModelVersion(**v) for v in vs]
                for k, vs in data.items()
            }
        return {}

    def _save(self):
        data = {k: [vars(v) for v in vs] for k, vs in self.versions.items()}
        self.path.write_text(json.dumps(data, indent=2, default=str))

    def register(self, name: str, version: str, path: str, metrics: dict) -> ModelVersion:
        mv = ModelVersion(
            name=name,
            version=version,
            path=path,
            metrics=metrics,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        self.versions.setdefault(name, []).append(mv)
        self._save()
        return mv

    def promote(self, name: str, version: str) -> bool:
        for mv in self.versions.get(name, []):
            mv.promoted = (mv.version == version)
        self._save()
        src = MODEL_DIR / f"{name}_{version}.joblib"
        dst = MODEL_DIR / f"{name}.joblib"
        if src.exists():
            shutil.copy2(src, dst)
            log.info("Promoted %s v%s -> %s", name, version, dst.name)
            return True
        return False

    def get_latest(self, name: str) -> Optional[ModelVersion]:
        versions = self.versions.get(name, [])
        return versions[-1] if versions else None

    def get_promoted(self, name: str) -> Optional[ModelVersion]:
        for mv in reversed(self.versions.get(name, [])):
            if mv.promoted:
                return mv
        return None


# ── Anomaly Model Trainer ─────────────────────────────────────────────────────

class AnomalyTrainer:
    def train(self, data: list[dict], contamination: float = 0.05) -> tuple[IsolationForest, StandardScaler, dict]:
        """Train IsolationForest on vessel feature vectors."""
        X_raw = np.array([[d.get(col, 0.0) for col in ANOMALY_FEATURE_COLS] for d in data])
        scaler = StandardScaler()
        X = scaler.fit_transform(X_raw)

        model = IsolationForest(
            n_estimators=200,
            contamination=contamination,
            max_samples="auto",
            random_state=42,
            n_jobs=-1,
        )
        model.fit(X)

        # Evaluate
        scores = model.decision_function(X)
        predictions = model.predict(X)
        anomaly_rate = (predictions == -1).sum() / len(predictions)

        metrics = {
            "n_samples": len(data),
            "contamination": contamination,
            "anomaly_rate": round(float(anomaly_rate), 4),
            "mean_score": round(float(scores.mean()), 4),
            "score_std": round(float(scores.std()), 4),
            "score_min": round(float(scores.min()), 4),
            "score_max": round(float(scores.max()), 4),
        }

        # If we have labeled test data, compute precision/recall
        if any(d.get("label") is not None for d in data):
            y_true = np.array([1 if d.get("label") == "anomaly" else 0 for d in data])
            y_pred_binary = (predictions == -1).astype(int)
            metrics["precision"] = round(precision_score(y_true, y_pred_binary, zero_division=0), 4)
            metrics["recall"] = round(recall_score(y_true, y_pred_binary, zero_division=0), 4)
            metrics["f1"] = round(f1_score(y_true, y_pred_binary, zero_division=0), 4)

        return model, scaler, metrics

    def save(self, model: IsolationForest, scaler: StandardScaler, version: str) -> Path:
        path = MODEL_DIR / f"anomaly_{version}.joblib"
        joblib.dump({"model": model, "scaler": scaler, "version": version}, path)
        log.info("Saved anomaly model: %s", path)
        return path


# ── Conflict Model Trainer ────────────────────────────────────────────────────

class ConflictTrainer:
    def train(self, traces: list[dict], conflicts: list[dict]) -> tuple[XGBClassifier, RandomForestClassifier, dict]:
        """Train conflict prediction models from vessel-conflict pairs."""
        # Build samples
        from conflict_predictor import FeatureEngineer
        engineer = FeatureEngineer()
        df = engineer.build_samples(traces, conflicts)

        if len(df) < 5:
            log.warning("Only %d samples — insufficient for conflict training", len(df))
            return None, None, {"status": "skipped", "n_samples": len(df)}

        # Feature engineering
        feature_cols = [
            "vessel_speed", "vessel_heading", "vessel_score",
            "distance_to_conflict_nm", "bearing_to_conflict_deg",
            "time_delta_minutes", "hour_of_day", "day_of_week",
            "is_nighttime", "vessel_heading_toward_conflict",
        ]
        categorical_cols = ["conflict_type", "conflict_region", "vessel_severity"]
        encoders = {}

        X_parts = [df[feature_cols].fillna(0).values.astype(np.float32)]
        for col in categorical_cols:
            le = LabelEncoder()
            X_parts.append(le.fit_transform(df[col].astype(str)).reshape(-1, 1).astype(np.float32))
            encoders[col] = le

        X = np.hstack(X_parts)
        scaler = StandardScaler()
        X = scaler.fit_transform(X)
        y = df["label_severity"].values.astype(int)

        # Re-encode labels for XGBoost
        unique_labels = sorted(set(y))
        label_map = {orig: i for i, orig in enumerate(unique_labels)}
        y_enc = np.array([label_map[lbl] for lbl in y])

        X_train, X_test, y_train, y_test = train_test_split(
            X, y_enc, test_size=0.25, random_state=42, stratify=y_enc
        )

        # XGBoost severity classifier
        n_classes = len(unique_labels)
        xgb_args = dict(
            n_estimators=200, max_depth=6, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8, random_state=42, n_jobs=-1,
        )
        if n_classes > 2:
            xgb_args["objective"] = "multi:softmax"
            xgb_args["num_class"] = n_classes
        else:
            xgb_args["objective"] = "binary:logistic"

        severity_clf = XGBClassifier(**xgb_args)
        severity_clf.fit(X_train, y_train)
        y_pred = severity_clf.predict(X_test)

        # RandomForest escalation classifier
        y_esc = (y >= 2).astype(int)
        y_esc_train, y_esc_test = train_test_split(
            y_esc, test_size=0.25, random_state=42, stratify=y_esc
        )
        escalation_clf = RandomForestClassifier(
            n_estimators=150, max_depth=10, min_samples_split=5,
            random_state=42, n_jobs=-1,
        )
        # Use same split indices
        n_test = len(y_test)
        y_esc_train = y_esc[:len(y_train)]
        y_esc_test = y_esc[len(y_train):len(y_train) + n_test]
        escalation_clf.fit(X_train, y_esc_train)
        y_esc_pred = escalation_clf.predict(X_test)

        metrics = {
            "n_samples": len(df),
            "n_classes": n_classes,
            "severity_f1": round(f1_score(y_test, y_pred, average="weighted"), 4),
            "escalation_f1": round(f1_score(y_esc_test, y_esc_pred), 4),
            "escalation_roc_auc": round(
                roc_auc_score(y_esc_test, escalation_clf.predict_proba(X_test)[:, 1]), 4
            ),
        }

        return severity_clf, escalation_clf, metrics

    def save(
        self,
        severity_clf: XGBClassifier,
        escalation_clf: RandomForestClassifier,
        scaler: StandardScaler,
        version: str,
    ) -> Path:
        path = MODEL_DIR / f"conflict_{version}.joblib"
        joblib.dump({
            "severity_clf": severity_clf,
            "escalation_clf": escalation_clf,
            "scaler": scaler,
        }, path)
        log.info("Saved conflict model: %s", path)
        return path


# ── Pipeline Orchestrator ─────────────────────────────────────────────────────

class Pipeline:
    def __init__(self, api_base: str = "http://localhost:10020"):
        self.fetcher = DataFetcher(api_base)
        self.registry = ModelRegistry()
        self.version = datetime.now(timezone.utc).strftime("v1.%Y%m%d%H%M%S")

    def run_anomaly(self) -> bool:
        """Train anomaly detection model."""
        log.info("=== Anomaly Detection Training ===")
        traces = self.fetcher.get_traces()
        if len(traces) < 10:
            log.warning("Only %d traces — insufficient for anomaly training", len(traces))
            return False

        trainer = AnomalyTrainer()
        model, scaler, metrics = trainer.train(traces)

        path = trainer.save(model, scaler, self.version)
        self.registry.register("anomaly", self.version, str(path), metrics)

        log.info("Anomaly metrics: %s", json.dumps(metrics, indent=2))
        return True

    def run_conflict(self) -> bool:
        """Train conflict prediction models."""
        log.info("=== Conflict Prediction Training ===")
        traces = self.fetcher.get_traces()
        conflicts = self.fetcher.get_conflicts().get("conflicts", [])

        if len(traces) < 5 or len(conflicts) < 5:
            log.warning("Insufficient data: %d traces, %d conflicts", len(traces), len(conflicts))
            return False

        trainer = ConflictTrainer()
        sev_clf, esc_clf, metrics = trainer.train(traces, conflicts)

        if sev_clf is None:
            return False

        # Build scaler
        from conflict_predictor import FeatureEngineer
        engineer = FeatureEngineer()
        df = engineer.build_samples(traces, conflicts)
        scaler = StandardScaler()
        feature_cols = [
            "vessel_speed", "vessel_heading", "vessel_score",
            "distance_to_conflict_nm", "bearing_to_conflict_deg",
            "time_delta_minutes", "hour_of_day", "day_of_week",
            "is_nighttime", "vessel_heading_toward_conflict",
        ]
        X = df[feature_cols].fillna(0).values.astype(np.float32)
        scaler.fit(X)

        path = trainer.save(sev_clf, esc_clf, scaler, self.version)
        self.registry.register("conflict", self.version, str(path), metrics)

        log.info("Conflict metrics: %s", json.dumps(metrics, indent=2))
        return True

    def validate(self) -> dict:
        """Validate all promoted models and return scores."""
        results = {}
        for name in ["anomaly", "conflict"]:
            mv = self.registry.get_promoted(name)
            if mv and Path(mv.path).exists():
                data = joblib.load(mv.path)
                results[name] = {
                    "version": mv.version,
                    "path": mv.path,
                    "exists": True,
                    "metrics": mv.metrics,
                }
            else:
                results[name] = {"exists": False}
        return results

    def full(self) -> dict:
        """Run the complete training pipeline."""
        log.info("=" * 50)
        log.info("Full ML Pipeline — Version %s", self.version)
        log.info("=" * 50)

        results = {
            "version": self.version,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "anomaly": self.run_anomaly(),
            "conflict": self.run_conflict(),
        }

        # Auto-promote if metrics meet thresholds
        anomaly_mv = self.registry.get_latest("anomaly")
        if anomaly_mv and anomaly_mv.metrics.get("f1", 0) > 0.7:
            self.registry.promote("anomaly", anomaly_mv.version)

        conflict_mv = self.registry.get_latest("conflict")
        if conflict_mv and conflict_mv.metrics.get("severity_f1", 0) > 0.6:
            self.registry.promote("conflict", conflict_mv.version)

        log.info("=" * 50)
        log.info("Pipeline complete: %s", json.dumps(results, indent=2, default=str))
        log.info("=" * 50)

        return results


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="HormuzWatch ML Training Pipeline")
    parser.add_argument("--api-base", default="http://localhost:10020")
    parser.add_argument("--full", action="store_true", help="Run full pipeline")
    parser.add_argument("--train-anomaly", action="store_true")
    parser.add_argument("--train-conflict", action="store_true")
    parser.add_argument("--validate", action="store_true", help="Validate promoted models")
    parser.add_argument("--promote", choices=["anomaly", "conflict"])
    parser.add_argument("--version", help="Version to promote (required with --promote)")
    args = parser.parse_args()

    pipeline = Pipeline(args.api_base)

    if args.full:
        pipeline.full()
    elif args.train_anomaly:
        pipeline.run_anomaly()
    elif args.train_conflict:
        pipeline.run_conflict()
    elif args.validate:
        results = pipeline.validate()
        print(json.dumps(results, indent=2))
    elif args.promote:
        if not args.version:
            log.error("--version required with --promote")
            sys.exit(1)
        pipeline.registry.promote(args.promote, args.version)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
