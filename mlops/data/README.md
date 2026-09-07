# 📊 HormuzWatch Data Directory (DVC Managed)

This directory houses maritime telemetry and GIS dataset layers.

## Layout:
- `raw/`: Unprocessed AIS, OpenSky ADS-B, and satellite SAR readings.
- `processed/`: Interpolated vessel trajectories and geofenced subsets.
- `features/`: Parquet matrices for model training.

## DVC Setup:
```bash
# Push updated datasets to MinIO
dvc add data/raw/
dvc push
```
