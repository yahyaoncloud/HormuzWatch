# 🧠 HormuzWatch Models Directory (MLflow Managed)

This directory manages serialized model artifacts, weights, and production registry manifests.

## Layout:
- `artifacts/`: Serialized models (`.joblib`, `.onnx`, `.pt`).
- `registry/`: Active champion/challenger metadata and signature definitions.

## MLflow Integration:
All training passes log to the central MLflow Model Registry (backed by MinIO bucket `s3://hormuzwatch-models`).
