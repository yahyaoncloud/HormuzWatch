# Developer Knowledge Base & Roadmap

This document serves as an unstructured collection of technical design decisions, known limitations, and the future roadmap for incoming engineers.

---

## 1. Technical Debt & Known Limitations

### SQLite Concurrency
**Issue**: SQLite is running in WAL mode with `MaxOpenConns(1)`. While this guarantees data integrity without `SQLITE_BUSY` errors, it limits write throughput.
**Impact**: High volume bursts of AIS data can theoretically block the API handlers attempting to read session data, causing HTTP timeouts.
**Resolution Path**: We have a `DATABASE_URL` environment variable ready. Moving to a managed PostgreSQL instance (like Supabase or Azure Database for PostgreSQL) is the immediate next step for scaling.

### Authentication Extensibility
**Issue**: The current Auth module uses local bcrypt hashing and embedded SQLite session tracking.
**Impact**: Maintaining custom auth code increases security risk.
**Resolution Path**: Migrate to an established IdP (Identity Provider) like Auth0, Azure AD B2C, or Clerk. This would allow OAuth2/SAML integrations for enterprise users.

### Frontend Map Performance (React-Leaflet)
**Issue**: Updating hundreds of markers simultaneously triggers heavy React reconciliation passes in `react-leaflet`.
**Impact**: High CPU usage on the client side when observing the entire Gulf region at once.
**Resolution Path**: The application heavily relies on `leaflet.markercluster` to mitigate this. Future optimization involves moving away from React-rendered SVGs inside `L.divIcon` to native Canvas-rendered markers (e.g., deck.gl or mapbox-gl).

---

## 2. Design Conventions

### Go Packages
- We adhere to "vertical slices" rather than MVC layers. For example, `server/internal/auth` contains both the API handlers and the JWT logic.
- Avoid global variables where possible. State (like the database pool `db.DB` and `hub.Hub`) is injected or initialized clearly in `main.go`.

### React Components
- **CSS over Tailwind**: For this portfolio project, vanilla CSS (`index.css`) was preferred to demonstrate fundamental styling and layout skills without relying on a utility framework.
- **Context API over Redux**: Because the state is highly localized to the WebSocket feed and Auth, Redux was deemed unnecessary boilerplate.

---

## 3. Product Roadmap

### Phase 2: Enhanced Intelligence (Next 3 Months)
- **Computer Vision Integration**: Integrate synthetic aperture radar (SAR) satellite imagery to detect "dark vessels" (vessels that have intentionally turned off their AIS transponders).
- **Graph Database**: Map corporate ownership structures of vessels to identify sanctions evasion networks (using Neo4j).
- **Vessel Profiling**: Predict destination ports based on historical trajectory analysis.

### Phase 3: Operationalization
- **Webhooks**: Allow operators to configure outgoing webhooks when a "Critical" anomaly is detected.
- **Mobile App**: A React Native wrapper around the dashboard for on-the-go alerts.
- **Role Granularity**: Introduce `viewer`, `operator`, `analyst`, and `admin` roles.

---

## 4. Useful Debugging Commands

**Inspect SQLite Database Locally:**
```bash
sqlite3 server/hormuzwatch.db
sqlite> .tables
sqlite> SELECT * FROM users;
```

**Test Python ML Service Manually:**
```bash
curl -X POST "http://localhost:8090/api/predict" \
     -H "Content-Type: application/json" \
     -d '{
       "track_id": "test-123",
       "features": {
         "course_delta": 45.0,
         "heading_delta": -45.0,
         "speed_delta": -10.0,
         "average_speed": 15.0,
         "speed_variance": 5.0,
         "ais_gap_minutes": 25.0,
         "dist_restricted_zone": 0.5,
         "dist_historical_site": 5.0
       }
     }'
```

**Generate a Test Token locally (Go):**
Set `AUTH_DISABLED=true` in `server/.env`. This completely bypasses the need for generating tokens and allows you to test protected API routes instantly via Postman or Curl.
