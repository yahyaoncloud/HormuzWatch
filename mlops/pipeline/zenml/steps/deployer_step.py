"""
mlops/pipeline/zenml/steps/deployer_step.py
===========================================
ZenML Step: Deployer
Promotes candidate models to production stage upon passing evaluation gates,
computes cryptographic SHA-256 hashes, updates model manifest, and notifies ML service.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Any, Dict

STEP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = STEP_DIR.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(PROJECT_ROOT / "mlops") not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT / "mlops"))

from mlops.pipeline.zenml.zenml_compat import step

logger = logging.getLogger("mlops.zenml.deployer")


@step(name="deployer_step", model_registry="mlflow-registry")
def deployer_step(
    eval_passed: bool,
    train_results: Dict[str, Any],
    domain: str = "vessel",
) -> Dict[str, Any]:
    """
    Deploy candidate model to Production if safety gates passed.
    Performs atomic file swap and SHA-256 verification.
    """
    if not eval_passed:
        logger.warning(f"Model candidate for domain='{domain}' did not pass evaluation gates. Skipping deployment.")
        return {
            "deployed": False,
            "domain": domain,
            "reason": "gate_failed",
        }

    from mlops.pipeline.deploy_candidate import evaluate_and_deploy

    logger.info(f"Deploying candidate model for domain='{domain}'...")
    try:
        success = evaluate_and_deploy(train_results)
        status_str = "SUCCESS" if success else "FAILED"
        logger.info(f"Production hot-swap deployment: {status_str}")
        return {
            "deployed": bool(success),
            "domain": domain,
            "status": status_str,
            "artifact_path": str(train_results.get("artifact_path", "")),
        }
    except Exception as exc:
        logger.error(f"Deployment encountered error: {exc}")
        return {
            "deployed": False,
            "domain": domain,
            "error": str(exc),
        }
