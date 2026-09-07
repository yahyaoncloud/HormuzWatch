# 🏛️ Model Tracking & Registry with MLflow — HormuzWatch

## 1. What is MLflow?
MLflow provides an enterprise-grade platform covering the machine learning lifecycle:
1. **MLflow Tracking**: Recording parameters, metrics, code versions, artifacts, and tags.
2. **MLflow Models**: Packaging models in a flavor-agnostic format (PyFunc, ONNX, Scikit-learn).
3. **MLflow Model Registry**: Centralized model hub with model lineage, model versioning, and stage transitions.

## 2. HormuzWatch ML Model Catalog
The HormuzWatch ensemble consists of 6 specialized models:
1. `vessel-density-v1`: Kernel Density Estimation & Spatial Isolation Forest for AIS anomaly detection.
2. `ais-spoofing-v1`: Kinematic acceleration & geographic plausibility verifier.
3. `dark-vessel-classifier-v1`: Satellite SAR radar vs AIS transponder cross-correlation.
4. `chokepoint-risk-predictor-v1`: Random Forest classifier estimating strait closure probability.
5. `geopolitical-sentiment-v1`: DistilBERT NLP classifier processing GDELT news events.
6. `spatial-heatmap-ensemble-v1`: Combined threat density field generator.

## 3. Model Registry Lifecycle
```
[Training Run] ──► MLflow Tracking Run (Params, Metrics, Artifacts)
                         │
                         ▼
             [Register Model Candidate]
                         │
                         ▼
                 Stage: "None"
                         │
        [Automated Evaluation Gate >= 0.85 F1]
                         │
                         ▼
                Stage: "Staging"
                         │
         [Canary / Shadow Traffic Validation]
                         │
                         ▼
               Stage: "Production" (Active Champion)
                         │
             [Superseded by New Challenger]
                         │
                         ▼
                Stage: "Archived"
```

## 4. Integration Code Example
```python
import mlflow
import mlflow.sklearn

mlflow.set_tracking_uri("http://localhost:5001")
mlflow.set_experiment("HormuzWatch-Vessel-Anomaly")

with mlflow.start_run(run_name="isolation_forest_retrain"):
    mlflow.log_param("contamination", 0.02)
    mlflow.log_param("n_estimators", 200)
    
    # Train
    model.fit(X_train)
    
    # Evaluate
    f1 = evaluate_f1(model, X_val, y_val)
    mlflow.log_metric("f1_score", f1)
    
    # Log Model & Register
    mlflow.sklearn.log_model(
        sk_model=model,
        artifact_path="model",
        registered_model_name="vessel-density-model"
    )
```
