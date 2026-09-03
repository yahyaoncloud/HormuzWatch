# HormuzWatch — Machine Learning & System Architecture Documentation

This directory contains the primary research report and the corresponding adversarial technical audit for the HormuzWatch maritime intelligence platform.

---

## Documents

1. **[End-to-End Machine Learning Architecture & Technical Reference](./END_TO_END_ML_ARCHITECTURE.md)**
   - Complete technical breakdown of the high-performance Python gRPC (`:8091`) and REST (`:8090`) inference engine.
   - Comprehensive documentation of all 7 specialized production models:
     1. Maritime Vessel Kinematic Anomaly Ensemble (`vessel_ensemble.joblib`)
     2. Aviation ADS-B Kinematic Anomaly Ensemble (`aviation_ensemble.joblib`)
     3. Geopolitical Risk & Conflict Predictor (`conflict_model.joblib`)
     4. Maritime Transit & Bottleneck Anomaly Engine (`transit_ensemble.joblib`)
     5. Spatial Geohash Heatmap Anomaly Ensemble (`heatmap_ensemble.joblib`)
     6. OSINT Narrative & Intelligence Classifier (`news_ensemble.joblib`)
     7. Blockade & STS Dark Transfer Detector (`blockade_ensemble.joblib`)
   - 9-dimensional canonical feature engineering specifications and $<5\text{ms}$ SIMD inference latency SLAs.

2. **[End-to-End MLOps Pipeline & Automated Retraining Proposal](./MLOPS_PIPELINE_PROPOSAL.md)**
   - Automated continuous training (CT) architecture triggered by cron schedules, data volume thresholds, and Kolmogorov-Smirnov / PSI feature drift.
   - Centralized model registry (MLflow / S3) with cryptographically signed lineage manifests.
   - Automated Champion/Challenger shadow testing and zero-downtime hot-reloading gates.
   - Comprehensive 4-phase implementation roadmap and observability integration with Prometheus and Grafana.

3. **[ML Service Optimization, Telemetry Kinematics, Degradation RCA & 1M User Fault-Tolerant Architecture](./ML_SERVICE_AND_SYSTEM_ARCHITECTURE_REPORT.md)**
   - Mathematical formalization of vessel telemetry kinematics (Haversine, initial bearing, shortest-arc angular deltas, EWMA baselines, Z-scores, and anti-spoofing land mask filters).
   - Calibrated hybrid anomaly detection ensemble (Isolation Forest + LOF + Isotonic Regression).
   - Root Cause Analysis (RCA) on server goroutines, database transaction bottlenecks, gRPC IPC transport, and WebSocket fan-out.
   - High-scale distributed architecture targeting 1,000,000 concurrent WebSocket connections.

4. **[Adversarial Technical Claim Audit & Evidence Validation](./ADVERSARIAL_TECHNICAL_AUDIT_REPORT.md)**
   - Rigorous adversarial audit across 30 technical categories with mathematical proofs and evidence validation.

---

## Directory Structure

```
docs/ML/
├── README.md                                     # This index
├── END_TO_END_ML_ARCHITECTURE.md                 # Full 7-Model System Reference
├── MLOPS_PIPELINE_PROPOSAL.md                    # Automated CT & MLOps Lifecycle Proposal
├── ML_SERVICE_AND_SYSTEM_ARCHITECTURE_REPORT.md  # Primary Architecture & ML Report
└── ADVERSARIAL_TECHNICAL_AUDIT_REPORT.md         # Adversarial Audit & Evidence Matrix
```
