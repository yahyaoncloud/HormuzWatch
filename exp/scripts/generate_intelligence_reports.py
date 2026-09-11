"""
exp/scripts/generate_intelligence_reports.py
============================================
Automated Maritime Intelligence & Tactical SITREP Generation Engine.
Uses NVIDIA API to generate non-chat operational intelligence briefs,
tactical incident demarches, and synthetic training datasets.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional

import requests

EXP_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = EXP_ROOT.parent
REPORTS_DIR = EXP_ROOT / "reports" / "intelligence"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
DEFAULT_MODEL = os.getenv("NVIDIA_MODEL", "nvidia/nemotron-3-ultra-550b-a55b")


def get_nvidia_api_key() -> str:
    """Retrieve API key from env var or secure local file without leaking."""
    key = os.getenv("NVIDIA_API_KEY")
    if key:
        return key

    sec_file = Path.home() / "sec.txt"
    if sec_file.exists():
        content = sec_file.read_text(encoding="utf-8")
        match = re.search(r"nvapi-[a-zA-Z0-9_\-]+", content)
        if match:
            return match.group(0)

    raise ValueError("NVIDIA API key not found in NVIDIA_API_KEY env or ~/sec.txt")


class NvidiaIntelligenceClient:
    def __init__(self, model: str = DEFAULT_MODEL):
        self.api_key = get_nvidia_api_key()
        self.model = model
        self.base_url = NVIDIA_BASE_URL.rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _call_api(self, system_instruction: str, prompt: str, max_tokens: int = 2048, temperature: float = 0.2) -> str:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        resp = requests.post(f"{self.base_url}/chat/completions", headers=self.headers, json=payload, timeout=90)
        if resp.status_code != 200:
            raise RuntimeError(f"NVIDIA API request failed [{resp.status_code}]: {resp.text}")

        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()

    def generate_incident_demarche(self, event_data: Dict[str, Any]) -> str:
        """Generate a formal tactical military/commercial maritime incident demarche."""
        system_instruction = (
            "You are the Chief Maritime Intelligence Analyst for the HormuzWatch Naval Operations Center. "
            "Your duty is to produce structured, factual, rigorous military-grade incident demarches (NOT conversational chat). "
            "Format your output strictly using Markdown with standard defense sections: "
            "INCIDENT IDENTIFIER, TACTICAL SUMMARY, KINEMATIC ANOMALY BREAKDOWN, GEOPOLITICAL / STRATEGIC IMPLICATION, "
            "and ACTIONABLE RULES OF ENGAGEMENT (ROE) / RECOMMENDATIONS."
        )

        prompt = (
            f"Generate a tactical incident demarche for the following detected maritime anomaly:\n\n"
            f"```json\n{json.dumps(event_data, indent=2)}\n```\n\n"
            f"Reference real navigational corridors (Strait of Hormuz TSS, Musandam Peninsula, Larak Island, Fujairah Anchorage). "
            f"Adopt formal defense intelligence tone. Do not use filler or chat greetings."
        )

        return self._call_api(system_instruction, prompt, max_tokens=1500, temperature=0.15)

    def generate_daily_sitrep(self, status_data: Dict[str, Any]) -> str:
        """Generate a 24-hour executive strategic situation report (SITREP)."""
        system_instruction = (
            "You are the Director of Intelligence for HormuzWatch Maritime Security Alliance. "
            "Generate a high-level operational SITREP (Situation Report) synthesizing chokepoint transit flow, "
            "blockade vulnerability indicators, transponder spoofing anomalies, and regional threat postures. "
            "Maintain professional strategic defense briefing style with clear bullet points and risk metrics."
        )

        prompt = (
            f"Generate the 24-Hour Maritime Security SITREP based on the following multi-domain telemetry digest:\n\n"
            f"```json\n{json.dumps(status_data, indent=2)}\n```\n\n"
            f"Structure into: \n"
            f"1. EXECUTIVE STRATEGIC RISK LEVEL (LOW / ELEVATED / HIGH / CRITICAL)\n"
            f"2. CHOKEPOINT FLOW & TRANSIT VELOCITY ANALYSIS\n"
            f"3. UNIDENTIFIED / DARK FLEET ANOMALIES\n"
            f"4. REGIONAL CONFLICT ESCALATION CORRELATION\n"
            f"5. COMMERCIAL SHIPPING ADVISORY"
        )

        return self._call_api(system_instruction, prompt, max_tokens=2048, temperature=0.2)

    def generate_synthetic_training_scenarios(self, count: int = 5) -> list[dict]:
        """Generate high-fidelity synthetic threat telemetry scenarios for ML training in /exp."""
        system_instruction = (
            "You are an expert synthetic data generator for maritime electronic warfare and anomaly detection systems. "
            "You output ONLY valid JSON arrays containing synthetic incident training cases with realistic physical bounds. "
            "Do not include any conversational pleasantries or markdown formatting outside of the JSON block."
        )

        prompt = (
            f"Generate {count} diverse synthetic vessel anomaly training samples in the Strait of Hormuz. "
            f"Include realistic numbers for: course_delta (0-360 deg), speed_delta (-20 to +20 kts), "
            f"average_speed (5-25 kts), ais_gap_minutes (0-180 min), dist_restricted_zone (0-50 NM), "
            f"in_restricted_zone (bool), is_anomaly (0 or 1), scenario_category (e.g. 'SPOOFED_AIS_TRACK', 'DARK_TRANSFER', 'GEOFENCE_PENETRATION', 'HARASSMENT_CONVOY'), "
            f"and narrative_description. Return strictly a JSON array."
        )

        raw = self._call_api(system_instruction, prompt, max_tokens=2500, temperature=0.3)
        # Clean JSON markdown fences if present
        raw_clean = re.sub(r"^```json\s*", "", raw)
        raw_clean = re.sub(r"\s*```$", "", raw_clean).strip()
        try:
            return json.loads(raw_clean)
        except Exception:
            return [{"raw_output": raw}]


def main():
    parser = argparse.ArgumentParser(description="HormuzWatch Intelligence Content & Report Generation Engine")
    parser.add_argument("--mode", choices=["demarche", "sitrep", "synthetic"], default="demarche", help="Report generation mode")
    parser.add_argument("--output", type=str, default="", help="Optional output file path")
    args = parser.parse_args()

    client = NvidiaIntelligenceClient()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    if args.mode == "demarche":
        sample_event = {
            "event_id": f"EVT-{int(time.time())}",
            "domain": "vessel",
            "mmsi": "211832000",
            "vessel_name": "MT PERSIAN GULF PIONEER",
            "vessel_type": "Crude Oil VLCC (300,000 DWT)",
            "flag_state": "Liberia",
            "latitude": 26.4182,
            "longitude": 56.3219,
            "speed_knots": 4.1,
            "course_delta_deg": 64.5,
            "speed_delta_knots": -9.8,
            "ais_gap_minutes": 28.5,
            "dist_restricted_zone_nm": 1.2,
            "anomaly_score": 0.89,
            "anomaly_reasons": [
                "Abrupt contra-flow deviation into Inward TSS lane",
                "Speed loss > 9 knots outside designated anchorage",
                "Transponder intermittent dropout near Iranian maritime boundary"
            ]
        }
        print("[*] Generating Tactical Incident Demarche via NVIDIA Nemotron 550B...")
        report = client.generate_incident_demarche(sample_event)
        out_file = Path(args.output) if args.output else REPORTS_DIR / f"incident_demarche_{timestamp}.md"
        out_file.write_text(report, encoding="utf-8")
        print(f"[✓] Demarche generated successfully:\n\n{report}\n")
        print(f"Saved to: {out_file}")

    elif args.mode == "sitrep":
        status_digest = {
            "reporting_period": "Past 24 Hours",
            "active_vessel_tracks": 1428,
            "strait_transits_24h": 94,
            "transit_flow_rate_vs_30d_baseline": "-12.4%",
            "blockade_risk_score": 0.42,
            "active_anomalies_detected": 11,
            "high_severity_alerts": 2,
            "dark_fleet_suspects": 4,
            "regional_conflict_indicators": [
                "IRGC Navy conducted unannounced fast-attack craft maneuvers 8 NM off Larak Island",
                "NAVAREA IX warning 048/26 active regarding GPS spoofing cluster in Northern Gulf of Oman",
                "Commercial insurance war-risk premium surged +18 bps"
            ]
        }
        print("[*] Generating 24-Hour Maritime Security SITREP via NVIDIA Nemotron 550B...")
        report = client.generate_daily_sitrep(status_digest)
        out_file = Path(args.output) if args.output else REPORTS_DIR / f"maritime_sitrep_{timestamp}.md"
        out_file.write_text(report, encoding="utf-8")
        print(f"[✓] SITREP generated successfully:\n\n{report}\n")
        print(f"Saved to: {out_file}")

    elif args.mode == "synthetic":
        print("[*] Generating Synthetic Training Scenarios for /exp via NVIDIA Nemotron 550B...")
        scenarios = client.generate_synthetic_training_scenarios(count=6)
        out_file = Path(args.output) if args.output else REPORTS_DIR / f"synthetic_scenarios_{timestamp}.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(scenarios, f, indent=2)
        print(f"[✓] Generated {len(scenarios)} synthetic training scenarios.")
        print(f"Saved to: {out_file}")


if __name__ == "__main__":
    main()
