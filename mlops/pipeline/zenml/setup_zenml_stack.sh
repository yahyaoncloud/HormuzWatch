#!/usr/bin/env bash
# ==============================================================================
# Setup ZenML Stack for HormuzWatch MLOps & ETL
# Connects ZenML with Local/S3 Artifact Store, MLflow Tracking & Registry
# ==============================================================================
set -euo pipefail

echo "======================================================================"
echo "⚡ HormuzWatch ZenML Stack Provisioning"
echo "======================================================================"

if ! command -v zenml &> /dev/null; then
    echo "[!] ZenML CLI is not installed in the active PATH."
    echo "    To install: pip install zenml>=0.60.0"
    echo "    HormuzWatch pipelines can also run in standalone mode via:"
    echo "    python -m mlops.pipeline.zenml.run --pipeline etl"
    exit 0
fi

echo "[1/5] Initializing ZenML Repository..."
zenml init --analytics-opt-in=false 2>/dev/null || true

echo "[2/5] Registering Artifact Store (MinIO S3 / Local)..."
zenml artifact-store register minio-store \
    --flavor=s3 \
    --path="${S3_BUCKET_URI:-s3://hormuzwatch-models}" 2>/dev/null || true

echo "[3/5] Registering MLflow Experiment Tracker..."
zenml experiment-tracker register mlflow-tracker \
    --flavor=mlflow \
    --tracking_uri="${MLFLOW_TRACKING_URI:-http://localhost:5001}" 2>/dev/null || true

echo "[4/5] Registering MLflow Model Registry..."
zenml model-registry register mlflow-registry \
    --flavor=mlflow 2>/dev/null || true

echo "[5/5] Creating & Activating hormuzwatch-stack..."
zenml stack register hormuzwatch-stack \
    -a minio-store \
    -e mlflow-tracker \
    -r mlflow-registry \
    -o default \
    --set 2>/dev/null || zenml stack set hormuzwatch-stack 2>/dev/null || true

echo "======================================================================"
echo "✔ ZenML Stack Configuration Complete"
echo "======================================================================"
zenml stack describe 2>/dev/null || zenml stack list
