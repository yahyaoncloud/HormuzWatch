"""
lib/features.py
---------------
Pydantic feature schemas and validation for the HormuzWatch ML inference service.

Four domain-specific schemas are defined:
  - VesselFeatures   (9 features: 8 kinematic + 1 EWMA deviation)
  - AviationFeatures  (9 features: 8 kinematic + 1 EWMA deviation)
  - HeatmapFeatures   (4 features)
  - NewsFeatures      (18 features: structural + content + context + enrichment)

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

NEWS_COLS: list[str] = [
    "keyword_count",
    "entity_count",
    "article_length",
    "publication_age_hours",
    "military_term_count",
    "energy_term_count",
    "shipping_term_count",
    "cyber_term_count",
    "country_risk_score",
    "source_reliability",
    "sentiment_score",
    "organization_count",
    "company_count",
    "port_mentions",
    "airport_mentions",
    "ship_mentions",
    "aircraft_mentions",
    "publisher_weight",
]

# ── Transit anomaly features ──────────────────────────────────────────────
# Used to detect anomalous gate-line crossing patterns. Features are
# computed by the Go backend's gate.go module when a crossing is detected.
TRANSIT_COLS: list[str] = [
    "crossing_speed",            # Speed at gate crossing (knots)
    "time_since_last_transit_h", # Hours since this vessel last crossed
    "crossing_hour",             # Hour of day (0-23)
    "vessel_speed_before",       # Speed 10 min before crossing
    "destination_direction_match", # 1.0 if destination matches crossing direction, 0.0 otherwise
    "gate_dist_from_center_nm",  # Distance from crossing point to gate center (NM)
    "speed_vs_avg_ratio",        # Crossing speed / vessel's average speed
]

# ── Blockade severity features ────────────────────────────────────────────
# Used for data-driven severity classification (normal/elevated/high/critical).
# Features are computed by the Go backend's blockade.go module.
BLOCKADE_COLS: list[str] = [
    "strait_transits_24h",       # Number of Strait crossings in 24h
    "anchored_ratio_pct",        # Percentage of vessels anchored
    "waiting_fleet_6h",          # Vessels stationary 6+ hours
    "waiting_fleet_24h",         # Vessels stationary 24+ hours
    "active_vessels",            # Total active vessel count
    "anchorage_zone_count",      # Number of anchorage zones with vessels
    "flag_entropy",              # Shannon entropy of flag state distribution (0-1)
]

DOMAIN_FEATURE_COLS: dict[str, list[str]] = {
    "vessel": VESSEL_COLS,
    "aviation": AVIATION_COLS,
    "heatmap": HEATMAP_COLS,
    "news": NEWS_COLS,
    "transit": TRANSIT_COLS,
    "blockade": BLOCKADE_COLS,
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
        default=0.0,
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
        default=0.0,
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


class NewsFeatures(BaseModel):
    """
    18-dimensional feature vector for news intelligence scoring.

    All features are computed by the Go backend's news preprocessing pipeline
    (cleaning → language detection → translation → entity extraction →
    keyword extraction → category classification → feature engineering).
    """
    # ... (existing fields unchanged) ...
    keyword_count: int = Field(ge=0, le=500)
    entity_count: int = Field(ge=0, le=200)
    article_length: int = Field(ge=0, le=100000)
    publication_age_hours: float = Field(ge=0.0, le=8760.0)
    military_term_count: int = Field(ge=0, le=200)
    energy_term_count: int = Field(ge=0, le=200)
    shipping_term_count: int = Field(ge=0, le=200)
    cyber_term_count: int = Field(ge=0, le=100)
    country_risk_score: float = Field(ge=0.0, le=1.0)
    source_reliability: float = Field(ge=0.0, le=1.0)
    sentiment_score: float = Field(ge=0.0, le=1.0)
    organization_count: int = Field(ge=0, le=50)
    company_count: int = Field(ge=0, le=50)
    port_mentions: int = Field(ge=0, le=30)
    airport_mentions: int = Field(ge=0, le=30)
    ship_mentions: int = Field(ge=0, le=30)
    aircraft_mentions: int = Field(ge=0, le=30)
    publisher_weight: float = Field(ge=0.0, le=1.0)

    def to_array(self) -> np.ndarray:
        d = self.model_dump()
        return np.array([d[col] for col in NEWS_COLS], dtype=np.float64)


class TransitFeatures(BaseModel):
    """
    7-dimensional feature vector for transit anomaly detection.

    Computed by the Go backend's gate.go module when a vessel crosses
    a gate line. Used to detect anomalous crossing patterns (e.g. night
    crossings, destination mismatch, unusual speed for vessel type).
    """

    crossing_speed: float = Field(
        ge=0.0, le=50.0,
        description="Speed at gate crossing (knots).",
    )
    time_since_last_transit_h: float = Field(
        ge=0.0, le=8760.0,
        description="Hours since this vessel last crossed any gate.",
    )
    crossing_hour: float = Field(
        ge=0.0, le=23.0,
        description="Hour of day the crossing occurred (0-23).",
    )
    vessel_speed_before: float = Field(
        ge=0.0, le=50.0,
        description="Vessel speed 10 minutes before crossing (knots).",
    )
    destination_direction_match: float = Field(
        ge=0.0, le=1.0,
        description="1.0 if AIS destination matches crossing direction, 0.0 otherwise.",
    )
    gate_dist_from_center_nm: float = Field(
        ge=0.0, le=30.0,
        description="Distance from crossing point to gate line center (NM).",
    )
    speed_vs_avg_ratio: float = Field(
        ge=0.0, le=10.0,
        description="Crossing speed divided by vessel's 24h average speed.",
    )

    def to_array(self) -> np.ndarray:
        d = self.model_dump()
        return np.array([d[col] for col in TRANSIT_COLS], dtype=np.float64)


class BlockadeFeatures(BaseModel):
    """
    7-dimensional feature vector for blockade severity classification.

    Computed by the Go backend's blockade.go module from aggregated
    vessel and transit statistics. Used to classify the regional
    maritime situation (normal / elevated / high / critical).
    """

    strait_transits_24h: int = Field(
        ge=0, le=1000,
        description="Number of Strait of Hormuz crossings in last 24h.",
    )
    anchored_ratio_pct: float = Field(
        ge=0.0, le=100.0,
        description="Percentage of active vessels currently anchored.",
    )
    waiting_fleet_6h: int = Field(
        ge=0, le=500,
        description="Vessels stationary for 6+ hours.",
    )
    waiting_fleet_24h: int = Field(
        ge=0, le=500,
        description="Vessels stationary for 24+ hours.",
    )
    active_vessels: int = Field(
        ge=0, le=2000,
        description="Total active vessel count in the region.",
    )
    anchorage_zone_count: int = Field(
        ge=0, le=20,
        description="Number of anchorage zones with at least one vessel.",
    )
    flag_entropy: float = Field(
        ge=0.0, le=1.0,
        description="Shannon entropy of flag state distribution (0=uniform, 1=diverse).",
    )

    def to_array(self) -> np.ndarray:
        d = self.model_dump()
        return np.array([d[col] for col in BLOCKADE_COLS], dtype=np.float64)


# ---------------------------------------------------------------------------
# Union type for top-level routing
# ---------------------------------------------------------------------------

AnyFeatures = VesselFeatures | AviationFeatures | HeatmapFeatures | NewsFeatures | TransitFeatures | BlockadeFeatures

DOMAIN_SCHEMA: dict[str, type] = {
    "vessel": VesselFeatures,
    "aviation": AviationFeatures,
    "heatmap": HeatmapFeatures,
    "news": NewsFeatures,
    "transit": TransitFeatures,
    "blockade": BlockadeFeatures,
}


def parse_features(domain: str, raw: dict) -> AnyFeatures:
    """
    Parse and validate a raw feature dictionary against the correct domain schema.

    Parameters
    ----------
    domain:
        One of ``"vessel"``, ``"aviation"``, ``"heatmap"``, or ``"news"``.
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
