# 📘 MLOps Architecture & Lifecycle — HormuzWatch

## 1. Executive Overview
In real-time maritime and geospatial intelligence systems like **HormuzWatch**, machine learning models operate in non-stationary, adversarial environments. Maritime traffic patterns shift due to geopolitical escalations, GPS spoofing, AIS transponder disabling ("dark vessels"), and seasonal weather. Traditional "train-once, deploy-forever" ML paradigms fail catastrophically in such settings due to **concept drift** and **data drift**.

**MLOps (Machine Learning Operations)** bridges the chasm between ML development and production operations. It enforces software engineering discipline (CI/CD, version control, testing) onto data engineering and machine learning workflows.

---

## 2. The Three Pillars of MLOps

```
               ┌─────────────────────────────────────────────────────────┐
               │                     Git Repository                      │
               │           (Code, Pipeline DAGs, .dvc Pointers)          │
               └───────────────────────────┬─────────────────────────────┘
                                           │
         ┌─────────────────────────────────┼────────────────────────────────┐
         ▼                                 ▼                                ▼
┌──────────────────┐             ┌───────────────────┐            ┌──────────────────┐
│  DATA MANAGEMENT │             │    ORCHESTRATION  │            │  MODEL REGISTRY  │
│      (DVC)       │             │      (ZenML)      │            │     (MLflow)     │
│ ──────────────── │             │ ───────────────── │            │ ──────────────── │
│ • Raw Ingestion  │ ──Features─►│ • Data Extract    │──Weights──►│ • Experiments    │
│ • S3 Remote      │             │ • Drift Check     │            │ • Model Versions │
│ • Versioning     │             │ • Train & Gate    │            │ • Staging/Prod   │
└──────────────────┘             └───────────────────┘            └──────────────────┘
         │                                 │                                │
         └─────────────────────────┬───────┴────────────────────────────────┘
                                   ▼
                   ┌───────────────────────────────┐
                   │    Production Serving Layer   │
                   │   (FastAPI / gRPC Ensemble)   │
                   └───────────────────────────────┘
```

1. **Continuous Integration (CI)**: Validates code, data schemas, feature transformations, and unit tests upon commit.
2. **Continuous Delivery (CD)**: Automatically deploys validated candidate models into staging and canary environments when performance gates are met.
3. **Continuous Training (CT)**: Automatically retrains models on fresh production data when drift monitors trigger an alarm, with Bayesian Hyperparameter Optimization (Optuna).

---

## 3. HormuzWatch MLOps Component Topology

| Capability | Tool Selected | HormuzWatch Implementation |
| :--- | :--- | :--- |
| **Data Versioning** | **DVC (Data Version Control)** | Tracks raw telemetry (`AIS`, `OpenSky`, `GDELT`) and feature matrices with S3/MinIO backend. |
| **Experiment Tracking** | **MLflow Tracking** | Logs metrics (ROC-AUC, Precision, Recall, F1), hyperparams, and loss curves. |
| **Model Registry** | **MLflow Model Registry** | Enforces lifecycle transitions (`None` -> `Staging` -> `Production` -> `Archived`). |
| **Pipeline DAGs** | **ZenML** | Clean Python decorators (`@step`, `@pipeline`) decoupling code from execution backends. |
| **Object Storage** | **MinIO S3** | Self-hosted S3 API (`hormuzwatch-models` and `hormuzwatch-datasets` buckets). |
| **Containerization** | **Docker Registry** | Built-in private registry (Port 5000) for immutable service image tags. |
