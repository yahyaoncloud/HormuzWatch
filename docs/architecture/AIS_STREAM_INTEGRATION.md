# Production Interchangeable AIS Maritime Telemetry Architecture (Open Waters & AIS Stream)

**Document Path:** `/docs/architecture/AIS_STREAM_INTEGRATION.md`  
**System:** HormuzWatch Maritime & Aerospace Intelligence Platform  
**Target Environment:** Local Dev (`localhost:5173`) & Production VM (`hormuzwatch.aburcloud.com`)  
**Supported Providers:** Open Waters (`ais.openwaters.io`), AIS Stream (`aisstream.io`), Multi-Feed Aggregator, Built-in Gulf Mock Engine

---

## 1. Executive Overview

HormuzWatch implements an **interchangeable maritime telemetry provider abstraction**. Telemetry ingestion is fully decoupled from the downstream processing pipeline, state caching, tactical map rendering, and conflict correlation engines.

```
┌───────────────────────────────┐     ┌───────────────────────────────┐
│     Open Waters Native API    │     │     AISStream.io WebSocket    │
│  wss://ais.openwaters.io/v1   │     │  wss://stream.aisstream.io/v0 │
│   GET /v1/vessels (GeoJSON)   │     │  Compressed Binary / Deflate  │
└───────────────┬───────────────┘     └───────────────┬───────────────┘
                │                                     │
                ▼                                     ▼
        ┌─────────────────────────────────────────────────────┐
        │        AISProvider Interchangeable Abstraction      │
        │      OpenWatersProvider   │   AISStreamProvider     │
        │                   MultiProvider                     │
        └──────────────────────────┬──────────────────────────┘
                                   │ NormalizedAISObservation
                                   │ (MMSI, SOG, COG, Lat, Lon, Provider, Station)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      HormuzWatch Backend Server                        │
│                                                                        │
│   ┌───────────────────────────┐    ┌──────────────────────────────┐    │
│   │    AIS Telemetry Manager  │───▶│    MMSI Vessel State Cache   │    │
│   │ Deduplication & Provenance│    │  (Position, SOG, COG, Track) │    │
│   └─────────────┬─────────────┘    └──────────────┬───────────────┘    │
│                 │                                 │                    │
│                 ▼                                 ▼                    │
│   ┌───────────────────────────┐    ┌──────────────────────────────┐    │
│   │  Rule-Based Anomaly Engine│    │ Incident Traffic Correlation │    │
│   │ (Speed drop, Course delta)│    │ (15 NM Spatial-Temporal Link)│    │
│   └───────────────────────────┘    └──────────────────────────────┘    │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │ REST / WebSocket / SSE
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        React Tactical Frontend                         │
│   • Live Vessel Vectors & Heading   • Spatial Incident Rings (15 NM)   │
│   • Source & Station Provenance     • 4-Tier Confidence Hierarchy      │
│   • Downsampled Historical Tracks   • Zero-Causality Disclaimers       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Interchangeable Provider Interface (`AISProvider`)

The Go backend defines a unified provider interface in `server/internal/integrations/ais/provider.go`:

```go
type AISProvider interface {
    Name() string
    Start(ctx context.Context, onObservation func(*NormalizedAISObservation)) error
    Stop() error
    Health() ProviderHealth
    GetSnapshot(ctx context.Context) ([]*NormalizedAISObservation, error)
}
```

### Supported Providers:

1. **Open Waters Provider (`OpenWatersProvider`):**
   - Stream endpoint: `wss://ais.openwaters.io/v1/stream?snapshot=true`
   - Snapshot endpoint: `GET https://ais.openwaters.io/v1/vessels?bbox=47.0,21.0,62.0,32.0`
   - Preserves ground feeder station IDs (e.g. `DXB-04`) and receiver provenance.
   - Handles GeoJSON `FeatureCollection` and `Feature` payloads.
2. **AIS Stream Provider (`AISStreamProvider`):**
   - Stream endpoint: `wss://stream.aisstream.io/v0/stream`
   - Subscribes with configurable bounding boxes within required 3-second window.
   - Normalizes 10 ITU message types (`PositionReport`, `ShipStaticData`, `Class B`, `AtoN`, `SAR`, etc.).
3. **Multi-Feed Aggregator (`MultiProvider`):**
   - Connects to both feeds simultaneously.
   - Ingests observations through a thread-safe deduplication filter (`MMSI + 5s time slice`).
   - Retains provenance of active transmitters.
4. **Offline Gulf Simulation (`MockAISStream`):**
   - Activated via `AIS_MOCK_ENABLED=true` or when running locally with zero API keys.
   - Accurately models VLCC tankers, LNG carriers, and patrol craft through the Strait of Hormuz.

---

## 3. Core Architectural Principles & Zero-Causality Design

1. **Telemetry vs. Intelligence Separation:** AIS observations are raw transponder telemetry, distinct from conflict intelligence.
2. **Explicit 4-Tier Confidence Hierarchy:**
   - `OBSERVED_AIS_FACT`: Raw GPS coordinate, timestamp, SOG, and COG broadcast by ship transponder.
   - `CALCULATED_PROXIMITY`: Mathematically derived Great-Circle distance (Haversine) and azimuth bearing.
   - `INFERRED_MOVEMENT_ANOMALY`: Algorithmic deviation (speed drop, course alteration) relative to kinematic baseline.
   - `EXTERNALLY_REPORTED_CONFLICT_EVENT`: Incident data from OSINT, UKMTO, or news agency.
3. **Strict Neutral Terminology:** The system never labels vessels as "hostile", "attacked", or "culprit" solely based on telemetry. Neutral descriptors such as *"movement anomaly"*, *"rapid reduction in SOG"*, *"course alteration"*, or *"nearby maritime traffic"* are strictly enforced.
4. **Zero-Causality Disclaimer:**
   > *"HormuzWatch observes maritime telemetry and correlates proximity to public security reports. Spatial proximity indicates co-location in international or regional waterways and does not imply involvement, fault, or hostility."*

---

## 4. Configuration Environment Variables

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `AIS_PROVIDER` | `openwaters` | Active provider: `openwaters`, `aisstream`, `multi` |
| `OPENWATERS_API_KEY` | *(None)* | Open Waters access token / key |
| `OPENWATERS_STREAM_URL` | `wss://ais.openwaters.io/v1/stream` | Open Waters WebSocket URL |
| `OPENWATERS_API_BASE` | `https://ais.openwaters.io` | Open Waters REST snapshot base |
| `AIS_STREAM_API_KEY` | *(None)* | AISStream.io API key |
| `AIS_MOCK_ENABLED` | `false` | Enable built-in simulation for zero-quota local development |
| `AIS_BOUNDING_BOXES` | *(Default Gulf 3-box)* | JSON override for monitored geographic bounding boxes |
| `AIS_STALE_TIMEOUT_SEC` | `3600` | Seconds before purging inactive vessel from memory |
| `AIS_ANOMALY_SPEED_DROP_KNOTS` | `6.0` | SOG reduction threshold for speed drop anomaly |
| `AIS_ANOMALY_COURSE_DELTA_DEG` | `45.0` | Shortest-arc course alteration threshold |

---

## 5. REST & WebSocket API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/public/ais/status` | Service health, active provider, message rate, reconnect counters, vessel count |
| `GET` | `/public/vessels` | All active vessels currently tracked in the Gulf theater |
| `GET` | `/public/vessels/:mmsi` | Detailed state, static voyage properties, and provenance |
| `GET` | `/public/vessels/:mmsi/track` | Chronological downsampled historical track points |
| `GET` | `/public/conflicts/:id/traffic` | Spatial-temporal correlation of nearby vessels within radius |
| `GET` | `/ws/stream` | Unified WebSocket stream delivering real-time telemetry updates |

---

## 6. Verification & Test Suite

```bash
# Run complete AIS provider test suite
cd server
go test -v ./internal/integrations/ais/...
```
Validates:
- Open Waters GeoJSON `FeatureCollection` and direct JSON normalization
- Station & Source provenance retention
- Multi-provider deduplication
- 10 AISStream ITU message types
- Haversine Great-Circle distance & bearing
- Anomaly rules evaluation
- Zlib compression & binary frame decoding
