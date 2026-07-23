# HormuzWatch Backend Codebase Analysis

**Generated:** 2026-07-21  
**Version:** Go 1.25.0  
**Framework:** Gin (v1.9.1) + PostgreSQL (pgx/v5) + gRPC + WebSocket

---

## Executive Summary

The HormuzWatch backend is a **real-time geospatial intelligence platform** for maritime and aviation threat monitoring in the Hormuz Strait region. It combines live AIS/ADS-B telemetry streams, geopolitical event aggregation (GDELT, FIRMS), rule-based anomaly scoring, and ML-based inference (Isolation Forest via gRPC) into a composite threat assessment pipeline.

**Architecture Pattern:** Modular monolith with clear package boundaries, background workers for integrations, in-memory state management with PostgreSQL persistence, and WebSocket-based real-time streaming.

---

## 1. Project Structure Analysis

```
server/
├── cmd/
│   └── main.go                    # Application entry point, wiring, lifecycle
├── environment/
│   └── env.go                     # Environment detection (dev/prod)
├── internal/
│   ├── api/                       # HTTP handlers, middleware, routing
│   │   ├── handlers.go            # Core telemetry/anomaly/WS handlers
│   │   ├── middleware.go          # Rate limiting, caching, API key auth
│   │   ├── briefing.go            # Intelligence briefing endpoints
│   │   ├── conflict_feed.go       # Conflict feed endpoints
│   │   ├── datasets.go            # Dataset management
│   │   ├── handlers.go            # Core handlers
│   │   ├── history.go             # Historical data endpoints
│   │   ├── latex.go               # LaTeX report generation
│   │   ├── news.go                # News aggregation endpoints
│   │   ├── public.go              # Public endpoints
│   │   ├── settings.go            # Settings management
│   │   ├── stream_poll.go         # SSE streaming
│   │   ├── tracks.go              # Track management endpoints
│   │   └── watchlist.go           # Watchlist management
│   ├── auth/                      # Authentication & authorization
│   │   ├── email.go               # Email verification
│   │   ├── handlers.go            # Auth HTTP handlers
│   │   └── jwt.go                 # JWT validation (Supabase + legacy)
│   ├── anomaly/                   # Rule-based anomaly scoring engine
│   │   ├── scorer.go              # Scoring algorithm (0-100)
│   │   └── geofence.go            # Geofence zone definitions & checks
│   ├── config/                    # Configuration management
│   │   └── admin.go               # Admin identity config
│   ├── datasets/                  # Dataset persistence (GDrive queue)
│   │   └── datasets.go
│   ├── db/                        # Database layer (PostgreSQL via pgx)
│   │   ├── db.go                  # Connection pool, schema, migrations
│   │   └── queries.go             # Query helpers with ?→$n rebinding
│   ├── geo/                       # Geospatial utilities
│   │   └── haversine.go           # Haversine distance, bearing
│   ├── heatmap/                   # Real-time heatmap aggregation
│   │   └── aggregator.go          # Grid-based time-windowed heatmap
│   ├── integrations/              # External data source integrations
│   │   ├── aisstream.go           # AISStream.io WebSocket client
│   │   ├── azure.go               # Azure integrations
│   │   ├── firms.go               # NASA FIRMS fire data
│   │   ├── gdelt.go               # GDELT geopolitical events
│   │   ├── kystverket.go          # Kystverket AIS (Norwegian)
│   │   ├── news.go                # RSS news aggregation
│   │   ├── opensky.go             # OpenSky Network ADS-B
│   │   ├── retention.go           # Data retention cleanup
│   │   ├── weather.go             # Open-Meteo weather
│   │   └── worker.go              # Worker orchestration
│   ├── intelligence/              # Core intelligence pipeline
│   │   ├── composite.go           # Composite threat scoring
│   │   ├── features.go            # Feature extraction
│   │   ├── geopolitical.go        # Geopolitical event store
│   │   ├── ml_client.go           # gRPC ML inference client
│   │   ├── state.go               # Track state manager (EWMA)
│   │   └── trainer.go             # Automated ML training
│   ├── mlgrpc/                    # Generated gRPC stubs
│   │   ├── ml_service.pb.go
│   │   └── ml_service_grpc.pb.go
│   └── websocket/                 # WebSocket hub
│       ├── hub/
│       │   └── hub.go             # Hub, client, message types
│       └── websocket.go           # Package re-exports
├── templates/
│   └── report_template.tex        # LaTeX report template
├── .dockerignore
├── .env.example
├── .gitignore
├── Dockerfile
├── go.mod
├── go.sum
├── hormuzwatch.db                 # SQLite (legacy/dev)
├── seed.go
```

---

## 2. Architecture Assessment

### 2.1 Strengths

| Area | Assessment |
|------|------------|
| **Separation of Concerns** | Clear package boundaries: `api`, `auth`, `anomaly`, `intelligence`, `integrations`, `db`, `heatmap`, `websocket` |
| **Real-time Pipeline** | WebSocket hub + background workers + in-memory state manager for low-latency streaming |
| **Resilience Patterns** | Graceful degradation: ML client falls back to local heuristic; workers reconnect with backoff; rate limiting + caching middleware |
| **Security** | JWT validation (Supabase RS256 + legacy HS256), admin-only middleware, single-admin enforcement, bcrypt password hashing, SQL injection prevention via parameterized queries |
| **Observability** | Structured logging with prefixes (`[AISStream]`, `[ML]`, `[Hub]`), graceful shutdown with signal handling |
| **Geospatial Accuracy** | Proper Haversine distance calculations, geofence radius/polygon support, bearing calculations |
| **ML Integration** | gRPC with TLS/mTLS support, 30s result caching, SHAP explanation parsing, automated retraining loop |

### 2.2 Critical Issues (Must Fix)

| # | Issue | Location | Severity | Description |
|---|-------|----------|----------|-------------|
| 1 | **SQL Injection Risk** | `db/queries.go`, `api/handlers.go`, `integrations/aisstream.go` | 🔴 Critical | Using custom `Rebind()` with `?` placeholders but executing raw SQL strings with `fmt.Sprintf` patterns. The `Rebind` function only converts `?` to `$n` but doesn't protect against injection in dynamic query parts. |
| 2 | **Hardcoded Admin Credentials** | `internal/db/db.go:145`, `internal/config/admin.go:15-16` | 🔴 Critical | Default admin password hash and email/username hardcoded. `PRIMARY_ADMIN_EMAIL` default is a real Gmail address. |
| 3 | **Insecure JWT Fallback** | `internal/auth/jwt.go:193-226` | 🔴 Critical | **Accepts unverified Supabase tokens** when signature verification fails (lines 193-226). This is a **critical authentication bypass** — any token with a valid `sub` claim is accepted without signature verification. |
| 4 | **SQLite/PostgreSQL Schema Mismatch** | `internal/db/db.go` | 🔴 Critical | Schema uses `TEXT` for timestamps, `CURRENT_TIMESTAMP` (SQLite), `ON CONFLICT` syntax — written for SQLite but running on PostgreSQL. Will fail or behave unexpectedly. |
| 5 | **No Database Migrations** | `internal/db/db.go` | 🟠 High | Schema applied via raw `Exec()` on startup. No versioning, no rollback, no CI/CD integration. |
| 6 | **Global Mutable State** | `internal/db/db.go:15`, `internal/heatmap/aggregator.go:38`, `internal/intelligence/geopolitical.go:23` | 🟠 High | Package-level `var DB`, `var store`, `var GeoStore` create hidden dependencies, prevent testing, cause init-order issues. |
| 7 | **No Structured Logging** | Throughout | 🟠 High | Uses `log.Printf` with custom prefixes. No log levels, no JSON output, no correlation IDs, no sampling. |
| 8 | **Missing Input Validation** | `api/handlers.go:43-59`, multiple handlers | 🟠 High | `TelemetryPayload` has `binding:"required"` but no range validation (lat/lon bounds, speed limits, heading 0-360). |
| 9 | **WebSocket Origin Check Disabled** | `api/handlers.go:207-208` | 🟠 High | `CheckOrigin: func(r *http.Request) bool { return true }` — allows cross-origin WebSocket hijacking. |
| 10 | **Hardcoded Secrets in Code** | `internal/auth/jwt.go:232`, `internal/db/db.go:145` | 🟠 High | Default JWT secret `"default_unsafe_secret_for_dev_only"`, default admin bcrypt hash. |

---

## 3. Code Quality Analysis

### 3.1 Design Patterns Used

| Pattern | Location | Assessment |
|---------|----------|------------|
| **Repository/DAO** | `db/queries.go` (Exec/Query/QueryRow) | ✅ Good — but no interfaces, tight coupling to `*sql.DB` |
| **Worker Pool** | `integrations/worker.go` → `StartWorkers()` | ✅ Good — clean goroutine orchestration |
| **Hub/Spoke (Pub-Sub)** | `websocket/hub/hub.go` | ✅ Good — thread-safe with RWMutex, non-blocking broadcast |
| **Strategy (Scoring)** | `anomaly/scorer.go`, `intelligence/composite.go` | ✅ Good — composable scoring layers |
| **Circuit Breaker / Fallback** | `intelligence/ml_client.go:233-267` | ✅ Good — gRPC failure → local heuristic |
| **EWMA (Streaming Stats)** | `intelligence/state.go:161-202` | ✅ Excellent — per-track adaptive baselines |
| **Cache-Aside** | `api/middleware.go:79-118`, `intelligence/ml_client.go:197-230` | ⚠️ Basic — no TTL jitter, no distributed cache |
| **Builder (Dial Options)** | `intelligence/ml_client.go:73-115` | ✅ Good — clean TLS/mTLS configuration |

### 3.2 Anti-Patterns & Code Smells

| Smell | Location | Impact |
|-------|----------|--------|
| **God Object (main.go)** | `cmd/main.go:71-315` | 244 lines — wires everything, starts workers, defines all routes. Should use dependency injection / module registration. |
| **Feature Envy** | `integrations/aisstream.go:143-165` | Calls `intelligence.ExtractFeatures`, `anomaly.Score`, `mlClient.Predict`, `intelligence.ComputeComposite` — integration knows too much about intelligence internals. |
| **Primitive Obsession** | `api/handlers.go:43-59` | `TelemetryPayload` uses raw `float64`/`string` — no value objects for `Coordinate`, `Speed`, `Heading`, `TrackID`. |
| **Magic Numbers** | `anomaly/scorer.go:15-46`, `intelligence/state.go:9-16` | Scoring weights, thresholds, EWMA alpha hardcoded. Should be configurable. |
| **Commented/Dead Code** | `api/handlers.go:233-239`, `websocket/hub/hub.go:235-239` | Commented-out hydration logic, unused goroutine wrappers. |
| **Inconsistent Error Handling** | Throughout | Mix of `log.Printf`, `c.JSON(http.Status...)`, bare returns, `_ = db.Exec()`. No unified error type or middleware. |
| **Tight Coupling to Gin** | `api/handlers.go`, `auth/jwt.go` | Handlers depend on `*gin.Context` directly — hard to unit test without Gin. |
| **Circular Import Risk** | `api/handlers.go` imports `intelligence`; `integrations/aisstream.go` imports `api`, `intelligence`, `anomaly`, `db`, `heatmap`, `websocket` | `integrations` is a "kitchen sink" package. |

---

## 4. Go Standards Compliance

| Standard | Status | Notes |
|----------|--------|-------|
| **Go 1.25 Compatibility** | ✅ | Uses `go:build` (not seen but assumed), modern stdlib |
| **Module Path** | ⚠️ | `Geospatial-harmuz-watch/server` — mixed case, should be lowercase per convention |
| **Package Naming** | ✅ | Short, lowercase, single-word mostly |
| **Error Handling** | ⚠️ | Inconsistent — some wrapped with `%w`, some bare, some logged and ignored |
| **Context Usage** | ✅ | Passed in gRPC calls, WebSocket context cancellation |
| **Concurrency Safety** | ✅ | RWMutex used correctly in hub, heatmap, geostore, track manager |
| **Interface Segregation** | ❌ | No interfaces for `DB`, `Hub`, `MLClient`, `TrackStateManager` — prevents mocking |
| **Testing** | ❌ | **Zero `_test.go` files found** in backend. No unit, integration, or contract tests. |
| **Documentation** | ⚠️ | Package comments missing on most packages. Some good function comments. |
| **Linting** | Unknown | No `.golangci.yml` or `Makefile` with `golangci-lint` found. |

---

## 5. Security Audit Summary

### 5.1 Authentication & Authorization

| Mechanism | Status | Issues |
|-----------|--------|--------|
| **JWT Validation** | 🔴 Broken | Unverified token fallback (lines 193-226 in `jwt.go`) |
| **Password Hashing** | ✅ | bcrypt cost 10 (default) |
| **Session Management** | ⚠️ | Custom session table, no rotation, no secure flags on cookies (not used) |
| **Admin Enforcement** | ✅ | Single-admin via email match, middleware check |
| **API Key Auth** | ✅ | `MetricsAuthMiddleware` for dataset endpoints |
| **Rate Limiting** | ✅ | IP-based, 20 req/s burst 40 (in-memory, not distributed) |

### 5.2 Data Protection

| Area | Status |
|------|--------|
| **TLS in Transit** | ✅ Enforced for DB (`sslmode=require`), gRPC (configurable), AISStream (configurable) |
| **Secrets Management** | ⚠️ Env vars only, no Vault/Secret Manager integration |
| **PII Handling** | ⚠️ Email stored, no encryption at rest, no GDPR tooling |
| **SQL Injection** | 🔴 **Critical** — see Issue #1 |

### 5.3 Network Security

| Vector | Status |
|--------|--------|
| **CORS** | ⚠️ Permissive default (`*`), configurable via `ALLOWED_ORIGINS` |
| **WebSocket Origin** | 🔴 **Disabled** — allows CSRF/WSH |
| **Helmet Headers** | ❌ Missing (no CSP, HSTS, X-Frame-Options) |

---

## 6. Performance & Scalability

| Component | Current | Bottleneck | Recommendation |
|-----------|---------|------------|----------------|
| **Database** | `sql.DB` pool (10/5) | Single writer, no read replicas | Add PgBouncer, read replicas |
| **Heatmap** | In-memory map, 1hr window | O(N) cleanup every 5min, unbounded growth | Redis sorted sets + TTL |
| **Geopolitical Store** | In-memory slice | Linear scan O(N) on every score | R-tree / geohash index, or PostGIS |
| **Track State** | In-memory map | Single process, no horizontal scaling | Redis Streams + consumer groups |
| **ML Inference** | gRPC + 30s cache | Single client, no connection pool tuning | gRPC load balancing, batch prediction |
| **WebSocket Hub** | Single process, in-memory | Cannot scale horizontally | Redis Pub/Sub or NATS for fan-out |
| **Rate Limiter** | In-memory map | Per-process, not distributed | Redis-based token bucket |

---

## 7. Recommended Refactoring Roadmap

### Phase 1: Critical Security (Week 1-2)
1. **Fix JWT unverified token fallback** — Remove lines 193-226 in `jwt.go`, enforce signature verification
2. **Fix SQL injection** — Use parameterized queries everywhere; remove custom `Rebind`, use `pgx` native `$n`
3. **Remove hardcoded secrets** — Generate secure defaults at deploy time, use env vars only
4. **Enable WebSocket origin check** — Validate against `ALLOWED_ORIGINS`
5. **PostgreSQL schema migration** — Rewrite schema for Postgres (TIMESTAMPTZ, proper types, SERIAL/UUID)

### Phase 2: Architecture & Testability (Week 3-4)
1. **Extract interfaces** — `Database`, `TrackStore`, `MLClient`, `Hub`, `Cache`
2. **Dependency injection** — Wire in `main.go` via constructor injection
3. **Add database migrations** — Use `golang-migrate` or `goose`
4. **Introduce structured logging** — `zerolog` or `slog` (Go 1.21+) with JSON output
5. **Write unit tests** — Target: anomaly scorer, feature extraction, EWMA, geofence, composite scoring

### Phase 3: Scalability & Observability (Week 5-6)
1. **Distributed caching** — Redis for heatmap, rate limiting, ML cache
2. **Horizontal WebSocket** — Redis Pub/Sub or NATS for multi-instance hub
3. **Metrics & Tracing** — Prometheus metrics, OpenTelemetry tracing
4. **Health checks** — `/health/live`, `/health/ready` with dependency checks
5. **Graceful degradation** — Circuit breakers for external APIs (AISStream, OpenSky, GDELT)

### Phase 4: Code Quality (Ongoing)
1. **Linting CI** — `golangci-lint` with strict config
2. **API versioning** — `/api/v1/` prefix, deprecation policy
3. **OpenAPI/Swagger** — Generate from code (`swag` or `oapi-codegen`)
4. **Configuration management** — `koanf` or `viper` with validation
5. **Domain-driven packages** — Split `integrations` into per-source packages

---

## 8. Specific File-Level Recommendations

### `cmd/main.go`
- Split into: `cmd/server/main.go` (thin), `internal/bootstrap/*.go` (wiring)
- Use a `Server` struct with `Run()` method for testability

### `internal/db/db.go`
- Replace `Exec(schema)` with migration files
- Use `pgx.Conn` / `pgxpool.Pool` directly for better performance
- Remove `Rebind` — use `$1, $2` natively

### `internal/auth/jwt.go`
- **Delete lines 193-226** (unverified token fallback)
- Add JWKS caching for Supabase public keys
- Use `golang-jwt/v5` with `ParseWithClaims` and proper validation

### `internal/integrations/aisstream.go`
- Extract feature extraction → scoring → persistence into `intelligence/pipeline.go`
- Integration should only: connect, parse, call `pipeline.Process(telemetry)`

### `internal/heatmap/aggregator.go`
- Replace in-memory with Redis `GEOADD` + `GEORADIUS` or sorted sets with TTL
- Add `source` as label/tag for filtering

### `internal/intelligence/state.go`
- Extract `TrackState` to its own package
- Consider persisting EWMA state to DB for restart resilience

### `api/middleware.go`
- Move rate limiter to Redis for multi-instance
- Add request ID middleware (correlation ID)

---

## 9. Dependency Analysis

### Direct Dependencies (go.mod)
| Package | Version | Purpose | Risk |
|---------|---------|---------|------|
| `github.com/gin-gonic/gin` | v1.9.1 | HTTP framework | Low — mature |
| `github.com/golang-jwt/jwt/v5` | v5.2.0 | JWT | Medium — CVE history, pin patch |
| `github.com/jackc/pgx/v5` | v5.10.0 | PostgreSQL driver | Low — excellent |
| `github.com/gorilla/websocket` | v1.5.3 | WebSocket | Low — stable |
| `google.golang.org/grpc` | v1.82.0 | gRPC | Low — Google maintained |
| `github.com/aisstream/ais-message-models` | v0.0.0-20230628 | AIS parsing | **High** — pseudo-version, no semver, unmaintained? |

### Indirect Risks
- `golang.org/x/oauth2` v0.36.0 — check for token source vulnerabilities
- `google.golang.org/api` v0.289.0 — large surface, keep updated

---

## 10. Testing Strategy (Missing — Must Implement)

| Layer | Target | Tools |
|-------|--------|-------|
| **Unit** | `anomaly`, `intelligence`, `geo`, `heatmap` | `testing`, `testify/assert`, `gomock` |
| **Integration** | `db`, `auth`, `api` handlers | `testcontainers-go` (PostgreSQL), `httptest` |
| **Contract** | gRPC ML service | `buf` / `protoc` validation |
| **Load** | WebSocket hub, API endpoints | `k6`, `hey` |
| **Security** | SQLi, auth bypass, CORS | `gosec`, `trivy`, manual pen-test |

---

## 11. Conclusion

The HormuzWatch backend demonstrates **strong domain knowledge** and a **functional real-time pipeline** with sophisticated geospatial intelligence. However, it has **critical security vulnerabilities** (unverified JWT acceptance, SQL injection risk, hardcoded secrets) and **architectural technical debt** (global state, no interfaces, no tests, God main) that prevent production readiness.

**Priority:** Fix security issues (Phase 1) before any feature work. The codebase is salvageable with focused refactoring — the core algorithms (EWMA, scoring, geofence) are well-designed and should be preserved.

---

*Analysis performed by automated code review. Recommend manual security audit for production deployment.*