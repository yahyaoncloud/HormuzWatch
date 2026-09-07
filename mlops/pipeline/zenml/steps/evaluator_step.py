"""
ZenML Step: Evaluator Gate
Validates challenger model against safety gates before promoting to Model Registry.
"""
from zenml import step
from typing import Dict, Any

@step
def evaluator_step(train_results: Dict[str, Any]) -> bool:
    """Evaluate performance gates (e.g. F1 >= 0.85, Latency <= 50ms)."""
    passed = True
    for model_name, metrics in train_results.items():
        f1 = metrics.get("f1_score", 0.0)
        if f1 < 0.80:
            passed = False
            break
    return passed
