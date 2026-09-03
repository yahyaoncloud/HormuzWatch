# HormuzWatch Incident Resolution & Diagnostic Runbook

**Document Path:** `/docs/runbooks/RESOLVED_ISSUES_RUNBOOK.md`  
**Last Updated:** September 3, 2026  
**System:** HormuzWatch Maritime & Aerospace Intelligence Platform  
**Target Environment:** Local Dev (`localhost:5173`) & Production VM (`hormuzwatch.aburcloud.com`)

---

## 1. Executive Summary

This runbook documents the technical root causes, step-by-step remediations, code modifications, and verification procedures for critical telemetry ingestion, geographic bounding, map layer filtering, and user interface issues resolved on the HormuzWatch platform.

---

## 2. Issues & Resolution Catalog

### Issue 1: Telemetry Bounding & Geographic Isolation (Filtering India Contacts)
* **Severity:** Medium
* **Component:** `server/internal/integrations/aisstream.go`, `server/internal/integrations/opensky.go`, `server/internal/api/tracks.go`, `client/src/components/maps/LeafletMapInner.tsx`, `client/src/components/home/useHomeTelemetry.ts`

#### Symptoms
Vessels from the west coast of India, Bay of Bengal, and Indian subcontinent appeared in the live telemetry stream, inflating metrics and cluttering tactical layers outside the Persian Gulf / Strait of Hormuz operational theater.

#### Root Cause
1. `AISStream` integration had wide bounding boxes extending to `5.0°N..25.0°N, 56.0°E..95.0°E` (Arabian Sea & Bay of Bengal).
2. `OpenSky` ADS-B query included Box 2 (`5N-33N, 60E-95E`), streaming all Indian airspace flights.
3. In-memory Track State Manager (TSM) and PostgreSQL fallback queries served historical coordinates outside the operational Gulf bounds.

#### Remediation Steps
1. **AISStream Ingestion Bounding (`aisstream.go`):**
   - Confined subscription to 3 precise Gulf bounding boxes:
     - Persian Gulf: `[23.5, 47.0] .. [31.5, 56.5]`
     - Strait of Hormuz Chokepoint: `[25.0, 55.0] .. [27.5, 57.5]`
     - Gulf of Oman Approach: `[22.0, 56.0] .. [26.5, 62.0]`
2. **OpenSky Ingestion Bounding (`opensky.go`):**
   - Replaced multi-box polling with single targeted query: `https://opensky-network.org/api/states/all?lamin=21&lomin=47&lamax=32.5&lomax=62`.
3. **Backend API Coordinate Guard (`tracks.go`):**
   - Added `isGulfCoordinate(lat, lon)` guard (`21.0 <= lat <= 32.5 && 46.5 <= lon <= 62.5`) for in-memory snapshots and SQL queries.
4. **Frontend Map Coordinate Guard (`LeafletMapInner.tsx` & `useHomeTelemetry.ts`):**
   - Added `isInsideGulf(lat, lon)` filter to both track and conflict marker rendering loops.

---

### Issue 2: Telemetry Disappearance on Page Refresh (Filter Persistence & Race Condition)
* **Severity:** High
* **Component:** `client/src/app/routes/public/home.tsx`, `client/src/components/home/useHomeTelemetry.ts`, `client/src/components/maps/LeafletMapInner.tsx`

#### Symptoms
Upon hard page refresh, vessels and aircraft were visible for ~5 seconds or completely missing from the map despite metrics showing active vessels.

#### Root Cause
1. **Severity Filter State Persistence:** `home.tsx` saved and loaded `severityFilter` from `localStorage`. If set to `'critical'`, the filter loop `track.severity !== severityFilter` dropped all nominal, low, and medium priority vessels (which represent >90% of the active fleet).
2. **Loader Timeout Window:** `clientLoader` in `home.tsx` had an aggressive 800ms race timeout, frequently returning `initialTracks: null` under network latency.
3. **Lack of Background Polling:** `useHomeTelemetry.ts` had `refetchInterval: false`, relying entirely on WebSocket frames.

#### Remediation Steps
1. **Default Filter Reset (`home.tsx`):**
   - Defaulted `severityFilter` and `timeline` to `'all'` on initialization so page refreshes always start with complete visibility.
2. **Flexible Severity Hierarchy (`LeafletMapInner.tsx`):**
   - Enhanced filter matching so selecting higher tiers maintains valid category boundaries without dropping nominal data when `'all'` is selected.
3. **Extended Loader Window & Polling (`home.tsx`, `useHomeTelemetry.ts`):**
   - Increased `clientLoader` timeout from 800ms to 3000ms.
   - Added `refetchInterval: 15000` to `publicTracksData` query as an autonomous baseline fallback.

---

### Issue 3: Telemetry Panel Relocation to Left Sidebar Stack View
* **Severity:** UI/UX
* **Component:** `client/src/components/home/HomePanels.tsx`, `client/src/components/intelligence/IntelligenceConsole.tsx`

#### Symptoms
The floating metrics card overlaid the bottom center of the tactical map, obstructing southern navigation sectors (Musandam Peninsula, Fujairah Anchorage, and Oman coast) and requiring manual offset math.

#### Remediation Steps
1. **Removed Floating Map Overlay:** Removed the bottom floating container from `HomePanels.tsx`.
2. **Embedded Sidebar Metrics Stack (`IntelligenceConsole.tsx`):**
   - Built a compact 2x2 grid stack view at the bottom of the Left Intel Console:
     - **Vessels Tracked** (with cyan maritime icon)
     - **Aircraft Tracked** (with amber aviation icon)
     - **Active Regions** (with primary blue compass icon)
     - **Maritime Risk Index** (with danger rose alert icon)
   - Wired live counters and click handlers (`onMetricClick`) directly to open metric detail sheets.

---

### Issue 4: Streamlining Strategic Watch Zones
* **Severity:** Optimization
* **Component:** `client/src/components/maps/LeafletMapInner.tsx`, `client/src/components/intelligence/IntelligenceConsole.tsx`, `client/src/components/home/HomeTopBar.tsx`

#### Symptoms
Over 9 overlapping micro-zones (anchorage sectors, loading docks, individual berths) cluttered the tactical map and navigation drawer with redundant bounding boxes.

#### Remediation Steps
1. **Consolidated into 4 Core Strategic Zones:**
   - `AREA-HORMUZ`: **Strait of Hormuz (TSS)** (`#FF0055`)
   - `AREA-PGULF`: **Persian Gulf Maritime Basin** (`#FF9900`)
   - `AREA-GOMAN`: **Gulf of Oman Approach** (`#00E5FF`)
   - `AREA-FUJAIRAH`: **Fujairah Offshore Anchorage (FOA)** (`#00E676`)
2. **Updated Navigation Controls:**
   - Synchronized top bar sector dropdown and quick sector pills in `LeafletMapInner.tsx`.

---

### Issue 5: In-Layout Modal Routing & Documentation Tab
* **Severity:** Usability / SPA Architecture
* **Component:** `client/src/components/intelligence/ThreatsPanel.tsx`, `client/src/app/routes/public/about.tsx`, `client/src/app/routes/public/home.tsx`, `client/src/components/home/HomeTopBar.tsx`

#### Symptoms
Clicking **"Open Intelligence →"** in the asset detail modal or **"Start with the documentation"** in About navigated away from the active SPA shell via full route changes.

#### Remediation Steps
1. **Modal Callbacks:** Added `onOpenIntelligence` to `ThreatDetailModal` and `onOpenDocs` to `AboutPage`.
2. **Documentation Tab:** Added `Docs` (`[F4] DOCS`) to `TABS` and `HomeTabId`, embedding `LearnIndex` directly inside the multi-tab layout.

---

### Issue 6: Aircraft Telemetry Displayed As Vessels On Airport Runways & Inland Ground
* **Severity:** High
* **Component:** `server/internal/integrations/opensky.go`, `server/internal/api/tracks.go`, `server/internal/domain/telemetry/telemetry.go`, `client/src/components/maps/LeafletMapInner.tsx`, `client/src/components/home/useHomeTelemetry.ts`

#### Symptoms
Commercial flights parked or taxiing at Hamad International Airport (Doha), Bahrain International Airport, Dubai International Airport (DXB), and inland airways appeared with vessel icons (`▲`) when only the **Vessels** layer toggle was enabled, and with titles such as `"Vessel Deviation: FDB1BM"` (FlyDubai).

#### Root Cause
1. **Raw Hex ICAO Track IDs:** OpenSky ingestion assigned raw hexadecimal `icao24` strings (e.g. `896372`, `761481`) to `TrackID` instead of prefixing with `FLIGHT-`.
2. **Incomplete Client & Server Classification:** Both backend SQL queries and the React `classifyTrackObject` logic only checked `startsWith('FLIGHT')`. Parked/taxiing aircraft have `speed <= 15 kn` and `altitude = 0`, causing them to fail kinematic thresholds and default to maritime `vessel`.

#### Remediation Steps
1. **Prefix Standard:** Added explicit `FLIGHT-` prefix to OpenSky ingest (`fmt.Sprintf("FLIGHT-%s", icao24)`).
2. **Multi-Signal Aircraft Identification:** Enhanced `classifyTrackObject` in `LeafletMapInner.tsx` and `Domain()` in `telemetry.go` to evaluate:
   - `FLIGHT-`, `ADS-`, `ICAO-` prefixes
   - 6-character hexadecimal ICAO patterns (`/^[0-9A-F]{6}$/`)
   - Airline ICAO callsign regex (`/^(FDB|ETD|SVA|UAE|QTR|GFA|OMA|BOX|FAD|CHZ|KNE|THY|BAW)[0-9A-Z]+/`)
   - `object_type` / `domain` fields, `altitude > 0`, and `speed > 80 kn`.
3. **Database Query Guards:** Updated `queryActiveTracks` in `tracks.go` to select and filter `t.object_type`.

---

### Issue 7: Interchangeable Maritime Telemetry Providers (Open Waters & AIS Stream)
* **Severity:** Medium / Architectural Enhancement
* **Component:** `server/internal/integrations/ais/`, `server/internal/api/ais_handlers.go`, `client/src/components/maps/LeafletMapInner.tsx`, `docs/architecture/AIS_STREAM_INTEGRATION.md`

#### Context & Goal
Decouple maritime telemetry from single-vendor lock-in by implementing an interchangeable `AISProvider` abstraction capable of streaming from **Open Waters** (`ais.openwaters.io`), **AIS Stream** (`aisstream.io`), a **Multi-Feed Aggregator**, or an offline **Gulf Simulation Mock**.

#### Architectural Remediation
1. **Unified `AISProvider` Interface (`provider.go`):**
   - Standardized `Start(ctx, onObservation)`, `Stop()`, `Health()`, `GetSnapshot()`.
2. **Open Waters Provider (`provider_openwaters.go`):**
   - Native WebSocket stream (`wss://ais.openwaters.io/v1/stream?snapshot=true`).
   - GeoJSON `FeatureCollection` and `Feature` normalization.
   - Ground station ID (`Station`) and feeder receiver (`Source`) provenance preservation.
   - Cold-start fallback via `GET /v1/vessels?bbox=...`.
3. **AIS Stream Provider (`provider_aisstream.go`):**
   - `wss://stream.aisstream.io/v0/stream` client with permessage-deflate compression and binary zlib decoding.
   - Normalized 10 ITU message types.
4. **Multi-Feed Aggregator (`provider_multi.go`):**
   - Concurrent feed consumption with `MMSI + 5s` deduplication ring buffer.
5. **Spatial-Temporal Conflict Correlation Engine (`correlation.go` & `LeafletMapInner.tsx`):**
   - Correlates geolocated incidents with nearby AIS traffic within 15 Nautical Miles.
   - Enforces 4-tier confidence model (`OBSERVED_AIS_FACT`, `CALCULATED_PROXIMITY`, `INFERRED_MOVEMENT_ANOMALY`, `EXTERNALLY_REPORTED_CONFLICT_EVENT`).
   - Strict zero-causality disclaimer: Proximity indicates spatial co-location, not involvement.

---

## 3. Deployment & Operational Verification

### Local Verification
```bash
cd client
npm run build
npm run dev
```
- Open `http://localhost:5173/`.
- Verify Left Console shows **Live Metrics Stack** (Vessels, Aircraft, Regions, Risk Index).
- Verify Map renders only Persian Gulf, Strait of Hormuz, and Gulf of Oman contacts.
- Verify clicking a conflict marker displays 15 NM nearby AIS traffic and confidence breakdown.
- Verify vessel tactical dossier popups show `SRC` and `STN` provenance metadata.

### Production Deployment Procedure
```bash
# 1. Sync source files to production host
rsync -avz --delete client/src/ tunkstun:/home/yahya/SHARED/Projects/HormuzWatch/client/src/
rsync -avz --delete server/ tunkstun:/home/yahya/SHARED/Projects/HormuzWatch/server/
rsync -avz docs/ tunkstun:/home/yahya/SHARED/Projects/HormuzWatch/docs/

# 2. Rebuild and restart services
ssh tunkstun "cd /home/yahya/SHARED/Projects/HormuzWatch && \
  docker compose -f docker-compose.dev.yml build server client && \
  docker compose -f docker-compose.dev.yml up -d server client"

# 3. Healthcheck
curl -sI https://hormuzwatch.aburcloud.com/public/ais/status
```
