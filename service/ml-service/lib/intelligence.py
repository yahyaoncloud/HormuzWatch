"""
lib/intelligence.py
===================
Operational Intelligence, Tactical Demarche & Content Analysis Engine.
Features resilient multi-tier LLM integration with automatic Logic Rollback
to a local deterministic generator when external APIs timeout or fail.
"""

from __future__ import annotations

import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests
from lib.logger import get_logger

logger = get_logger("hormuzwatch.intelligence")

NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
PRIMARY_MODELS = [
    os.getenv("NVIDIA_MODEL", "google/gemma-4-31b-it"),
    "nvidia/nemotron-3-ultra-550b-a55b",
    "deepseek-ai/deepseek-v4-flash-0731",
]


def resolve_api_key() -> Optional[str]:
    """Retrieve API key from env or sec.txt safely."""
    key = os.getenv("NVIDIA_API_KEY")
    if key and key.startswith("nvapi-"):
        return key

    resolved_path = Path(__file__).resolve()
    sec_candidates = [
        Path.home() / "sec.txt",
        Path("/root/sec.txt"),
    ]
    if len(resolved_path.parents) > 3:
        sec_candidates.append(resolved_path.parents[3] / "sec.txt")
    for p in sec_candidates:
        try:
            if p.is_file():
                content = p.read_text(encoding="utf-8")
                match = re.search(r"nvapi-[a-zA-Z0-9_\-]+", content)
                if match:
                    return match.group(0)
        except Exception:
            pass
    return None


class IntelligenceEngine:
    """
    Dual-engine Intelligence Analyzer with automatic Logic Rollback:
      Tier 1: Cloud High-Capacity LLM API (NVIDIA / Google / DeepSeek)
      Tier 2: Local Deterministic Rule-Based Intelligence Synthesizer
    """

    def __init__(self, timeout_sec: float = 12.0):
        self.api_key = resolve_api_key()
        self.timeout_sec = timeout_sec
        self.base_url = NVIDIA_BASE_URL.rstrip("/")
        self.primary_models = PRIMARY_MODELS

    def _call_cloud_llm(self, system_prompt: str, user_prompt: str, max_tokens: int = 1500) -> Tuple[str, str]:
        """Attempt calls across prioritized cloud models with strict timeout."""
        if not self.api_key:
            raise ValueError("No API key available for cloud intelligence.")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        last_err = None
        for model in self.primary_models:
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.2,
                "max_tokens": max_tokens,
            }
            try:
                logger.info(f"Dispatching intelligence query to cloud model: {model}")
                t0 = time.perf_counter()
                resp = requests.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=self.timeout_sec,
                )
                elapsed = time.perf_counter() - t0
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"].strip()
                    logger.info(f"Cloud intelligence response received from {model} in {elapsed:.2f}s")
                    return content, model
                else:
                    logger.warning(f"Cloud model {model} returned HTTP {resp.status_code}: {resp.text[:150]}")
                    last_err = f"HTTP {resp.status_code}"
            except requests.exceptions.Timeout:
                logger.warning(f"Cloud model {model} timed out after {self.timeout_sec}s")
                last_err = "TIMEOUT"
            except Exception as exc:
                logger.warning(f"Cloud model {model} encountered error: {exc}")
                last_err = str(exc)

        raise RuntimeError(f"All cloud intelligence models exhausted. Last error: {last_err}")

    # ==========================================================================
    # LOGIC ROLLBACK ENGINE: Deterministic Local Report Generators
    # Guarantees zero-downtime, structured defense outputs when cloud is offline
    # ==========================================================================

    def _rollback_incident_demarche(self, event: Dict[str, Any]) -> str:
        """Deterministic military demarche synthesized from kinematic telemetry."""
        evt_id = event.get("event_id", f"EVT-{int(time.time())}")
        mmsi = event.get("mmsi", "UNKNOWN")
        vessel = event.get("vessel_name", f"VESSEL-MMSI-{mmsi}")
        vtype = event.get("vessel_type", "Commercial Transport")
        flag = event.get("flag_state", "Unknown")
        lat = event.get("latitude", 26.4)
        lon = event.get("longitude", 56.3)
        spd = event.get("speed_knots", 0.0)
        c_delta = event.get("course_delta_deg", 0.0)
        s_delta = event.get("speed_delta_knots", 0.0)
        gap = event.get("ais_gap_minutes", 0.0)
        reasons = event.get("anomaly_reasons", ["Kinematic deviation outside baseline bounds"])
        dist_restr = event.get("dist_restricted_zone_nm", 999.0)

        # Tactical assessment logic
        if dist_restr < 3.0 or gap > 20:
            assessment = "CRITICAL: High probability of intentional transponder concealment / territorial penetration."
            action = "IMMEDIATE: Dispatch aerial surveillance and issue bridge-to-bridge VHF challenge on Ch 16."
        elif abs(c_delta) > 40:
            assessment = "ELEVATED: Irregular contra-flow maneuver violating Traffic Separation Scheme (TSS)."
            action = "ADVISORY: Notify Maritime Security Center (MSC) and warn converging commercial traffic."
        else:
            assessment = "MODERATE: Speed/kinematic anomaly detected; monitoring for convoy coherence."
            action = "MONITOR: Maintain active radar tracking lock."

        reasons_list = "\n".join([f"- {r}" for r in reasons])

        return f"""# ⚠️ TACTICAL MARITIME INCIDENT DEMARCHE: {evt_id}
**CLASSIFICATION: RESTRICTED // MARITIME OPERATIONS COMMAND**  
**GENERATION SOURCE: LOGIC ROLLBACK (DETERMINISTIC INFERENCE)**  
**DATE/TIME: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%SZ')}**  

---

### 1. INCIDENT IDENTIFIER & ASSET PROFILE
- **Incident ID:** `{evt_id}`
- **Vessel Designation:** **{vessel}** (MMSI: `{mmsi}`)
- **Vessel Classification:** {vtype} | **Flag State:** {flag}
- **Geographic Coordinates:** `{lat:.4f}°N, {lon:.4f}°E` (Strait of Hormuz Sector)
- **Proximity to Restricted Naval Enclave:** `{dist_restr:.1f} NM`

---

### 2. KINEMATIC ANOMALY BREAKDOWN
| Parameter | Observed Telemetry | Operational Assessment |
|---|---|---|
| **Speed Over Ground (SOG)** | `{spd:.1f} kts` | Speed change: `{s_delta:+.1f} kts` |
| **Course Over Ground (COG)** | Deviation: `{c_delta:+.1f}°` | {'Contra-flow violation' if abs(c_delta)>30 else 'Nominal corridor track'} |
| **AIS Continuity Gap** | `{gap:.1f} minutes` | {'Unexplained transponder darkness' if gap>15 else 'Intermittent reception'} |

**Detected Anomaly Drivers:**
{reasons_list}

---

### 3. TACTICAL & GEOPOLITICAL ASSESSMENT
{assessment}

---

### 4. ACTIONABLE RULES OF ENGAGEMENT (ROE)
{action}
"""

    def _rollback_daily_sitrep(self, status: Dict[str, Any]) -> str:
        """Deterministic strategic situation report synthesized from aggregate digest."""
        period = status.get("reporting_period", "Past 24 Hours")
        tracks = status.get("active_vessel_tracks", 0)
        transits = status.get("strait_transits_24h", 0)
        flow_delta = status.get("transit_flow_rate_vs_30d_baseline", "0.0%")
        blockade = status.get("blockade_risk_score", 0.0)
        anomalies = status.get("active_anomalies_detected", 0)
        dark_fleet = status.get("dark_fleet_suspects", 0)
        conflicts = status.get("regional_conflict_indicators", ["No active naval advisories posted"])

        risk_level = "CRITICAL" if blockade > 0.60 else "ELEVATED" if blockade > 0.35 else "NOMINAL"
        conflicts_bullets = "\n".join([f"- {c}" for c in conflicts])

        return f"""# 🌐 HORMUZWATCH 24-HOUR MARITIME SECURITY SITREP
**CLASSIFICATION: OPERATIONAL // MARITIME MONITORING ALLIANCE**  
**GENERATION SOURCE: LOGIC ROLLBACK (DETERMINISTIC AGGREGATION)**  
**PERIOD OF REPORT:** {period} | **PUBLISHED:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%SZ')}  

---

### 1. STRATEGIC THREAT POSTURE: **{risk_level}** (Composite Index: {blockade:.2f}/1.00)
Traffic flow through the Strait of Hormuz is operating under **{risk_level}** monitoring protocols. 

### 2. TRAFFIC SEPARATION SCHEME (TSS) METRICS
- **Total Active Monitored Tracks:** `{tracks}`
- **24-Hour Verified Chokepoint Transits:** `{transits}`
- **Flow Variance vs 30-Day Baseline:** `{flow_delta}`
- **Active Kinematic Anomalies:** `{anomalies}`
- **Dark Fleet / Transponder Gap Suspects:** `{dark_fleet}`

### 3. REGIONAL CONFLICT INDICATORS & ADVISORIES
{conflicts_bullets}

### 4. COMMERCIAL FLEET DIRECTIVES
1. Vessels transiting the Strait must maintain dual watch on VHF Ch 16 and UKMTO emergency frequencies.
2. Report any GPS spoofing or GNSS deviations exceeding 1.0 NM immediately.
3. Pre-position security teams when approaching northern TSS outbound channel.
"""

    def _rollback_content_analysis(self, raw_text: str) -> Dict[str, Any]:
        """Deterministic NLP feature and threat extraction from raw OSINT text."""
        military_keywords = ["navy", "missile", "drone", "patrol", "irgc", "seizure", "frigate", "warship", "boarding"]
        energy_keywords = ["crude", "tanker", "oil", "lng", "pipeline", "barrel", "refinery"]
        cyber_keywords = ["spoofing", "gps", "jamming", "ais", "cyber", "transponder"]

        text_lower = raw_text.lower()
        mil_count = sum(text_lower.count(k) for k in military_keywords)
        energy_count = sum(text_lower.count(k) for k in energy_keywords)
        cyber_count = sum(text_lower.count(k) for k in cyber_keywords)

        threat_score = min(1.0, round((mil_count * 0.15) + (cyber_count * 0.20) + (energy_count * 0.05), 3))
        threat_level = "CRITICAL" if threat_score > 0.70 else "HIGH" if threat_score > 0.40 else "MODERATE"

        return {
            "source": "LOGIC_ROLLBACK_DETERMINISTIC",
            "threat_level": threat_level,
            "threat_score": threat_score,
            "detected_signals": {
                "military_indicators": mil_count,
                "cyber_electronic_warfare": cyber_count,
                "energy_commercial_risk": energy_count,
            },
            "summary": raw_text[:300] + ("..." if len(raw_text) > 300 else ""),
            "action_required": threat_score > 0.40,
        }

    # ==========================================================================
    # PUBLIC API: Self-Healing Dispatches
    # ==========================================================================

    def generate_incident_demarche(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Generate tactical incident demarche with cloud primary and logic rollback."""
        t0 = time.perf_counter()
        system_instruction = (
            "You are the Chief Maritime Intelligence Analyst for the HormuzWatch Naval Operations Center. "
            "Produce a structured, rigorous military-grade incident demarche in clean Markdown (NOT conversational chat). "
            "Sections: INCIDENT IDENTIFIER, TACTICAL SUMMARY, KINEMATIC ANOMALY BREAKDOWN, GEOPOLITICAL ASSESSMENT, and RULES OF ENGAGEMENT (ROE)."
        )
        prompt = (
            f"Generate a tactical incident demarche for this anomaly event:\n"
            f"```json\n{json.dumps(event, indent=2)}\n```\n"
            f"Use formal defense tone. Reference Strait of Hormuz TSS, Larak Island, and Musandam. No conversational filler."
        )

        try:
            content, model = self._call_cloud_llm(system_instruction, prompt, max_tokens=1500)
            return {
                "status": "SUCCESS",
                "source": "CLOUD_LLM_API",
                "model_used": model,
                "report_markdown": content,
                "latency_ms": round((time.perf_counter() - t0) * 1000, 2),
            }
        except Exception as exc:
            logger.warning(f"Cloud LLM dispatch failed ({exc}). Initiating LOGIC ROLLBACK...")
            rollback_content = self._rollback_incident_demarche(event)
            return {
                "status": "SUCCESS",
                "source": "LOGIC_ROLLBACK_LOCAL",
                "model_used": "deterministic_naval_rules_v1",
                "report_markdown": rollback_content,
                "latency_ms": round((time.perf_counter() - t0) * 1000, 2),
                "rollback_reason": str(exc),
            }

    def generate_sitrep(self, status: Dict[str, Any]) -> Dict[str, Any]:
        """Generate 24-hour maritime security SITREP with cloud primary and logic rollback."""
        t0 = time.perf_counter()
        system_instruction = (
            "You are Director of Intelligence for HormuzWatch Maritime Security Alliance. "
            "Generate an executive 24-Hour Maritime Security SITREP synthesizing transit volume, "
            "blockade vulnerability, AIS spoofing, and threat posture. Output in clean Markdown."
        )
        prompt = (
            f"Generate 24-Hour Maritime Security SITREP for this telemetry digest:\n"
            f"```json\n{json.dumps(status, indent=2)}\n```\n"
            f"Include: 1. EXECUTIVE RISK LEVEL, 2. TSS FLOW & VELOCITY, 3. DARK FLEET ANOMALIES, 4. REGIONAL CONFLICT CORRELATION, 5. COMMERCIAL SHIPPING ADVISORY."
        )

        try:
            content, model = self._call_cloud_llm(system_instruction, prompt, max_tokens=1800)
            return {
                "status": "SUCCESS",
                "source": "CLOUD_LLM_API",
                "model_used": model,
                "report_markdown": content,
                "latency_ms": round((time.perf_counter() - t0) * 1000, 2),
            }
        except Exception as exc:
            logger.warning(f"Cloud LLM dispatch failed ({exc}). Initiating LOGIC ROLLBACK...")
            rollback_content = self._rollback_daily_sitrep(status)
            return {
                "status": "SUCCESS",
                "source": "LOGIC_ROLLBACK_LOCAL",
                "model_used": "deterministic_sitrep_rules_v1",
                "report_markdown": rollback_content,
                "latency_ms": round((time.perf_counter() - t0) * 1000, 2),
                "rollback_reason": str(exc),
            }

    def analyze_content(self, text: str) -> Dict[str, Any]:
        """Analyze unstructured OSINT text with cloud primary and logic rollback."""
        t0 = time.perf_counter()
        system_instruction = (
            "You are an expert military OSINT intelligence analyst. "
            "Analyze the given text for maritime, defense, and cyber threats in the Persian Gulf. "
            "Output ONLY valid JSON with keys: threat_level (LOW/MODERATE/HIGH/CRITICAL), threat_score (0.0-1.0), "
            "primary_actors (list), target_infrastructure (list), operational_impact (string), and actionable_warning (string)."
        )

        try:
            raw_content, model = self._call_cloud_llm(system_instruction, f"Analyze this report:\n\n{text}", max_tokens=800)
            # Parse JSON
            raw_clean = re.sub(r"^```json\s*", "", raw_content)
            raw_clean = re.sub(r"\s*```$", "", raw_clean).strip()
            parsed = json.loads(raw_clean)
            return {
                "status": "SUCCESS",
                "source": "CLOUD_LLM_API",
                "model_used": model,
                "analysis": parsed,
                "latency_ms": round((time.perf_counter() - t0) * 1000, 2),
            }
        except Exception as exc:
            logger.warning(f"Cloud LLM analysis failed ({exc}). Initiating LOGIC ROLLBACK...")
            parsed = self._rollback_content_analysis(text)
            return {
                "status": "SUCCESS",
                "source": "LOGIC_ROLLBACK_LOCAL",
                "model_used": "deterministic_regex_nlp_v1",
                "analysis": parsed,
                "latency_ms": round((time.perf_counter() - t0) * 1000, 2),
                "rollback_reason": str(exc),
            }


# Global singleton instance
global_intelligence_engine = IntelligenceEngine()
