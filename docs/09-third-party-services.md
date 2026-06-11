# Third-Party Services & Integrations

HormuzWatch aggregates data from multiple external APIs to build a comprehensive picture of the maritime domain. All integrations run as persistent or polling goroutines within the Go backend (`server/internal/integrations/`).

---

## 1. AISStream (Live Vessel Data)

**Purpose:** Provides real-time Automatic Identification System (AIS) telemetry for maritime vessels.

| Detail | Value |
|---|---|
| **Protocol** | Secure WebSocket (`wss://stream.aisstream.io/v0/stream`) |
| **Authentication** | API Key embedded in initial subscription JSON payload |
| **Env Variable** | `AISSTREAM_API_KEY` |
| **File Location** | `server/internal/integrations/aisstream.go` |
| **Data Mapped** | `MMSI` (TrackID), `ShipName`, `Latitude`, `Longitude`, `SOG` (Speed), `COG` (Course) |

**Integration Logic:**
- Connects and subscribes to a specific geographic bounding box (Strait of Hormuz).
- Parses incoming JSON messages. Filters for `PositionReport`.
- Streams updates directly into `TrackStateManager.Update()`.
- Implements an infinite retry loop with a 10-second backoff to handle network disconnects gracefully.

---

## 2. OpenSky Network (Live Aircraft Data)

**Purpose:** Provides live ADS-B telemetry for aircraft, tracking airborne patrols or commercial flights in the region.

| Detail | Value |
|---|---|
| **Protocol** | REST API (`https://opensky-network.org/api/states/all`) |
| **Authentication** | Basic Auth (`username:password`) |
| **Env Variables** | `OPENSKY_USERNAME`, `OPENSKY_PASSWORD` |
| **File Location** | `server/internal/integrations/opensky.go` |
| **Data Mapped** | `Icao24` (TrackID), `Callsign`, `Latitude`, `Longitude`, `Velocity` (Speed), `TrueTrack` (Heading) |

**Integration Logic:**
- Polls the API every 60 seconds (rate limited to prevent bans).
- Requests data specifically bounded by the Strait of Hormuz bounding box (`lamin`, `lamax`, `lomin`, `lomax`).
- Converts speed from m/s to Knots to align with maritime vessel standards.
- Streams updates into `TrackStateManager.Update()`.

---

## 3. NASA FIRMS (Fire Events)

**Purpose:** Fire Information for Resource Management System. Identifies potential kinetic strikes, offshore rig fires, or significant thermal anomalies.

| Detail | Value |
|---|---|
| **Protocol** | REST API |
| **Authentication** | Map Key |
| **Env Variable** | `FIRMS_MAP_KEY` |
| **File Location** | `server/internal/integrations/firms.go` |

**Integration Logic:**
- Intended for future or specialized geographical correlation. The integration package is prepared for polling active thermal data in the region.

---

## 4. GDELT (Global Database of Events, Language, and Tone)

**Purpose:** Real-time geopolitical intelligence and event extraction.

| Detail | Value |
|---|---|
| **Protocol** | JSON/CSV API |
| **Authentication** | None (Public) |
| **File Location** | `server/internal/integrations/gdelt.go` |

**Integration Logic:**
- Polls for recent events tagged with maritime or relevant regional taxonomy.
- Normalizes data into the `news` SQLite table to surface on the dashboard and inform the `geopolitical` threat score context.

---

## 5. RSS News Aggregator

**Purpose:** Fetches targeted maritime security bulletins from trusted sources.

| Detail | Value |
|---|---|
| **Library** | `github.com/mmcdole/gofeed` |
| **Authentication** | None |
| **File Location** | `server/internal/integrations/news.go` |

**Integration Logic:**
- Polls RSS feeds (e.g., Maritime Executive, generic security feeds) on a schedule.
- UPSERTs unique articles (based on URL/GUID) into the SQLite `news` table.

---

## 6. Open-Meteo (Weather Data)

**Purpose:** Environmental context (wave height, wind speed) which impacts vessel maneuverability expectations.

| Detail | Value |
|---|---|
| **Protocol** | REST API |
| **Authentication** | None |
| **File Location** | `server/internal/integrations/weather.go` |

**Integration Logic:**
- Provides marine weather forecasts to the dashboard.
- Future use: Used by the Rule Engine to suppress "speed drop" anomaly scores if severe weather is present in the vessel's grid cell.
