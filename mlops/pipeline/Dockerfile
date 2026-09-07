# Dockerfile for HormuzWatch MLOps Continuous Training Pipeline
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for scientific packages and PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY pipeline/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy ML Service and Pipeline codebase
COPY service/ml-service /app/service/ml-service
COPY pipeline /app/pipeline

WORKDIR /app/pipeline

ENV PYTHONUNBUFFERED=1
ENV MLFLOW_TRACKING_URI="file:///app/pipeline/artifacts/mlruns"
ENV MLFLOW_EXPERIMENT_NAME="HormuzWatch-Automated-CT"

ENTRYPOINT ["python", "orchestrator.py", "--daemon"]
