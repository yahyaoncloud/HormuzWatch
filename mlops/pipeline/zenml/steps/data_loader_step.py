"""
ZenML Step: Data Loader
Ingests raw or pre-extracted AIS maritime features from DVC-managed local storage or database.
"""
from zenml import step
import pandas as pd
from pathlib import Path

@step
def data_loader_step() -> pd.DataFrame:
    """Load latest telemetry features for continuous training."""
    feature_path = Path("data/features/vessel_features.parquet")
    if feature_path.exists():
        df = pd.read_parquet(feature_path)
    else:
        # Fallback to generating baseline features via extract_features
        from pipeline.extract_features import extract_features_from_db
        df = extract_features_from_db(hours=48)
    return df
