# Backend Documentation

## 1. Runtime & Framework

| Property | Value |
|---|---|
| **Language** | Go 1.25 |
| **HTTP Framework** | Gin v1.9.1 |
| **WebSocket** | Gorilla WebSocket v1.5.3 |
| **Database Driver** | modernc.org/sqlite (pure Go, no CGO) |
| **JWT Library** | golang-jwt/jwt v5 |
| **Auth Hashing** | golang.org/x/crypto/bcrypt |
| **UUID** | google/uuid v1.6.0 |
| **RSS Feed** | mmcdole/gofeed v1.3.0 |
| **Rate Limiting** | golang.org/x/time/rate |
| **Entry Point** | `server/cmd/main.go` |

---

## 2. Folder Structure

```
server/
├── cmd/
│   └── main.go                    ← Application entry point
├── internal/
│   ├── anomaly/
│   │   ├── scorer.go              ← 5-factor rule engine (returns 0-100)
│   │   └── geofence.go            ← Restricted zone polygon containment
│   ├── api/
│   │   ├── handlers.go            ← TelemetryPayload, Analyze, WebSocket
│   │   ├── history.go             ← Historical attack data endpoints
│   │   ├── middleware.go          ← Rate limiting, cache middleware
│   │   ├── news.go                ← RSS/GDELT news endpoint
│   │   ├── public.go              ← SSE public stream, top-traces
│   │   ├── settings.go            ← Key-value system settings
│   │   └── watchlist.go           ← Watchlist CRUD
│   ├── auth/
│   │   ├── handlers.go            ← Register, Login, Logout, user management
│   │   ├── jwt.go                 ← JWT generation and middleware
│   │   └── email.go               ← Admin/user email notifications
│   ├── config/
│   │   └── config.go              ← Primary admin credentials config
│   ├── db/
│   │   ├── db.go                  ← SQLite init, schema creation
│   │   └── postgres.go            ← Optional Postgres connection (Supabase)
│   ├── geo/
│   │   └── haversine.go           ← Haversine distance calculations
│   ├── heatmap/
│   │   └── heatmap.go             ← In-memory spatial grid aggregation
│   ├── integrations/
│   │   ├── aisstream.go           ← AISStream WebSocket client (vessels)
│   │   ├── opensky.go             ← OpenSky REST poller (aircraft)
│   │   ├── gdelt.go               ← GDELT news aggregator
│   │   ├── firms.go               ← NASA FIRMS fire events
│   │   ├── weather.go             ← Open-Meteo weather data
│   │   ├── news.go                ← RSS news aggregator
│   │   ├── retention.go           ← Data retention cleanup worker
│   │   └── workers.go             ← Starts all integration goroutines
│   ├── intelligence/
│   │   ├── composite.go           ← ComputeComposite (40/40/20 blend)
│   │   ├── features.go            ← FeatureVector extraction
│   │   ├── geopolitical.go        ← Zone-based geopolitical score lookup
│   │   ├── ml_client.go           ← HTTP client for Python ML service
│   │   ├── state.go               ← TrackStateManager (sliding window)
│   │   └── trainer.go             ← Automated ML training loop
│   └── websocket/
│       ├── hub/
│       │   ├── hub.go             ← Broadcast hub (fan-out to all clients)
│       │   └── client.go          ← Per-connection read/write pumps
│       └── websocket.go           ← Hub constructor wrapper
└── data/
    └── history-attacks.json       ← Static historical incident data
```

---

## 3. Architecture Pattern

The backend follows a **vertical slice** approach organized by domain, not by layer. Each internal package owns its own models, logic, and DB interactions:

- `anomaly` — scoring algorithms  
- `intelligence` — multi-layer intelligence pipeline  
- `integrations` — external data source adapters  
- `api` — HTTP handlers and middleware  
- `auth` — authentication and authorization  
- `db` — single shared database connection  

---

## 4. Middleware

### CORS Middleware (`main.go`)
Applied globally. In development mode, allows all origins (`*`). **Must be tightened in production.**

### Rate Limiter (`api/middleware.go`)
Uses `golang.org/x/time/rate` token bucket. Applied globally via `router.Use()`. Prevents abuse of public endpoints.

### Cache Middleware (`api/middleware.go`)
30-second in-memory cache applied to heavy geospatial endpoints (`/heatmap`, `/history/attacks`, `/zones/restricted`). Prevents redundant computation on each request.

### JWT Middleware (`auth/jwt.go`)
Validates `Authorization: Bearer <token>` header:
1. Parses and verifies JWT signature against `JWT_SECRET`
2. Checks token expiry
3. Queries SQLite `sessions` table: ensures `revoked_at IS NULL` and `expires_at` not past
4. Injects `AuthenticatedUser{Username, Email, Role, SessionID}` into Gin context

### Admin Only Middleware (`auth/jwt.go`)
Reads `authUser` from Gin context, returns `403` if `role != "admin"`.

---

## 5. Key Services & Business Logic

### TrackStateManager (`intelligence/state.go`)
Thread-safe, in-memory ring buffer of telemetry observations per vessel/aircraft.

```go
// Sliding window: last 20 observations per track
type TrackState struct {
    TrackID   string
    History   []Observation // ring buffer, max 20
    LastUpdated time.Time
}

// Computed on each new observation:
type ComputedDeltas struct {
    CourseDelta   float64 // absolute heading change (degrees)
    HeadingDelta  float64 // signed heading change
    SpeedDelta    float64 // speed_current - speed_previous
    PreviousSpeed float64
    AverageSpeed  float64 // mean over window
    SpeedVariance float64 // variance over window
    AISGapMinutes float64 // minutes since last observation
}
```

### Rule Engine (`anomaly/scorer.go`)
Multi-factor rule-based anomaly scorer returning 0–100:

| Factor | Max Score | Logic |
|---|---|---|
| Course deviation | 34 pts | Linear ramp 10°→90° |
| AIS signal gap | 26 pts | Linear ramp 5→30 min |
| Speed anomaly (deceleration) | 22 pts | Linear ramp 2→15 kts drop |
| Excessive speed | 11 pts | Linear ramp >25 kts |
| Inside restricted zone | 30 pts | Binary flat |
| Approaching restricted zone | 15 pts | Proportional to distance |
| Near historical attack | 15 pts | Binary flat |

### Intelligence Pipeline (`intelligence/`)
```
ExtractFeatures() → FeatureVector (8 ML features + geospatial context)
anomaly.Score()   → ruleScore (0-100, rule-based)
mlClient.Predict() → mlScore (0-100, Python Isolation Forest, 500ms timeout)
GeoStore.ScoreForLocation() → geoScore (0-100, zone-based geopolitical)
ComputeComposite() → FinalScore = rule×0.4 + ml×0.4 + geo×0.2
```

### WebSocket Hub (`websocket/hub/`)
Fan-out broadcast hub:
- `hub.Broadcast` — unbuffered send channel  
- `hub.Register` / `hub.Unregister` — client lifecycle  
- Goroutine per client: `ReadPump` (receives client messages) + `WritePump` (sends hub messages)
- Buffer size: 256 messages per client; overflow drops message (non-blocking `select`)

---

## 6. API Endpoints Reference

### Public Endpoints (No Auth Required)

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Server info + endpoint list |
| `GET` | `/health` | Health check |
| `POST` | `/auth/register` | Register new user |
| `POST` | `/auth/login` | Login, returns JWT |
| `GET` | `/public/top-traces` | Top 10 anomalous vessel traces (JSON) |
| `GET` | `/public/stream` | SSE stream of top traces (every 5s) |

### Authenticated Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/auth/session` | Validate current session | JWT |
| `POST` | `/auth/logout` | Revoke session | JWT |
| `GET` | `/ws/stream` | WebSocket (telemetry + anomaly push) | JWT |
| `GET` | `/heatmap` | Heatmap grid data (30s cache) | JWT |
| `GET` | `/history/attacks` | Historical incident markers | JWT |
| `GET` | `/zones/restricted` | Restricted zone polygons | JWT |
| `GET` | `/news` | RSS/GDELT intelligence news | JWT |
| `GET` | `/settings` | System settings | JWT |
| `POST` | `/settings` | Update system settings | JWT |
| `GET` | `/watchlist` | User's watchlist | JWT |
| `POST` | `/watchlist/:id` | Add track to watchlist | JWT |
| `DELETE` | `/watchlist/:id` | Remove track from watchlist | JWT |
| `GET` | `/tracks/:id/history` | Track telemetry history | JWT |
| `POST` | `/telemetry` | Ingest telemetry (internal use) | JWT |
| `POST` | `/analyze` | Run anomaly analysis | JWT |

### Admin-Only Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/auth/users` | All users |
| `GET` | `/auth/pending` | Pending approval users |
| `PUT` | `/auth/users/:username` | Update user (status/role/email) |
| `DELETE` | `/auth/users/:username` | Delete user |
| `POST` | `/auth/approve/:username` | Approve user access |
| `POST` | `/auth/blacklist/:username` | Blacklist user (revokes sessions) |
| `POST` | `/auth/unblacklist/:username` | Restore blacklisted user |

---

## 7. Auth Disabled Mode

When `AUTH_DISABLED=true`, the server wraps all routes with a JWT middleware that injects a **virtual admin session** (`sessionID = "auth-disabled-session"`, `role = "admin"`). This allows local development without managing credentials.

```bash
# Enable in server/.env
AUTH_DISABLED=true
```

> **Warning:** Never deploy with `AUTH_DISABLED=true` in production.

---

## 8. Background Workers (Started at Startup)

| Worker | Frequency | Purpose |
|---|---|---|
| `StartAISStream` | Persistent (reconnect on error) | Ingest live AIS vessel data |
| `OpenSky poller` | Every 60 seconds | Ingest ADS-B aircraft tracks |
| `StartNewsAggregator` | Configurable | Fetch GDELT/RSS maritime news |
| `StartAutomatedTraining` | Every 1 hour | Retrain ML Isolation Forest |
| `StartRetentionWorker` | Daily | Delete records older than `retention_days` setting |
| `heatmap.StartCleanupRoutine` | Periodic | Prune stale heatmap cells |

---

## 9. Error Handling

- HTTP errors returned as `{"error": "message"}` JSON with appropriate HTTP status codes
- ML service unavailability → graceful degradation: `mlScore = 0.0`, rule engine result used alone
- SQLite write failures → logged to stdout, broadcast continues (data may not persist)
- WebSocket write errors → client goroutine exits, client de-registered from hub
- AISStream disconnect → automatic reconnect after 10-second backoff (infinite retry loop)
