# HormuzWatch — Maritime Intelligence MVP

**HormuzWatch** is a real-time maritime intelligence and geospatial anomaly detection platform for the Strait of Hormuz.

The project is architected with complete folder isolation (`service/`, `server/`, `client/`), designed for local development and hybrid cloud deployment across **Tunkstun Workstation (`192.168.1.51`)**, **Cloudflare Tunnel (`hormuzwatch.aburcloud.com`)**, and **Vercel Edge (`hormuzwatch.vercel.app`)**.

---

## 📁 Repository Structure

```text
HormuzWatch/
├── .github/
│   └── workflows/
│       ├── service-pipeline.yml       # Pipeline: Cloudflared Tunnel & Ingress
│       ├── ml-service-pipeline.yml    # Pipeline: Python ML Anomaly Detection Engine
│       ├── server-pipeline.yml        # Pipeline: Go Backend API & Core Engine
│       └── client-pipeline.yml        # Pipeline: React Vite Frontend & Vercel Deploy
├── service/                           # Edge Ingress, Tunnel & ML Backend Services
│   ├── cloudflared/
│   │   └── config.yml                 # Cloudflare Tunnel routing configuration
│   ├── ml-service/                    # Isolated Python FastAPI + gRPC anomaly ensemble
│   │   ├── app.py                     # ML REST health & prediction API
│   │   ├── grpc_server.py             # ML gRPC high-throughput scoring bridge
│   │   ├── requirements.txt           # Python dependencies
│   │   └── Dockerfile                 # Multi-stage Python 3.11 container
│   └── scripts/
│       └── manage-service.sh          # Tunnel status, reload, and verification script
├── server/                            # Isolated Go Backend Engine
│   ├── cmd/                           # Go server entrypoint (main.go)
│   ├── internal/                      # REST API, WebSocket hub, SSE, AIS ingest, DB
│   ├── proto/                         # Protocol Buffer definitions for gRPC bridge
│   ├── data/                          # Land masks and incident history data
│   ├── templates/                     # LaTeX report templates
│   ├── Dockerfile                     # Go 1.24 multi-stage Alpine build
│   └── go.mod                         # Go 1.24 module definition
├── client/                            # Isolated React 18 / Vite / Tailwind Frontend
│   ├── src/                           # UI components, Leaflet/MapLibre map, state
│   ├── Dockerfile                     # Multi-stage production Nginx container
│   ├── vercel.json                    # Vercel SPA routing & deployment config
│   └── package.json
├── docs/                              # Architecture & technical documentation
├── docker-compose.yml                 # Full-stack production Compose
├── docker-compose.dev.yml             # Isolated development Compose (Hot-reload / Debug)
├── .env.example                       # Environment configuration template
└── README.md
```

---

## 🚀 Quick Start (Development Environment)

### 1. Run the Entire Stack in Dev Mode with Docker
```bash
# Clone and navigate to project root
cd ~/SHARED/Projects/HormuzWatch

# Copy environment variables
cp .env.example .env

# Start dev environment (Server + ML Service + Client)
docker compose -f docker-compose.dev.yml up --build
```

### 2. Run Services Individually

#### A. Go Server (`server/`)
```bash
cd server
go run cmd/main.go
# API running on http://localhost:10020
```

#### B. Python ML Service (`service/ml-service/`)
```bash
cd service/ml-service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python ml_cli.py serve --port 8090
# REST on :8090 | gRPC on :8091
```

#### C. React Client (`client/`)
```bash
cd client
npm install
npm run dev
# Vite dev server running on http://localhost:5173
```

---

## 🌐 Production & Host Architecture (`tunkstun`)

| Component | Target Host / URL | Protocol / Port | Role |
| :--- | :--- | :--- | :--- |
| **Host Workstation** | `192.168.1.51` (Static IP) | SSH Port 22 | Server compute node (`tunkstun`) |
| **Cloudflare Tunnel**| `hormuzwatch.aburcloud.com` | HTTPS | Edge entrypoint to MVP client |
| **Backend API** | `api.hormuzwatch.aburcloud.com` | HTTPS / WSS | Go REST API, WebSocket & SSE stream |
| **ML Engine** | `ml.hormuzwatch.aburcloud.com` | HTTPS | ML telemetry & anomaly endpoints |
| **Vercel Client** | `hormuzwatch.vercel.app` | HTTPS | Edge-hosted production React client |

---

## 🔄 Dedicated CI/CD Pipelines

1. **Service Pipeline (`service-pipeline.yml`)**  
   Validates Cloudflare tunnel configs and syncs `/etc/cloudflared/config.yml` on `tunkstun`.
2. **ML Service Pipeline (`ml-service-pipeline.yml`)**  
   Runs Python test suite, builds ML container, and deploys `hormuzwatch-ml` on `tunkstun`.
3. **Server Pipeline (`server-pipeline.yml`)**  
   Executes Go test suite, builds backend binary container, and deploys `hormuzwatch-server` on `tunkstun`.
4. **Client Pipeline (`client-pipeline.yml`)**  
   Validates TypeScript, compiles production bundle, and deploys to Vercel at `hormuzwatch.vercel.app`.

---

## 🛠️ Management Commands on Tunkstun

```bash
# Connect to Tunkstun without password
ssh tunkstun

# Manage containers
cd ~/SHARED/Projects/HormuzWatch
docker compose ps
docker compose logs -f server
docker compose logs -f ml
docker compose restart

# Manage Cloudflare Tunnel service
sudo systemctl status cloudflared
sudo systemctl restart cloudflared
```
