# 📊 HormuzWatch Observability Dev Stack (`service/observability/`)

A pre-configured development observability layer bundling **Prometheus** for metric collection and **Grafana** for SRE visualization.

---

## 🏗️ Components

| Component | Port | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Prometheus** | `9090` | `http://localhost:9090` | Time-series scraper scraping Go API (`:10020/metrics`) and ML engine (`:8090/metrics`) |
| **Grafana** | `3001` | `http://localhost:3001` | Pre-provisioned SRE Dashboard with automatic Prometheus datasource (`admin` / `admin`) |

---

## 📈 Pre-Configured Dashboards

The Grafana instance automatically provisions `dashboards/hormuzwatch-sre.json`:
- **Total Ingestion Cycles**: Live counter of AIS and ADS-B ingestion passes.
- **Observations & Anomaly Rate**: Timeseries graph plotting observations processed vs. anomalies flagged per second.
- **Active WebSocket Subscribers**: Gauge tracking connected real-time clients.
- **Database Latency & Pool Health**: Supabase PostgreSQL query latency and connection pool metrics.

---

## 🚀 Quickstart

```bash
# Start Observability Stack
docker compose -f service/observability/docker-compose.observability.yml up -d

# Stop Observability Stack
docker compose -f service/observability/docker-compose.observability.yml down
```
