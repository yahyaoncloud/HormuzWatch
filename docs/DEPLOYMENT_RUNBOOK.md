# HormuzWatch — On-Premises DevOps Deployment Runbook

This runbook documents the exact, repeatable procedure for deploying and operating **HormuzWatch** on the on-premise workstation `tunkstun`.

---

## 1. System Architecture Overview

```text
                           INTERNET
                              │
                              ▼
                       Cloudflare Edge
                  (hormuzwatch.aburcloud.com)
                              │
                              ▼
                      Cloudflare Tunnel
                     (cloudflared daemon)
                              │
                              ▼
                     tunkstun (On-Prem)
                              │
                    Docker Engine Bridge
                  (hormuzwatch-dev-network)
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
       ▼                      ▼                      ▼
hormuzwatch-client    hormuzwatch-server      hormuzwatch-ml
  (Nginx SPA :3000)      (Go API :10020)     (FastAPI/gRPC :8090/:8091)
       │                      │                      ▲
       │  Reverse Proxy /api/ │   Internal gRPC/REST │
       └─────────────────────►│──────────────────────┘
                              │
                              ▼
                     Supabase PostgreSQL
```

---

## 2. Prerequisites & Host Requirements

### Host Details (`tunkstun`)
* **OS:** Linux Mint 22.2 (Ubuntu 24.04 Noble base, Kernel `7.0.0-30-generic`)
* **Docker Engine:** `29.7.2`
* **Docker Compose:** `v5.5.0`
* **Cloudflare Tunnel:** `cloudflared` systemd service active
* **Repository Location:** `/home/yahya/SHARED/Projects/HormuzWatch`

### Required Open Ports (Local / Container)
* `3000` — Frontend SPA & Nginx Reverse Proxy
* `10020` — Go Backend REST API, WebSocket & SSE Stream
* `8090` — Python ML FastAPI Health & REST Inference
* `8091` — Python ML gRPC Inference

---

## 3. Environment Setup & Configuration

All runtime environment variables are loaded by Docker Compose from `.env` in the project root.

```bash
# Verify environment file existence on tunkstun
cd ~/SHARED/Projects/HormuzWatch
ls -la .env
```

### Key Configuration Categories
| Category | Variables | Notes |
|---|---|---|
| **Server & Auth** | `PORT`, `GIN_MODE`, `JWT_SECRET`, `AUTH_DISABLED` | Controls auth bypass and port bindings |
| **Database** | `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Supabase pooled connection string |
| **ML Bridge** | `ML_SERVICE_ADDR=ml:8091`, `ML_SERVICE_URL=http://ml:8090` | Internal container network routing |
| **Data Ingestion** | `AISSTREAM_API_KEY`, `OPENSKY_USERNAME`, `FIRMS_MAP_KEY` | Real-time sensor credentials |
| **ArcGIS Chokepoints**| `ARCGIS_CHOKEPOINTS_URL`, `ARCGIS_FETCH_INTERVAL_HOURS` | Daily vessel transit feature server |

---

## 4. Manual Deployment Workflow

To deploy or update the stack on `tunkstun`:

```bash
# 1. SSH into the deployment machine
ssh yahya@tunkstun

# 2. Navigate to project directory
cd ~/SHARED/Projects/HormuzWatch

# 3. Pull latest changes
git fetch origin
git checkout production-ready
git pull origin production-ready

# 4. Validate Compose configuration syntax
docker compose -f docker-compose.dev.yml config

# 5. Build images (leveraging cache layers)
docker compose -f docker-compose.dev.yml build

# 6. Start the stack in detached mode
docker compose -f docker-compose.dev.yml up -d

# 7. Verify running containers
docker compose -f docker-compose.dev.yml ps
```

---

## 5. Deployment Verification & Healthchecks

Run the following automated verification suite:

```bash
# Check all container states
docker compose -f docker-compose.dev.yml ps

# 1. Verify Go Backend Health
curl -sf http://localhost:10020/health | jq .

# 2. Verify Python ML Ensemble Health & Loaded Models
curl -sf http://localhost:8090/health | jq .

# 3. Verify Client Nginx Response
curl -sI http://localhost:3000

# 4. Verify Mediatory Boot Status Page
curl -sI http://localhost:3000/status

# 5. Verify Public Cloudflare Ingress
curl -sI https://hormuzwatch.aburcloud.com
curl -sf https://hormuzwatch.aburcloud.com/health | jq .
curl -sf https://hormuzwatch.aburcloud.com/ml/health | jq .
```

---

## 6. Rollback Procedure

If a deployment fails health checks:

```bash
# 1. Inspect error logs
docker compose -f docker-compose.dev.yml logs --tail=100

# 2. Revert Git commit to previous known-good state
git checkout HEAD~1

# 3. Rebuild and restart containers
docker compose -f docker-compose.dev.yml build
docker compose -f docker-compose.dev.yml up -d

# 4. Validate recovered state
docker compose -f docker-compose.dev.yml ps
curl -sf http://localhost:10020/health
```

---

## 7. Troubleshooting Common Issues

### Issue 1: `403 Forbidden` on Client Nginx
* **Root Cause:** Missing `index.html` in `/usr/share/nginx/html` due to build script exiting before SPA HTML generation.
* **Fix:** Ensure `client/package.json` uses `tsc && node scripts/build.mjs` executing `npx react-router build` to generate `build/client/index.html`.

### Issue 2: `PermissionError: [Errno 13] Permission denied: '/app/analysis_output'`
* **Root Cause:** Container non-root user `hormuz` cannot create directories in root-owned `/app`.
* **Fix:** Update `service/ml-service/Dockerfile` to `RUN mkdir -p /app/models /app/logs /app/analysis_output && chown -R hormuz:hormuz /app`.

### Issue 3: Stale / Hanging Node & Buildx Processes
* **Root Cause:** Lingering esbuild ping sockets keeping Node.js event loop active.
* **Fix:** Terminate stale build processes: `pkill -f 'docker-buildx' || true; pkill -f 'vite build' || true`.
