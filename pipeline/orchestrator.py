"""
pipeline/orchestrator.py
========================
Autonomous Continuous Training (CT) and MLOps Orchestrator.
Monitors drift, triggers Bayesian HPO retraining, validates gates,
and deploys updated models to the active ML service.

================================================================================
ARCHITECTURE & WORKFLOW COLOR-CODED TAG LEGEND:
  [STAGE]               - Computational pipeline phase in the end-to-end lifecycle
  [OBJECTIVE]           - Concrete mathematical or operational goal of the code block
  [MATHEMATICAL BASIS]  - Algorithmic formulation, probability theory, or geometry
  [SYSTEM OUTCOME]      - State change, persisted artifact, or downstream impact
  [SAFETY INVARIANT]    - Non-negotiable constraint to prevent data leakage/corruption
================================================================================
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import schedule

# ------------------------------------------------------------------------------
# [STAGE 0: SYSTEM INITIALIZATION & IMPORT BINDINGS]
# [OBJECTIVE]: Resolve pipeline paths and link ML continuous training components.
# ------------------------------------------------------------------------------
PIPELINE_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = PIPELINE_ROOT.parent
sys.path.insert(0, str(PROJECT_ROOT / "service" / "ml-service"))
if "/app" not in sys.path:
    sys.path.insert(0, "/app")

from pipeline.config import config
from pipeline.extract_features import extract_features_from_db
from pipeline.train_and_evaluate import train_domain_model, train_all_models
from pipeline.deploy_candidate import evaluate_and_deploy
from pipeline.drift_monitor import evaluate_feature_drift

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [MLOps] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("mlops_orchestrator")


# ==============================================================================
# [STAGE 1: CONTINUOUS TRAINING (CT) CYCLE EXECUTION]
# [OBJECTIVE]: Execute end-to-end retraining: Bayesian optimization, candidate gate
#              verification, champion comparison, and atomic production promotion.
# [MATHEMATICAL BASIS]:
#   Gate Thresholds: PR-AUC ≥ 0.85, ECE ≤ 0.08, Latency ≤ 12.0 ms/sample.
# [SYSTEM OUTCOME]: If candidate surpasses all gates, promotes artifact to champion;
#                   otherwise preserves the active champion and logs rejection cause.
# [SAFETY INVARIANT]: A candidate that fails evaluation gates must NEVER replace champion.
# ==============================================================================
def run_pipeline_cycle(domain: str = "vessel", reason: str = "SCHEDULED") -> dict:
    """Execute complete MLOps retraining and deployment cycle."""
    logger.info(f"=== Starting MLOps Retraining Cycle for '{domain}' (Reason: {reason}) ===")
    
    # --------------------------------------------------------------------------
    # [SUBSTAGE 1.1: FEATURE EXTRACTION & BAYESIAN OPTIMIZATION TRAINING]
    # [OBJECTIVE]: Train candidate ensemble with Optuna HPO on recent data.
    # --------------------------------------------------------------------------
    logger.info(f"Phase 1: Extracting features and running Optuna Bayesian HPO for '{domain}'...")
    train_result = train_domain_model(domain=domain)
    metrics = train_result.get("metrics", {})
    logger.info(f"Training Complete. Metrics: PR-AUC={metrics.get('test_pr_auc', 0):.4f}, ECE={metrics.get('test_ece', 0):.4f}")
    
    # --------------------------------------------------------------------------
    # [SUBSTAGE 1.2: STATIC EVALUATION GATE FILTERING]
    # [OBJECTIVE]: Validate candidate against baseline SLA requirements before champion check.
    # --------------------------------------------------------------------------
    logger.info("Phase 2: Verifying Candidate Model against Production Evaluation Gates...")
    passed_gate = (
        metrics.get("test_pr_auc", 0) >= config.min_pr_auc and
        metrics.get("test_ece", 1.0) <= config.max_ece and
        metrics.get("latency_ms_per_sample", 999.0) <= config.max_latency_ms
    )
    
    if not passed_gate:
        logger.warning(
            f"Candidate model for '{domain}' REJECTED by static evaluation gate. "
            f"PR-AUC: {metrics.get('test_pr_auc', 0):.4f} (min {config.min_pr_auc}), "
            f"ECE: {metrics.get('test_ece', 0):.4f} (max {config.max_ece}), "
            f"Latency: {metrics.get('latency_ms_per_sample', 0):.2f}ms (max {config.max_latency_ms}ms)"
        )
        return {"status": "REJECTED_BY_STATIC_GATE", "domain": domain, "metrics": metrics}
        
    logger.info("Candidate model PASSED static evaluation gate. Initiating champion comparison and promotion...")
    
    # --------------------------------------------------------------------------
    # [SUBSTAGE 1.3: CHAMPION COMPARISON, ATOMIC PROMOTION & ZERO-DOWNTIME RELOAD]
    # [OBJECTIVE]: Hand off to deploy_candidate for champion comparison and atomic POSIX swap.
    # --------------------------------------------------------------------------
    logger.info("Phase 3: Promoting artifact to production and triggering zero-downtime hot-reload...")
    deploy_result = evaluate_and_deploy(domain=domain)
    logger.info(f"Deployment Result: {json.dumps(deploy_result)}")

    if deploy_result.get("status") != "DEPLOYED":
        logger.warning(f"Candidate rejected at deployment stage: {deploy_result.get('reason')}")
        return {
            "status": "REJECTED_AT_DEPLOYMENT",
            "domain": domain,
            "metrics": metrics,
            "deployment": deploy_result,
        }

    return {
        "status": "PROMOTED_AND_DEPLOYED",
        "domain": domain,
        "metrics": metrics,
        "deployment": deploy_result,
        "completed_at": datetime.now(timezone.utc).isoformat()
    }


# ==============================================================================
# [STAGE 2: STATISTICAL DRIFT DETECTION & AUTOMATED REMEDIATION]
# [OBJECTIVE]: Monitor distribution shifts between historical baseline and current telemetry.
# [MATHEMATICAL BASIS]:
#   PSI = ∑ (Actual% - Expected%) * ln(Actual% / Expected%).
#   Trigger Condition: PSI > 0.20 (Critical Shift) or KS p-value < 0.01.
# [SYSTEM OUTCOME]: Triggers automated retraining cycle if critical drift is observed.
# ==============================================================================
def check_and_remediate_drift(domain: str = "vessel") -> bool:
    """Evaluate drift on recent data window and trigger retraining if critical."""
    logger.info(f"Checking data drift for domain '{domain}'...")
    baseline_df, _, _ = extract_features_from_db(domain=domain, limit=3000)
    current_df, _, _ = extract_features_from_db(domain=domain, limit=1000)
    
    drift_res = evaluate_feature_drift(baseline_df, current_df)
    if drift_res.get("drift_detected", False):
        logger.warning(f"CRITICAL DRIFT DETECTED for '{domain}'! Triggering automated retraining...")
        run_pipeline_cycle(domain=domain, reason="CRITICAL_DATA_DRIFT")
        return True
    else:
        logger.info(f"No critical drift detected for '{domain}'. Max PSI: {drift_res.get('max_psi', 0):.4f}")
        return False


# ==============================================================================
# [STAGE 3: SCHEDULER DAEMON LOOP]
# [OBJECTIVE]: Run recurring drift checks (hourly) and scheduled retraining (nightly).
# [SYSTEM OUTCOME]: Autonomous, long-running MLOps background daemon.
# ==============================================================================
def start_scheduler(domain: str = "vessel"):
    """Schedule recurring drift checks and automated training cycles."""
    logger.info("Initializing MLOps Scheduling Engine...")
    
    # Check drift hourly
    schedule.every(1).hours.do(check_and_remediate_drift, domain=domain)
    
    # Retrain model nightly at 02:00 UTC
    schedule.every().day.at("02:00").do(run_pipeline_cycle, domain=domain, reason="NIGHTLY_SCHEDULED")
    
    logger.info("Scheduler online. Running event loop...")
    while True:
        schedule.run_pending()
        time.sleep(30)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="HormuzWatch Continuous Training (CT) Orchestrator")
    parser.add_argument("--domain", default="vessel", help="Target domain (vessel, aviation, transit, etc.)")
    parser.add_argument("--mode", choices=["once", "daemon", "drift-check"], default="once", help="Execution mode")
    args = parser.parse_args()
    
    if args.mode == "once":
        res = run_pipeline_cycle(domain=args.domain, reason="MANUAL_TRIGGER")
        print(json.dumps(res, indent=2))
    elif args.mode == "drift-check":
        has_drift = check_and_remediate_drift(domain=args.domain)
        print(json.dumps({"drift_detected": has_drift}))
    elif args.mode == "daemon":
        start_scheduler(domain=args.domain)
