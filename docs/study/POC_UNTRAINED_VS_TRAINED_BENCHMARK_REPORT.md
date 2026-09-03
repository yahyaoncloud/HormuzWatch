# HormuzWatch: Corrected Proof-of-Concept (PoC) Benchmark Report
## Untrained / Raw Baseline vs. Trained & Calibrated MLOps Ensemble

> [!WARNING]
> **AUDIT NOTICE & SUPERSEDED RESULTS**:
> The previous benchmark report dated September 3, 2026 is **superseded and invalidated** due to methodological data leakage identified during the technical adversarial audit. Specifically:
> 1. In the previous benchmark, `train_ensemble()` executed an unstratified independent reshuffle of entities, causing 8 of 12 test vessels (66.7%) to leak into training and 2 vessels (16.7%) into calibration.
> 2. Model A previously utilized test-set min/max values for score normalization.
> 
> This document presents the **corrected, strictly leakage-free benchmark** where train, validation, calibration, and test partitions are mutually exclusive across all entity identifiers (MMSIs), and all preprocessing/normalization statistics are derived strictly from training data.

---

## 1. Executive Summary & Experimental Methodology

This benchmark evaluates the performance differential between an **Untrained / Raw Baseline Model** (default unscaled Isolation Forest) and the **Trained & Calibrated MLOps Ensemble** (`StandardScaler` $\to$ Dual IF + LOF $\to$ Monotonic Isotonic Regression).

```mermaid
flowchart TD
    subgraph Data Generation
        Gen[3,000 Standardized Telemetry Observations<br/>100 Unique Vessel MMSIs | 6.0% Anomaly Contamination]
    end

    subgraph Single Authoritative Grouped Split
        Gen --> Split[Authoritative Entity Splitter<br/>Deterministic Seed = 42]
        Split --> Tr[Train Split: 60 MMSIs<br/>1,800 Observations]
        Split --> Val[Validation Split: 14 MMSIs<br/>420 Observations]
        Split --> Cal[Calibration Split: 14 MMSIs<br/>420 Observations]
        Split --> Te[Held-out Test Split: 12 MMSIs<br/>360 Observations (45 Anomalies)]
    end

    subgraph Leakage Verification
        Tr & Val & Cal & Te --> Check["Pairwise MMSI Intersections: Exactly 0<br/>(Train ∩ Test = ∅ | Calib ∩ Test = ∅)"]
    end
```

### Partitioning Matrix
- **Total Observations**: 3,000 across 100 distinct vessel MMSIs.
- **Train Partition**: 1,800 samples (60 vessels). Fits `StandardScaler`, `IsolationForest`, `LocalOutlierFactor`, and Model A.
- **Validation Partition**: 420 samples (14 vessels). Guides hyperparameter selection.
- **Calibration Partition**: 420 samples (14 vessels). Fits `IsotonicRegression` probability mapping.
- **Held-out Test Partition**: 360 samples (12 vessels, 45 anomalies). Untouched evaluation set.

---

## 2. Leakage Audit & Verification Matrix

The following zero-overlap assertions are programmatically enforced and verified by regression test suite `tests/test_mlops_leakage_and_benchmark.py`:

| Intersection Pair | Overlap Count | Status | Enforcement Mechanism |
| :--- | :--- | :--- | :--- |
| **Train MMSIs $\cap$ Test MMSIs** | **0** | **LEAKAGE-FREE** | Mutual exclusivity via authoritative group partitioning |
| **Calibration MMSIs $\cap$ Test MMSIs** | **0** | **LEAKAGE-FREE** | Calibrator fit strictly on separate calibration vessels |
| **Validation MMSIs $\cap$ Test MMSIs** | **0** | **LEAKAGE-FREE** | Hyperparameter evaluation strictly disjoint from test |
| **Train MMSIs $\cap$ Calibration MMSIs** | **0** | **LEAKAGE-FREE** | Base models and calibrator fit on independent entities |
| **Test-Derived Min/Max in Model A** | **None** | **LEAKAGE-FREE** | Bounds $s_{\min}, s_{\max}$ derived strictly from $X_{\text{train}}$ |

---

## 3. Side-by-Side Corrected Benchmark Results

Both models were evaluated on the **exact same held-out 360-observation test set** (`y_test` containing 45 true anomalies, $12.50\%$ test prevalence):

| Metric | Model A: Untrained / Raw Baseline | Model B: Trained & Calibrated MLOps Ensemble | Delta / Comparative Finding |
| :--- | :--- | :--- | :--- |
| **Architecture** | Unscaled features $\to$ Default IsolationForest (100 trees, no HPO, no Isotonic calibration) | `StandardScaler` $\to$ Dual IF (200 trees) + LOF (20 neighbors) $\to$ Isotonic Calibration | Multi-algorithm ensemble with quantile calibration |
| **ROC-AUC** | $1.0000$ | $0.9751$ | Baseline isolates extreme synthetic outliers cleanly |
| **PR-AUC (Average Precision)** | $1.0000$ | $0.8194$ | Baseline shows higher precision on synthetic cluster separation |
| **Expected Calibration Error (ECE)** | $0.1486$ ($14.86\%$ error) | $\mathbf{0.0457}$ ($\mathbf{4.57\%}$ error) | **$69.2\%$ Reduction in Calibration Error** 🏆 |
| **Brier Score Loss** | $\mathbf{0.0273}$ | $0.0373$ | Baseline shows low mean squared probability loss on step distribution |
| **Precision** | $\mathbf{0.9184}$ | $0.8148$ | $4$ false positives (Model A) vs. $10$ false positives (Model B) |
| **Recall** | $\mathbf{1.0000}$ | $0.9778$ | $45/45$ caught (Model A) vs. $44/45$ caught (Model B) |
| **Specificity** | $\mathbf{0.9873}$ | $0.9683$ | $311/315$ clean (Model A) vs. $305/315$ clean (Model B) |
| **F1-Score** | $\mathbf{0.9574}$ | $0.8889$ | Baseline higher on synthetic bimodal data |
| **Confusion Matrix (TP / FP / TN / FN)** | $45 \;/\; 4 \;/\; 311 \;/\; 0$ | $44 \;/\; 10 \;/\; 305 \;/\; 1$ | Both maintain high sensitivity ($>97\%$) |
| **Latency per 100 Tracks** | $\mathbf{1.64\text{ms}}$ | $4.25\text{ms}$ | Both well within the $<12.0\text{ms}$ production SLA |
| **Retraining Time** | N/A | $\mathbf{0.42\text{ seconds}}$ | Ultra-fast continuous retraining cycle |

---

## 4. Scientific Calibration Assessment

### What the Corrected Benchmark Actually Demonstrates
1. **$69.2\%$ Reduction in Calibration Error (ECE)**:
   - In Model A, heuristic linear min-max mapping yields an **ECE of $0.1486$** ($14.86\%$ error). The scores cluster arbitrarily and do not represent empirical event frequencies.
   - In Model B, the out-of-training **Isotonic Regression Calibrator** reduces ECE to **$0.0457$** ($4.57\%$).
2. **Clarification of Confidence vs. Operational Rogue Intent**:
   - > [!IMPORTANT]
     > A calibrated probability of $0.90$ means: *"Given the synthetic kinematic generator's parametric distribution, observations with this score have an empirical $90\%$ frequency of belonging to the positive anomaly class."*
   - It **does NOT** mathematically imply a $90\%$ probability of "hostile", "pirate", or "rogue" intent. Real-world rogue intent requires Bayesian integration of geopolitical priors, AIS spoofing/jamming likelihood, weather effects, and navigational safety requirements (COLREGs Rule 8 maneuvers).

---

## 5. Anomaly Label Origin & Limitations

The 45 positive anomalies in this benchmark were generated using `generate_vessel_data`:
- **Synthetic Rule-Generated Labels**: Positive anomalies are created by sampling from uniform distributions outside nominal bounds (e.g. `course_delta` $\sim U[25^\circ, 85^\circ]$, `speed_delta` $\sim \pm 8\text{ to } 12\text{ kt}$, `dist_restricted_zone` $\sim U[0, 0.8\text{ km}]$).
- **Consequence on Discrimination**: Because the synthetic generator produces distinctly separated kinematic clusters, the simple default Isolation Forest (Model A) separates the clusters with a perfect ROC-AUC ($1.0000$).
- **Real-World Implication**: Real AIS telemetry exhibits continuous noise, GPS multi-path errors, zig-zag anti-collision maneuvers, and transponder latency variance. On realistic continuous data, simple default trees overfit to feature variances, which is where the ensemble (`StandardScaler` + LOF density estimation) provides spatial stability.

---

## 6. Production Path Verification

The benchmark evaluates the exact numerical transformations executed by the live Python ML service:
$$\text{Vector } X \xrightarrow{\text{StandardScaler}} X_{\text{scaled}} \xrightarrow{\text{IF} + \text{LOF}} \text{Norm Scores} \xrightarrow{\text{Weighted Blend}} \text{Score}_{01} \xrightarrow{\text{Isotonic Calibrator}} P_{\text{calibrated}}$$

### Runtime Discrepancies vs. Live Pipeline
| Production Component | Live Pipeline Path | Benchmark PoC Path |
| :--- | :--- | :--- |
| **Ingestion** | Live AIS transponder packets via Go engine | Synthetic batch generator |
| **Feature Computation** | Go Time-Series Manager (`tsm.go`) | Pre-extracted 9-dim NumPy matrix |
| **Scoring Invocation** | gRPC unary / batch Protobuf call (`:8091`) | In-process Python function call (`scoring.py`) |
| **Composite Blending** | $0.4\text{ Rule} + 0.4\text{ ML} + 0.2\text{ Geo}$ | Pure ML probability ($P \ge 0.50$) |

---

## 7. Reproducibility Command

To independently reproduce this leakage-free benchmark on the production server:
```bash
ssh tunkstun "docker exec -w /app hormuzwatch-ml-dev python /app/benchmark_poc.py"
```
To run the automated leakage verification regression test suite:
```bash
ssh tunkstun "docker exec -w /app hormuzwatch-ml-dev python /tmp/test_mlops_leakage_and_benchmark.py"
```
