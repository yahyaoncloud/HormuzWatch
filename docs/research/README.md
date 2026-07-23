# Research & Intelligence Sources

This directory contains research materials, intelligence source documentation, and reference notes used for the Geospatial HormuzWatch project.

---

## Intelligence Data Sources

| Source | Type | Coverage | Integration | Status |
|--------|------|----------|-------------|--------|
| **AISStream** | WebSocket | Live AIS vessel positions (Strait of Hormuz, Persian Gulf) | `internal/integrations/aisstream.go` | ✅ Active |
| **OpenSky Network** | REST API | ADS-B aircraft state vectors | `internal/integrations/opensky.go` | ✅ Active |
| **GDELT 2.0** | REST (Geo API) | Global conflict events, protests, military activity | `internal/integrations/gdelt.go` | ✅ Active |
| **NASA FIRMS** | REST API | Active fire/hotspot detection (MODIS/VIIRS) | `internal/integrations/firms.go` | ✅ Active |
| **News RSS Feeds** | RSS/Atom | 16 regional news sources (Persian Gulf, Iran, UAE, Oman, Qatar, maritime security) | `internal/intelligence/source/rss.go` + `gulf_sources.go` | ✅ Active |
| **Custom Scrapers** | HTTP + DOM | Government/military press releases, port authority notices | `internal/intelligence/source/scraper.go` | ✅ Active |

---

## News Intelligence Pipeline

### Source Registry (16 Configured Sources)

| ID | Source | Country | Language | Type | Category |
|----|--------|---------|----------|------|----------|
| `tasnim` | Tasnim News Agency | Iran | Persian | RSS | Official |
| `farsnews` | Fars News Agency | Iran | Persian | RSS | Official |
| `irna` | IRNA | Iran | Persian | RSS | Official |
| `mehrnews` | Mehr News Agency | Iran | Persian | RSS | Official |
| `isna` | ISNA | Iran | Persian | RSS | Official |
| `kayhan` | Kayhan | Iran | Persian | RSS | Official |
| `theiranproject` | The Iran Project | Iran | English | RSS | Analysis |
| `tehrantimes` | Tehran Times | Iran | English | RSS | Official |
| `presstv` | Press TV | Iran | English | RSS | Broadcast |
| `gulfnews` | Gulf News | UAE | English | RSS | Regional |
| `thenationalnews` | The National News | UAE | English | RSS | Regional |
| `timesofoman` | Times of Oman | Oman | English | RSS | Regional |
| `muscatdaily` | Muscat Daily | Oman | English | RSS | Regional |
| `qatar_tribune` | Qatar Tribune | Qatar | English | RSS | Regional |
| `maritime_executive` | The Maritime Executive | Global | English | RSS | Maritime |
| `lloyds_list` | Lloyd's List Intelligence | Global | English | RSS | Maritime |

*Defined in `server/internal/intelligence/source/gulf_sources.go`*

---

## ML Processing Pipeline

### Anomaly Detection (Python ML Service)

**Architecture**: FastAPI (port 8090) + gRPC (port 8091) for low-latency inference
**Model**: IsolationForest + LOF ensemble (scikit-learn) with XGBoost classifier
**GPU Support**: ROCm (AMD) via PyTorch, CuPy, XGBoost GPU; CUDA fallback

**Features (18-dim vector)**:
- Vessel: speed anomaly, course change, loitering, AIS gap, draught anomaly, proximity to infrastructure
- Aircraft: altitude deviation, squawk anomaly, holding pattern, airspace violation
- News: risk score, entity density, sentiment, geographic proximity to assets

**Training**: `ml-service/train_gpu.py` — ROCm-accelerated with joblib model bundles
**CLI**: `ml-service/ml_cli.py serve|status|stop|train|models|predict`

### News Intelligence Pipeline (Go)

**5-Layer Architecture**:

```
LAYER 1: INGEST         → source/ (16 sources, interface.go, registry)
LAYER 2: ORCHESTRATION  → scheduler/jobs.go + worker/pool.go (4 workers, 2/sec rate limit)
LAYER 3: ML PROCESSING  → news/scorer.go orchestrator
     ├── cleaner.go      HTML strip, unicode normalize
     ├── dedup.go        URL hash, SimHash, content hash
     ├── language.go     Unicode-range detection (ar/fa/he/en)
     ├── entity.go       Gazetteer NER (80+ locations) + regex patterns
     ├── enrichment.go   Category classification + risk mapping
     ├── features.go     18-dim NewsFeatureVector
     └── scorer.go       6-subscore composite (0-100)
LAYER 4: GEO-EXTRACTION → news/coordinates.go (4-phase) + geocode.go (80+ gazetteer)
LAYER 5: PERSISTENCE    → news/persist.go + db/queries_news.go → PostgreSQL
```

### State Machine (Article Lifecycle)

```
QUEUED → PROCESSING → SCORED → GEOCODED → STORED → DONE
                ↘️          ↘️           ↘️
               ERROR      ERROR       ERROR
```

*Defined in `server/internal/intelligence/news/pipeline_state.go` with valid transitions, retry logic, and stuck-item eviction.*

---

## Geospatial Processing

### Coordinate Extraction (4-Phase)

1. **Gazetteer Match** — 80+ named locations (ports, straits, islands, cities) with pre-cached lat/lon
2. **DMS/DD Regex** — Degrees/Minutes/Seconds and Decimal Degrees patterns
3. **UTM/MGRS** — Military grid reference systems
4. **Fallback** — Country/region centroid from source metadata

*Implemented in `server/internal/intelligence/news/coordinates.go` + `geocode.go`*

### Map Visualization

**Frontend**: MapLibre GL + Leaflet dual-layer
**Data Format**: GeoJSON `FeatureCollection` with properties:
```typescript
interface NewsMapFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    id: string;
    title: string;
    riskScore: number;      // 0-100
    category: string;       // conflict, maritime, military, etc.
    entities: string[];     // extracted entities
    coordinates: { lat: number; lon: number; confidence: number };
    publishedAt: string;
  };
}
```

**Heatmap**: Kernel density estimation via `--color-heatmap-*` CSS tokens (blue → green → amber → red)

---

## Threat Scoring (News)

**6 Sub-scores (weighted composite 0-100)**:

| Component | Weight | Description |
|-----------|--------|-------------|
| **Entity Density** | 0.25 | Count of military/port/infrastructure entities |
| **Keyword Severity** | 0.20 | Threat lexicon matches (attack, missile, seizure, etc.) |
| **Category Risk** | 0.20 | Conflict > Maritime > Military > Diplomatic > Economic |
| **Source Credibility** | 0.15 | Official > Regional > International > Social |
| **Recency** | 0.10 | Exponential decay (half-life ~24h) |
| **Geographic Proximity** | 0.10 | Distance to strategic chokepoints (Hormuz, Bab al-Mandab) |

*Defined in `server/internal/intelligence/news/scorer.go`*

---

## Infrastructure & Observability

### Stream Analytics (`stream-analytics/`)
- **ais-anomaly-queries.sql**: 7 production SQL queries (gap detection, course deviation, speed anomaly, geofence proximity, hourly aggregation, track history, threat density heatmap)
- Target: PostgreSQL/TimescaleDB continuous aggregates

### Infra Observability (`infra-observability/`)
- **Prometheus**: Metrics collection (backend, ML, node, postgres)
- **Grafana**: Dashboards (golden signals, business KPIs, ML model health)
- **OpenSearch**: Log aggregation (Fluent Bit shipper)
- **Jaeger**: Distributed tracing (OTEL Collector)
- **AlertManager**: PagerDuty/Slack/email routes

### Terraform (`terraform/`)
- **Modules** (7): app, ai-services, networking, security, storage, event_hubs, monitoring
- **Environments**: dev, test, prod (separate state)
- **Target**: Azure (Container Apps, PostgreSQL Flexible Server, AKS, Event Hubs, Monitor)

---

## API Surface

### REST (Go Backend, port 10020)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | DB + WS + version |
| `/api/v1/news/articles` | GET | Paginated articles (unified `{data, total}` wrapper) |
| `/api/v1/news/map` | GET | GeoJSON FeatureCollection for map |
| `/api/v1/news/heatmap` | GET | Aggregated risk buckets for heatmap |
| `/api/v1/news/metrics` | GET | Risk distribution, category counts, source stats |
| `/api/v1/events` | GET | AIS/ADS-B anomaly events |
| `/api/v1/threats` | GET | High-severity threats |
| `/api/v1/timeline` | GET | Chronological event feed |
| `/api/v1/sources` | GET/POST | Source registry CRUD |
| `/api/v1/admin/*` | * | Auth-protected admin operations |

### gRPC (Python ML, port 8091)
- `PredictRisk(NewsFeatureVector) → RiskScore`
- `BatchPredict(...) → repeated RiskScore`
- `HealthCheck() → ModelInfo`

### WebSocket (Real-time)
- `ws://host:10020/ws/tracks` — Live vessel/aircraft positions
- `ws://host:10020/ws/events` — Anomaly event stream

---

## Versioning & Deployment

| Component | Version | Build |
|-----------|---------|-------|
| **Platform** | `2.0.0` | Go ldflags (`-X main.Version=...`) |
| **Go Backend** | `2.0.0` | `VERSION` file + git commit SHA |
| **Python ML** | `2.0.0` | `APP_VERSION` env var |
| **Frontend** | `2.0.0` | `VITE_APP_VERSION` build arg |

**Docker Compose**: Multi-service with `ml-models` named volume, `VERSION` interpolation, client in `full` profile.

---

## Recent Major Changes (July 2026)

- ✅ Unified 16-source news registry (migrated from 5 hardcoded feeds)
- ✅ Article lifecycle state machine with valid transitions
- ✅ 4-phase coordinate extraction + 80-location gazetteer
- ✅ Content-hash deduplication + SimHash near-dup detection
- ✅ LLM translation gating (OpenRouter) for non-English content
- ✅ Unified API response wrapper `{data: [], total: n}` across all handlers
- ✅ AMD ROCm GPU support for ML training/inference
- ✅ Linux deployment guide + systemd services + Cloudflare Tunnel
- ✅ Stream analytics SQL + Infra observability stack + Terraform modules
- ✅ Accent color migration: brown/zinc → indigo (light/dark)

---

## Key File Index

```
server/
├── cmd/main.go                           # Entry point, version injection
├── internal/
│   ├── intelligence/
│   │   ├── news/                         # 11-file pipeline (cleaner→persist)
│   │   ├── source/                       # 6-file registry (interface, rss, api, scraper, gulf, retry)
│   │   └── pipeline.go                   # ProcessAndStore orchestration
│   ├── scheduler/jobs.go                 # 15-min ticker → worker pool
│   ├── worker/pool.go + collector.go     # 4 workers, rate limit, retry
│   ├── api/
│   │   ├── news_handlers.go              # Unified map/heatmap/metrics
│   │   ├── event_handlers.go             # AIS/ADS-B anomalies
│   │   └── entity_handlers.go            # Track management
│   └── db/queries_news.go                # All article SQL + geo queries
├── DESIGN.md                             # This LLD document
ml-service/
├── app.py                                # FastAPI + gRPC server
├── train_gpu.py                          # ROCm training pipeline
├── ml_cli.py                             # serve|status|train|predict
├── lib/scoring.py                        # IsolationForest + LOF ensemble
└── schemas.py                            # Pydantic request/response
client-v2/
├── src/styles/globals.css                # @theme tokens (indigo palette)
├── src/components/maps/                  # MapLibre + Leaflet components
├── src/app/routes/public/intelligence/   # Map + news views
└── src/lib/api.ts                        # Typed API client
stream-analytics/
├── ais-anomaly-queries.sql               # 7 analytics queries
infra-observability/
├── docker-compose.yml                    # Prometheus/Grafana/OpenSearch/Jaeger/OTEL
terraform/
├── modules/ (7)                          # Azure infra as code
└── environments/dev|test|prod/
docs/
├── ARCHITECTURE.md                       # System architecture
├── DEVOPS.md                             # Operations guide
├── LINUX_DEPLOYMENT.md                   # GPU-enabled Linux deploy
├── MIGRATION_WINDOWS_TO_LINUX.md
└── research/README.md                    # This file
```

---

## References

- [AISStream Documentation](https://aisstream.io/docs)
- [OpenSky Network API](https://opensky-network.org/apidoc/rest.html)
- [GDELT 2.0 API](https://blog.gdeltproject.org/gdelt-2-0-our-global-world-in-realtime/)
- [NASA FIRMS API](https://firms.modaps.eosdis.nasa.gov/api/)
- [ROCm Documentation](https://rocm.docs.amd.com/)
- [Tailwind CSS v4 @theme](https://tailwindcss.com/docs/theme)
- [React Router v8 Framework Mode](https://reactrouter.com/start/framework/installation)