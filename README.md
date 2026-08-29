# 🌊 HormuzWatch — Maritime & Geospatial Intelligence Platform

HormuzWatch is an open-source real-time geospatial tracking, risk prediction, and anomaly detection intelligence platform monitoring the **Strait of Hormuz** and the broader Persian Gulf region.

The platform ingests live AIS maritime telemetry, OpenSky aviation feeds, GDELT geopolitical news events, and satellite SAR anomalies to generate threat assessments, blockade predictions, and geospatial heatmaps.

---

## 🏛️ System Architecture & Repository Layout

The repository is organized into cleanly isolated tiers:

```
HormuzWatch/
├── client/                     # React 19 + React Router v7 SPA (Vite, Tailwind, MapLibre GL)
│   ├── src/                    # UI Components, Leaflet/MapLibre maps, Stores
│   ├── Dockerfile              # Production Nginx multi-stage build (Port 3000)
│   ├── nginx.conf              # SPA routing & Go API reverse proxy
│   └── vercel.json             # Vercel SPA deployment configuration
│
├── server/                     # Go 1.24+ High-Performance REST & WebSocket Backend
│   ├── cmd/                    # Entrypoint (hormuz-server)
│   ├── internal/               # API handlers, intelligence pipeline, auth, db, geo
│   ├── data/                   # Historical attack datasets & GIS land masks
│   ├── templates/              # LaTeX report generation templates
│   └── Dockerfile              # Minimal Alpine production container (Port 10020)
│
├── service/                    # Infrastructure & Platform Services
│   ├── cloudflared/            # Cloudflare Tunnel ingress configurations
│   ├── ml-service/             # Python 3.11 FastAPI & gRPC 6-model ML anomaly ensemble
│   │   ├── app/                # Ensemble models (Vessel, Aviation, Heatmap, News, etc.)
│   │   ├── service_entrypoint.py # FastAPI (:8090) & gRPC (:8091) runner
│   │   └── Dockerfile          # Python 3.11 ML container
│   ├── sre/                    # SRE CLI tool in Go & Bash for monitoring & chaos tests
│   │   ├── main.go             # Go SRE CLI implementation
│   │   └── sre.sh              # Bash execution wrapper
│   └── observability/          # Dev Observability Stack (Prometheus & Grafana)
│       ├── prometheus.yml      # Prometheus metrics scraper config
│       ├── dashboards/         # Pre-provisioned Grafana SRE dashboards
│       └── docker-compose.observability.yml # Prometheus (:9090) & Grafana (:3001)
│
├── .github/workflows/          # 4 Dedicated Automated CI/CD Pipelines
│   ├── service-pipeline.yml    # Ingress & Cloudflare Tunnel deployment
│   ├── ml-service-pipeline.yml # Python ML testing & container updates
│   ├── server-pipeline.yml     # Go testing, Docker build & backend deployment
│   └── client-pipeline.yml     # TypeScript check, Vite build & Vercel deployment
│
├── docker-compose.yml          # Production container orchestration
└── docker-compose.dev.yml      # Local development compose stack with hot-reload
```

---

## 🚀 Live Production MVP Endpoints

Deployed on workstation `tunkstun` (`192.168.1.51`) routed via Cloudflare Zero-Trust Tunnel and Vercel:

| Tier | Endpoint | Description |
| :--- | :--- | :--- |
| **Client Web SPA** | [https://hormuzwatch.aburcloud.com](https://hormuzwatch.aburcloud.com) | Production Web Dashboard (Nginx) |
| **Vercel Client** | [https://hormuzwatch.vercel.app](https://hormuzwatch.vercel.app) | Production Edge SPA (Vercel) |
| **Backend REST API** | [https://api.hormuzwatch.aburcloud.com](https://api.hormuzwatch.aburcloud.com/health) | Go API & WebSocket Stream |
| **ML Inference Service** | [https://ml.hormuzwatch.aburcloud.com](https://ml.hormuzwatch.aburcloud.com/health) | FastAPI ML Engine |
| **Grafana SRE Dashboard** | `http://192.168.1.51:3001` | SRE Vital Signs & Telemetry Graphs |
| **Prometheus Metrics** | `http://192.168.1.51:9090` | Prometheus Time-Series Scraper |

---

## 🛠️ Developer Quickstart

### 1. Run Complete Local Dev Stack
```bash
# Start Server, ML Engine, and Client in Dev Mode
docker compose -f docker-compose.dev.yml up -d

# Verify all services are healthy
./service/sre/sre.sh health
```

### 2. SRE & Observability CLI
HormuzWatch includes a built-in SRE CLI in Go (`service/sre/`):
```bash
# Multi-tier health check across all services & cloudflare edge
./service/sre/sre.sh health

# Fault-tolerance & resilience benchmark (SLO score, P50/P99 latency)
./service/sre/sre.sh tolerance -requests 100 -concurrency 10

# Real-time multi-container colorized logs
./service/sre/sre.sh logs

# Live terminal TUI vital signs monitor
./service/sre/sre.sh monitor

# Start Prometheus (:9090) & Grafana (:3001) SRE dashboards
./service/sre/sre.sh obs-up
```

---

## 🔄 CI/CD Pipelines

Automated GitHub Actions workflows are configured in `.github/workflows/`:
- **`client-pipeline.yml`**: Validates TypeScript, compiles Vite bundle, and deploys to Vercel (`hormuzwatch.vercel.app`).
- **`server-pipeline.yml`**: Runs Go tests, compiles `hormuz-server`, builds Docker container, and deploys to `tunkstun`.
- **`ml-service-pipeline.yml`**: Runs PyTest suite, validates model serialization, and updates `hormuzwatch-ml` on `tunkstun`.
- **`service-pipeline.yml`**: Validates Cloudflare Tunnel configuration and reloads edge service.

---

## 📜 License
Apache-2.0 License.
