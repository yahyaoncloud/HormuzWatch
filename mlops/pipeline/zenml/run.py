"""
CLI Runner for HormuzWatch ZenML Pipelines.
"""
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from pipeline.zenml.pipelines.hormuz_pipeline import hormuz_continuous_training_pipeline

if __name__ == "__main__":
    print("[ZenML] Executing HormuzWatch Continuous Training Pipeline...")
    pipeline_instance = hormuz_continuous_training_pipeline()
    print("[ZenML] Pipeline executed successfully!")
