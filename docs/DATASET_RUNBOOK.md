# HormuzWatch — Historical ML Dataset Generation Runbook

## Overview
This runbook explains how to generate versioned, reproducible, ML-ready datasets from historical Supabase/PostgreSQL observations without affecting the real-time operational path.

---

## 1. Core Principles

1. **Supabase is Historical Storage, NOT Real-Time Transport:**
   The dataset generator queries historical records independently using transaction-mode pooling (port `6543`), ensuring zero interference with real-time AIS/ADS-B ingestion or WebSocket streaming.
2. **Preserves Normal & Anomalous Observations:**
   All observations within the requested window are retained ($92\%-95\%$ normal, $5\%-8\%$ anomalies) to provide models with a realistic baseline distribution.
3. **Deterministic Feature Reconstruction with Lookback Warmup:**
   The pipeline queries `[start - lookback, end]` (default 2h lookback) to warm up kinematic derivatives and EWMA moments. Lookback data is excluded from dataset samples to prevent sample contamination.
4. **Chronological Splitting (No Temporal Leakage):**
   Records are sorted chronologically and partitioned into `Train` (70%), `Validation` (15%), and `Test` (15%).
5. **Multi-Format Export:**
   Outputs compressed `.parquet` (primary for Python ML), human-readable `.csv`, `metadata.json`, and automated markdown/JSON quality reports.

---

## 2. Directory Layout & Generated Artifacts

Each dataset is stored in a dedicated versioned directory:
```text
datasets/
  └── dataset_vessel_2026-09-01_to_2026-09-03/
      ├── data.parquet             # Full dataset in snappy-compressed Parquet
      ├── data.csv                 # Full dataset in CSV
      ├── train.parquet            # 70% chronological training split
      ├── train.csv
      ├── val.parquet              # 15% chronological validation split
      ├── val.csv
      ├── test.parquet             # 15% chronological testing split
      ├── test.csv
      ├── metadata.json            # Machine-readable provenance and schema
      ├── quality_report.json      # Numerical moments, distributions, null counts
      └── quality_report.md        # Human-readable quality summary
```

---

## 3. How to Generate Datasets

### A. Using Quick Presets (Operator Command)
From the server directory:
```bash
# 1. Short window (last 6 hours)
./dataset-generator --preset short --out ./datasets

# 2. Daily window (last 24 hours)
./dataset-generator --preset daily --out ./datasets

# 3. Multi-day window (last 7 days)
./dataset-generator --preset 7days --out ./datasets
```

### B. Using Arbitrary Timestamp Ranges
```bash
./dataset-generator \
  --start "2026-09-01T00:00:00Z" \
  --end "2026-09-07T23:59:59Z" \
  --lookback-hours 2.0 \
  --domain vessel \
  --id "dataset_vessel_september_week1" \
  --out ./datasets
```

---

## 4. Python ML Workflow Integration

In your Python model training script (`train.py`):
```python
from lib.dataset_generator import load_dataset, extract_feature_matrix

# Load versioned dataset bundle
bundle = load_dataset("datasets/dataset_vessel_2026-09-01_to_2026-09-03")

# Extract training features and targets
X_train, y_train = extract_feature_matrix(bundle.df_train, domain="vessel")
X_val, y_val = extract_feature_matrix(bundle.df_val, domain="vessel")
X_test, y_test = extract_feature_matrix(bundle.df_test, domain="vessel")

print(f"Loaded {len(X_train)} train samples, {len(X_test)} test samples.")
```

---

## 5. 7-Day Collection Workflow ("How-To")

**Question:** *"If I collect another 7 days of Hormuz Watch telemetry, exactly what command/process do I run to turn those 7 days into a new ML-ready dataset without affecting the live system?"*

### Exact Step-by-Step Procedure:

1. **Step 1:** Connect to `yahya@tunkstun`.
2. **Step 2:** Navigate to `/home/yahya/SHARED/Projects/HormuzWatch/server`.
3. **Step 3:** Run the 7-day dataset generation command:
   ```bash
   cd /home/yahya/SHARED/Projects/HormuzWatch/server
   export DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d '=' -f2- | tr -d '\r\n"' | sed 's/:5432\//:6543\//')
   ./dataset-generator --preset 7days --out ./datasets
   ```
   *(Or specify exact date bounds)*:
   ```bash
   ./dataset-generator \
     --start "2026-09-04T00:00:00Z" \
     --end "2026-09-10T23:59:59Z" \
     --id "dataset_vessel_2026-09-04_to_2026-09-10" \
     --out ./datasets
   ```
4. **Step 4 (Optional Parquet Sync):**
   ```bash
   docker exec -u 0:0 hormuzwatch-ml-dev python /app/scripts/export_parquet.py /tmp/datasets
   ```
5. **Step 5 (Train / Validate Models):**
   Pass the new dataset directory directly to the ML training service:
   ```bash
   docker exec hormuzwatch-ml-dev python /app/train.py --dataset /tmp/datasets/dataset_vessel_2026-09-04_to_2026-09-10
   ```

**Live Safety Guarantee:**  
This operation connects to Supabase in read-only transaction pooler mode, reads historical tables with bounded cursor batches, does not restart any Docker containers, and generates files purely on the local disk. Ingestion and WebSocket streaming are completely untouched.
