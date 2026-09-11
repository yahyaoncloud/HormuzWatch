# 🧪 HormuzWatch ML Experimentation & Model Refinement Laboratory (`/exp`)

Welcome to the **HormuzWatch Experimentation Lab**. This directory is an isolated environment dedicated to exploratory data science, model architecture prototyping, Bayesian hyperparameter optimization (Optuna), slice evaluation, calibration tuning, and rigorous pre-deployment testing.

---

## 1. Purpose & Guiding Principles

1. **Isolation from Production Serving**: Production models in `service/ml-service/models/` are never directly overwritten during experimental iterations. Models must be rigorously refined, calibrated, and tested in `/exp` first.
2. **The 10-Step MLOps Baseline**: All model prototypes must satisfy the 10-step MLOps engineering criteria (Data Contracts, Entity-Stratified Splitting, Baseline Comparison, Bayesian HPO, Isotonic Calibration, and Slice Testing).
3. **Automated Quality Promotion Gate**: A candidate model can only be promoted to production if:
   - $F_1 \ge 0.40$ and $\text{Recall} \ge 0.30$ (eliminating the legacy zero-recall defect).
   - Expected Calibration Error $\text{ECE} \le 0.12$.
   - Inference latency $\le 1.0\text{ ms/sample}$ on CPU SIMD.
   - Cryptographic SHA-256 integrity manifest is generated.

---

## 2. Directory Layout

```
exp/
├── README.md                  # Laboratory guidelines and execution procedures
├── notebooks/                 # Interactive Jupyter notebooks for EDA and research
│   ├── 01_maritime_vessel_anomaly.ipynb
│   ├── 02_aviation_anomaly.ipynb
│   ├── 03_chokepoint_blockade_transit.ipynb
│   ├── 04_geopolitical_news_and_conflict.ipynb
│   ├── 05_geospatial_heatmap_fusion.ipynb
│   ├── 06_statistical_drift_and_ct_loop.ipynb
│   ├── colab_deploy.ipynb
│   └── ml_anomaly_detection_experiments.ipynb
├── scripts/                   # Model refinement, HPO, and promotion automation
│   ├── refine_models.py       # End-to-end model training, threshold tuning & evaluation
│   └── promote_models.py      # Promotion of tested candidate models into production
├── tests/                     # Automated testing suite for candidate models
│   └── test_model_refinements.py
├── models/                    # Experimental candidate artifacts (.joblib)
└── reports/                   # Performance benchmarks, confusion matrices & slice evaluations
```

---

## 3. Workflow & How to Run

### Step 1: Run Full Refinement and Calibration
```bash
docker run --rm -u 0 -v $(pwd):/app -w /app \
  -e PYTHONPATH=/app/service/ml-service:/app/mlops:/app/exp \
  hormuzwatch-ml:dev python3 exp/scripts/refine_models.py
```

### Step 2: Run Rigorous Model Test Suite
```bash
docker run --rm -u 0 -v $(pwd):/app -w /app \
  -e PYTHONPATH=/app/service/ml-service:/app/mlops:/app/exp \
  hormuzwatch-ml:dev pytest exp/tests/test_model_refinements.py -v
```

### Step 3: Promote Validated Models to Production
```bash
python3 exp/scripts/promote_models.py
```
