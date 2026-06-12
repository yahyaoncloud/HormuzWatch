# Flow and Load Testing

This document details how HormuzWatch validates its performance under heavy load and traces the user journey from "A to B" across both the MVP and Production architectures.

## 1. "A to B" Flow Testing

HormuzWatch maintains two distinct architectural pipelines. We must flow-test both to ensure data integrity.

### MVP Stack (Vercel + Render + Supabase)
- **A (Ingestion):** Golang worker on Render fetches AIS data and saves it to Supabase Postgres.
- **B (Client):** React app on Vercel connects to the Render WebSocket hub and receives live updates.
- **Testing:** Ensure that the free-tier latency of Render sleeping instances doesn't break the Vercel frontend. Use WebSockets ping/pong to keep the connection alive.

### Production Stack (Azure Cloud)
- **A (Ingestion):** Golang container on Azure Virtual Machine processes high-volume telemetry.
- **B (Client):** React frontend served via Azure Static Web Apps fetches data through the Azure Application Gateway.
- **Testing:** Verify that the Azure Application Gateway WAF (Web Application Firewall) does not aggressively block legitimate WebSocket traffic.

## 2. API & WebSocket Optimization

Real-time geospatial rendering requires thousands of data points per second.
- **Load Testing Tool:** `k6` will be used to simulate 1,000 concurrent WebSocket connections to the Golang Hub.
- **Optimization Strategy:**
  1. **Delta Compression:** Only send coordinates that have changed since the last broadcast, rather than the entire vessel payload.
  2. **Goroutine Pooling:** Ensure the Go backend reuses memory efficiently rather than spinning up boundless goroutines for every incoming HTTP request.

## 3. Database Transition & Tuning (Postgres)

The project initially used local SQLite for rapid prototyping, migrated to Supabase (Postgres) for the MVP cloud layer, and ultimately targets Azure Database for Postgres in production.

### Handling Heavy Read/Writes
Because HormuzWatch ingests constant AIS streaming data while simultaneously serving heatmap density queries to users, the database is under significant stress.
- **Write-Ahead Logging (WAL):** Tune Postgres WAL settings to handle high ingestion rates.
- **Spatial Indexing:** Utilize PostGIS extensions (`GIST` indexes) for boundary box queries on the Strait of Hormuz. Standard B-Tree indexes fail under complex spatial loads.
- **Connection Pooling:** The Go backend MUST use `PgBouncer` or an optimized connection pool to prevent starving the database of available connections during traffic spikes.
