# HormuzWatch — Production-Grade Roadmap & Master Engineering Backlog

## 1. Critical — Must Fix (P0)

- [x] **Priority:** P0  
  **Area:** Security / Terraform NSG  
  **Problem:** Unrestricted `0.0.0.0/0` SSH access rule in Terraform.  
  **Fix:** Restricted to `var.admin_allowed_cidr` in `terraform/main.tf`.

- [x] **Priority:** P0  
  **Area:** Reliability / Rate Limiter Memory Leak  
  **Problem:** Unbounded map growing indefinitely under scanning traffic.  
  **Fix:** Replaced with `visitor` struct and 5-minute eviction ticker in `server/internal/api/middleware.go`.

- [x] **Priority:** P0  
  **Area:** Configuration / Race Condition  
  **Problem:** Static admin credentials evaluated before `.env` parsing.  
  **Fix:** Replaced with `InitAdminConfig()` and dynamic getters in `server/internal/config/admin.go`.

- [x] **Priority:** P0  
  **Area:** Reliability / Worker Lifecycle  
  **Problem:** Ingestion workers lacked `context.Context` cancellation.  
  **Fix:** Added graceful shutdown cancellation across all collectors in `server/internal/integrations/`.

---

## 2. Cloud Architecture

- [ ] **Priority:** P1  
  **Area:** Azure Compute Platform  
  **Problem:** Standardize production deployment on **Azure Container Apps (ACA)** with dedicated internal ingress for ML inference and external ingress for Go API.

- [ ] **Priority:** P1  
  **Area:** Identity & Access Management  
  **Problem:** Provision User-Assigned Managed Identity for containers and grant Key Vault Secrets User / Storage Blob Data Contributor RBAC roles.

---

## 3. Go Backend

- [x] **Priority:** P1  
  **Area:** gRPC Client Resilience  
  **Problem:** ML client lacked circuit breaker.  
  **Fix:** Implemented 3-state Circuit Breaker (`CLOSED`, `OPEN`, `HALF-OPEN`) with canary probing in `server/internal/intelligence/ml_client.go`.

- [x] **Priority:** P1  
  **Area:** Health Checks & Readiness Probes  
  **Problem:** Health check returned static `200 OK`.  
  **Fix:** Added `/health/live` and `/health/ready` (checking DB pool latency, WebSocket hub, and ML circuit status) in `server/internal/api/handlers.go` and `server/internal/bootstrap/router.go`.

- [x] **Priority:** P2  
  **Area:** WebSocket Broadcasting & Hub Backpressure  
  **Problem:** WebSocket broadcast queue lacked drop counters.  
  **Fix:** Added atomic drop counters and stats reporting in `server/internal/websocket/hub/hub.go`.

---

## 4. Python ML Service

- [x] **Priority:** P1  
  **Area:** Model Registry & Integrity Verification  
  **Problem:** Model artifacts loaded without cryptographic verification.  
  **Fix:** Added `manifest.json` with SHA-256 hashes and load-time validation in `service/ml-service/app.py` and `grpc_server.py`.

- [x] **Priority:** P1  
  **Area:** Drift Detection & Monitoring  
  **Problem:** No automated drift detection.  
  **Fix:** Implemented PSI and KS statistics in `service/ml-service/lib/drift.py` and exposed `/drift/status` and `/drift/evaluate/{domain}`.

- [x] **Priority:** P2  
  **Area:** Dual-Protocol Unification & Signal Coordination  
  **Problem:** Coordinated shutdown across FastAPI diagnostics and gRPC inference.  
  **Fix:** Implemented unified `SIGINT`/`SIGTERM` coordination in `service/ml-service/service_entrypoint.py`.

---

## 5. Frontend & Mapping System

- [x] **Priority:** P1  
  **Area:** Map Tile Provider & Tactical Raw Grading  
  **Problem:** Replaced third-party keyed/watermarked tile providers with direct, production-grade ESRI ArcGIS Canvas & Imagery basemaps.  
  **Fix:** Configured ESRI World Dark Gray Canvas, World Imagery, and World Light Gray Base with raw tactical shader grading (`tactical-esri-dark`, `tactical-esri-satellite`, `tactical-osm-fallback`), full environment variable configurability (`VITE_MAP_TILE_URL_DARK`, `VITE_MAP_TILE_URL_SATELLITE`, `VITE_MAP_TILE_URL_LIGHT`, `VITE_MAP_TILE_URL_FALLBACK`, `VITE_MAP_ATTRIBUTION`), and automatic error recovery in `client/src/components/maps/LeafletMapInner.tsx` and `client/src/environments/environment.ts`.

- [x] **Priority:** P1  
  **Area:** Molecular Component Formatting & Theme Parity  
  **Problem:** High JSX duplication, monolithic store file (783 lines), prop drilling, and manual inline styling across route pages.  
  **Fix:** Established Atomic/Molecular architecture in `client/TODO.md`:
  - Created canonical domain types (`types/telemetry.ts`, `types/health.ts`, `types/metrics.ts`).
  - Created atomic & molecular primitives (`StatusIndicator`, `HoverLogCard`, `HudMetricBadge`, `LayerToggleGroup`).
  - Extracted modular Zustand store slices (`stores/slices/map.store.ts`, `stores/slices/health.store.ts`).
  - Refactored `HomeTopBar.tsx` into clean declarative composition using theme CSS tokens.

- [ ] **Priority:** P2  
  **Area:** Client-Side Tile Caching & Offline PWA Caching  
  **Problem:** Map tiles are fetched on every session without service worker IndexedDB caching for tactical offline usage.  
  **Recommended Improvement:** Configure service worker caching with Cache-Control TTL headers for raster tile assets.

- [ ] **Priority:** P2  
  **Area:** Map Error Observability  
  **Problem:** Client-side tile network failures are only logged to browser console.  
  **Recommended Improvement:** Emit telemetry metrics to Sentry / Application Insights when fallback basemap is activated.

---

## 6. DevOps / CI/CD & Delivery Pipelines

- [ ] **Priority:** P1  
  **Area:** Multi-Pipeline Delivery Architecture  
  **Recommended Implementation:**
  1. `server.yml`: Go backend CI/CD (lint, test, build, Docker, Trivy scan, deploy to ACR/ACA).
  2. `ml-service.yml`: ML serving container CI/CD (pytest, lint, Docker build, security scan, deploy).
  3. `ml-training.yml`: MLOps training, statistical evaluation gates, artifact registration, and model promotion.
  4. `frontend.yml`: React SPA pipeline (typecheck, lint, build, test, deploy to Vercel/CDN).
  5. `terraform.yml`: Infrastructure as Code pipeline (`terraform fmt`, `tflint`, `validate`, `plan` on PR, `apply` on main).
