# 🗄️ Dataset Versioning & Registry Architecture

This document describes how HormuzWatch manages, versions, catalogs, and verifies maritime and aviation telemetry training datasets.

---

## 🧭 Dataset Storage Hierarchy

All raw and preprocessed training datasets reside in `server/datasets/`:

```
server/datasets/
├── registry_manifest.json                          # Central cryptographic catalog of all versions
├── dataset_aircraft_20260902_2200_20260903_2200/  # Aircraft telemetry dataset (v1.0.0)
│   ├── data.csv                                    # Full combined dataset
│   ├── train.csv                                   # 70% Training split
│   ├── val.csv                                     # 15% Validation split
│   ├── test.csv                                    # 15% Holdout test split
│   ├── metadata.json                               # Provenance, time window, column schema
│   ├── quality_report.json                         # Feature distributions, missingness, drift
│   └── quality_report.md                           # Human-readable report
└── dataset_vessel_20260902_2200_20260903_2200/    # Vessel telemetry dataset (v1.0.0)
    ├── data.csv                                    # 153,052 maritime AIS records
    ├── train.csv                                   # 107,136 training rows
    ├── val.csv                                     # 22,958 validation rows
    ├── test.csv                                    # 22,958 test rows
    ├── metadata.json
    ├── quality_report.json
    └── quality_report.md
```

---

## 🔒 Immutability & Integrity Guarantees

Datasets must NEVER be edited in place. Any change creates a new version.

Each file in a dataset is tracked with its SHA256 cryptographic digest in `registry_manifest.json`:
```json
{
  "registry_version": "1.0.0",
  "total_datasets": 2,
  "datasets": {
    "dataset_aircraft_20260902_2200_20260903_2200": {
      "domain": "aircraft",
      "version": "1.0.0",
      "total_rows": 9996,
      "files": {
        "data.csv": {
          "sha256": "5d4135a07dba7ea8faefba5b2e6521bc2705df583f733fc003d5513ab0a93144",
          "size_bytes": 3204054
        },
        ...
      }
    }
  }
}
```

---

## 🛠️ Dataset Management CLI: `scripts/dataset_registry.py`

### 1. List Available Datasets
```bash
python3 scripts/dataset_registry.py list
```
Output:
```text
=====================================================================================
DATASET ID                                    | DOMAIN   | VER   | ROWS     | SIZE (MB) 
=====================================================================================
dataset_aircraft_20260902_2200_20260903_2200  | aircraft | 1.0.0 | 9996     | 6.12      
dataset_vessel_20260902_2200_20260903_2200    | vessel   | 1.0.0 | 153052   | 76.64     
=====================================================================================
```

### 2. Verify Cryptographic Integrity
```bash
python3 scripts/dataset_registry.py verify dataset_aircraft_20260902_2200_20260903_2200
```

### 3. Export Portable Tarball Archive
To export a dataset into a single compressed package with computed SHA256 checksum for distribution or backup:
```bash
python3 scripts/dataset_registry.py export-tar dataset_aircraft_20260902_2200_20260903_2200 --out-dir ./dist/datasets
```

### 4. Index New Datasets
When a new dataset is generated (e.g. by the Go dataset generator or Python worker):
```bash
python3 scripts/dataset_registry.py build-manifest
```
