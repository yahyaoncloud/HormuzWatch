"""
ZenML Continuous Training Pipeline for HormuzWatch.
"""
from zenml import pipeline
from pipeline.zenml.steps.data_loader_step import data_loader_step
from pipeline.zenml.steps.drift_detector_step import drift_detector_step
from pipeline.zenml.steps.trainer_step import trainer_step
from pipeline.zenml.steps.evaluator_step import evaluator_step
from pipeline.zenml.steps.deployer_step import deployer_step

@pipeline
def hormuz_continuous_training_pipeline():
    """Continuous Training (CT) Pipeline connecting Data Ingestion, Drift Detection, Training, and Deployment."""
    data = data_loader_step()
    drift_detected, drift_score = drift_detector_step(current_data=data)
    train_results = trainer_step(features=data)
    eval_passed = evaluator_step(train_results=train_results)
    deployer_step(eval_passed=eval_passed, train_results=train_results)
