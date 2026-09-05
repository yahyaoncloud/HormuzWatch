# 🗺️ HormuzWatch — Architectural Specifications & Master Engineering Plans

> **Date:** September 5, 2026  
> **Status:** Active Reference & Implementation Blueprint  
> **Target Workstation:** `tunkstun` (`192.168.1.51`) & Future Workstation Targets  

---

## 📑 Index of Planning Documents

| Document | Domain | Scope & Core Deliverables |
| :--- | :--- | :--- |
| **[01. MLOps & CI/CD/CT Pipeline](file:///home/tp24/SHARED/Projects/HormuzWatch/docs/plan/01_MLOPS_AND_CICD_CT_PIPELINE.md)** | MLOps & DevOps | End-to-end CI/CD/CT lifecycle: DVC, MLflow registry, Optuna HPO, automated drift-triggered and schedule-triggered retraining, automated evaluation gates (PR-AUC, latency, calibration), zero-downtime hot reloading, and GitHub Actions automation. |
| **[02. ML Anomaly Model Experimentation](file:///home/tp24/SHARED/Projects/HormuzWatch/docs/plan/02_ML_MODEL_EXPERIMENTATION_AND_BENCHMARKING.md)** | Machine Learning | Comprehensive experimentation protocol for finding the best anomaly detection fit using `/server/datasets/` on Jupyter Notebook. Benchmarks Isolation Forest, LOF, One-Class SVM, Elliptic Envelope, Autoencoders, and XGBoost/LightGBM. |
| **[03. Pluggable Python ML Service Architecture](file:///home/tp24/SHARED/Projects/HormuzWatch/docs/plan/03_PLUGGABLE_PYTHON_ML_SERVICE_ARCHITECTURE.md)** | ML Architecture | Concrete extensible base for `service/ml-service`. Defines `BaseAnomalyModel`, `ModelRegistry` with `@register_model`, standardized feature contracts, and pluggable ensemble runners to add any new model without modifying core service code. |
| **[04. High-Performance Go Server & Dedicated Dataset Worker](file:///home/tp24/SHARED/Projects/HormuzWatch/docs/plan/04_HIGH_PERFORMANCE_GO_SERVER_AND_DEDICATED_DATASET_WORKER.md)** | Systems Engineering | Maximizing Go server capacity with zero-allocation pooling (`sync.Pool`), fixed circular ring buffers, sharded lock-free state manager, and R-tree spatial indexing. Architecture for isolating dataset creation to a dedicated server/service. |
| **[05. Infrastructure Automation & Ansible Portability](file:///home/tp24/SHARED/Projects/HormuzWatch/docs/plan/05_INFRASTRUCTURE_AUTOMATION_AND_ANSIBLE_PORTABILITY.md)** | Platform & SRE | Full automation pipeline for remote server `tunkstun` and complete, idempotent Ansible playbooks and roles to migrate the entire platform to a higher-capacity workstation in the future. |

---

## 🎯 Global System Vision

HormuzWatch is a 24/7 mission-critical maritime and aviation intelligence platform monitoring the **Strait of Hormuz** chokepoint. The platform processes high-velocity sensor streams (AIS maritime telemetry, OpenSky ADS-B, GDELT geopolitical news, FIRMS satellite thermal data) to identify vessel deviations, spoofing, loitering, lane crossings, and geopolitical escalation indicators.

To support the next phase of scale and operational stability, the platform is evolving from ad-hoc single-server execution to:
1. **Zero-Contention Core Server**: A lean, low-latency Go core optimized for microsecond ingestion, in-memory caching, and sub-second WebSocket/SSE distribution.
2. **Decoupled Analytical Engine**: Heavy dataset generation, Parquet compression, and historical lookback extraction offloaded to a dedicated worker.
3. **Continuous Machine Learning (CT)**: Automated closed-loop retraining, drift detection, and rigorous verification gates with zero service interruption.
4. **Hardware Portability**: Declarative Ansible provisioning allowing migration across bare-metal workstations in minutes.
