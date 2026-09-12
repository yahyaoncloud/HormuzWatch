"""
mlops/etl/extractor.py
======================
Multi-source telemetry extractor for maritime AIS and aviation telemetry feeds.
Supports extraction from:
  1. Live HormuzWatch HTTP REST endpoints (/public/tracks/active, /api/tracks)
  2. Curated snapshots in server/datasets/
  3. Direct PostgreSQL execution via dataset-generator engine
"""

from __future__ import annotations

import json
import logging
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import pandas as pd
import requests

logger = logging.getLogger("mlops.etl.extractor")


class TelemetryExtractor:
    """Extracts raw maritime and aviation telemetry records from live APIs or curated data stores."""

    def __init__(
        self,
        api_base_url: str = "http://192.168.1.40:10020",
        local_api_base_url: str = "http://localhost:10020",
        datasets_dir: Optional[Union[str, Path]] = None,
    ):
        self.api_base_url = os.getenv("HORMUZ_API_URL", api_base_url)
        self.local_api_base_url = local_api_base_url
        if datasets_dir is None:
            # Locate server/datasets relative to repository root
            current = Path(__file__).resolve().parent
            while current.parent != current:
                if (current / "server" / "datasets").exists():
                    self.datasets_dir = current / "server" / "datasets"
                    break
                current = current.parent
            else:
                self.datasets_dir = Path("server/datasets")
        else:
            self.datasets_dir = Path(datasets_dir)

    def extract_from_rest_api(self, domain: str = "vessel", limit: Optional[int] = None) -> pd.DataFrame:
        """Extract active live tracks directly from the Go backend REST service."""
        endpoints_to_try = [
            f"{self.api_base_url}/public/tracks/active",
            f"{self.local_api_base_url}/public/tracks/active",
            f"{self.api_base_url}/api/tracks",
            f"{self.local_api_base_url}/api/tracks",
        ]

        data = None
        for endpoint in endpoints_to_try:
            try:
                logger.info(f"Connecting to telemetry REST endpoint: {endpoint}")
                resp = requests.get(endpoint, timeout=5.0)
                if resp.status_code == 200:
                    payload = resp.json()
                    if isinstance(payload, dict) and "data" in payload:
                        data = payload["data"]
                    elif isinstance(payload, list):
                        data = payload
                    if data:
                        logger.info(f"Successfully retrieved {len(data)} tracks from {endpoint}")
                        break
            except Exception as e:
                logger.debug(f"Endpoint {endpoint} unreachable: {e}")

        if not data:
            raise ConnectionError("Unable to reach HormuzWatch server REST API across configured endpoints.")

        # Normalize schema
        records = []
        target_domain = "vessel" if domain in ("vessel", "maritime") else "aircraft"

        for row in data:
            # Map objectType
            obj_type = row.get("objectType") or row.get("domain") or "vessel"
            if obj_type == "aviation":
                obj_type = "aircraft"
            if target_domain != "all" and obj_type != target_domain:
                continue

            track_id = str(row.get("trackId") or row.get("track_id") or "")
            asset_name = str(row.get("assetName") or row.get("asset_name") or f"TRACK-{track_id}")
            obs_time = row.get("timestamp") or row.get("observed_at") or datetime.now(timezone.utc).isoformat()
            lat = float(row.get("lat") or 0.0)
            lon = float(row.get("lon") or 0.0)
            speed = float(row.get("speed") or 0.0)
            prev_speed = float(row.get("previousSpeed") or row.get("previous_speed") or speed)
            heading = float(row.get("heading") or 0.0)
            course_delta = float(row.get("courseDelta") or row.get("course_delta") or 0.0)
            ais_age = int(row.get("aisAgeMinutes") or row.get("ais_age_minutes") or 0)
            altitude = float(row.get("altitude") or 0.0)
            squawk = str(row.get("squawk") or "")
            on_ground = bool(row.get("onGround") or False)
            anom_score = float(row.get("anomalyScore") or row.get("score") or 0.0)
            severity = str(row.get("severity") or "nominal")

            records.append({
                "track_id": track_id,
                "asset_name": asset_name,
                "domain": obj_type,
                "source": "live_telemetry",
                "observed_at": obs_time,
                "lat": lat,
                "lon": lon,
                "speed": speed,
                "previous_speed": prev_speed,
                "heading": heading,
                "course_delta": course_delta,
                "ais_age_minutes": ais_age,
                "altitude": altitude,
                "squawk": squawk,
                "on_ground": on_ground,
                "anomaly_score": anom_score,
                "anomaly_severity": severity,
            })

        df = pd.DataFrame(records)
        if limit and len(df) > limit:
            df = df.iloc[:limit]
        return df

    def extract_from_curated_snapshot(self, domain: str = "vessel", snapshot_id: Optional[str] = None) -> pd.DataFrame:
        """Load telemetry observations from an existing curated snapshot directory."""
        if not self.datasets_dir.exists():
            raise FileNotFoundError(f"Datasets directory not found: {self.datasets_dir}")

        target_dir = None
        if snapshot_id:
            candidate = self.datasets_dir / snapshot_id
            if candidate.exists() and (candidate / "data.csv").exists():
                target_dir = candidate
        else:
            # Find latest dataset for domain
            pattern = f"dataset_{domain}_*"
            matches = sorted(self.datasets_dir.glob(pattern), reverse=True)
            for m in matches:
                if (m / "data.csv").exists():
                    target_dir = m
                    break

        if not target_dir:
            # Fallback to any dataset directory containing data.csv
            for d in sorted(self.datasets_dir.iterdir(), reverse=True):
                if d.is_dir() and (d / "data.csv").exists():
                    target_dir = d
                    break

        if not target_dir:
            raise FileNotFoundError(f"No curated dataset snapshot found for domain '{domain}' in {self.datasets_dir}")

        csv_file = target_dir / "data.csv"
        logger.info(f"Loading curated telemetry snapshot from: {csv_file}")
        df = pd.read_csv(csv_file)
        return df

    def extract(
        self,
        domain: str = "vessel",
        source_mode: str = "auto",
        limit: Optional[int] = None,
        snapshot_id: Optional[str] = None,
    ) -> pd.DataFrame:
        """
        Unified extraction method.
        Modes:
          - 'auto': Try live REST API first; if unavailable, fallback to curated snapshot.
          - 'api': Strict live REST API extraction.
          - 'snapshot': Strict curated dataset snapshot extraction.
        """
        if source_mode == "api":
            return self.extract_from_rest_api(domain=domain, limit=limit)
        elif source_mode == "snapshot":
            return self.extract_from_curated_snapshot(domain=domain, snapshot_id=snapshot_id)
        elif source_mode == "auto":
            try:
                df = self.extract_from_rest_api(domain=domain, limit=limit)
                if len(df) > 0:
                    return df
            except Exception as e:
                logger.warning(f"Live REST extraction failed ({e}); falling back to curated snapshot.")
            return self.extract_from_curated_snapshot(domain=domain, snapshot_id=snapshot_id)
        else:
            raise ValueError(f"Unknown source_mode '{source_mode}'. Expected 'auto', 'api', or 'snapshot'.")


def extract_raw_telemetry(domain: str = "vessel", source_mode: str = "auto", limit: Optional[int] = None) -> pd.DataFrame:
    """Convenience helper for quick telemetry extraction."""
    extractor = TelemetryExtractor()
    return extractor.extract(domain=domain, source_mode=source_mode, limit=limit)
