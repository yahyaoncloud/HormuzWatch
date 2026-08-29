# 🚀 HormuzWatch Backend Server (`server/`)

The HormuzWatch backend is a high-throughput, low-latency Go service responsible for ingesting live telemetry streams, orchestrating ML anomaly detection, maintaining stateful track histories, and serving real-time REST and WebSocket endpoints.

---

## 🏗️ Architecture & Packages

```
server/
├── cmd/                        # Application entrypoints
│   └── main.go                 # Main daemon bootstrap
├── internal/
│   ├── api/                    # REST HTTP route handlers & middleware
│   ├── auth/                   # JWT & API key authentication
│   ├── bootstrap/              # Subsystem lifecycle (Router, App, Config)
│   ├── config/                 # Environment & admin configuration
│   ├── datasets/               # Automated telemetry persistence
│   ├── db/                     # PostgreSQL (Supabase) connection pool & queries
│   ├── geo/                    # Geospatial algorithms, land masks, distance math
│   ├── heatmap/                # Geospatial density grid generation
│   ├── integrations/           # Live background stream workers (AIS, OpenSky, GDELT)
│   ├── intelligence/           # Intelligence Pipeline & gRPC ML Client
│   ├── observability/          # Prometheus metrics handler & structured logger
│   ├── pdf/                    # Automated LaTeX-to-PDF report generator
│   ├── scheduler/              # Cron-like background task scheduler
│   ├── version/                # Build time & git commit versioning metadata
│   ├── websocket/              # Real-time WebSocket hub & client connection pool
│   └── worker/                 # High-concurrency worker pool
├── data/                       # Pre-loaded GIS land masks & historical attack data
├── templates/                  # LaTeX intelligence report templates
└── Dockerfile                  # Multi-stage Alpine production container
```

---

## 📡 API Endpoints

### 1. Public Streaming & Health
- `GET /health` — Multi-tier healthcheck (Database latency, ML circuit breaker, WebSocket status)
- `GET /health/live` — Liveness probe (HTTP 200 OK)
- `GET /health/ready` — Readiness probe (Checks database and memory status)
- `GET /metrics` — Native Prometheus text-format metrics exporter
- `GET /debug/vars` — Standard Go expvar metrics
- `GET /public/stream` — Real-time Server-Sent Events (SSE) vessel & flight updates
- `GET /public/top-traces` — Live high-priority tracks in the Strait of Hormuz

### 2. Real-Time WebSocket
- `GET /ws/stream` — Bidirectional WebSocket stream for map subscribers

### 3. Intelligence & Reporting
- `GET /api/v1/intelligence/assessment` — Latest aggregate threat score and blockade risk
- `GET /api/v1/intelligence/report/pdf` — Dynamic LaTeX-generated PDF intelligence dossier
- `GET /api/v1/heatmaps/density` — 2D geospatial traffic density tiles

---

## ⚙️ Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Listening HTTP port | `10020` |
| `DATABASE_URL` | Supabase / PostgreSQL connection string | `""` |
| `ML_SERVICE_URL` | Python ML gRPC address | `localhost:8091` |
| `AISSTREAM_API_KEY` | AISStream.io live maritime WebSocket key | `""` |
| `OPENSKY_USERNAME` | OpenSky Network aviation API user | `""` |
| `OPENSKY_PASSWORD` | OpenSky Network aviation API password | `""` |
| `JWT_SECRET` | Secret key for JWT session signing | `""` |

---

## 🧪 Local Testing & Build

```bash
# Run unit & integration tests
go test -v ./...

# Build local binary
go build -o bin/hormuz-server ./cmd/

# Run local development server
./bin/hormuz-server
```
