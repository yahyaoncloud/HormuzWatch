"""
tests/test_intelligence.py
==========================
Unit & Integration Tests for Intelligence Endpoints and Logic Rollback Mechanism.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from app import app
from lib.intelligence import IntelligenceEngine

client = TestClient(app)


def test_demarche_endpoint_returns_success():
    """Verify demarche endpoint generates structured markdown via cloud or rollback."""
    payload = {
        "event_id": "EVT-TEST-9901",
        "domain": "vessel",
        "mmsi": "211832000",
        "vessel_name": "MT PERSIAN PIONEER",
        "vessel_type": "VLCC",
        "flag_state": "Liberia",
        "latitude": 26.4182,
        "longitude": 56.3219,
        "speed_knots": 4.1,
        "course_delta_deg": 64.5,
        "speed_delta_knots": -9.8,
        "ais_gap_minutes": 28.5,
        "dist_restricted_zone_nm": 1.2,
        "anomaly_score": 0.89,
        "anomaly_reasons": ["Contra-flow turn into inward lane", "Speed loss > 9 knots"],
    }
    resp = client.post("/api/intelligence/demarche", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "SUCCESS"
    assert data["source"] in ["CLOUD_LLM_API", "LOGIC_ROLLBACK_LOCAL"]
    assert "report_markdown" in data
    assert "EVT-TEST-9901" in data["report_markdown"]
    assert "211832000" in data["report_markdown"]


def test_sitrep_endpoint_returns_success():
    """Verify SITREP endpoint synthesizes maritime security summary."""
    payload = {
        "reporting_period": "Past 24 Hours",
        "active_vessel_tracks": 1428,
        "strait_transits_24h": 94,
        "transit_flow_rate_vs_30d_baseline": "-12.4%",
        "blockade_risk_score": 0.42,
        "active_anomalies_detected": 11,
        "dark_fleet_suspects": 4,
        "regional_conflict_indicators": ["IRGC-N drills near Larak Island"],
    }
    resp = client.post("/api/intelligence/sitrep", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "SUCCESS"
    assert "report_markdown" in data
    assert "1428" in data["report_markdown"] or "TSS" in data["report_markdown"]


def test_content_analysis_endpoint():
    """Verify unstructured OSINT article analysis."""
    payload = {
        "text": "IRGC fast boats were spotted conducting electronic warfare and GPS jamming operations against crude oil tankers near the Musandam Peninsula."
    }
    resp = client.post("/api/intelligence/analyze", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "SUCCESS"
    assert "analysis" in data
    analysis = data["analysis"]
    assert "threat_level" in analysis
    assert analysis["threat_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]


def test_forced_logic_rollback_on_cloud_failure():
    """Verify that when cloud LLM fails, logic rollback immediately delivers valid output with 0 downtime."""
    engine = IntelligenceEngine(timeout_sec=1.0)

    # Force cloud failure by patching _call_cloud_llm
    with patch.object(engine, "_call_cloud_llm", side_effect=TimeoutError("Forced cloud timeout simulation")):
        event = {
            "event_id": "EVT-ROLLBACK-001",
            "mmsi": "311992000",
            "vessel_name": "PACIFIC GLORY",
            "speed_knots": 1.2,
            "course_delta_deg": 88.0,
            "anomaly_reasons": ["Extreme course alteration"],
            "dist_restricted_zone_nm": 0.8,
        }
        res = engine.generate_incident_demarche(event)

        assert res["status"] == "SUCCESS"
        assert res["source"] == "LOGIC_ROLLBACK_LOCAL"
        assert res["model_used"] == "deterministic_naval_rules_v1"
        assert "EVT-ROLLBACK-001" in res["report_markdown"]
        assert "PACIFIC GLORY" in res["report_markdown"]
        assert res["latency_ms"] < 50.0  # Local rollback runs under 50ms!
