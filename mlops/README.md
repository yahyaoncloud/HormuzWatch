# 🔬 HormuzWatch MLOps & Experimentation Hub

Consolidated MLOps workspace containing data versioning, model governance, continuous training pipelines, and interactive Jupyter experimentation notebooks.

---

## 🏛️ Directory Layout

```
mlops/
├── notebooks/                              # Interactive Jupyter Experimentation
│   ├── 01_maritime_vessel_anomaly.ipynb    # Vessel anomaly (Isolation Forest, LOF, Autoencoder)
│   ├── 02_aviation_anomaly.ipynb           # OpenSky ADS-B flight corridor & kinematics
│   ├── 03_chokepoint_blockade_transit.ipynb# Strait of Hormuz blockade & transit risk
│   ├── 04_geopolitical_news_and_conflict.ipynb # GDELT news sentiment & conflict models
│   ├── 05_geospatial_heatmap_fusion.ipynb  # Multi-source geospatial risk density fusion
│   ├── 06_statistical_drift_and_ct_loop.ipynb # PSI, KS-test, and ZenML CT pipeline trigger
│   └── ml_anomaly_detection_experiments.ipynb  # Comprehensive model benchmark suite
│
├── data/                                   # DVC-Managed Data Tier
│   ├── raw/                                # Raw telemetry feeds (.dvc tracked)
│   ├── processed/                          # Geofenced & interpolated trajectories (.dvc tracked)
│   ├── features/                           # Parquet feature matrices (.dvc tracked)
│   └── contracts/                          # Data schemas & telemetry quality contracts
│
├── models/                                 # Model Governance Tier
│   ├── artifacts/                          # Candidate & champion models (.joblib)
│   ├── registry/                           # Manifests, signatures, version lineage
│   └── evaluations/                        # Slice-based evaluation framework
│
└── pipeline/                               # Continuous Training & Serving Pipelines
    ├── zenml/                              # ZenML DAG orchestration (pipelines & steps)
    ├── config.py                           # SLAs, evaluation gates, endpoints
    ├── train_and_evaluate.py               # Bayesian HPO (Optuna) + MLflow tracking
    ├── deploy_candidate.py                 # Champion-challenger quality gatekeeper
    └── drift_monitor.py                    # Data drift monitoring (PSI & KS-test)
```

---

## 🚀 Quickstart Guide

### 1. Launch JupyterLab for Interactive Experimentation
```bash
# Activate the MLOps virtual environment
source .venv-mlops/bin/activate

# Launch JupyterLab inside the mlops directory
jupyter lab mlops/notebooks
```

### 2. Manage Datasets with DVC
```bash
# Add new telemetry data to DVC
dvc add mlops/data/raw/ais_feed.parquet

# Push dataset to local MinIO S3 bucket (s3://hormuzwatch-datasets)
dvc push

# Pull datasets onto another workstation
dvc pull
```

### 3. Spin Up Open-Source MLflow & MinIO Registries
```bash
# Start MinIO S3 (:9000/:9001) and MLflow Tracking Server (:5001)
docker compose -f docker-compose.registry.yml up -d

# View MLflow UI at: http://localhost:5001
# View MinIO Console at: http://localhost:9001
```

### 4. Run ZenML Continuous Training Pipeline
```bash
# Initialize and activate ZenML stack
bash mlops/pipeline/zenml/setup_zenml_stack.sh

# Execute end-to-end continuous training DAG
python3 mlops/pipeline/zenml/run.py
```

### 5. Production Execution & Drift Remediation Runbook
Detailed architecture specification: [01_mlops_fundamentals_and_architecture.md](file:///home/yahya/SHARED/Projects/HormuzWatch/docs/study/01_mlops_fundamentals_and_architecture.md).

```bash
# Verify cryptographic integrity of all 9 registered ML models
python3 scripts/model_registry.py verify

# Train maritime vessel ensemble with Optuna HPO & MLflow logging
python3 mlops/pipeline/train_and_evaluate.py vessel

# Train deep learning corridor reconstruction autoencoder
python3 mlops/pipeline/train_autoencoder.py

# Execute fine-grained slice evaluation (vessel types, geofences, diurnal cycles)
python3 mlops/models/evaluations/slice_evaluator.py

# Query live statistical drift (PSI & KS p-value)
curl -s http://localhost:8090/drift/evaluate/vessel | jq .

# Trigger event-driven continuous training remediation cycle
curl -X POST http://localhost:8090/drift/remediate/vessel | jq .
```

