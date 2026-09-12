"""
mlops/etl/transformer.py
========================
Telemetry feature transformation, validation against data contracts,
and stratified train/val/test partitioning for HormuzWatch MLOps.
"""

from __future__ import annotations

import logging
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from mlops.data.contracts.telemetry_contract import TelemetryDataQualityReport

logger = logging.getLogger("mlops.etl.transformer")

# Key maritime restricted zones / chokepoints in Strait of Hormuz & Persian Gulf
RESTRICTED_ZONES = [
    {"name": "Hormuz_TSS_Inbound", "lat": 26.35, "lon": 56.45, "radius_nm": 4.0},
    {"name": "Hormuz_TSS_Outbound", "lat": 26.42, "lon": 56.55, "radius_nm": 4.0},
    {"name": "Bandar_Abbas_Naval_Base", "lat": 27.14, "lon": 56.21, "radius_nm": 6.0},
    {"name": "Fujairah_Offshore_Anchorage", "lat": 25.18, "lon": 56.36, "radius_nm": 5.0},
    {"name": "Ras_Tanura_Terminal_Exclusion", "lat": 26.68, "lon": 50.18, "radius_nm": 5.0},
    {"name": "Abu_Musa_Territorial_Zone", "lat": 25.88, "lon": 55.03, "radius_nm": 3.0},
]

# Historical attack / incident sites (e.g. 2019 Gulf of Oman tanker attacks, drone incidents)
HISTORICAL_ATTACK_SITES = [
    {"incident": "Front_Altair_Attack", "lat": 25.45, "lon": 57.35},
    {"incident": "Kokuka_Courageous_Attack", "lat": 25.40, "lon": 57.48},
    {"incident": "Stena_Impero_Seizure", "lat": 26.32, "lon": 56.38},
    {"incident": "Fujairah_Sabotage_2019", "lat": 25.15, "lon": 56.39},
    {"incident": "Mercer_Street_Strike", "lat": 21.16, "lon": 59.81},
]


def haversine_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute great-circle distance between two points in Nautical Miles (NM)."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return 3440.065 * c  # 1 radian ≈ 3440.065 NM


class TelemetryTransformer:
    """Transforms raw observations into canonical ML feature matrices with data contracts."""

    def __init__(self, domain: str = "vessel", train_pct: float = 0.70, val_pct: float = 0.15):
        self.domain = "vessel" if domain in ("vessel", "maritime") else "aviation"
        self.train_pct = train_pct
        self.val_pct = val_pct

    def compute_geospatial_features(self, lat: float, lon: float) -> Tuple[float, float, bool, bool]:
        """Compute distances to nearest restricted zones and historical incident sites."""
        min_zone_dist = 999.0
        in_zone = False
        for zone in RESTRICTED_ZONES:
            d = haversine_nm(lat, lon, zone["lat"], zone["lon"])
            effective_dist = max(0.0, d - zone["radius_nm"])
            if effective_dist < min_zone_dist:
                min_zone_dist = effective_dist
            if d <= zone["radius_nm"]:
                in_zone = True

        min_attack_dist = 999.0
        near_attack = False
        for site in HISTORICAL_ATTACK_SITES:
            d = haversine_nm(lat, lon, site["lat"], site["lon"])
            if d < min_attack_dist:
                min_attack_dist = d
            if d <= 5.0:
                near_attack = True

        return round(min_zone_dist, 2), round(min_attack_dist, 2), in_zone, near_attack

    def transform(self, raw_df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Transforms raw records into canonical ML feature matrix.
        Calculates:
          - Heading / Course deltas (shortest angular delta [-180, 180])
          - Speed delta, average speed, speed variance
          - Spatial proximity to restricted corridors and historical attack sites
          - EWMA multivariate kinematic deviation
          - Silver / weak labeling with confidence score
          - Chronological train/val/test splits
        """
        if raw_df.empty:
            raise ValueError("Input telemetry dataframe is empty.")

        df = raw_df.copy()

        # Contract validation pre-check
        contract_cols = {
            "latitude": df["lat"] if "lat" in df.columns else df.get("latitude", 0),
            "longitude": df["lon"] if "lon" in df.columns else df.get("longitude", 0),
            "speed_over_ground": df["speed"] if "speed" in df.columns else df.get("speed_over_ground", 0),
        }
        contract_df = pd.DataFrame(contract_cols)
        quality_contract = TelemetryDataQualityReport.validate_batch(contract_df)

        # Standardize required columns
        if "track_id" not in df.columns:
            df["track_id"] = [f"TRK_{i}" for i in range(len(df))]
        if "asset_name" not in df.columns:
            df["asset_name"] = df["track_id"]
        if "observed_at" not in df.columns:
            df["observed_at"] = datetime.now(timezone.utc).isoformat()
        if "speed" not in df.columns:
            df["speed"] = 0.0
        if "heading" not in df.columns:
            df["heading"] = 0.0

        # Sort chronologically by track and time
        df["observed_at"] = pd.to_datetime(df["observed_at"], errors="coerce").fillna(pd.Timestamp.now(timezone.utc))
        df = df.sort_values(by=["track_id", "observed_at"]).reset_index(drop=True)

        # Feature computation grouped by track
        records: List[Dict[str, Any]] = []

        for track_id, group in df.groupby("track_id"):
            obs_list = group.to_dict("records")
            speeds_window: List[float] = []

            # EWMA state
            mean_course_delta = 0.0
            var_course_delta = 1.0
            mean_speed_delta = 0.0
            var_speed_delta = 1.0
            mean_speed = 0.0
            var_speed = 1.0
            alpha = 0.15

            for i, curr in enumerate(obs_list):
                curr_spd = float(curr.get("speed", 0.0) or 0.0)
                curr_hdg = float(curr.get("heading", 0.0) or 0.0)
                curr_lat = float(curr.get("lat", 0.0) or 0.0)
                curr_lon = float(curr.get("lon", 0.0) or 0.0)

                if i > 0:
                    prev = obs_list[i - 1]
                    prev_spd = float(prev.get("speed", 0.0) or 0.0)
                    prev_hdg = float(prev.get("heading", 0.0) or 0.0)
                    spd_delta = curr_spd - prev_spd

                    diff = (curr_hdg - prev_hdg + 540.0) % 360.0 - 180.0
                    course_delta = abs(diff)
                    heading_delta = diff

                    prev_time = prev["observed_at"]
                    curr_time = curr["observed_at"]
                    gap_mins = max(0.0, (curr_time - prev_time).total_seconds() / 60.0)
                else:
                    course_delta = float(curr.get("course_delta", 0.0) or 0.0)
                    heading_delta = 0.0
                    prev_spd = float(curr.get("previous_speed", curr_spd) or curr_spd)
                    spd_delta = curr_spd - prev_spd
                    gap_mins = float(curr.get("ais_age_minutes", 0.0) or 0.0)

                # Sliding speed moments
                speeds_window.append(curr_spd)
                if len(speeds_window) > 20:
                    speeds_window.pop(0)

                avg_spd = float(np.mean(speeds_window))
                spd_var = float(np.var(speeds_window, ddof=1)) if len(speeds_window) > 1 else 0.0

                # EWMA tracking
                if i == 0:
                    mean_course_delta = course_delta
                    mean_speed_delta = spd_delta
                    mean_speed = curr_spd
                else:
                    mean_course_delta = (1 - alpha) * mean_course_delta + alpha * course_delta
                    d_c = course_delta - mean_course_delta
                    var_course_delta = (1 - alpha) * var_course_delta + alpha * (d_c ** 2)

                    mean_speed_delta = (1 - alpha) * mean_speed_delta + alpha * spd_delta
                    d_sd = spd_delta - mean_speed_delta
                    var_speed_delta = (1 - alpha) * var_speed_delta + alpha * (d_sd ** 2)

                    mean_speed = (1 - alpha) * mean_speed + alpha * curr_spd
                    d_s = curr_spd - mean_speed
                    var_speed = (1 - alpha) * var_speed + alpha * (d_s ** 2)

                z_c = (course_delta - mean_course_delta) / math.sqrt(max(var_course_delta, 0.25))
                z_sd = (spd_delta - mean_speed_delta) / math.sqrt(max(var_speed_delta, 0.25))
                z_s = (curr_spd - mean_speed) / math.sqrt(max(var_speed, 0.25))
                ewma_dev = math.sqrt((z_c ** 2 + z_sd ** 2 + z_s ** 2) / 3.0)

                # Geospatial context
                dist_zone, dist_attack, in_zone, near_attack = self.compute_geospatial_features(curr_lat, curr_lon)

                # Aviation-specific features
                alt = float(curr.get("altitude", 0.0) or 0.0)
                squawk = str(curr.get("squawk", "") or "")
                squawk_anom = 1.0 if squawk in ("7500", "7600", "7700") else 0.0

                # Silver / Weak Labeling
                anom_score = float(curr.get("anomaly_score", curr.get("model_score", 0.0)) or 0.0)
                severity = str(curr.get("anomaly_severity", curr.get("model_severity", "nominal")) or "nominal")

                # Multi-factor anomaly heuristics
                is_anom = 0
                label_src = "weak_label"
                label_conf = 0.95
                reasons = []

                if anom_score >= 50.0 or severity in ("critical", "high"):
                    is_anom = 1
                    label_src = "model_prediction"
                    label_conf = anom_score / 100.0
                    reasons.append(f"Model threat score {anom_score:.1f}")
                elif squawk_anom > 0:
                    is_anom = 1
                    label_src = "weak_label"
                    label_conf = 1.0
                    reasons.append(f"Emergency squawk transponder: {squawk}")
                elif in_zone and curr_spd > 25.0:
                    is_anom = 1
                    label_src = "weak_label"
                    label_conf = 0.85
                    reasons.append("High-speed incursion into restricted maritime zone")
                elif course_delta > 45.0 and spd_delta > 8.0:
                    is_anom = 1
                    label_src = "weak_label"
                    label_conf = 0.75
                    reasons.append("Abrupt erratic maneuver with rapid speed escalation")
                elif gap_mins > 30.0 and curr_spd > 5.0:
                    is_anom = 1
                    label_src = "weak_label"
                    label_conf = 0.70
                    reasons.append(f"Dark AIS transmission blackout ({gap_mins:.1f} mins)")
                else:
                    is_anom = 0
                    label_src = "weak_label"
                    label_conf = 0.95
                    reasons.append("Nominal kinematics conforming to Gulf transit corridors")

                rec = {
                    "observation_id": curr.get("id", curr.get("observation_id", len(records) + 1)),
                    "track_id": track_id,
                    "asset_name": curr.get("asset_name", f"TRACK_{track_id}"),
                    "domain": self.domain,
                    "source": curr.get("source", "telemetry_pipeline"),
                    "observed_at": curr["observed_at"].isoformat() if hasattr(curr["observed_at"], "isoformat") else str(curr["observed_at"]),
                    "lat": curr_lat,
                    "lon": curr_lon,
                    "course_delta": round(course_delta, 4),
                    "heading_delta": round(heading_delta, 4),
                    "speed": round(curr_spd, 2),
                    "speed_delta": round(spd_delta, 2),
                    "previous_speed": round(prev_spd, 2),
                    "average_speed": round(avg_spd, 2),
                    "speed_variance": round(spd_var, 4),
                    "ais_gap_minutes": round(gap_mins, 2),
                    "dist_restricted_zone": dist_zone,
                    "dist_historical_site": dist_attack,
                    "in_restricted_zone": in_zone,
                    "near_historical_attack": near_attack,
                    "ewma_deviation": round(ewma_dev, 4),
                    "model_score": anom_score,
                    "model_severity": severity,
                    "is_anomaly": is_anom,
                    "label_source": label_src,
                    "label_confidence": round(label_conf, 2),
                    "anomaly_reasons": str(reasons),
                }

                if self.domain == "aviation":
                    rec["alt_delta"] = 0.0
                    rec["gap_minutes"] = round(gap_mins, 2)
                    rec["dist_restricted_airspace"] = dist_zone
                    rec["squawk_anomaly_flag"] = squawk_anom

                records.append(rec)

        transformed_df = pd.DataFrame(records)

        # Chronological Partitioning into Train / Val / Test
        transformed_df = transformed_df.sort_values(by="observed_at").reset_index(drop=True)
        n_total = len(transformed_df)
        train_idx = int(n_total * self.train_pct)
        val_idx = int(n_total * (self.train_pct + self.val_pct))

        splits = []
        for i in range(n_total):
            if i < train_idx:
                splits.append("train")
            elif i < val_idx:
                splits.append("val")
            else:
                splits.append("test")

        transformed_df["dataset_split"] = splits

        # Quality & Statistical Summary
        summary = {
            "total_records": n_total,
            "unique_tracks": transformed_df["track_id"].nunique(),
            "train_rows": train_idx,
            "val_rows": val_idx - train_idx,
            "test_rows": n_total - val_idx,
            "anomaly_count": int((transformed_df["is_anomaly"] == 1).sum()),
            "normal_count": int((transformed_df["is_anomaly"] == 0).sum()),
            "anomaly_pct": round((transformed_df["is_anomaly"] == 1).sum() / n_total * 100, 2),
            "contract_quality": quality_contract,
        }

        return transformed_df, summary


def transform_telemetry_dataset(raw_df: pd.DataFrame, domain: str = "vessel") -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Convenience helper for transforming raw telemetry."""
    transformer = TelemetryTransformer(domain=domain)
    return transformer.transform(raw_df)
