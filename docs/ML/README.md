# HormuzWatch — Machine Learning & System Architecture Documentation

This directory contains the primary research report and the corresponding adversarial technical audit for the HormuzWatch maritime intelligence platform.

---

## Documents

1. **[ML Service Optimization, Telemetry Kinematics, Degradation RCA & 1M User Fault-Tolerant Architecture](./ML_SERVICE_AND_SYSTEM_ARCHITECTURE_REPORT.md)**
   - Mathematical formalization of vessel telemetry kinematics (Haversine, initial bearing, shortest-arc angular deltas, EWMA baselines, Z-scores, and anti-spoofing land mask filters).
   - Calibrated hybrid anomaly detection ensemble (Isolation Forest + LOF + Isotonic Regression).
   - Root Cause Analysis (RCA) on server goroutines, database transaction bottlenecks, gRPC IPC transport, and WebSocket fan-out.
   - High-scale distributed architecture targeting 1,000,000 concurrent WebSocket connections.

2. **[Adversarial Technical Claim Audit & Evidence Validation](./ADVERSARIAL_TECHNICAL_AUDIT_REPORT.md)**
   - Rigorous adversarial audit across 30 technical categories.
   - Complete Technical Claim Register with taxonomy verdicts (**VALIDATED**, **PLAUSIBLE**, **PARTIALLY CORRECT**, **INCORRECT**, **UNSUPPORTED**, **MISLEADING**, **ARCHITECTURAL PROPOSAL**).
   - Mathematical counter-proofs (Geodesy spherical bounds, relative fractional error vs true normal Z-score, $1000\times$ egress math correction).
   - Clear separation of implemented capabilities vs architectural proposals.
   - Interview-grade defensible engineering narrative.

---

## Directory Structure

```
docs/ML/
├── README.md                                     # This index
├── ML_SERVICE_AND_SYSTEM_ARCHITECTURE_REPORT.md  # Primary Architecture & ML Report
└── ADVERSARIAL_TECHNICAL_AUDIT_REPORT.md         # Hostile Adversarial Audit & Evidence Matrix
```
