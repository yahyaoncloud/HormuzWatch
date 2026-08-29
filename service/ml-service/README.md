# 🧠 HormuzWatch Machine Learning Service (`service/ml-service/`)

The ML Service is a Python 3.11 asynchronous anomaly detection and risk scoring ensemble engine. It exposes both a **FastAPI HTTP API (Port 8090)** and a **high-throughput gRPC Service (Port 8091)**.

---

## 🔬 6-Model Ensemble Architecture

1. **Vessel Track Anomaly Detector** (`models/vessel`):
   - Isolation Forest + DBSCAN anomaly scoring on maritime AIS kinematics (speed over ground, course variations, draft discrepancies).
2. **Aviation Threat Classifier** (`models/aviation`):
   - ADS-B transponder squawk analysis, military flight profile detection, and airspace corridor deviation scoring.
3. **Geospatial Heatmap Density Engine** (`models/heatmap`):
   - Kernel Density Estimation (KDE) over historical shipping lanes vs. current traffic corridors.
4. **GDELT Geopolitical NLP Sentiment Analyzer** (`models/news`):
   - Transformer-based sentiment & conflict event extraction from Middle East news wires.
5. **Strait Transit Time-Series Estimator** (`models/transit`):
   - Gradient-boosted regression estimating bottleneck wait times and choke-point congestion.
6. **Blockade Probability Predictor** (`models/blockade`):
   - Multi-factor XGBoost classifier computing live blockade and disruption probability.

---

## 📡 Dual Protocol Endpoints

### 1. HTTP / REST (`:8090`)
- `GET /health` — Service health and loaded ensemble model status (HTTP 200 OK)
- `POST /predict/anomaly` — Synchronous vessel anomaly evaluation
- `POST /predict/blockade` — Regional blockade risk probability scoring
- `GET /metrics` — Prometheus metrics export

### 2. gRPC RPCs (`:8091`)
- `DetectVesselAnomaly(VesselTelemetryRequest) -> AnomalyResponse`
- `PredictBlockadeRisk(RegionalFeaturesRequest) -> RiskResponse`
- `BatchAnalyzeTracks(TrackBatchRequest) -> BatchAnomalyResponse`

---

## 🛠️ Local Development & Testing

```bash
# Set up virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run PyTest suite
pytest tests/

# Launch service locally (FastAPI on 8090, gRPC on 8091)
python service_entrypoint.py
```
