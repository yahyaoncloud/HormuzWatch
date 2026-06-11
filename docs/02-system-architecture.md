# System Architecture

## 1. Component Overview

HormuzWatch follows a **polyglot microservice** architecture with three primary runtime services and one embedded database:

| Service | Runtime | Role |
|---|---|---|
| **React SPA** | Node.js (build) / Browser | UI, maps, user interactions |
| **Go API Server** | Go 1.25 | Core backend, data ingestion, WebSocket hub, auth |
| **Python ML Service** | Python 3.11 / FastAPI | Isolation Forest inference + training |
| **SQLite** | Embedded in Go server | Persistence for tracks, anomalies, users, sessions |

---

## 2. Full Architecture Diagram

```mermaid
graph TB
    subgraph "External Data Sources"
        AIS[AISStream WebSocket<br/>wss://stream.aisstream.io]
        OSK[OpenSky REST API<br/>ADS-B aircraft data]
        GDL[GDELT / RSS Feeds<br/>Maritime news]
        FIRMS[NASA FIRMS<br/>Fire/event data]
        MET[Open-Meteo<br/>Weather data]
    end

    subgraph "Azure Hosting (Production)"
        SWA[Azure Static Web Apps<br/>React Frontend]
        ACA_API[Azure Container App<br/>Go Backend :8080]
        ACA_ML[Azure Container App<br/>Python ML :8090]
        SQLITE[(SQLite WAL<br/>hormuzwatch.db)]
        ACR[Azure Container Registry]
        AKV[Azure Key Vault]
        AI_MON[Application Insights]
        EH[Azure Event Hubs]
    end

    subgraph "Client Browser"
        REACT[React SPA<br/>Vite + TypeScript]
        WS_CLIENT[WebSocket Client]
        LEAFLET[Leaflet Map]
    end

    subgraph "CI/CD"
        GHA[GitHub Actions]
    end

    AIS -->|WebSocket| ACA_API
    OSK -->|REST poll 60s| ACA_API
    GDL -->|RSS poll| ACA_API
    FIRMS -->|REST poll| ACA_API
    MET -->|REST poll| ACA_API

    REACT -->|HTTPS REST| ACA_API
    WS_CLIENT -->|WSS| ACA_API
    ACA_API -->|HTTP POST| ACA_ML
    ACA_API --- SQLITE
    ACA_ML --- SQLITE

    GHA -->|docker push| ACR
    GHA -->|az containerapp update| ACA_API
    GHA -->|az containerapp update| ACA_ML
    GHA -->|SWA deploy| SWA

    ACA_API -->|telemetry| EH
    ACA_API --> AI_MON
    AKV -->|secrets| ACA_API
```

---

## 3. Service Interaction Diagrams

### 3.1 Real-Time Telemetry Pipeline

```mermaid
sequenceDiagram
    participant AIS as AISStream
    participant GO as Go Server
    participant TSM as TrackStateManager
    participant FE as Feature Extractor
    participant RULE as Rule Engine
    participant ML as Python ML Service
    participant GEO as GeoStore
    participant COMP as Composite Scorer
    participant HUB as WebSocket Hub
    participant DB as SQLite
    participant CLIENT as Browser

    AIS->>GO: PositionReport (MMSI, lat, lon, speed, COG)
    GO->>TSM: Update(trackID, lat, lon, speed, heading)
    TSM-->>GO: ComputedDeltas (courseDelta, speedDelta, aisGap, variance)
    GO->>FE: ExtractFeatures(trackID, lat, lon, speed, deltas)
    FE->>RULE: CheckGeofence(lat, lon)
    FE->>FE: ComputeDistToNearestZone()
    FE-->>GO: FeatureVector
    GO->>RULE: Score(courseDelta, aisGap, speed, distToZone, ...)
    RULE-->>GO: ruleScore (0-100)
    GO->>ML: POST /predict {features} (500ms timeout)
    ML-->>GO: {anomaly_score, is_anomaly, confidence, shap_values}
    GO->>GEO: ScoreForLocation(lat, lon)
    GEO-->>GO: geopoliticalScore (0-100)
    GO->>COMP: ComputeComposite(features, rule=40%, ml=40%, geo=20%)
    COMP-->>GO: ThreatAssessment {id, score, severity, reasons, actions}
    GO->>HUB: Broadcast(telemetry + anomaly)
    GO->>DB: UPSERT tracks + anomalies
    HUB->>CLIENT: WebSocket message {type: "telemetry"/"anomaly", data}
```

### 3.2 Authentication Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant AUTH as AuthContext
    participant API as Go Server /auth/*
    participant DB as SQLite (users + sessions)

    B->>AUTH: login(username, password)
    AUTH->>API: POST /auth/login
    API->>DB: SELECT password_hash, status, role FROM users
    DB-->>API: {hash, "approved", "user"}
    API->>API: bcrypt.CompareHashAndPassword()
    API->>DB: INSERT INTO sessions (id, username, expires_at)
    API->>API: GenerateToken(username, email, role, sessionID, 24h)
    API-->>AUTH: {token, expiresAt, sessionId, user}
    AUTH->>AUTH: Store token in module-level memory (not localStorage)
    AUTH-->>B: isAuthenticated = true, user = {username, role}

    Note over B,AUTH: Subsequent API calls
    B->>AUTH: api.fetch('/protected-route')
    AUTH->>API: GET /protected-route<br/>Authorization: Bearer <token>
    API->>API: JWTMiddleware validates token + checks session in DB
    API-->>B: Protected resource
```

### 3.3 ML Training Loop

```mermaid
sequenceDiagram
    participant T as trainer.go (goroutine)
    participant TSM as TrackStateManager
    participant ML as Python ML Service
    participant DB as hormuzwatch.db

    Note over T: Runs every 1 hour after 2-minute startup delay

    T->>TSM: Lock & iterate all tracks (min 5 history each)
    TSM-->>T: []MLFeaturePayload (≥50 samples required)
    T->>ML: POST /train {data: [...features], contamination: 0.05}
    ML->>ML: StandardScaler.fit_transform()
    ML->>ML: IsolationForest(n_estimators=200).fit()
    ML->>ML: joblib.dump({model, scaler, version})
    ML-->>T: {status, model_version, n_samples}
    T->>T: log "Trained version v1.YYYYMMDDHHMMSS"
```

---

## 4. Frontend ↔ Backend Communication

### HTTP REST (JSON)
All authenticated requests send `Authorization: Bearer <JWT>` header.

```
Client (Vite proxy /api → :8080)
  GET  /health                     → Health check
  POST /auth/login                 → Login
  POST /auth/register              → Register
  GET  /auth/session               → Validate session
  POST /auth/logout                → Logout
  GET  /heatmap                    → Heatmap grid (30s cache)
  GET  /history/attacks            → Historical incidents
  GET  /zones/restricted           → Geofence definitions
  GET  /news                       → RSS/GDELT news
  GET  /watchlist                  → Watchlist items
  POST /watchlist/:id              → Add to watchlist
  DELETE /watchlist/:id            → Remove from watchlist
  GET  /tracks/:id/history         → Track telemetry history
  GET  /settings                   → System settings
  POST /settings                   → Update settings
  GET  /auth/users                 → [Admin] All users
  POST /auth/approve/:username     → [Admin] Approve user
  POST /auth/blacklist/:username   → [Admin] Blacklist user
```

### WebSocket (Real-Time)
```
Client → WSS /ws/stream (JWT auth required in prod)
Server → Client: {type: "telemetry", data: TelemetryPayload}
Server → Client: {type: "anomaly", data: ThreatAssessment}
```

### Server-Sent Events (Public)
```
GET /public/stream → SSE stream
  event: "traces"  data: {traces: TopTrace[], timestamp: string}
  (refreshed every 5 seconds, top 10 by anomaly score)
```

---

## 5. Data Flow Diagram

```mermaid
flowchart LR
    subgraph "Ingestion Layer"
        A1[AISStream WebSocket<br/>Vessels]
        A2[OpenSky REST<br/>Aircraft]
        A3[RSS Feeds<br/>News]
    end

    subgraph "Processing Layer (Go)"
        B1[TrackStateManager<br/>Sliding window 20 obs]
        B2[Feature Extractor<br/>8 features]
        B3[Rule Engine<br/>5-factor scorer]
        B4[ML Client<br/>HTTP to Python]
        B5[GeoStore<br/>Geopolitical zones]
        B6[Composite Scorer<br/>40/40/20 blend]
    end

    subgraph "Storage"
        C1[(SQLite<br/>tracks)]
        C2[(SQLite<br/>anomalies)]
        C3[(SQLite<br/>news)]
    end

    subgraph "Delivery Layer"
        D1[WebSocket Hub<br/>Broadcast]
        D2[SSE Public Stream]
        D3[REST API]
    end

    subgraph "Presentation"
        E1[Leaflet Map]
        E2[Analytics Charts]
        E3[Alert Panel]
        E4[News Feed]
    end

    A1 & A2 --> B1 --> B2 --> B3 & B4 & B5 --> B6
    B6 --> D1 & C2
    A3 --> C3
    B2 --> C1
    D1 --> E1 & E3
    D2 --> E3
    C1 & C2 --> D3 --> E2
    C3 --> D3 --> E4
```

---

## 6. Request Lifecycle

### Authenticated API Request
1. React component calls `api.fetch()` (from `services/api.ts`)
2. `api.ts` retrieves the JWT from `AuthContext` (module-level memory)
3. Request issued with `Authorization: Bearer <token>`
4. Vite dev proxy forwards to `http://localhost:8080`
5. Gin router matches route
6. `JWTMiddleware()` validates token signature + expiry
7. Middleware queries SQLite to confirm session is not revoked
8. `authUser` injected into Gin context
9. Handler executes business logic
10. JSON response returned to client

### WebSocket Lifecycle
1. Client establishes WSS connection to `/ws/stream` (JWT in header or query param)
2. Server upgrades HTTP → WebSocket via `gorilla/websocket`
3. Client registered with `hub.Hub`
4. **Hydration goroutine** immediately loads last 2 hours of tracks+anomalies from SQLite → sends to client
5. Client receives continuous real-time messages as new telemetry arrives
6. On disconnect, client de-registered from hub

---

## 7. Event Flow

```mermaid
flowchart TD
    AIS[AISStream Event] --> INGEST[Go: StartAISStream loop]
    INGEST --> TSM[TrackStateManager.Update]
    TSM --> FEAT[ExtractFeatures]
    FEAT --> RULES[Rule Score]
    FEAT --> MLCALL[MLClient.Predict HTTP POST]
    FEAT --> GEO[GeoStore.ScoreForLocation]
    RULES & MLCALL & GEO --> COMP[ComputeComposite]
    COMP --> HUB_BCAST[hub.Broadcast channel]
    HUB_BCAST --> WS_SEND[WritePump to each Client]
    WS_SEND --> REACT[React: WebSocketContext]
    REACT --> MAP[HormuzMap re-renders]
    REACT --> ALERTS[AlertPanel updates]
```
