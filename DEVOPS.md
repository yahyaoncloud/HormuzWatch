# HormuzWatch — DevOps Pipeline & Operations Guide

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Service Topology](#2-service-topology)
3. [Cloudflare Tunnel](#3-cloudflare-tunnel)
4. [GitHub Actions CI/CD](#4-github-actions-cicd)
5. [Windows Background Services](#5-windows-background-services)
6. [Python ML Service](#6-python-ml-service)
7. [Health Monitoring](#7-health-monitoring)
8. [Unified Management CLI](#8-unified-management-cli)
9. [Deployment Workflow](#9-deployment-workflow)
10. [Troubleshooting](#10-troubleshooting)
11. [Operations Runbook](#11-operations-runbook)

---

## 1. Architecture Overview

```
                            INTERNET
                                │
                         ┌──────▼──────┐
                         │  Cloudflare  │
                         │   Tunnel     │  api.hormuzwatch.app → localhost:10020
                         │  (cloudflared)│
                         └──────┬──────┘
                                │
                    ┌───────────┴───────────┐
                    │   Windows Machine     │
                    │                       │
                    │  ┌─────────────────┐  │
                    │  │  Go Backend     │  │  :10020  REST API + WebSocket
                    │  │  hormuz-server  │  │
                    │  │  (background)   │  │
                    │  └───────┬─────────┘  │
                    │          │ gRPC       │
                    │  ┌───────▼─────────┐  │
                    │  │  Python ML      │  │  :8090  FastAPI (health/train/predict)
                    │  │  ml_cli serve   │  │  :8091  gRPC (inference)
                    │  │  (background)   │  │
                    │  └───────┬─────────┘  │
                    │          │            │
                    │  ┌───────▼─────────┐  │
                    │  │  Supabase       │  │  PostgreSQL (cloud)
                    │  │  (PostgreSQL)   │  │
                    │  └─────────────────┘  │
                    │                       │
                    │  ┌─────────────────┐  │
                    │  │  GitHub Actions │  │  Auto-build on push to main
                    │  │  Runner (local) │  │
                    │  └─────────────────┘  │
                    └───────────────────────┘
```

**Port assignments:**

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Go Backend | `10020` | HTTP/WS | REST API, WebSocket streams, admin UI API |
| Python ML FastAPI | `8090` | HTTP | Health checks, training, prediction, model listing |
| Python ML gRPC | `8091` | gRPC | Low-latency inference (Go → Python) |
| Cloudflare Tunnel | — | TCP | Forwards `api.hormuzwatch.app` → `localhost:10020` |

---

## 2. Service Topology

### Go Backend (`server/cmd/main.go` → `build/hormuz-server.exe`)

- **Framework:** Gin (HTTP), gorilla/websocket (WS)
- **Database:** Supabase PostgreSQL via pgx pool (10 max conns, 1 min)
- **Scheduler:** 15-min RSS refresh, 30-min API refresh (4 worker goroutines, rate-limited 2/sec)
- **ML Bridge:** gRPC client to Python service (`GRPC_ADDR` env var, default `localhost:8091`)
- **Graceful shutdown:** SIGINT/SIGTERM → close gRPC → close DB pool → exit
- **Health:** `GET /health` → DB ping + WebSocket status + version

### Python ML Service (`ml-service/app.py` + `ml_cli.py`)

- **Framework:** FastAPI (health/train/predict), gRPC (inference)
- **Models:** IsolationForest + LOF ensemble per domain (vessel, aviation, heatmap, news)
- **Storage:** `.joblib` bundles in `ml-service/models/`
- **CLI:** `python ml_cli.py [serve|status|stop|train|models|predict]`
- **Health:** `GET /health` → uptime, models loaded, ports

### Supabase (Cloud PostgreSQL)

- **Project ref:** `dipuwvlnauqkjrqcfeqw`
- **Connection:** pgx pool via `DATABASE_URL` env var
- **Tables:** sources, articles, entities, content_hashes, scrape_jobs, events, countries, tracks, anomalies

---

## 3. Cloudflare Tunnel

### Setup (One-Time)

```powershell
# 1. Install cloudflared
winget install Cloudflare.cloudflared

# 2. Authenticate
cloudflared tunnel login
# → Opens browser, authorize with Cloudflare account

# 3. Create tunnel
cloudflared tunnel create hormuzwatch
# → Creates credentials file at:
#   C:\Users\<user>\.cloudflared\<tunnel-uuid>.json

# 4. Configure DNS
cloudflared tunnel route dns hormuzwatch api.hormuzwatch.app
# → Creates CNAME record pointing to tunnel

# 5. Create config file
# C:\Users\<user>\.cloudflared\config.yml
```

**`config.yml`:**
```yaml
tunnel: <tunnel-uuid>
credentials-file: C:\Users\<user>\.cloudflared\<tunnel-uuid>.json

ingress:
  - hostname: api.hormuzwatch.app
    service: http://localhost:10020
  - service: http_status:404
```

### Run as Windows Service

```powershell
# Install as auto-start Windows service
cloudflared service install

# Check status
cloudflared service status

# Restart
cloudflared service restart

# View logs
cloudflared service logs
```

After this, `https://api.hormuzwatch.app/health` proxies to `http://localhost:10020/health`.

The tunnel handles TLS termination, DDoS protection, and global CDN caching automatically.

---

## 4. GitHub Actions CI/CD

**File:** [`.github/workflows/backend-ci.yml`](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/.github/workflows/backend-ci.yml)

### Trigger

```yaml
on:
  push:
    branches: [main, master]
```

### Workflow Steps

| Step | What happens |
|------|-------------|
| 1. Checkout | Clones latest code from main/master |
| 2. Setup Go | Installs Go 1.23, caches modules |
| 3. Build | `go build -o build/hormuz-server.exe ./cmd/...` |
| 4. Stop existing | Kills running hormuz-server process by PID file |
| 5. Deploy | Copies binary to `deploy/`, starts as hidden background process |
| 6. Health check | `curl localhost:10020/health` → expects `"status":"healthy"` |
| 7. Verify Python | Checks `ml-service/` imports and CLI works |

### Self-Hosted Runner Setup

The workflow uses `runs-on: self-hosted` — meaning it runs on the same Windows machine as the services.

**Add a self-hosted runner:**
```
GitHub Repo → Settings → Actions → Runners → New self-hosted runner
```
Follow the Windows instructions to download and configure the runner as a Windows service.

### Required Secrets (GitHub → Settings → Secrets)

| Secret | Purpose |
|--------|---------|
| `DATABASE_URL` | PostgreSQL connection string (set in deploy/.env) |
| `SUPABASE_ANON_KEY` | For frontend auth (set in client-v2/.env) |
| `METRICS_API_KEY` | For dataset snapshot/flush endpoints |

---

## 5. Windows Background Services

**Manager script:** [`scripts/manage.ps1`](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/scripts/manage.ps1)

### Daily Commands

```powershell
# Build the Go binary
.\scripts\manage.ps1 build

# Start all services (Go + Python ML)
.\scripts\manage.ps1 start

# Check health of both services
.\scripts\manage.ps1 status

# View tail of logs
.\scripts\manage.ps1 logs

# Stop everything
.\scripts\manage.ps1 stop

# Restart (stop → start)
.\scripts\manage.ps1 restart
```

### What `start` Does

1. **Python ML Service** — runs `python ml_cli.py serve --port 8090` in a hidden window
   - PID written to `build/ml.pid`
   - Logs written to `build/logs/ml-service.log`
2. **Go Backend** — runs `deploy/hormuz-server.exe` with `PORT=10020` in a hidden window
   - PID written to `build/server.pid`
   - Logs written to `build/logs/server.log`
3. **Health checks** — waits 5s, then curls both health endpoints

### On System Boot

To make services auto-start on Windows boot:

```powershell
# Create a scheduled task that runs at system startup:
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-File C:\Users\amena\OneDrive\Desktop\Projects\HormuzWatch\scripts\manage.ps1 start"
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount
Register-ScheduledTask -TaskName "HormuzWatch-Start" -Action $action `
    -Trigger $trigger -Principal $principal -RunLevel Highest
```

---

## 6. Python ML Service

**CLI:** [`ml-service/ml_cli.py`](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/ml-service/ml_cli.py)

### Commands

```powershell
cd ml-service

# Start in background (default port 8090)
python ml_cli.py serve

# Start on custom port
python ml_cli.py serve --port 8095

# Check status and health
python ml_cli.py status

# Stop the background service
python ml_cli.py stop

# List available model bundles
python ml_cli.py models

# Trigger model training
python ml_cli.py train --domain vessel

# Run single prediction (for testing)
python ml_cli.py predict --domain vessel --features "12.5,0.3,1.2,15.0,2.1,0,45.2,0,0.8"
```

### Health Endpoint

```
GET http://localhost:8090/health
```

```json
{
  "status": "healthy",
  "uptime_seconds": 3600.5,
  "legacy_model_loaded": true,
  "legacy_model_version": "2.0.0",
  "models_loaded": 2,
  "models_total": 4,
  "ensemble_models": {
    "vessel": true,
    "aviation": false,
    "heatmap": true,
    "news": false
  },
  "grpc_port": 8091,
  "app_port": 8090
}
```

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `ML_PORT` | `8090` | FastAPI listen port |
| `GRPC_PORT` | `8091` | gRPC listen port |
| `MODELS_DIR` | `ml-service/models/` | Model bundle directory |

---

## 7. Health Monitoring

### Go Backend Health

```
GET http://localhost:10020/health
```

```json
{
  "status": "healthy",
  "timestamp": "2026-07-23T12:00:00Z",
  "managed_identity_enabled": false,
  "components": {
    "database": {
      "healthy": true,
      "ping_ms": 45
    },
    "websocket": {
      "healthy": true
    }
  },
  "version": "2.0.0"
}
```

Status values: `healthy` | `degraded` | `unhealthy`

### Pipeline Health

```
GET http://localhost:10020/public/news/pipeline/status
```

```json
{
  "articles_total": 1423,
  "articles_done": 1401,
  "articles_failed": 12,
  "articles_duplicate": 10,
  "sources_total": 16,
  "sources_active": 2,
  "sources_errored": 1,
  "source_states": {
    "WAM": "DONE",
    "IRNA": "ERROR",
    "USNI News": "FETCHING"
  },
  "state_counts": {
    "DONE": 1401,
    "PROCESS_FAILED": 12,
    "DUPLICATE": 10
  }
}
```

### Python ML Health

```
GET http://localhost:8090/health
```

### Monitoring Checklist (Daily)

| Check | Command | Expected |
|-------|---------|----------|
| Go backend alive | `.\scripts\manage.ps1 status` | `HEALTHY` |
| Python ML alive | `.\scripts\manage.ps1 status` | `HEALTHY` |
| DB connected | `curl localhost:10020/health` | `"database.healthy": true` |
| Pipeline running | `curl localhost:10020/public/news/pipeline/status` | `articles_done > 0` |
| Sources healthy | Same as above | `sources_errored < 5` |
| Cloudflare tunnel | `curl https://api.hormuzwatch.app/health` | Same as localhost |

### Alert Thresholds

| Condition | Severity | Action |
|-----------|----------|--------|
| `sources_errored > sources_total * 0.3` | HIGH | Check source URLs, network |
| `articles_failed > 50` | MEDIUM | Check DB connection, storage |
| `articles_in_flight > 100` | LOW | Pipeline backlog — check worker pool |
| Health returns `degraded` | HIGH | DB connection lost — check Supabase |
| Health returns 404/timeout | CRITICAL | Service down — restart |

---

## 8. Unified Management CLI

```powershell
# All commands from project root:
cd C:\Users\amena\OneDrive\Desktop\Projects\HormuzWatch

# Build
.\scripts\manage.ps1 build

# Service lifecycle
.\scripts\manage.ps1 start      # Start Go + Python in background
.\scripts\manage.ps1 stop       # Stop both
.\scripts\manage.ps1 restart    # Stop then start
.\scripts\manage.ps1 status     # Health check both
.\scripts\manage.ps1 logs       # Tail recent logs

# Tunnel
.\scripts\manage.ps1 tunnel-setup   # Shows Cloudflare setup instructions

# Python ML specific
cd ml-service
python ml_cli.py status         # ML service health
python ml_cli.py models         # List model bundles
python ml_cli.py train --domain vessel   # Trigger training
python ml_cli.py stop           # Stop only ML service
python ml_cli.py serve          # Start only ML service
```

---

## 9. Deployment Workflow

### Normal Deployment (Automated)

```
Developer pushes to main → GitHub Actions triggers:
  1. go build ./cmd/...
  2. Copy binary to deploy/
  3. Stop old process (by PID file)
  4. Start new process (hidden, PORT=10020)
  5. Health check → ✓
  Total: ~60 seconds
```

### Manual Deployment

```powershell
# 1. Build
cd server
go build -o ../build/hormuz-server.exe ./cmd/...

# 2. Stop old
.\scripts\manage.ps1 stop

# 3. Deploy
Copy-Item build/hormuz-server.exe deploy/hormuz-server.exe

# 4. Start
.\scripts\manage.ps1 start
```

### First-Time Setup (New Machine)

```powershell
# 1. Clone
git clone https://github.com/your-org/HormuzWatch.git
cd HormuzWatch

# 2. Install Go
winget install GoLang.Go.1.23

# 3. Install Python
winget install Python.Python.3.11
cd ml-service && pip install -r requirements.txt

# 4. Configure .env
cp .env.example .env
# Edit .env with Supabase credentials

# 5. Build & start
.\scripts\manage.ps1 build
.\scripts\manage.ps1 start

# 6. Cloudflare Tunnel
.\scripts\manage.ps1 tunnel-setup
# Follow instructions

# 7. GitHub Runner
# Repo → Settings → Actions → Runners → Add self-hosted
# Install as Windows service
```

---

## 10. Troubleshooting

### Go backend won't start

```powershell
# Check .env
cat deploy/.env | Select-String DATABASE_URL

# Run in foreground to see errors
cd deploy
.\hormuz-server.exe
```

### Python ML won't start

```powershell
# Check if port is in use
netstat -ano | findstr :8090

# Run in foreground
cd ml-service
python -c "from app import app; import uvicorn; uvicorn.run(app, host='0.0.0.0', port=8090)"
```

### Cloudflare tunnel 502/504

```powershell
# Check if backend is running locally
curl http://localhost:10020/health

# Check tunnel logs
cloudflared service logs

# Restart tunnel
cloudflared service restart
```

### Health check returns degraded

```
"database.healthy": false → Check DATABASE_URL, Supabase dashboard, network
"websocket.healthy": false → WebSocket hub not initialized (non-critical)
```

### Empty articles in frontend

```powershell
# Check pipeline is running
curl http://localhost:10020/public/news/pipeline/status

# Check articles directly
curl http://localhost:10020/public/news/latest?limit=5

# If empty, check DB:
# supabase CLI: supabase db query "SELECT count(*) FROM articles"
```

---

## 11. Operations Runbook

### Routine Tasks

| Frequency | Task | Command |
|-----------|------|---------|
| Daily | Health check | `.\scripts\manage.ps1 status` |
| Daily | Check logs for errors | `.\scripts\manage.ps1 logs` |
| Weekly | Check model freshness | `python ml_cli.py models` |
| Weekly | Verify tunnel health | `curl https://api.hormuzwatch.app/health` |
| Monthly | Train new models | `python ml_cli.py train --domain vessel` |
| Monthly | Prune old logs | Delete `build/logs/*.log` older than 30 days |

### Emergency Procedures

**Service is down:**
```powershell
.\scripts\manage.ps1 status     # Confirm both down
.\scripts\manage.ps1 restart    # Restart everything
.\scripts\manage.ps1 status     # Confirm healthy
```

**Database is unreachable:**
1. Check Supabase dashboard → project status
2. Check network → `ping dipuwvlnauqkjrqcfeqw.supabase.co`
3. Verify `DATABASE_URL` in `deploy/.env`
4. If DB is down, Go returns `degraded` health — frontend will show stale data from cache

**Pipeline backlog (articles_in_flight > 100):**
1. Check worker pool → `curl localhost:10020/public/news/pipeline/status`
2. Reduce source count temporarily by disabling slow sources
3. Increase worker count: set `NEWS_WORKERS=8` in `.env`, restart

**Cloudflare tunnel down:**
1. Check `cloudflared service status`
2. `cloudflared service restart`
3. If persistent, `cloudflared tunnel list` → verify tunnel exists
4. Frontend will fall back to direct `http://localhost:10020` for local development

### Log Locations

| Service | Log Path |
|---------|----------|
| Go Backend | `build/logs/server.log` |
| Python ML | `build/logs/ml-service.log` |
| Cloudflare Tunnel | `cloudflared service logs` |
| GitHub Actions | GitHub → Actions tab → workflow run |
