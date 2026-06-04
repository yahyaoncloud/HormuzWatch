import time
from fastapi import FastAPI, HTTPException
from schemas import PredictRequest, PredictResponse, TrainRequest, TrainResponse
from model import AnomalyModel

app = FastAPI(title="HormuzWatch ML Service", version="1.0.0")
model = AnomalyModel()

@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    start = time.perf_counter()
    features = req.features.model_dump()
    score, is_anomaly, confidence, explanation = model.predict(features, explain=req.explain)
    elapsed_ms = (time.perf_counter() - start) * 1000

    return PredictResponse(
        track_id=req.track_id,
        anomaly_score=score,
        is_anomaly=is_anomaly,
        confidence=confidence,
        model_version=model.version,
        inference_time_ms=round(elapsed_ms, 2),
        explanation=explanation,
    )

@app.post("/train", response_model=TrainResponse)
async def train(req: TrainRequest):
    if len(req.data) < 50:
        raise HTTPException(400, "Need at least 50 samples to train")
    version = model.train(req.data, req.contamination)
    return TrainResponse(
        status="trained",
        model_version=version,
        n_samples=len(req.data),
        contamination=req.contamination,
    )

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": model.model is not None,
        "model_version": model.version,
    }
