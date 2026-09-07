# 🏆 HormuzWatch MLOps Architecture & Completion Report
**Platform:** HormuzWatch Maritime & Geospatial Intelligence Platform  
**Target Environment:** Open-Source Production Stack (DVC, MinIO, MLflow, ZenML, FastAPI, Go Server)  
**Reference Standards:** Chip Huyen's *Designing Machine Learning Systems*, Gene Kim's *The DevOps Handbook (2nd Ed)*

---

## 1. Executive Summary

This engineering report certifies the successful establishment of a dedicated, open-source **MLOps Continuous Training (CT) and Continuous Delivery for Machine Learning (CD4ML)** ecosystem for HormuzWatch. All machine learning components, datasets, governance registries, and interactive experimentation environments have been consolidated under a unified, top-level **[`mlops/`](file:///run/media/tp24/SHARED/Projects/HormuzWatch/mlops)** workspace with backward-compatible root symlinks.

---

## 2. Completed MLOps Capabilities

### 2.1 Open-Source Stack Architecture
- **Data Versioning (DVC)**:
  - Initialized `.dvc` tracking `mlops/data/raw/`, `mlops/data/processed/`, and `mlops/data/features/`.
  - Configured MinIO S3 remote (`minio-storage`) targeting bucket `s3://hormuzwatch-datasets` at `http://localhost:9000`.
  - Defined reproducible pipeline execution in [`dvc.yaml`](file:///run/media/tp24/SHARED/Projects/HormuzWatch/dvc.yaml).
- **Tracking & Governance (MLflow)**:
  - Added containerized `mlflow-server` (Port `5001`) to [`docker-compose.registry.yml`](file:///run/media/tp24/SHARED/Projects/HormuzWatch/docker-compose.registry.yml) with MinIO S3 artifact storage (`s3://hormuzwatch-models`).
  - Standardized model artifacts in `mlops/models/artifacts/` and registry manifests in `mlops/models/registry/`.
- **Pipeline Orchestration (ZenML)**:
  - Configured Pythonic DAGs in [`mlops/pipeline/zenml/`](file:///run/media/tp24/SHARED/Projects/HormuzWatch/mlops/pipeline/zenml/) connecting data loading, drift detection, training, gating, and zero-downtime hot-reloading.
  - Provided automated stack setup script (`setup_zenml_stack.sh`).

### 2.2 Data Contracts & Quality Bounds
- Created [`mlops/data/contracts/telemetry_contract.py`](file:///run/media/tp24/SHARED/Projects/HormuzWatch/mlops/data/contracts/telemetry_contract.py) enforcing strict boundaries:
  - Latitude: $20.0^\circ \le \text{lat} \le 32.0^\circ$ (Persian Gulf & Strait of Hormuz)
  - Longitude: $50.0^\circ \le \text{lon} \le 62.0^\circ$
  - Speed over ground: $0 \le \text{speed} \le 70\text{ kts}$
  - Automated batch validation, coordinate compliance scores, and missingness tolerance auditing.

### 2.3 Slice-Based Model Evaluation
- Created [`mlops/models/evaluations/slice_evaluator.py`](file:///run/media/tp24/SHARED/Projects/HormuzWatch/mlops/models/evaluations/slice_evaluator.py) protecting against aggregate metric masking:
  - **Vessel Class Slices**: Cargo, Oil Tanker, High-Speed Craft, Military/Law Enforcement, Fishing.
  - **Geofence Slices**: Hormuz TSS Chokepoint vs Fujairah Offshore Anchorage vs Persian Gulf Open Waters.

### 2.4 Interactive Jupyter Experimentation Suite
Established [`mlops/notebooks/`](file:///run/media/tp24/SHARED/Projects/HormuzWatch/mlops/notebooks/) with 6 end-to-end notebooks covering all models:
1. `01_maritime_vessel_anomaly.ipynb` — Maritime AIS anomaly detection (`vessel_ensemble.joblib`, `isolation_forest.joblib`, LOF).
2. `02_aviation_anomaly.ipynb` — OpenSky ADS-B flight corridor & kinematic deviations (`aviation_ensemble.joblib`).
3. `03_chokepoint_blockade_transit.ipynb` — Strait closure risk & passage delay (`blockade_ensemble.joblib`, `transit_ensemble.joblib`).
4. `04_geopolitical_news_and_conflict.ipynb` — GDELT news sentiment & conflict escalation (`news_ensemble.joblib`, `conflict_model.joblib`).
5. `05_geospatial_heatmap_fusion.ipynb` — Multi-modal risk density & spatial heat fusion (`heatmap_ensemble.joblib`).
6. `06_statistical_drift_and_ct_loop.ipynb` — Covariate shift simulation, PSI & KS tests, and ZenML CT trigger.

---

## 3. Server Ingestion & Real-Time Playback Delay Integration

### 3.1 Rate Limit Leniency (HTTP 429 Prevention)
- **Adaptive Rate Limiting**: Exponential backoff with jitter and parsing of `Retry-After` headers on OpenSky API and AIS providers.
- **Dead-Reckoning & Continuity Extrapolation**: In-memory kinematic extrapolation bridges polling intervals without flooding upstream APIs or dropping tracked aircraft/vessels.

### 3.2 In-Memory Time-Shifted Playback Buffer (1–2 Minute Comfortable Delay)
- **Pre-Gathering Live Streams**: Incoming raw observations are buffered in memory and released with a comfortable 90-second (1.5-minute) delay.
- **Benefits**:
  - Eliminates map stutter and visual jitter caused by network bursts or temporary API 429 pauses.
  - Provides adequate window for full ML inference, LOF density calculation, and feature attribution before markers appear on the map.
  - Enables smooth trajectory interpolation between consecutive waypoints.
