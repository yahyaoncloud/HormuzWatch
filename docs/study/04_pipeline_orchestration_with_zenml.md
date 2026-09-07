# ⚡ Pipeline Orchestration with ZenML — HormuzWatch

## 1. Why ZenML?
Many workflow orchestrators (Airflow, Kubeflow) force vendor lock-in with complex YAML DSLs or low-level Kubernetes CRDs.
**ZenML** provides an extensible, Python-first pipeline framework:
- **Code Portability**: The exact same pipeline code runs locally on your workstation, inside Docker Compose, or on a remote Kubernetes cluster without code changes.
- **Stack Decoupling**: Orchestration, artifact storage, experiment tracking, and model registries are configured as swappable components in a "Stack".

## 2. The ZenML Stack for HormuzWatch
```
ZenML Stack: "hormuzwatch-stack"
├── Orchestrator:        Local / Docker
├── Artifact Store:      MinIO S3 (s3://hormuzwatch-models)
├── Experiment Tracker:  MLflow
└── Model Registry:      MLflow Model Registry
```

## 3. Pipeline Step Topology
```
[extract_features_step]
         │
         ▼
[drift_detection_step] ──(Drift Detected?)──► [Alert / Trigger HPO]
         │
         ▼
[train_models_step]    ──(Logs to MLflow Tracking)
         │
         ▼
[evaluate_gate_step]   ──(F1 > Champion?)
         │
         ▼
[deploy_model_step]    ──(Promotes to MLflow Production & updates service)
```

## 4. Stack Provisioning Script
```bash
# Register MinIO Artifact Store
zenml artifact-store register minio-store --flavor=s3 --path=s3://hormuzwatch-models

# Register MLflow Experiment Tracker
zenml experiment-tracker register mlflow-tracker --flavor=mlflow --tracking_uri=http://localhost:5001

# Register MLflow Model Registry
zenml model-registry register mlflow-registry --flavor=mlflow

# Create and activate Stack
zenml stack register hormuzwatch-stack     -a minio-store     -e mlflow-tracker     -r mlflow-registry     -o default --set
```
