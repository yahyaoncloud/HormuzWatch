# HormuzWatch — Technical Study: RSS Conflict Tracking & Map Conflict-Area Beaconing

**Document ID:** HW-STUDY-2026-001  
**Category:** Architecture & Capability Inspection  
**Author:** DevOps & Systems Engineering  
**Status:** Approved Reference  

---

## 1. Executive Summary

An end-to-end technical inspection of the **HormuzWatch** platform was conducted to verify the operational readiness and code implementation of the **RSS conflict tracking pipeline** and **map conflict-area beaconing** system across the Go backend ingestion layer, WebSocket hub, database persistence, and React/Leaflet geospatial visualization engine.

### Verification Matrix

| Capability | Status | Implementation Mechanism |
|---|---|---|
| **1. RSS Ingestion & Parsing** | **Fully Implemented** | Go parser ingests 20+ GCC official agencies & international defence feeds |
| **2. Geoparsing & Structured Conversion** | **Fully Implemented** | Port/Airport gazetteers & LLM parser extract coordinates and severity |
| **3. Conflict Plotting on Map** | **Fully Implemented** | Rendered via Leaflet markers with custom animated SVG beacons |
| **4. Animated Beaconing & Popups** | **Fully Implemented** | Pulsing radial ping (animation: ping 2s) + rotating dashed reticle + modal popup |
| **5. Multi-Event Proximity / Clustering** | **Fully Implemented** | Grouped into leaflet.markercluster with spiderfy expansion on click |
| **6. Real-Time Map Auto-Updates** | **Partially Implemented** | WS pipeline exists; wsConflicts omitted from map effect dependency array |
| **7. Stale / Timeline Marker Handling** | **Fully Implemented** | Filterable by age (1hr, 3hr, 6hr, 12hr, 24hr, all) |

---

## 2. In-Depth Component Analysis



---

## 3. Subsystem Implementation Details

### A. RSS Feed Ingestion & Parsing
* **File:** server/internal/intelligence/source/rss.go (RSSSource.Fetch())
* **File:** server/internal/intelligence/source/gulf_sources.go (DefaultGulfSources())
* **Mechanism:** Uses github.com/mmcdole/gofeed to parse RSS/Atom XML feeds across regional news agencies (WAM, SPA, KUNA, BNA, ONA, QNA, IRNA, INA) and maritime/defense feeds (USNI News, DefenseNews Naval).

### B. Geoparsing & Structured Event Conversion
* **File:** server/internal/intelligence/news/geocode.go (PortGazetteer, AirportGazetteer)
* **File:** server/internal/api/conflict_feed.go (ConflictEvent, SaveConflictEventsToDB, getDatabaseConflicts)
* **Mechanism:** Converts raw intelligence into structured ConflictEvent records with lat, lon, conflictType (naval, air, cyber, infrastructure, piracy), severity (critical, high, medium, low), affectedAssets, casualties, source, and timestamp, persisted in PostgreSQL events table.

### C. Map Conflict Beaconing & Interactive Popups
* **File:** client/src/components/maps/LeafletMapInner.tsx (lines 1077–1177)
* **Visual Beacon:** Custom CSS/SVG marker (conflictSVG(color)):
  - **Outer Beacon Pulse:** animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
  - **Inner Rotating Reticle:** animation: spin 8s linear infinite; with dashed border
  - **Tactical Icon:** Color-coded alert shield with drop-shadow
* **Interactive Popup:** Displays Title, Verified badge (✓ Verified), Severity tag, Description, Region, Conflict Type, Affected Assets, Casualties, Source, and Timestamp.

### D. Multi-Event Proximity & Cluster Management
* **File:** client/src/components/maps/LeafletMapInner.tsx (line 1175)
* **Mechanism:** All conflict markers are added directly to clusterRef.current.addLayer(marker) using leaflet.markercluster. When multiple incidents occur in proximity (e.g., Fujairah Anchorage or Strait of Hormuz TSS), markers are clustered with cluster count badges and expand on click.

### E. Stale & Timeline Filtering
* **File:** client/src/components/maps/LeafletMapInner.tsx (lines 1110–1117)
* **Mechanism:** Computes elapsed hours ((Date.now() - new Date(c.timestamp).getTime()) / (1000 * 60 * 60)) and filters out stale markers according to the active timeline window (1hr, 3hr, 6hr, 12hr, 24hr, all).

### F. Real-Time Streaming & Identified Gap
* **Backend:** server/internal/api/conflict_feed.go (BroadcastConflictFeed) publishes { type: "conflict", data: c } to the WebSocket hub.
* **Frontend Provider:** client/src/providers.tsx (case 'conflict': rtAddConflict(message.payload)) writes into Zustand store client/src/stores/index.ts (s.conflicts).
* **Gap Identified:** In LeafletMapInner.tsx (line 1178), wsConflicts is extracted from the store (const wsConflicts = useRealtimeStore((s) => s.conflicts);), but was omitted from the useEffect dependency array. Consequently, newly arrived WebSocket conflict events do not trigger an immediate map canvas redraw until another prop or state changes. Adding wsConflicts to the dependency array resolves this latency.

---

## 4. Responsibility & Component Matrix

| Subsystem / Layer | Source File | Key Functions & Exported Primitives |
|---|---|---|
| **RSS Ingestion** | server/internal/intelligence/source/rss.go | RSSSource.Fetch(), Validate() |
| **Source Registry** | server/internal/intelligence/source/gulf_sources.go | DefaultGulfSources() |
| **Geoparsing Engine** | server/internal/intelligence/news/geocode.go | PortGazetteer, AirportGazetteer |
| **Conflict REST API** | server/internal/api/conflict_feed.go | GetConflictFeed(), SaveConflictEventsToDB() |
| **Conflict WS Broadcast** | server/internal/api/conflict_feed.go | BroadcastConflictFeed() |
| **Frontend API Client** | client/src/lib/api.ts | getConflictFeed() (/public/conflicts) |
| **Frontend WS Listener** | client/src/providers.tsx | case 'conflict': rtAddConflict(...) |
| **Frontend Conflict Store**| client/src/stores/index.ts | useRealtimeStore.conflicts, addConflict() |
| **Map Beacons & Markers** | client/src/components/maps/LeafletMapInner.tsx | conflictSVG(), marker.bindPopup(), clusterRef |
