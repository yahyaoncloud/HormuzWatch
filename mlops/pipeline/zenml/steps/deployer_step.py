"""
ZenML Step: Deployer
Promotes model in MLflow Model Registry to Production and reloads ML service.
"""
from zenml import step
import mlflow
from typing import Dict, Any

@step(model_registry="mlflow-registry")
def deployer_step(eval_passed: bool, train_results: Dict[str, Any]) -> bool:
    """Deploy candidate model to Production if gates pass."""
    if not eval_passed:
        print("[MLOps Gate] Model candidate did not pass evaluation gates. Skipping deployment.")
        return False
        
    from pipeline.deploy_candidate import evaluate_and_deploy
    success = evaluate_and_deploy(train_results)
    print(f"[MLOps Deploy] Production hot-swap deployment: {'SUCCESS' if success else 'FAILED'}")
    return success
