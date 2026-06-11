# Executive Overview

## 1. Project Purpose

**HormuzWatch** is an educational and portfolio-grade geospatial intelligence platform that monitors maritime vessel traffic and aviation activity in and around the **Strait of Hormuz** — one of the world's most strategically significant shipping chokepoints. The platform processes live telemetry from public AIS and ADS-B APIs, applies an ensemble anomaly detection pipeline (rules engine + ML + geopolitical context), and surfaces threat visualizations, heatmaps, and vessel intelligence to authenticated operators.

> **⚠️ Disclaimer:** This is NOT an operational tool. All anomaly scores and risk classifications are illustrative outputs of statistical models intended for portfolio demonstration purposes only.

---

## 2. Business Objective

| Objective | Detail |
|---|---|
| **Portfolio demonstration** | Show end-to-end cloud-native architecture for a future engineering employer |
| **Technical breadth** | Demonstrate competency across real-time systems, ML inference, geospatial visualization, cloud infrastructure, and DevSecOps |
| **Domain relevance** | Maritime domain awareness is a real, valuable problem in defence, insurance, and logistics |

---

## 3. Core Features

### Public (Unauthenticated)
- **Live Map** — Real-time geospatial visualization of vessels and aircraft on Leaflet/OpenStreetMap
- **Live Feed** — Top-10 anomalous vessel traces updated every 5 seconds via SSE
- **Documentation** — Self-hosted project documentation
- **Disclaimer** — Legal context for use of data

### Authenticated (Operator Dashboard)
- **Dashboard** — Real-time WebSocket-driven telemetry map with anomaly overlays and heatmaps
- **Analytics** — Historical track analysis with time-series charts
- **Alerts** — Configurable anomaly severity alerts
- **Insights** — AI-driven threat intelligence summaries
- **News** — GDELT/RSS-sourced maritime security intelligence
- **Watchlist** — Operator-curated vessels under observation
- **Settings** — System configuration (data retention, integrations toggle)

### Admin
- **User Management** — Approve, blacklist, unblacklist operators
- **Audit Logs** — Session and action tracking

---

## 4. User Personas

| Persona | Role | Capabilities |
|---|---|---|
| **Public Visitor** | No account | View live map, live feed, docs, disclaimer |
| **Operator** | Approved user | Full dashboard, analytics, insights, watchlist |
| **Administrator** | Role = `admin` | Everything + user management, system admin panel |

---

## 5. Key Workflows

### Vessel Telemetry → Threat Score (Core Data Flow)
```
AISStream WebSocket
  → Go Server ingests raw AIS PositionReport
  → TrackStateManager computes deltas (course, speed, AIS gap)
  → ExtractFeatures() builds a FeatureVector
  → Rule Engine scores 0-100 across 5 factors
  → ML Client calls Python Isolation Forest (async, 500ms timeout)
  → GeoStore adds geopolitical context score
  → ComputeComposite() blends: 40% rule + 40% ML + 20% geopolitical
  → ThreatAssessment broadcast via WebSocket to all clients
  → Persisted to SQLite (tracks + anomalies tables)
```

### User Authentication Flow
```
User submits credentials
  → POST /auth/login
  → bcrypt password verification
  → Status check: pending/blacklisted/approved
  → JWT token issued (24-hour TTL)
  → Session record created in SQLite
  → Token stored in memory (not localStorage)
  → AuthContext exposes session to React app
```

### Registration → Access Flow
```
User submits registration form
  → POST /auth/register
  → bcrypt hash + UUID generated
  → User created with status='pending'
  → Admin email notification sent (async)
  → Admin approves via /admin panel
  → POST /auth/approve/:username
  → User status → 'approved'
  → User notification email sent
```

---

## 6. High-Level Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                      PUBLIC INTERNET                          │
│                                                               │
│  ┌──────────────┐    ┌──────────────────────────────────┐   │
│  │  AISStream   │    │  React SPA (Azure Static Web Apps)│   │
│  │  OpenSky     │    │  Leaflet Map, WebSocket Client    │   │
│  │  GDELT/RSS   │    └────────────┬─────────────────────┘   │
│  │  NASA FIRMS  │                 │ HTTPS / WSS              │
│  └──────┬───────┘                 ▼                         │
│         │              ┌────────────────────┐               │
│         └─────────────▶│ Go Server (Gin)    │               │
│                         │ Azure Container App│               │
│                         │ :8080              │               │
│                         └────────┬───────────┘               │
│                                  │                            │
│              ┌───────────────────┼────────────────┐          │
│              ▼                   ▼                ▼          │
│       ┌──────────┐      ┌──────────────┐  ┌──────────────┐  │
│       │ SQLite DB│      │ Python ML    │  │ Azure Monitor│  │
│       │ WAL mode │      │ FastAPI :8090│  │ App Insights │  │
│       └──────────┘      └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Technology Stack Overview

| Category | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | React | 18 | SPA UI |
| **Language (Frontend)** | TypeScript | 5.x | Type safety |
| **Build Tool** | Vite | 5.x | Fast HMR bundler |
| **Routing** | React Router | v6 | SPA navigation |
| **Map** | Leaflet.js + react-leaflet | 1.9 / 4.x | Geospatial visualization |
| **HTTP Client** | Fetch API (native) | — | API calls |
| **Charting** | Recharts | 2.x | Analytics charts |
| **Icons** | Lucide React | — | UI icons |
| **Backend Language** | Go | 1.25 | High-performance server |
| **Backend Framework** | Gin | 1.9.1 | HTTP router/middleware |
| **WebSocket** | Gorilla WebSocket | 1.5.3 | Real-time push |
| **JWT** | golang-jwt/jwt | v5 | Auth tokens |
| **Password Hashing** | bcrypt | — | Credential security |
| **Database** | SQLite (WAL) | modernc.org | Embedded persistence |
| **ML Framework** | scikit-learn | latest | Isolation Forest |
| **ML Explainability** | SHAP | latest | Feature importance |
| **ML API** | FastAPI | latest | Python inference service |
| **ML Serialization** | joblib | latest | Model persistence |
| **Cloud** | Azure | — | Hosting, monitoring, infra |
| **IaC** | Terraform | ~1.x | Azure provisioning |
| **CI/CD** | GitHub Actions | — | Automated deploy |
| **Containers** | Docker + Docker Compose | — | Local dev + prod |
