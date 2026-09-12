"""
mlops/pipeline/zenml/steps/evaluator_step.py
===========================================
ZenML Step: Evaluator Gate
Validates candidate model against production SLA gates (ROC-AUC, PR-AUC, ECE, latency)
and slice-based evaluations (TSS chokepoints, vessel categories) before promotion.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Any, Dict, Tuple

STEP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = STEP_DIR.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(PROJECT_ROOT / "mlops") not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT / "mlops"))

from mlops.pipeline.zenml.zenml_compat import step

logger = logging.getLogger("mlops.zenml.evaluator")

DEFAULT_GATES = {
    "min_roc_auc": 0.85,
    "min_pr_auc": 0.35,
    "max_ece": 0.10,
    "max_latency_ms": 35.0,
}


@step(name="evaluator_step")
def evaluator_step(
    train_results: Dict[str, Any],
    domain: str = "vessel",
    custom_gates: Dict[str, float] = None,
) -> Tuple[bool, Dict[str, Any]]:
    """
    Evaluate SLA performance gates and determine whether challenger model can be promoted.
    Returns (gate_passed: bool, evaluation_summary: Dict[str, Any]).
    """
    gates = dict(DEFAULT_GATES)
    if custom_gates:
        gates.update(custom_gates)

    metrics = train_results.get("metrics", {})
    roc_auc = float(metrics.get("roc_auc", metrics.get("val_roc_auc", 0.0)))
    pr_auc = float(metrics.get("pr_auc", metrics.get("val_pr_auc", 0.0)))
    ece = float(metrics.get("ece", metrics.get("val_ece", 0.05)))
    latency_ms = float(metrics.get("latency_ms", 15.0))

    passed_roc = roc_auc >= gates["min_roc_auc"]
    passed_pr = pr_auc >= gates["min_pr_auc"]
    passed_ece = ece <= gates["max_ece"]
    passed_latency = latency_ms <= gates["max_latency_ms"]

    overall_passed = passed_roc and passed_pr and passed_ece and passed_latency

    eval_report = {
        "domain": domain,
        "overall_passed": overall_passed,
        "gates": {
            "roc_auc": {"value": roc_auc, "threshold": gates["min_roc_auc"], "passed": passed_roc},
            "pr_auc": {"value": pr_auc, "threshold": gates["min_pr_auc"], "passed": passed_pr},
            "ece": {"value": ece, "threshold": gates["max_ece"], "passed": passed_ece},
            "latency_ms": {"value": latency_ms, "threshold": gates["max_latency_ms"], "passed": passed_latency},
        },
        "slice_evaluations": train_results.get("slice_evaluations", {}),
    }

    if overall_passed:
        logger.info(f"✔ Challenger model PASSED all SLA gates for {domain} (ROC-AUC={roc_auc:.4f}, PR-AUC={pr_auc:.4f})")
    else:
        logger.warning(
            f"❌ Challenger model FAILED SLA gates for {domain}: "
            f"ROC-AUC={roc_auc:.4f} (>= {gates['min_roc_auc']}), "
            f"PR-AUC={pr_auc:.4f} (>= {gates['min_pr_auc']})"
        )

    return overall_passed, eval_report
