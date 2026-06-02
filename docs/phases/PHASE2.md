# Phase 2 – Live Telemetry Integration & Threat Intelligence Foundation (MVP)

## Objective

Replace all simulated telemetry feeds with real-world operational data and establish the foundation for a real-time intelligence platform.

This phase focuses on building a working product before introducing Azure-specific infrastructure.

The outcome should be a live dashboard capable of displaying Geospatial traffic, aviation traffic, regional incidents, environmental hazards, and threat indicators across the Middle East corridor.

This is an MVP phase.

Priorities:

- Real telemetry
- Real-time updates
- Lightweight architecture
- Fast implementation
- Low operational cost
- Resume-quality engineering

Avoid:

- Azure Event Hub
- Azure Stream Analytics
- Azure ML
- Databricks
- AKS
- Complex microservices

These belong to future phases.

---

# Target Architecture

```text
┌──────────────────────────────────────────────┐
│              External Sources                │
├──────────────────────────────────────────────┤
│ AISStream                                    │
│ OpenSky Network                              │
│ NASA FIRMS                                   │
│ GDELT                                        │
│ Open-Meteo                                  │
└──────────────────────────────┬───────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────┐
│        Node.js Ingestion Services            │
└──────────────────────────────┬───────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────┐
│         Threat Correlation Engine            │
└──────────────────────────────┬───────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────┐
│           Server-Sent Events API             │
└──────────────────────────────┬───────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────┐
│         React + Leaflet Dashboard            │
└──────────────────────────────────────────────┘
```

---

# Geographic Scope

Middle East Operational Corridor

Bounding Box:

```text
Latitude:
22° N → 30° N

Longitude:
48° E → 60° E
```

Coverage:

- Strait of Hormuz
- Persian Gulf
- Gulf of Oman
- UAE
- Saudi Arabia
- Qatar
- Bahrain
- Kuwait
- Oman
- Iran

All telemetry sources must be filtered to this region before reaching the frontend.

---

# Phase 2.1 – Geospatial Telemetry

## Provider

AISStream

## Goal

Display live vessel tracking data.

## Responsibilities

- Connect to AISStream WebSocket
- Subscribe using regional bounding box
- Normalize incoming messages
- Broadcast updates through SSE

## Output Schema

```json
{
  "assetType": "vessel",
  "id": "123456789",
  "name": "AL SAFINA",
  "lat": 25.254,
  "lon": 55.32,
  "speed": 14.5,
  "heading": 278,
  "timestamp": "2026-06-01T12:00:00Z"
}
```

---

# Phase 2.2 – Aviation Telemetry

## Provider

OpenSky Network

## Goal

Display commercial aircraft crossing regional airspace.

## Polling Frequency

```text
30 seconds
```

## Responsibilities

- Query OpenSky REST API
- Filter regional aircraft
- Normalize telemetry
- Broadcast updates

## Output Schema

```json
{
  "assetType": "aircraft",
  "callsign": "UAE234",
  "lat": 25.12,
  "lon": 55.45,
  "altitude": 37000,
  "speed": 485,
  "heading": 118
}
```

---

# Phase 2.3 – Thermal Anomalies

## Provider

NASA FIRMS

## Goal

Display industrial fires and thermal hotspots.

## Responsibilities

- Pull FIRMS feed
- Filter regional coordinates
- Convert to GeoJSON
- Display on map

## Output Schema

```json
{
  "eventType": "thermal",
  "lat": 25.31,
  "lon": 55.42,
  "confidence": 95
}
```

---

# Phase 2.4 – Regional Incident Intelligence

## Provider

GDELT

## Goal

Display operational disruptions and regional events.

## Query Topics

```text
Port Closure
Piracy
Drone Activity
Oil Spill
Airspace Restriction
Supply Chain Disruption
Industrial Incident
```

## Output Schema

```json
{
  "eventType": "incident",
  "title": "Port operations delayed",
  "lat": 25.26,
  "lon": 55.29,
  "severity": "high"
}
```

---

# Phase 2.5 – Weather Intelligence

## Provider

Open-Meteo

Avoid paid weather APIs.

## Goal

Provide environmental context.

## Data Points

```text
Wind Speed
Visibility
Cloud Cover
Rain
Storm Conditions
```

---

# Phase 2.6 – Threat Correlation Engine

## Goal

Convert raw telemetry into operational intelligence.

No machine learning in this phase.

Use deterministic scoring.

---

## Rule 1

Speed Reduction

```text
Current Speed < Previous Speed × 0.5
```

Score:

```text
30 points
```

---

## Rule 2

Course Deviation

```text
Course Delta > 45°
```

Score:

```text
20 points
```

---

## Rule 3

AIS Degradation

```text
AIS Age > 10 Minutes
```

Score:

```text
20 points
```

---

## Rule 4

Incident Proximity

```text
Distance < 20nm
```

Score:

```text
20 points
```

---

## Rule 5

Thermal Event Proximity

```text
Distance < 10nm
```

Score:

```text
10 points
```

---

## Threat Output

```json
{
  "asset": "AL SAFINA",
  "score": 84,
  "severity": "high",
  "reasons": ["Speed reduction", "Incident proximity"]
}
```

---

# Phase 2.7 – Real-Time Delivery

## Transport

Server-Sent Events (SSE)

Avoid WebSockets unless required.

## Responsibilities

- Telemetry updates
- Threat updates
- Auto reconnect
- Deduplication
- Heartbeat monitoring

Directory:

```text
api/stream
```

---

# Phase 2.8 – Frontend Mapping

## Framework

Leaflet

Existing implementation must be retained.

## Libraries

```text
react-leaflet
leaflet.markercluster
leaflet.heat
```

---

## Layers

```text
Vessels
Aircraft
Thermal Events
Regional Incidents
Threat Markers
```

---

## Clustering

Use:

```text
Leaflet MarkerCluster
```

---

## Heatmaps

Optional

```text
Vessel Density
Aircraft Density
Incident Density
```

---

# Phase 2.9 – Storage

Use lightweight persistence.

Options:

```text
SQLite
or
PostgreSQL
```

Store:

- Latest telemetry
- Threat events
- Incident cache

Avoid introducing cloud storage during this phase.

---

# Phase 2.10 – Security

Implement:

```text
JWT Authentication
Role-Based Middleware
Input Validation (Zod)
Rate Limiting
```

Avoid:

```text
Azure Entra ID
Managed Identity
Key Vault
```

These belong to Phase 3.

---

# Phase 2.11 – Observability

Use open-source tooling.

Backend:

```text
Pino
Winston
```

Metrics:

```text
Prometheus-compatible endpoint
```

Frontend:

```text
Browser telemetry logging
```

Avoid Azure monitoring services during this phase.

---

# Folder Structure

```text
api/
├── ingestion/
│   ├── aisstream
│   ├── opensky
│   ├── firms
│   ├── gdelt
│   └── weather
│
├── correlation/
│
├── stream/
│
├── services/
│
└── types/

src/
├── components/
├── hooks/
├── pages/
├── map/
└── services/
```

---

# Completion Criteria

Phase 2 is complete when:

✓ AISStream vessels appear live

✓ OpenSky aircraft appear live

✓ NASA FIRMS hotspots appear

✓ GDELT incidents appear

✓ Threat scoring engine operational

✓ SSE updates functioning

✓ Leaflet dashboard updates in real time

✓ Threat markers visible

✓ Local deployment stable

✓ Ready for Azure deployment in Phase 3

At completion, GeospatialOps AI transitions from a mock dashboard into a live regional intelligence platform powered by real-world telemetry and threat correlation.
