# HormuzWatch — Infrastructure Observability

## Stack

| Component | Port | Purpose |
|-----------|------|---------|
| Prometheus | `:9090` | Metrics collection + alerting |
| Grafana | `:3000` | Dashboards (anomaly rates, API latency, pipeline health) |
| OpenSearch | `:9200` | Centralized log storage + search |
| Jaeger | `:16686` | Distributed tracing (Go → Python gRPC calls) |
| OTEL Collector | `:4317` (gRPC), `:4318` (HTTP) | OpenTelemetry ingestion gateway |
| Fluent Bit | — | Log tailing + forwarding to OpenSearch |

## Architecture

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Go Server│     │ Python ML│     │  Nginx   │
│ :10020   │     │ :8090    │     │  :3000   │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │ logs           │ logs           │ access logs
     ▼                ▼                ▼
┌────────────────────────────────────────────┐
│              Fluent Bit                     │
│  (tail + parse + forward)                  │
└──────────────────┬─────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────┐
│            OpenSearch (:9200)              │
│  (indexed logs, full-text search)          │
└────────────────────────────────────────────┘

┌──────────┐     ┌──────────┐
│ Go Server│     │ Python ML│
│ metrics  │     │ metrics  │
│ /metrics │     │ /metrics │
└────┬─────┘     └────┬─────┘
     │                │
     ▼                ▼
┌────────────────────────────────────────────┐
│        OTEL Collector (:4317/:4318)         │
│  (ingest → process → export)               │
└──────────────────┬─────────────────────────┘
                   │
     ┌─────────────┼─────────────┐
     ▼             ▼             ▼
┌─────────┐  ┌──────────┐  ┌──────────┐
│Prometheus│ │  Jaeger  │  │OpenSearch│
│ :9090   │  │  :16686  │  │ :9200    │
└─────────┘  └──────────┘  └──────────┘
     │
     ▼
┌─────────┐
│ Grafana │
│ :3000   │
└─────────┘
```

## Quick Start

```bash
cd infra-observability
docker compose up -d
```

## Access

| UI | URL | Credentials |
|----|-----|-------------|
| Grafana | http://localhost:3000 | admin / hormuzshield |
| Jaeger | http://localhost:16686 | none |
| Prometheus | http://localhost:9090 | none |
| OpenSearch | http://localhost:9200 | admin / HormuzShield-Dev-Only-ChangeMe1! |

## Prometheus Metrics

### Go Backend (`GET /metrics`)

| Metric | Type | Description |
|--------|------|-------------|
| `hormuzwatch_articles_total` | Counter | Total articles processed |
| `hormuzwatch_articles_failed` | Counter | Failed article processing |
| `hormuzwatch_articles_duplicate` | Counter | Duplicate articles skipped |
| `hormuzwatch_sources_errored` | Gauge | Sources currently in error state |
| `hormuzwatch_ws_connections` | Gauge | Active WebSocket connections |
| `hormuzwatch_api_requests_total` | Counter | API requests (by endpoint) |
| `hormuzwatch_api_latency_seconds` | Histogram | API response latency |
| `hormuzwatch_db_ping_ms` | Gauge | Database ping latency |
| `hormuzwatch_pipeline_in_flight` | Gauge | Articles currently in pipeline |

### Python ML (`GET /metrics`)

| Metric | Type | Description |
|--------|------|-------------|
| `ml_inference_total` | Counter | Total predictions served |
| `ml_inference_latency_seconds` | Histogram | Inference latency |
| `ml_models_loaded` | Gauge | Number of loaded model bundles |
| `ml_gpu_temp_celsius` | Gauge | GPU temperature (ROCm) |
| `ml_gpu_vram_used_bytes` | Gauge | GPU VRAM usage |

## Grafana Dashboards

Import pre-built dashboards from `grafana/dashboards/`:

1. **Pipeline Overview** — articles processed, source health, error rates
2. **API Performance** — request rates, P50/P95/P99 latency, error %
3. **ML Model Health** — inference latency, GPU temp/VRAM, model versions
4. **AIS Track Health** — active vessels, anomaly rates, geo distribution

## Fluent Bit Configuration

File: `infra-observability/fluent-bit.conf`

Logs are collected from:
- `build/logs/server.log` — Go backend structured logs
- `build/logs/ml-service.log` — Python ML logs
- Nginx access/error logs (when containerized)

Parsed fields:
- `timestamp` — ISO 8601
- `level` — INFO, WARN, ERROR, DEBUG
- `service` — server, ml, nginx
- `message` — log line content

## Alerts

### Prometheus Alert Rules

```yaml
# hormuzwatch_alerts.yml
groups:
  - name: hormuzwatch
    rules:
      - alert: PipelineBacklog
        expr: hormuzwatch_pipeline_in_flight > 100
        for: 10m
        annotations:
          summary: "Pipeline backlog exceeds 100 articles"

      - alert: SourceFailure
        expr: hormuzwatch_sources_errored > 5
        for: 15m
        annotations:
          summary: "More than 5 sources in error state"

      - alert: HighGPU
        expr: ml_gpu_temp_celsius > 85
        for: 5m
        annotations:
          summary: "GPU temperature exceeds 85C"

      - alert: ServiceDown
        expr: up == 0
        for: 2m
        annotations:
          summary: "Service is unreachable"
```
