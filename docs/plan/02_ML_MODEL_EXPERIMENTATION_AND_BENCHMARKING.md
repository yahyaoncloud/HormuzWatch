# 🧪 ML Anomaly Detection Model Experimentation & Benchmarking

> **Date:** September 5, 2026  
> **Status:** Implementation Blueprint & Experimentation Protocol  
> **Datasets:** `/server/datasets/` (`dataset_vessel_*`, `dataset_aircraft_*`)  
> **Notebook:** `notebooks/ml_anomaly_detection_experiments.ipynb`  

---

## 1. Problem Formulation & Operational Context

Maritime vessel and aircraft anomaly detection in the Strait of Hormuz is characterized by **severe class imbalance**:
* Typical operational data shows $\approx 96.8\%$ normal maritime transit and $\approx 3.2\%$ behavioral anomalies (deviations from TSS lanes, unauthorized loitering, AIS spoofing/gaps, sudden speed drops near critical infrastructure).
* Standard classification accuracy is a deceptive metric. The model evaluation must prioritize **Precision-Recall AUC (PR-AUC)**, **False Positive Rate at High Recall**, **Calibration Reliability (ECE)**, and **Inference Latency SLA**.

---

## 2. Dataset Structure & Kinematic Feature Space

The historical datasets located in `/server/datasets/` (and mirrored in `server/datasets/`) provide pre-partitioned, standardized telemetry:

```text
/server/datasets/
├── dataset_vessel_20260902_2200_20260903_2200/
│   ├── metadata.json          # 153,052 total rows, 2,313 unique tracks
│   ├── train.csv              # 107,136 rows (70% split, grouped by MMSI)
│   ├── val.csv                # 22,958 rows (15% split)
│   ├── test.csv               # 22,958 rows (15% out-of-sample holdout)
│   └── quality_report.json    # Audited nulls, distribution stats, provenance
└── dataset_aircraft_20260902_2200_20260903_2200/
    ├── metadata.json          # 22,000+ rows, unique ICAO hexes
    └── train.csv / val.csv / test.csv
```

### Feature Dictionary:
| Feature | Physical Meaning | Normal Range | Anomalous Indicator |
| :--- | :--- | :--- | :--- |
| `course_delta` | Absolute course turn angle between observations | $0^\circ - 15^\circ$ | Sudden erratic turns ($> 60^\circ$) |
| `heading_delta` | Directional heading change over shortest arc | $-15^\circ - +15^\circ$ | High-frequency zigzagging |
| `speed_delta` | Instantaneous acceleration / deceleration | $-2.0 - +2.0\text{ kn}$ | Emergency stop, engine kill ($> 8\text{ kn}$) |
| `average_speed` | Rolling 20-observation kinematic mean | $10 - 22\text{ kn}$ | Suspicious loitering ($< 3\text{ kn}$) |
| `speed_variance` | Second moment of sliding speed window | $< 4.0$ | Unstable erratic throttling |
| `ais_gap_minutes` | Duration of transponder transmission silence | $< 3.0\text{ min}$ | Intentional AIS disabling / spoofing |
| `dist_restricted_zone` | Haversine distance to Iranian / UAE military zones | $> 12.0\text{ NM}$ | Boundary violations, chokepoint breach |
| `dist_historical_site` | Proximity to historical tanker seizure/attack spots | Non-zero | Clustering in high-threat sectors |
| `ewma_deviation` | Multi-dimensional Mahalanobis residual Z-score | $0.0 - 2.5$ | Significant departure from vessel baseline |

---

## 3. Candidate Model Families for Benchmarking

We evaluate 6 distinct algorithmic paradigms across unsupervised, semi-supervised, and deep learning architectures:

```
                               ┌────────────────────────────────┐
                               │   ML Anomaly Model Families    │
                               └───────────────┬────────────────┘
         ┌──────────────────┬──────────────────┼──────────────────┬──────────────────┐
         ▼                  ▼                  ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Isolation Forest│ │Local Outlier Fac│ │ One-Class SVM   │ │ Deep Autoencoder│ │  XGBoost / LGBM │
│ (Path-Length)   │ │ (Local Density) │ │(Kernel Boundary)│ │ (Reconstruction)│ │(PU-Semi Superv.)│
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 3.1. Isolation Forest (iForest)
* **Principle:** Recursive random spatial partitioning isolates anomalies in fewer tree splittings (shorter average path lengths $h(x)$).
* **Pros:** Fast $O(n \log n)$ training, sub-millisecond inference, scale-invariant, robust to multimodal normal distributions.
* **Cons:** Susceptible to axis-aligned partitioning artifacts; requires isotonic calibration for calibrated probabilities.

### 3.2. Local Outlier Factor (LOF)
* **Principle:** Measures local density of a sample relative to its $k$-nearest neighbors. Anomalies have significantly lower local reachability density.
* **Pros:** Excels at detecting subtle contextual deviations within specific shipping lanes.
* **Cons:** $O(n^2)$ inference complexity without spatial indexing; higher memory footprint.

### 3.3. One-Class Support Vector Machine (OC-SVM)
* **Principle:** Maps features into a high-dimensional reproducing kernel Hilbert space (RBF) and determines the maximum-margin hyperplane separating normal data from the origin.
* **Pros:** Strong non-linear geometric decision boundaries.
* **Cons:** Sensitive to kernel parameters ($\gamma, \nu$); poor scaling on large datasets ($> 100\text{k}$ samples).

### 3.4. Elliptic Envelope / Robust Mahalanobis Covariance
* **Principle:** Fits a robust minimum covariance determinant (FastMCD) ellipsoid to assume an elliptical normal cluster.
* **Pros:** Highly interpretable statistical distance metric; extremely fast inference.
* **Cons:** Degrades when normal maritime behavior forms multiple disconnected corridors.

### 3.5. Deep PyTorch Reconstruction Autoencoder
* **Principle:** An encoder compresses input features $x \in \mathbb{R}^d$ to a low-dimensional latent bottleneck $z \in \mathbb{R}^k$ ($k \ll d$), and a decoder reconstructs $\hat{x}$. Anomaly score is the Reconstruction Loss $\mathcal{L}_{\text{rec}} = \|x - \hat{x}\|_2^2$.
* **Architecture:** Dense MLP (`[9 -> 16 -> 6 -> 16 -> 9]`) with LeakyReLU and Batch Normalization.
* **Pros:** Captures complex, high-order non-linear correlations across kinematic features; naturally extensible to Sequence LSTM/GRU Autoencoders for trajectory series.
* **Cons:** Requires GPU or PyTorch runtime; slower cold-start than scikit-learn.

### 3.6. Semi-Supervised / PU-Learning Gradient Boosting (XGBoost / LightGBM)
* **Principle:** Uses verified attacks and expert-annotated historical maritime incidents as positive labels ($P$), and unlabeled telemetry as negative labels ($U$) using Positive-Unlabeled (PU) loss weighting or pseudo-labeling.
* **Pros:** State-of-the-art predictive discriminative power; native feature importance and TreeSHAP.
* **Cons:** Requires careful probability calibration to avoid overconfident predictions on unseen anomaly modalities.

---

## 4. Evaluation Methodology & Metrics

To establish the **Best Fit** model, all models are evaluated on the identical out-of-sample holdout test set (`test.csv`, 22,958 samples) across 6 core criteria:

| Metric | Formula / Definition | Operational Requirement |
| :--- | :--- | :--- |
| **PR-AUC** | $\int_0^1 P(R) dR$ (Area under Precision-Recall Curve) | **$\ge 0.90$** (Primary metric under 3.2% imbalance) |
| **F1-Score ($F_1$)** | $2 \cdot \frac{\text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$ at optimal threshold | **$\ge 0.85$** |
| **Precision @ Top-50** | Precision among the top 50 highest-scored alerts | **$\ge 94\%$** (Prevents alert fatigue for naval watch officers) |
| **Inference Latency** | Per-sample scoring time (CPU P95 / P99) | **$\le 5.0\text{ms}$** (Must support 1,000 msgs/sec stream) |
| **Expected Calibration Error** | $\sum_{m=1}^M \frac{\|B_m\|}{N} \| \text{acc}(B_m) - \text{conf}(B_m) \|$ | **$\le 0.08$** (Scores must map to true risk probabilities) |
| **Memory Footprint** | Resident Set Size (RSS) in Docker container | **$\le 150\text{MB}$** per domain worker |

---

## 5. Jupyter Notebook Architecture (`ml_anomaly_detection_experiments.ipynb`)

The companion Jupyter Notebook is structured into 8 modular, executable phases:
1. **Environment Setup & Hardware Acceleration:** Detects CUDA / ROCm / OpenCL / CPU and sets deterministic random seeds.
2. **Dataset Loading & Exploratory Data Analysis (EDA):** Inspects `/server/datasets/`, evaluates class balance, distributions, and correlation matrices.
3. **Feature Preprocessing Pipeline:** Robust scaling, quantile transforms, and missing value handling.
4. **Model Training & Hyperparameter Search:** Trains the 6 candidate models with cross-validation.
5. **Evaluation Matrix & Metric Computation:** Computes PR-AUC, ROC-AUC, F1, Precision, Recall, and Confusion Matrices.
6. **Inference Latency & Memory Profiling:** Micro-benchmarks single-sample and batch-100 latency across all models.
7. **Model Interpretability (SHAP):** Computes TreeSHAP and KernelSHAP to verify that anomalies trigger on valid physical deviations.
8. **Automated Recommendation & Export:** Ranks models via Pareto frontier and exports the winning model bundle to `service/ml-service/models/`.
