"""
lib/features.py
---------------
Pydantic feature schemas and validation for the HormuzWatch ML inference service.

Three domain-specific schemas are defined:
  - VesselFeatures  (9 features: 8 kinematic + 1 EWMA deviation)
  - AviationFeatures (9 features: 8 kinematic + 1 EWMA deviation)
  - HeatmapFeatures  (4 features)

Each schema validates that values are in physically meaningful ranges and
provides a ``to_array`` method that returns features in the canonical order
expected by the saved StandardScaler / IsolationForest.

The ``DOMAIN_FEATURE_COLS`` mapping is the single source of truth for
column ordering — both train.py and predict.py import from here so that
the order never drifts between training and inference.
"""

from __future__ import annotations

from typing import Literal

import numpy as np
from pydantic import BaseModel, Field, model_validator


# ---------------------------------------------------------------------------
# Canonical feature column ordering (must match train.py exactly)
# ---------------------------------------------------------------------------

VESSEL_COLS: list[str] = [
    "course_delta",
    "heading_delta",
    "speed_delta",
    "average_speed",
    "speed_variance",
    "ais_gap_minutes",
    "dist_restricted_zone",
    "dist_historical_site",
    "ewma_deviation",
]

AVIATION_COLS: list[str] = [
    "course_delta",
    "alt_delta",
    "speed_delta",
    "average_speed",
    "speed_variance",
    "gap_minutes",
    "dist_restricted_airspace",
    "squawk_anomaly_flag",
    "ewma_deviation",
]

HEATMAP_COLS: list[str] = [
    "event_density_grid",
    "event_velocity",
    "gdelt_firms_ratio",
    "distance_to_nearest_track",
]

DOMAIN_FEATURE_COLS: dict[str, list[str]] = {
    "vessel": VESSEL_COLS,
    "aviation": AVIATION_COLS,
    "heatmap": HEATMAP_COLS,
}


# ---------------------------------------------------------------------------
# Domain schemas
# ---------------------------------------------------------------------------


class VesselFeatures(BaseModel):
    """
    9-dimensional feature vector for maritime vessel tracks.

    All distances are in nautical miles; speeds in knots; angles in degrees.
    ``ewma_deviation`` is a dimensionless z-score computed by the Go backend
    against that track's per-vessel EWMA baseline.
    """

    course_delta: float = Field(
        ge=0.0,
        le=360.0,
        description="Absolute heading change since previous observation (degrees).",
    )
    heading_delta: float = Field(
        ge=-180.0,
        le=180.0,
        description="Signed heading change, shortest arc (degrees).",
    )
    speed_delta: float = Field(
        description="Speed change since previous observation, signed (knots).",
    )
    average_speed: float = Field(
        ge=0.0,
        description="Mean speed over the sliding observation window (knots).",
    )
    speed_variance: float = Field(
        ge=0.0,
        description="Variance of speed over the observation window.",
    )
    ais_gap_minutes: float = Field(
        ge=0.0,
        description="Minutes elapsed since the previous AIS position report.",
    )
    dist_restricted_zone: float = Field(
        ge=0.0,
        description="Distance to the nearest restricted maritime zone (nm).",
    )
    dist_historical_site: float = Field(
        ge=0.0,
        description="Distance to the nearest historical attack site (nm).",
    )
    ewma_deviation: float = Field(
        description=(
            "Z-score of the track's current kinematic state versus its "
            "per-track exponentially-weighted moving average baseline. "
            "Computed by the Go backend's TrackStateManager."
        ),
    )

    def to_array(self) -> np.ndarray:
        """Return features as a 1-D NumPy array in canonical column order."""
        d = self.model_dump()
        return np.array([d[col] for col in VESSEL_COLS], dtype=np.float64)


class AviationFeatures(BaseModel):
    """
    9-dimensional feature vector for aviation tracks (OpenSky Network data).

    Speeds are in m/s (OpenSky convention); altitude delta in metres.
    ``ewma_deviation`` mirrors the vessel definition.
    """

    course_delta: float = Field(
        ge=0.0,
        le=360.0,
        description="Absolute heading change since previous observation (degrees).",
    )
    alt_delta: float = Field(
        description="Altitude change since previous observation (metres).",
    )
    speed_delta: float = Field(
        description="Speed change since previous observation (m/s).",
    )
    average_speed: float = Field(
        ge=0.0,
        description="Mean speed over the sliding observation window (m/s).",
    )
    speed_variance: float = Field(
        ge=0.0,
        description="Variance of speed over the observation window.",
    )
    gap_minutes: float = Field(
        ge=0.0,
        description="Minutes elapsed since the previous position update.",
    )
    dist_restricted_airspace: float = Field(
        ge=0.0,
        description="Distance to the nearest restricted airspace boundary (nm).",
    )
    squawk_anomaly_flag: float = Field(
        ge=0.0,
        le=1.0,
        description=(
            "1.0 if the aircraft is squawking a distress/emergency code "
            "(7500, 7600, 7700), else 0.0. Float to allow fractional "
            "confidence if inferred."
        ),
    )
    ewma_deviation: float = Field(
        description="Z-score vs per-track EWMA baseline (computed by Go backend).",
    )

    def to_array(self) -> np.ndarray:
        """Return features as a 1-D NumPy array in canonical column order."""
        d = self.model_dump()
        return np.array([d[col] for col in AVIATION_COLS], dtype=np.float64)


class HeatmapFeatures(BaseModel):
    """
    4-dimensional feature vector for regional heatmap anomaly detection.

    Captures spatial dynamics of multi-source event density in a grid cell.
    """

    event_density_grid: float = Field(
        ge=0.0,
        description=(
            "Number of aggregated telemetry/event hits in the 0.5° grid cell "
            "over the 1-hour sliding window."
        ),
    )
    event_velocity: float = Field(
        description=(
            "Rate of change of event density vs the previous window interval "
            "(events/minute, signed)."
        ),
    )
    gdelt_firms_ratio: float = Field(
        ge=0.0,
        description=(
            "Ratio of FIRMS (thermal) events to GDELT (geopolitical) events "
            "in the cell. 0.0 when GDELT events = 0."
        ),
    )
    distance_to_nearest_track: float = Field(
        ge=0.0,
        description="Distance from cell centroid to the nearest active vessel/aircraft track (nm).",
    )

    def to_array(self) -> np.ndarray:
        """Return features as a 1-D NumPy array in canonical column order."""
        d = self.model_dump()
        return np.array([d[col] for col in HEATMAP_COLS], dtype=np.float64)


# ---------------------------------------------------------------------------
# Union type for top-level routing
# ---------------------------------------------------------------------------

AnyFeatures = VesselFeatures | AviationFeatures | HeatmapFeatures

DOMAIN_SCHEMA: dict[str, type] = {
    "vessel": VesselFeatures,
    "aviation": AviationFeatures,
    "heatmap": HeatmapFeatures,
}


def parse_features(domain: str, raw: dict) -> AnyFeatures:
    """
    Parse and validate a raw feature dictionary against the correct domain schema.

    Parameters
    ----------
    domain:
        One of ``"vessel"``, ``"aviation"``, or ``"heatmap"``.
    raw:
        Dictionary of feature name → value from the incoming request body.

    Returns
    -------
    AnyFeatures
        Validated Pydantic model instance.

    Raises
    ------
    ValueError
        If ``domain`` is not recognised.
    pydantic.ValidationError
        If any field value fails range/type validation.
    """
    schema = DOMAIN_SCHEMA.get(domain)
    if schema is None:
        raise ValueError(
            f"Unknown domain '{domain}'. Expected one of: "
            f"{sorted(DOMAIN_SCHEMA.keys())}"
        )
    return schema(**raw)
