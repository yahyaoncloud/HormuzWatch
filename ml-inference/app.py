from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
import json
import logging
from api.predict import handler

from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import Resource
import os

logger = logging.getLogger("hormuzwatch.app")

resource = Resource.create({"service.name": "ml-inference", "deployment.environment": os.getenv("ENV", "production")})
provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(OTLPSpanExporter(endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317"), insecure=True))
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

app = FastAPI(
    title="HormuzWatch ML Inference API",
    description="Render-hosted wrapper for the HormuzWatch ML anomaly detection ensemble.",
    version="1.0.0"
)
FastAPIInstrumentor.instrument_app(app)

# A mock object to satisfy the Vercel request handler signature
class VercelMockRequest:
    def __init__(self, method: str, body: bytes, headers: dict):
        self.method = method
        self.body = body
        self.headers = headers

@app.post("/api/predict")
async def predict(request: Request):
    """
    Passes the FastAPI request to the existing Vercel handler logic.
    """
    body_bytes = await request.body()
    mock_req = VercelMockRequest(
        method=request.method,
        body=body_bytes,
        headers=dict(request.headers)
    )
    
    # Call the original ML prediction logic
    resp = handler(mock_req)
    
    status_code = resp.get("statusCode", 500)
    body_str = resp.get("body", "{}")
    headers = resp.get("headers", {})
    
    try:
        content = json.loads(body_str)
    except json.JSONDecodeError:
        content = {"error": "Failed to decode response"}
        
    return JSONResponse(status_code=status_code, content=content, headers=headers)

@app.get("/health")
def health():
    return {"status": "healthy", "service": "ml-inference-render"}
