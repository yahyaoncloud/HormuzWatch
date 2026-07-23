# Study Module 3 — Data Sources & Geospatial Methods

> Textbook notes on the telemetry feeds and the geometry that turns lat/lon into "near a zone".
> Anchored to verified source. Companion to `client-v2/src/app/routes/learn/{ais,adsb,heatmaps,regional,satellite}.tsx`.

## 3.1 The six feeds (verified workers)

| Feed | Protocol | What it gives | Worker |
|------|----------|---------------|--------|
| AIS | VHF TDMA (`!AIVDM`) | vessel identity, position, SOG/COG/heading, voyage | `aisstream.go` |
| ADSB | 1090ES (Mode-S) | aircraft position, altitude, squawk, on-ground | `opensky.go` |
| GDELT | REST GeoJSON (15 min) | geopolitical events as points | `gdelt.go` |
| NASA FIRMS | REST (MODIS/VIIRS) | thermal anomalies | `firms.go` |
| Open-Meteo | REST | weather (sea state, visibility) | `weather.go` |
| RSS news | fetch | human-reported incidents | `news.go` |

Integrity principle (from the publication): each source is a *claim to be corroborated*, not a
fact to be trusted blindly. Weather is pulled explicitly so a storm-driven course change is not
scored as malice.

## 3.2 AIS deep dive

AIS is a self-organizing TDMA VHF broadcast (channels 87B/88B, 161.975/162.025 MHz). Class A
transponders (vessels >300 GT) send Position Reports (types 1/2/3); static data (type 5) every
~6 min; Class B (types 18/24) for smaller craft.

Key Type-1 fields (bits): MMSI(30), Status(4), ROT(8), SOG(10, 1/10 kt), Longitude(28),
Latitude(27), COG(12, 1/10°), Heading(9), Timestamp(6). Position is WGS84 in 1/10000 minute.

**Dark period** = AIS silent > 2h in a monitored zone. Detected by (a) AIS-gap tracking in the
TrackStateManager, (b) SAR/optical fusion (cross-referencing known positions against silent
AIS), (c) behavioral prediction (expected position from last course/speed).

> Source: `client-v2/src/app/routes/learn/ais.tsx`, `server/internal/integrations/aisstream.go`,
> `server/internal/intelligence/state.go` (AISGapMinutes / EWMA).

## 3.3 ADSB deep dive

1090 MHz Extended Squinter (Mode-S) broadcasts aircraft state. The system watches altitude,
heading, and squawk; in a maritime corridor, air traffic is often the earliest escalation signal
(patrols, reconnaissance). The aviation model watches for it specifically.

> Source: `client-v2/src/app/routes/learn/adsb.tsx`, `server/internal/integrations/opensky.go`.

## 3.4 Heatmaps

`server/internal/heatmap` keeps an in-memory grid; `AddTelemetry(lat,lon)` accumulates vessel
density, `AddGeoEvent(lat,lon)` adds GDELT danger events (intentionally weighted up), and FIRMS
adds thermal density. `GetGridDataBySource(source)` serves `vessel|fire|geo|all`.

The frontend renders this with `leaflet.heat` (legacy `client`) — the MVP ports that back in
(`TODO.md` P5). Color = density; it is a *correlation surface*, not a verdict.

> Source: `server/internal/heatmap/*`, `server/internal/api/handlers.go` (`GetHeatmap`),
> `client/src/components/HormuzMap.tsx` (legacy heat layer).

## 3.5 Coordinate geometry — Haversine distance

Zones and attacks are compared to a track by great-circle distance in **nautical miles**:

$$
d = 2R \arcsin\!\Big(\sqrt{\sin^2\!\tfrac{\Delta\phi}{2}
+ \cos\phi_1\cos\phi_2\sin^2\!\tfrac{\Delta\lambda}{2}}\Big),
\qquad R = 3440.065\ \text{NM}
$$

where $\phi$ is latitude, $\lambda$ is longitude, in radians. The backend `geo.HaversineNM`
implements this; `computeDistToNearestZone` subtracts `RadiusDeg*60` NM to get distance to the
zone *boundary*, and `computeDistToNearestAttack` returns an estimate when within the ~6 NM
proximity threshold.

> Source: `server/internal/intelligence/features.go`, `server/internal/geo/*`.

## 3.6 Geofence representation

Restricted zones are polygons (or center+radius circles in the feature-helper). `CheckGeofence`
returns `(inZone, name)`. The frontend `REGION_CONFIG` (`maps/RegionalMap.tsx`) carries the
editorial region metadata (bounds, risk, threats).

> Source: `server/internal/anomaly/geofence.go`, `client-v2/src/components/maps/RegionalMap.tsx`.

## 3.7 Regions monitored (verified editorial content)

From `learn/regional.tsx` (these are *editorial* numbers, illustrative — label them as such):

| Region | Narrowest | Note |
|--------|-----------|------|
| Strait of Hormuz | 21 nm | ~21% global oil transit |
| Red Sea / Bab-el-Mandeb | 18 nm | Houthi attacks since 2023 rerouted ~60% |
| Suez Canal | 193 km | single-vessel blockage risk |
| Persian Gulf | — | 8 littoral states, high tanker density |

> The MVP directive expands coverage to the **Middle East** broadly (Levant, Arabian Peninsula,
> Persian Gulf, Gulf of Oman, Red Sea, E. Mediterranean). Extend `REGION_CONFIG` + geofence zones
> accordingly (TODO m3).

## 3.8 Satellite & thermal

NASA FIRMS (MODIS + VIIRS) supplies thermal anomalies; `heatmaps` folds them into the geo
surface. The publication treats an unexpected fire/explosion in a chokepoint as a high-value event.
VIIRS also powers night-light and the SAR/optical fusion used for dark-vessel detection.

> Source: `client-v2/src/app/routes/learn/{satellite,heatmaps}.tsx`, `server/internal/integrations/firms.go`.

## 3.9 Study questions

1. Why does the system treat AIS as a *claim*, and what concrete mechanism prevents trusting it blindly?
2. Compute the Haversine distance (NM) between (26.0, 56.0) and (26.5, 56.5) by hand (approx).
3. A zone has `RadiusDeg=0.2`; a track is 15 NM from the zone center. What is its
   `distToBoundary`? Is it "approaching" (threshold 0.3°)?
4. Name two reasons weather data is ingested before scoring.
5. Which feeds are "corroborating" vs "primary" for a maritime anomaly? Why does the composite
   weight geo at 0.2?

## 3.10 Source map

| Concept | File |
|--------|------|
| AIS worker | `server/internal/integrations/aisstream.go` |
| ADSB worker | `server/internal/integrations/opensky.go` |
| GDELT | `server/internal/integrations/gdelt.go` |
| FIRMS | `server/internal/integrations/firms.go` |
| Weather | `server/internal/integrations/weather.go` |
| Heatmap | `server/internal/heatmap/*` |
| Haversine/geo | `server/internal/geo/*`, `server/internal/intelligence/features.go` |
| Region config | `client-v2/src/components/maps/RegionalMap.tsx` |
| Editorial pages | `client-v2/src/app/routes/learn/{ais,adsb,heatmaps,regional,satellite}.tsx` |
