# Maritime HormuzWatch

Real-time maritime surveillance and anomaly detection system for the Strait of Hormuz, featuring containerized Go backend and React Router v7 frontend with WebSocket real-time updates and anomaly heatmap visualization.

---

## 🏗️ Phase 2: Containerized Architecture (Current)

### Services

**Backend: Go Server** (`:8080`)

- REST API for telemetry ingestion
- WebSocket hub for real-time streaming
- Multi-factor anomaly scoring engine
- Heatmap aggregation for threat visualization

**Frontend: React** (`:3000`)

- React Router v7 with 7-page routing
- WebSocket client for real-time updates
- Leaflet map with anomaly heatmap layer
- Dark mode support

**Orchestration: Docker Compose**

- Local development environment
- Two-service setup with health checks
- Network bridge for service communication

---

## 🚀 Quick Start

### Prerequisites

- Docker Desktop installed and running

### Run Locally

```bash
# Build and start containers (first run: 3-5 minutes)
docker-compose up --build

# Wait for both services to show "healthy"
# Then access: http://localhost:3000
```

### Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Health Check**: http://localhost:8080/health

---

## ✨ Key Features

- **Real-Time Vessel Tracking** — WebSocket updates every 2 seconds
- **Multi-Factor Anomaly Detection** — Route deviation, stale AIS, speed drops, hot zone proximity
- **Interactive Map** — OpenStreetMap with marker clustering
- **Anomaly Heatmap** — Real-time visualization of threat hotspots
- **Dark Mode** — Built-in theme toggle
- **URL-Based Navigation** — React Router v7 with persistent state
- **JWT Authentication** — Ready for Phase 3 Azure AD integration

---

## 🧪 Verification Checklist

- [ ] Docker Desktop is running
- [ ] `docker-compose up --build` completes without errors
- [ ] Both containers show "healthy" in `docker-compose ps`
- [ ] Frontend loads at http://localhost:3000 (no blank page)
- [ ] Vessel markers appear on map and update every 2 seconds
- [ ] Browser DevTools → Network → WS shows WebSocket connection
- [ ] Anomaly scores display on vessel markers
- [ ] Heatmap toggle button works (top-right of map)
- [ ] Navigation links work (React Router)
- [ ] Selected vessel persists in URL query params

See [IMPLEMENTATION_SUMMARY.md](./docs/project-info/IMPLEMENTATION_SUMMARY.md) for complete setup guide.

---

## 📁 Project Structure

```
Maritime-HormuzWatch/
├── server/                 # Go backend
│   ├── cmd/main.go        # Entry point
│   ├── internal/          # Internal packages
│   │   ├── api/           # HTTP handlers
│   │   ├── websocket/     # WebSocket hub
│   │   ├── anomaly/       # Threat scoring
│   │   ├── auth/          # JWT middleware
│   │   ├── heatmap/       # Visualization
│   │   └── integrations/  # Azure services
│   ├── go.mod
│   └── Dockerfile
├── client/                # React frontend
│   ├── src/
│   │   ├── main.tsx       # Router entry point
│   │   ├── routes/        # Route configuration
│   │   ├── pages/         # Page components (7 routes)
│   │   ├── context/       # WebSocket provider
│   │   ├── components/    # Reusable components
│   │   └── layouts/       # Layout components
│   ├── package.json       # Dependencies (React Router v7)
│   └── Dockerfile
├── docker-compose.yml     # Service orchestration
├── .env                   # Configuration
└── docs/
    ├── docker/DOCKER_COMPOSE_DEV.md
    ├── phases/PROJECT_PHASES_ROADMAP.md
    ├── project-info/IMPLEMENTATION_SUMMARY.md
    └── ...
```

---

## 📊 API Endpoints

| Method | Endpoint     | Purpose             | Auth |
| ------ | ------------ | ------------------- | ---- |
| GET    | `/health`    | Service status      | ✓    |
| POST   | `/telemetry` | Ingest vessel data  | ✓    |
| POST   | `/analyze`   | Anomaly analysis    | ✓    |
| GET    | `/ws/stream` | WebSocket real-time | ✓    |
| GET    | `/heatmap`   | Heatmap grid data   | ✓    |

---

## 🌐 WebSocket Messages

**Telemetry:**

```json
{
  "type": "telemetry",
  "data": {
    "imo": "9234567",
    "vesselName": "Tanker ABC",
    "lat": 26.125,
    "lon": 56.234,
    "speed": 12.5,
    "heading": 45
  }
}
```

**Anomaly:**

```json
{
  "type": "anomaly",
  "data": {
    "id": "9234567",
    "score": 67,
    "severity": "high",
    "reasons": ["Course deviation: 52° (>45°)"],
    "actions": ["Alert operations team"]
  }
}
```

**Heatmap:**

```json
{
  "type": "heatmap",
  "data": [{ "lat": 26.0, "lon": 56.0, "intensity": 5 }]
}
```

---

## 🔧 Common Commands

```bash
# Start services
docker-compose up --build

# Watch logs
docker-compose logs -f

# Go server logs only
docker-compose logs -f go-server

# React frontend logs only
docker-compose logs -f react-frontend

# Check status
docker-compose ps

# Stop services
docker-compose down

# Full rebuild (no cache)
docker-compose build --no-cache

# Validate configuration
docker-compose config
```

---

## 🔄 Development Workflow

### Backend Changes

```bash
# Edit Go code in server/internal/*/
nano server/internal/anomaly/scorer.go

# Rebuild and restart
docker-compose up --build go-server

# Watch logs
docker-compose logs -f go-server
```

### Frontend Changes

```bash
# Edit React code in client/src/
nano client/src/pages/DashboardPage.tsx

# Rebuild container (Vite handles hot reload)
docker-compose up --build react-frontend

# Check logs
docker-compose logs -f react-frontend
```

---

## 🐛 Troubleshooting

### Docker not running

**Issue:** `Docker daemon is not available`  
**Solution:** Start Docker Desktop

### Port already in use

**Issue:** `Port 8080 is already in use`  
**Solution:** Edit `docker-compose.yml` ports or stop conflicting process

### No telemetry on map

**Issue:** Blank map, no vessel markers  
**Solution:**

1. Check WebSocket connected: DevTools → Network → WS filter
2. Verify backend health: `curl http://localhost:8080/health`
3. Check auth disabled: `.env` should have `AUTH_DISABLED=true`

### Frontend shows blank page

**Issue:** White/blank page at localhost:3000  
**Solution:**

1. Check console errors: DevTools → Console
2. Check frontend logs: `docker-compose logs react-frontend`
3. Try hard refresh: Ctrl+Shift+R or Cmd+Shift+R

See [docs/docker/DOCKER_COMPOSE_DEV.md](./docs/docker/DOCKER_COMPOSE_DEV.md) for detailed troubleshooting.

---

## 🛣️ Phase Roadmap

**Phase 1: Foundation** ✅  
Local MVP with simulated telemetry, React + TypeScript frontend, Node.js backend

**Phase 2: Containerization** ✅ (Current)  
Go server with WebSocket, React Router v7 frontend, Docker Compose, anomaly heatmap

**Phase 3: Production Infrastructure** 📋  
Azure deployment (Terraform), real data sources (AISStream, OpenSky, GDELT), Event Hubs, Azure Functions

**Phase 4: Intelligence** 📋  
Multi-factor threat scoring, GDELT enrichment, Azure OpenAI integration

**Phase 5: Prediction** 📋  
Historical analysis, route deviation detection, regional risk indexing, daily reports

**Phase 6: Polish** 📋  
ADRs, test coverage, security audit, FinOps validation, interview-ready

See [docs/phases/PROJECT_PHASES_ROADMAP.md](./docs/phases/PROJECT_PHASES_ROADMAP.md) for details.

---

## 🔐 Security

- JWT authentication with Azure AD JWKS support (Phase 3)
- Rate limiting: 120 req/60s per IP
- CORS middleware
- Zod schema validation
- Managed identity for Azure (Phase 3)

---

## 📚 Documentation

- **[IMPLEMENTATION_SUMMARY.md](./docs/project-info/IMPLEMENTATION_SUMMARY.md)** — Complete setup & architecture
- **[docs/docker/DOCKER_COMPOSE_DEV.md](./docs/docker/DOCKER_COMPOSE_DEV.md)** — Local development guide
- **[docs/phases/PROJECT_PHASES_ROADMAP.md](./docs/phases/PROJECT_PHASES_ROADMAP.md)** — Phase details
- **[docs/project-info/architecture.md](./docs/project-info/architecture.md)** — System design
- **[docs/azure/deployment-guide.md](./docs/azure/deployment-guide.md)** — Production deployment
- **[docs/project-info/CONTRIBUTING.md](./docs/project-info/CONTRIBUTING.md)** — Contributing guidelines

---

## 🤝 Contributing

See [docs/project-info/CONTRIBUTING.md](./docs/project-info/CONTRIBUTING.md) for guidelines.

---

## 📝 Technologies

**Backend:** Go 1.23 · Gin · WebSocket · JWT  
**Frontend:** React 19 · TypeScript · React Router v7 · Tailwind CSS · Leaflet  
**Infrastructure:** Docker Compose · Docker · Vite · Gin  
**Future:** Azure · Event Hubs · Functions · Terraform

---

**Status**: Phase 2 - Containerized MVP Complete  
**Next**: Phase 3 - Azure Infrastructure & Real Data Sources  
**Updated**: June 2, 2026
