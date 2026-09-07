"""
ZenML Step: Model Trainer
Trains candidate model ensemble with MLflow autologging.
"""
from zenml import step
import mlflow
import pandas as pd
from typing import Dict, Any

@step(experiment_tracker="mlflow-tracker")
def trainer_step(features: pd.DataFrame) -> Dict[str, Any]:
    """Train models and log experiment run to MLflow."""
    from pipeline.train_and_evaluate import train_all_models
    
    mlflow.set_experiment("HormuzWatch-Continuous-Training")
    with mlflow.start_run(run_name="zenml_ct_run"):
        results = train_all_models(features)
        for model_name, metrics in results.items():
            for m_key, m_val in metrics.items():
                if isinstance(m_val, (int, float)):
                    mlflow.log_metric(f"{model_name}_{m_key}", m_val)
    return results
