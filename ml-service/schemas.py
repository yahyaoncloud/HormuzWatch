from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class FeatureExplanation(BaseModel):
    feature: str
    shap_value: float
    direction: str

class Explanation(BaseModel):
    top_features: List[FeatureExplanation]
    isolation_depth: Optional[float] = None

class FeatureInput(BaseModel):
    course_delta: float = Field(ge=0, le=360)
    heading_delta: float = Field(ge=-180, le=180)
    speed_delta: float = Field()
    average_speed: float = Field(ge=0)
    speed_variance: float = Field(ge=0)
    ais_gap_minutes: float = Field(ge=0)
    dist_restricted_zone: float = Field(ge=0)
    dist_historical_site: float = Field(ge=0)

class PredictRequest(BaseModel):
    track_id: str
    features: FeatureInput
    explain: bool = False

class PredictResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    track_id: str
    anomaly_score: float = Field(ge=0, le=100)
    is_anomaly: bool
    confidence: float = Field(ge=0, le=1)
    model_version: str
    inference_time_ms: float
    explanation: Optional[Explanation] = None

class TrainRequest(BaseModel):
    data: List[Dict[str, float]]  # List of feature dictionaries
    contamination: float = Field(default=0.05, ge=0.01, le=0.5)

class TrainResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    status: str
    model_version: str
    n_samples: int
    contamination: float
