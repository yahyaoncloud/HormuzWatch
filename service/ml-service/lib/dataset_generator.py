"""
lib/dataset_generator.py
-------------------------
Historical dataset loader and exporter for HormuzWatch ML workflows.
Enables Python training scripts (e.g. train.py) to load versioned
parquet / CSV snapshots with clean separation between normal and anomalous samples.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import pandas as pd
from lib.features import VESSEL_COLS, AVIATION_COLS

@dataclass
class DatasetBundle:
    metadata: Dict
    quality_report: Dict
    df_full: pd.DataFrame
    df_train: pd.DataFrame
    df_val: pd.DataFrame
    df_test: pd.DataFrame


def load_dataset(dataset_dir: str) -> DatasetBundle:
    """Load a versioned dataset directory containing data.csv/parquet and metadata."""
    meta_path = os.path.join(dataset_dir, "metadata.json")
    if not os.path.exists(meta_path):
        raise FileNotFoundError(f"Missing metadata.json in {dataset_dir}")

    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    report_path = os.path.join(dataset_dir, "quality_report.json")
    report = {}
    if os.path.exists(report_path):
        with open(report_path, "r", encoding="utf-8") as f:
            report = json.load(f)

    csv_path = os.path.join(dataset_dir, "data.csv")
    df = pd.read_csv(csv_path)

    df_train = df[df["dataset_split"] == "train"].copy()
    df_val = df[df["dataset_split"] == "val"].copy()
    df_test = df[df["dataset_split"] == "test"].copy()

    return DatasetBundle(
        metadata=meta,
        quality_report=report,
        df_full=df,
        df_train=df_train,
        df_val=df_val,
        df_test=df_test,
    )


def extract_feature_matrix(df: pd.DataFrame, domain: str = "vessel") -> Tuple[pd.DataFrame, pd.Series]:
    """Extract canonical feature matrix X and target label y."""
    feature_cols = VESSEL_COLS if domain == "vessel" else AVIATION_COLS
    available_cols = [c for c in feature_cols if c in df.columns]
    
    X = df[available_cols].copy()
    y = df["is_anomaly"].copy() if "is_anomaly" in df.columns else pd.Series([0] * len(df))
    return X, y
