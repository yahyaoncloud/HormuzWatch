# 🛠️ Complementary MLOps Tools & Ecosystem — HormuzWatch

## 1. Ecosystem Tool Matrix

| Tool | Category | Role in HormuzWatch Architecture |
| :--- | :--- | :--- |
| **Evidently AI** | Data & Model Monitoring | Automated drift reports (KS test, Wasserstein distance, Data Quality metrics). |
| **Great Expectations**| Data Quality Testing | Declarative assertions on incoming AIS & OpenSky telemetry schemas before ingestion. |
| **Feast** | Feature Store | Low-latency point-in-time correct online feature retrieval for live AIS inferencing. |
| **Optuna** | Hyperparameter Optimization | Bayesian optimization (TPE sampler) for automated retraining passes. |
| **Triton / FastAPI** | High-Throughput Serving | Low-latency concurrent inference engine serving multiple ensemble models. |
| **Prometheus + Grafana**| SRE Observability | Scraping p99 inference latency, error rates, and live anomaly scores. |

---

## 2. Evidently AI vs In-House Drift Monitors
- HormuzWatch contains `pipeline/drift_monitor.py` implementing Kolmogorov-Smirnov and Population Stability Index (PSI).
- **Evidently AI** complements this by generating interactive HTML dashboards, data drift matrices, and JSON metric endpoints directly ingestible into CI/CD pipelines.

## 3. Great Expectations for AIS Telemetry Ingestion
AIS data frequently suffers from corrupted coordinates (lat > 90, lon > 180) and invalid Maritime Mobile Service Identity (MMSI) headers.
Great Expectations asserts:
```python
validator.expect_column_values_to_be_between("latitude", min_value=24.0, max_value=28.0)
validator.expect_column_values_to_be_between("longitude", min_value=54.0, max_value=58.0)
validator.expect_column_values_to_be_between("speed_over_ground", min_value=0.0, max_value=60.0)
```

## 4. End-to-End Production Loop
1. Telemetry streamed into Kafka/PostgreSQL.
2. **Great Expectations** validates raw batch validity.
3. **DVC** versions feature matrices into MinIO.
4. **ZenML** runs CT pipeline with **Evidently AI** drift verification.
5. **Optuna + MLflow** optimizes and registers champion model candidate.
6. Deployment gate passes -> promoted to **MLflow Production**.
7. **FastAPI/Triton** reloads weights with zero-downtime hot swap.
8. **Prometheus & Grafana** display telemetry and live anomaly scores.
