# 📦 Dataset Versioning with DVC — HormuzWatch

## 1. Why Git Fails for Datasets
- Git stores entire snapshots of files as delta-compressed binary blobs. Committing multi-gigabyte AIS or SAR imagery sets bloats `.git`, slows cloning, and degrades repository performance.
- Git lacks native deduplication across different datasets sharing overlapping historical telemetry.

## 2. How DVC Works
**DVC (Data Version Control)** solves this by decoupling dataset metadata from dataset storage:
1. **Pointers in Git**: DVC creates lightweight human-readable `.dvc` files containing content-based hashes (MD5) and file sizes.
2. **Data in Remote Storage**: The raw data files are pushed to an external store (MinIO S3 bucket `s3://hormuzwatch-datasets`).
3. **Reproducibility**: Checking out a Git tag or branch automatically references the exact `.dvc` metadata; running `dvc checkout` restores the matching data files.

## 3. Directory Layout in HormuzWatch
```
data/
├── .gitignore          # Ignores large raw files, allows *.dvc pointers
├── raw/                # AIS, OpenSky, GDELT raw parquet/json streams
│   └── telemetry.dvc   # DVC pointer tracking raw dataset
├── processed/          # Cleaned, geofenced, interpolated trajectories
│   └── clean_geo.dvc   # DVC pointer tracking processed dataset
└── features/           # Standardized anomaly feature matrices
    └── features.dvc    # DVC pointer tracking feature matrices
```

## 4. Operational Runbook
```bash
# 1. Initialize DVC in repository
dvc init

# 2. Configure MinIO S3 Remote (from docker-compose.registry.yml)
dvc remote add -d minio-storage s3://hormuzwatch-datasets
dvc remote modify minio-storage endpointurl http://localhost:9000
dvc remote modify minio-storage access_key_id hormuzadmin
dvc remote modify minio-storage secret_access_key HormuzSecret2026!

# 3. Track a new dataset snapshot
dvc add data/raw/ais_telemetry_2026_09.parquet
git add data/raw/ais_telemetry_2026_09.parquet.dvc data/raw/.gitignore
git commit -m "feat(data): track 2026-09 AIS telemetry via DVC"

# 4. Push dataset to MinIO
dvc push
```
