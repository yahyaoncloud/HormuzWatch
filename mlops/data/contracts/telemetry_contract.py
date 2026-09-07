"""
data/contracts/telemetry_contract.py
====================================
Data contracts and schema validation rules for incoming maritime AIS and
aviation telemetry feeds, based on Chip Huyen's 'Designing Machine Learning Systems' (Chapter 3).
"""

from __future__ import annotations
from typing import List, Optional
import pandas as pd
from pydantic import BaseModel, Field, field_validator


class AISRecordContract(BaseModel):
    """Schema & boundary assertion for a single AIS telemetry record."""
    mmsi: int = Field(..., ge=100000000, le=999999999, description="Valid 9-digit MMSI")
    latitude: float = Field(..., ge=20.0, le=32.0, description="Strait of Hormuz / Gulf bounding box")
    longitude: float = Field(..., ge=50.0, le=62.0, description="Strait of Hormuz / Gulf bounding box")
    speed_over_ground: float = Field(..., ge=0.0, le=70.0, description="Speed in knots")
    course_over_ground: float = Field(..., ge=0.0, le=360.0, description="Course in degrees")
    heading: Optional[float] = Field(None, ge=0.0, le=360.0)
    vessel_type: Optional[str] = "Cargo"
    nav_status: Optional[str] = "Under way using engine"


class TelemetryDataQualityReport:
    """Validates a Pandas DataFrame of telemetry batches against data contracts."""

    @staticmethod
    def validate_batch(df: pd.DataFrame) -> dict:
        total = len(df)
        if total == 0:
            return {"valid": False, "error": "Empty dataframe"}

        # Missingness checks
        null_counts = df.isnull().sum().to_dict()
        coord_valid = (
            (df["latitude"] >= 20.0) & (df["latitude"] <= 32.0) &
            (df["longitude"] >= 50.0) & (df["longitude"] <= 62.0)
        ).sum()

        speed_valid = ((df["speed_over_ground"] >= 0.0) & (df["speed_over_ground"] <= 70.0)).sum()
        
        valid_records = coord_valid == total and speed_valid == total
        quality_score = (coord_valid + speed_valid) / (2 * total)

        return {
            "valid": valid_records,
            "total_records": total,
            "quality_score": round(quality_score, 4),
            "coord_compliance_pct": round(coord_valid / total * 100, 2),
            "speed_compliance_pct": round(speed_valid / total * 100, 2),
            "null_distribution": null_counts,
        }
