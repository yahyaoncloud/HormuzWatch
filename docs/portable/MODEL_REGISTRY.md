# 🧠 ML Model Registry & Lifecycle Management

This guide details the ML model registry, versioning methodology, artifact storage, and staging promotions used in HormuzWatch.

---

## 🎯 Architecture & Guarantees

Every machine learning model running inside the Python ML Service (`service/ml-service/models/`) is subject to strict governance:

1. **Cryptographic Provenance**: Every model `.joblib` file is hashed with SHA256. If a model file is modified by even 1 bit, validation fails.
2. **Catalog Tracking**: Manifest file `service/ml-service/models/registry_manifest.json` acts as the single source of truth for all models, versions, sizes, and validation metrics.
3. **S3/MinIO Artifact Store**: Models are mirrored to MinIO object storage (`s3://hormuzwatch-models`) on port `9000` for instant distribution across nodes.

---

## 📊 Currently Registered Models (Version 2.4.0)

| Model Name | Artifact Filename | Stage | Size (MB) | Role |
| :--- | :--- | :--- | :--- | :--- |
| **`vessel_ensemble`** | `vessel_ensemble.joblib` | `production` | 35.33 MB | Primary maritime AIS anomaly detector |
| **`aviation_ensemble`** | `aviation_ensemble.joblib` | `production` | 4.23 MB | ADS-B military/civilian flight risk classifier |
| **`blockade_ensemble`** | `blockade_ensemble.joblib` | `production` | 2.63 MB | Chokepoint density & blockade likelihood |
| **`transit_ensemble`** | `transit_ensemble.joblib` | `production` | 2.89 MB | AIS speed & trajectory corridor compliance |
| **`news_ensemble`** | `news_ensemble.joblib` | `production` | 2.44 MB | NLP threat classification on regional feeds |
| **`heatmap_ensemble`** | `heatmap_ensemble.joblib` | `production` | 0.40 MB | Geospatial risk heat grid projection |
| **`conflict_model`** | `conflict_model.joblib` | `production` | 0.22 MB | Kinetic escalation & incident risk |
| **`isolation_forest`** | `isolation_forest.joblib` | `production` | 0.57 MB | Unsupervised outlier fallback detector |

---

## 🛠️ CLI Operations: `scripts/model_registry.py`

### 1. View Registered Models & Stages
```bash
python3 scripts/model_registry.py list
```

### 2. Verify Cryptographic Checksums (Zero Tampering)
```bash
python3 scripts/model_registry.py verify
```
Example Output:
```text
[*] Verifying integrity of 8 ML models...
  [OK] aviation_ensemble      -> verified (SHA256: 74bd38375a34...)
  [OK] blockade_ensemble      -> verified (SHA256: 79dc7e084f10...)
  [OK] conflict_model         -> verified (SHA256: 664a0357cd43...)
  [OK] heatmap_ensemble       -> verified (SHA256: e13b2396a75d...)
  [OK] isolation_forest       -> verified (SHA256: bdffae18355e...)
  [OK] news_ensemble          -> verified (SHA256: eb84735e3756...)
  [OK] transit_ensemble       -> verified (SHA256: 33ec2f4498e4...)
  [OK] vessel_ensemble        -> verified (SHA256: a2a9945b482c...)
[✓] All ML models passed cryptographic verification!
```

### 3. Rebuild Manifest After Training
When models are retrained (e.g. via `scripts/train_from_dataset.py`):
```bash
python3 scripts/model_registry.py build-manifest
```

---

## ☁️ Synchronizing with MinIO Object Registry

When deploying in multi-node or cold-start environments:

### Push Models to Registry
```bash
# Push all local models to MinIO bucket s3://hormuzwatch-models
./scripts/registry/sync_artifacts.py push-models
```

### Pull Models from Registry
On a new server that has no models locally:
```bash
MINIO_ENDPOINT="http://192.168.1.51:9000" ./scripts/registry/sync_artifacts.py pull-models
```
