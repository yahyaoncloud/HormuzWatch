# HormuzWatch — Gulf Intelligence Platform

Real-time geospatial surveillance, multi-source news intelligence, and ensemble anomaly detection for strategic maritime regions.

**Stack:** Go · Python (ROCm GPU) · React 19 · Supabase · Cloudflare Tunnel

---

## Architecture

```
 16 News Sources (RSS)       AISStream / OpenSky       Python ML (GPU)
        │                         │                        │
        ▼                         ▼                        ▼
 ┌──────────────┐    ┌──────────────────────┐    ┌─────────────────┐
 │  Scheduler   │    │   WebSocket Stream   │    │  Ensemble       │
 │  (15 min)    │    │   (real-time)        │    │  IF + LOF +     │
 │  Worker Pool │    │                      │    │  XGBoost (GPU)  │
 └──────┬───────┘    └──────────┬───────────┘    └────────┬────────┘
        │                       │                         │
        ▼                       ▼                         ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │                     Go Backend (:10020)                          │
 │  Gin REST API  ·  WebSocket Hub  ·  gRPC Client  ·  JWT Auth   │
 └─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
 ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
 │  Supabase    │    │  Cloudflare  │    │  React Frontend  │
 │  PostgreSQL  │    │  Tunnel      │    │  (client-v2)     │
 │              │    │  (public)    │    │  :5173 dev       │
 └──────────────┘    └──────────────┘    └──────────────────┘
```

---

## Quick Start

### Prerequisites
- Go 1.23+, Python 3.11+, Node.js 20+
- Supabase project (PostgreSQL)

### Setup

```bash
git clone https://github.com/your-org/HormuzWatch.git
cd HormuzWatch

# Environment
cp .env.example .env   # Edit with Supabase credentials

# Build & start (Windows)
.\scripts\manage.ps1 build
.\scripts\manage.ps1 start

# Build & start (Linux)
chmod +x scripts/manage.sh
./scripts/manage.sh venv
./scripts/manage.sh build
./scripts/manage.sh start
```

### Access

| Service | URL |
|---------|-----|
| Frontend (dev) | http://localhost:5173 |
| Go Backend | http://localhost:10020 |
| Python ML | http://localhost:8090 |
| Health Check | http://localhost:10020/health |
| Pipeline Status | http://localhost:10020/public/news/pipeline/status |

---

## Components

### Go Backend (`server/`)
- **16 RSS intelligence sources** — WAM, SPA, KUNA, IRNA, USNI, UKMTO, IMO, Maritime Executive...
- **7-step ML pipeline** per article — clean → dedup → language → entities → classify → features → score
- **4-phase coordinate extraction** — regex decimal → DMS → entity geocode → country centroid
- **Pipeline state machine** — tracks every article through QUEUED → SCORED → GEOCODED → STORED → DONE
- **REST API** — 15 endpoints with unified `{data, total}` response format
- **Health monitoring** — DB ping, WebSocket status, component health

### Python ML Service (`ml-service/`)
- **Ensemble anomaly scoring** — IsolationForest + LOF + XGBoost
- **4 domains** — vessel (9 features), aviation (9), heatmap (4), news (18)
- **AMD GPU support** — ROCm 6.1+ with PyTorch, CuPy, XGBoost GPU
- **CLI management** — `python ml_cli.py [serve|status|stop|train|models|predict]`
- **Training script** — `python train_gpu.py --domain vessel` with GPU/CPU auto-detection

### React Frontend (`client-v2/`)
- React 19 + React Router v8 + Tailwind CSS v4
- Admin dashboard with live pipeline metrics
- Leaflet map with vessel/aircraft tracking + news geo-overlay
- Supabase auth (admin-only login)
- Real-time WebSocket updates

### DevOps
- **GitHub Actions** — auto-build on push to main (Windows + Linux workflows)
- **Cloudflare Tunnel** — public serving via `api.hormuzwatch.app`
- **systemd services** — Linux auto-start with dedicated `hormuzwatch` user
- **Windows Task Scheduler** — auto-start on boot via `scripts/manage.ps1`

---

## Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health (DB ping, WS status) |
| GET | `/public/news/latest` | Latest scored articles |
| GET | `/public/news/heatmap` | Geo-tagged articles for map display |
| GET | `/public/news/pipeline/status` | Pipeline state metrics |
| GET | `/public/events` | Intelligence events timeline |
| GET | `/public/threats` | Active threat board |
| GET | `/public/tracks/active` | Real-time vessel/aircraft positions |
| WS | `/ws/stream` | WebSocket telemetry + anomaly stream |
| POST | `/auth/login` | Admin JWT login (Supabase) |

---

## Project Structure

```
HormuzWatch/
├── server/                    # Go backend
│   ├── cmd/main.go           # Entry point — wires all layers
│   ├── internal/
│   │   ├── intelligence/     # News pipeline + ML bridge
│   │   │   ├── news/         # 15 files — scorer, cleaner, dedup, entities, coords...
│   │   │   └── source/       # 6 files — RSS, API, scraper, 16 Gulf sources
│   │   ├── scheduler/        # Periodic job runner (15-min RSS refresh)
│   │   ├── worker/           # Bounded goroutine pool (4 workers, rate-limited)
│   │   ├── api/              # REST handlers (news, events, threats, health...)
│   │   ├── db/               # PostgreSQL schema + queries
│   │   ├── websocket/        # Real-time telemetry hub
│   │   └── auth/             # JWT + Supabase admin auth
│   └── DESIGN.md             # Low-level design document
├── ml-service/                # Python ML service
│   ├── app.py                # FastAPI (health, train, predict)
│   ├── ml_cli.py             # CLI manager (serve, status, stop, train)
│   ├── train_gpu.py          # GPU-accelerated training
│   ├── lib/                  # Scoring, features, logging
│   ├── models/               # .joblib model bundles
│   └── requirements-gpu.txt  # ROCm GPU dependencies
├── client-v2/                 # React frontend
│   ├── src/
│   │   ├── app/routes/       # admin/, auth/, public/ route groups
│   │   ├── lib/api.ts        # Typed API client (all 15 endpoints)
│   │   └── environments/     # Centralized config
│   └── PIPELINE_FRONTEND_GUIDE.md
├── scripts/                   # Service management
│   ├── manage.ps1            # Windows (PowerShell)
│   └── manage.sh             # Linux (bash + systemd)
├── .github/workflows/         # CI/CD
│   ├── backend-ci.yml        # Windows self-hosted
│   └── backend-ci-linux.yml  # Linux (ubuntu-latest)
├── docs/                      # Documentation
│   ├── LINUX_DEPLOYMENT.md   # Full Linux deployment + GPU setup
│   ├── MIGRATION_WINDOWS_TO_LINUX.md
│   ├── DEVOPS.md             # Operations runbook
│   ├── architecture/         # Architecture diagrams
│   └── plan/                 # Future plans
├── terraform/                 # Azure infrastructure (IaC)
├── proto/                     # gRPC service definitions
└── infra-observability/       # Prometheus, Fluent Bit, OTEL
```

---

## Documentation Index

| Document | Content |
|----------|---------|
| [server/DESIGN.md](server/DESIGN.md) | Low-level design — pipeline, scoring, state machine, data model |
| [docs/DEVOPS.md](docs/DEVOPS.md) | Operations — Cloudflare Tunnel, CI/CD, monitoring, runbooks |
| [docs/LINUX_DEPLOYMENT.md](docs/LINUX_DEPLOYMENT.md) | Linux deployment — systemd, ROCm GPU, firewall, verification |
| [docs/MIGRATION_WINDOWS_TO_LINUX.md](docs/MIGRATION_WINDOWS_TO_LINUX.md) | Windows → Linux migration guide |
| [client-v2/PIPELINE_FRONTEND_GUIDE.md](client-v2/PIPELINE_FRONTEND_GUIDE.md) | Frontend API utilization guide |
| [ARCHITECTURE.md](ARCHITECTURE.md) | High-level system architecture |
| [TODO.md](TODO.md) | Implementation roadmap |

---

## Technologies

**Backend:** Go 1.23 · Gin · PostgreSQL (Supabase) · gRPC · WebSocket · JWT
**ML:** Python 3.11 · PyTorch (ROCm) · CuPy · XGBoost · scikit-learn · FastAPI
**Frontend:** React 19 · TypeScript · React Router v8 · Tailwind CSS v4 · Leaflet · TanStack Query
**Infrastructure:** Cloudflare Tunnel · GitHub Actions · systemd · Docker · Terraform (Azure)

---

**Updated:** July 2026
