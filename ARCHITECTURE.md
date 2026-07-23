# HormuzWatch — System Architecture & Implementation Map

HormuzWatch is a high-availability maritime and aviation intelligence platform monitoring the Strait of Hormuz, Persian Gulf, Gulf of Oman, Red Sea, and Bab-el-Mandeb chokepoints.

---

## 🏛️ System Overview

```
                      ┌─────────────────────────────────────────┐
                      │    React Router v7 Frontend (client-v2) │
                      │      - Leaflet 2D / MapLibre 3D Maps    │
                      │      - Realtime uPlot Metrics & Graphs  │
                      └────────────────────┬────────────────────┘
                                           │ WebSocket / SSE / REST
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │            Go Server (server/)          │
                      │      - Gin REST & WS Gateway            │
                      │      - Track State & Geofencing         │
                      │      - SQLite Persistence & Cache       │
                      └────────────────────┬────────────────────┘
                                           │ gRPC / Protocol Buffers
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │          Python ML Service (ml-service) │
                      │      - Multi-Domain Isolation Forest    │
                      │      - Local Outlier Factor (LOF)       │
                      │      - Isotonic Probability Calibration │
                      └─────────────────────────────────────────┘
```

---

## 📂 Core Subsystems

### 1. Frontend (`client-v2/`)
- **Framework:** React Router v7 (Framework Mode), Vite, TailwindCSS v4, Biome.
- **Maps:** Leaflet hero basemap on home page; MapLibre GL for regional intelligence and heatmaps.
- **Charts:** uPlot lightweight high-frequency charting for F1 comparisons, anomaly distributions, and live telemetry rates.
- **State & Realtime:** Zustand stores + TanStack Query + WebSockets & Server-Sent Events.

### 2. Backend Gateway (`server/`)
- **Framework:** Go with Gin Web Framework & Gorilla WebSocket.
- **Ingestion Workers:** Multi-provider live ingestion (AISStream, OpenSky Network, Kystverket NMEA-0183 TCP stream, GDELT OSINT).
- **Intelligence Pipeline:** In-memory track state manager (`TSM`), spatial geofencing, threat scoring engine.
- **Dataset Pipeline:** Asynchronous bounded queue with Google Drive API persistence and automated 3-file retention.
- **Caching:** 5-minute in-memory TTL telemetry cache with admin toggle.

### 3. Machine Learning Microservice (`ml-service/`)
- **Framework:** Python 3.11, FastAPI, gRPC, scikit-learn, SHAP.
- **Ensemble Architecture:** Hybrid Isolation Forest + Local Outlier Factor + Isotonic Calibration.
- **Features:** 14-feature multi-domain kinematic vector (speed variance, course delta, AIS message gap, hotzone proximity, barometric altitude deltas).

---

## 📚 Deep-Dive Architecture Documentation

For complete technical specifications, analysis, and implementation details, refer to:

- [Repository Overview & Architecture Analysis](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/docs/new/00-repository-analysis.md)
- [Design & Styling Token System](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/docs/new/02-styling-root-cause.md)
- [Backend Pipeline & API Analysis](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/docs/new/07-backend-review.md)
- [ML & AI Foundations Study](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/docs/learn/study/01-ml-ai-foundations.md)
- [Geospatial & Data Sources Reference](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/docs/learn/study/03-data-sources-geospatial.md)
- [Frontend Inventory & Coverage](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/docs/new/13-frontend-coverage.md)
