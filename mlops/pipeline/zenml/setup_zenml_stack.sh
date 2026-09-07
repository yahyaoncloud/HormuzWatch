#!/usr/bin/env bash
# ==============================================================================
# Setup ZenML Stack for HormuzWatch
# Connects ZenML with MinIO Artifact Store and MLflow Model Registry
# ==============================================================================
set -euo pipefail

echo "=== Initializing ZenML Repository ==="
zenml init

echo "=== Registering MinIO S3 Artifact Store ==="
zenml artifact-store register minio-store     --flavor=s3     --path=s3://hormuzwatch-models || true

echo "=== Registering MLflow Experiment Tracker ==="
zenml experiment-tracker register mlflow-tracker     --flavor=mlflow     --tracking_uri=http://localhost:5001 || true

echo "=== Registering MLflow Model Registry ==="
zenml model-registry register mlflow-registry     --flavor=mlflow || true

echo "=== Creating & Activating hormuzwatch-stack ==="
zenml stack register hormuzwatch-stack     -a minio-store     -e mlflow-tracker     -r mlflow-registry     -o default     --set || zenml stack set hormuzwatch-stack

echo "=== ZenML Stack Configuration Complete ==="
zenml stack describe
