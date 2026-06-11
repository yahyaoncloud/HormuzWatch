# HormuzWatch — Documentation Index

> **Educational portfolio project** demonstrating cloud architecture, real-time data engineering, and machine learning applied to maritime and aviation domain awareness.

---

## Documentation Structure

| Document | Audience | Description |
|---|---|---|
| [01-executive-overview.md](./01-executive-overview.md) | All | Project purpose, features, personas, architecture summary |
| [02-system-architecture.md](./02-system-architecture.md) | Architects, DevOps | Full architecture, component diagrams, data flows |
| [03-frontend.md](./03-frontend.md) | Frontend Engineers | React app, routing, components, state, auth |
| [04-backend.md](./04-backend.md) | Backend Engineers | Go server, API endpoints, middleware, services |
| [05-database.md](./05-database.md) | Backend, Data Engineers | SQLite schema, tables, relationships, ERD |
| [06-auth-security.md](./06-auth-security.md) | Security Engineers | JWT, RBAC, session management, secrets |
| [07-ml-architecture.md](./07-ml-architecture.md) | ML Engineers, Data Scientists | Full AI/ML ecosystem documentation |
| [08-api-reference.md](./08-api-reference.md) | Frontend, Integration Engineers | Complete API reference with examples |
| [09-third-party-services.md](./09-third-party-services.md) | DevOps, Architects | External services, credentials, integrations |
| [10-infrastructure.md](./10-infrastructure.md) | DevOps, Cloud Architects | Azure, Terraform, containers, deployment |
| [11-local-development.md](./11-local-development.md) | All Engineers | Onboarding guide, quick start, troubleshooting |
| [12-environment-variables.md](./12-environment-variables.md) | DevOps, Engineers | All env vars with purpose and security notes |
| [13-deployment.md](./13-deployment.md) | DevOps, SRE | CI/CD pipelines, deployment runbooks |
| [14-monitoring.md](./14-monitoring.md) | SRE, DevOps | Logging, observability, incident detection |
| [15-folder-structure.md](./15-folder-structure.md) | All Engineers | Full directory tree with explanations |
| [16-developer-knowledge-base.md](./16-developer-knowledge-base.md) | All Engineers | Patterns, conventions, limitations, roadmap |

---

## Quick Start (30 seconds)

```bash
# Clone
git clone <repo>

# Start server
cd server && go run cmd/main.go

# Start frontend (separate terminal)
cd client && npm install && npm run dev

# Start ML inference (separate terminal)  
cd ml-inference && pip install -r requirements.txt && uvicorn app:app --port 8090
```

---

## Technology Stack Summary

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, React Router v6, Leaflet.js |
| **Backend** | Go 1.25, Gin, Gorilla WebSocket |
| **Database** | SQLite (WAL mode), optional PostgreSQL/Supabase |
| **ML Inference** | Python 3.11, FastAPI, scikit-learn Isolation Forest, SHAP |
| **Infrastructure** | Azure Container Apps, Azure Static Web Apps, Terraform |
| **CI/CD** | GitHub Actions |
| **Data Sources** | AISStream (AIS), OpenSky (ADS-B), GDELT, NASA FIRMS, Open-Meteo, RSS feeds |
