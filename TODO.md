# HormuzWatch — Master Engineering Roadmap & DevOps / MLOps Backlog

## 0. Distributed 3-Node Topology Overview

The infrastructure is strictly partitioned across three dedicated nodes to ensure zero-resource contention and resilient edge operation:

```mermaid
flowchart TD
    subgraph BuildRunner["Node 1: tp24 (Heavy Operations & Build Runner)"]
        TP_HW["AMD Ryzen 3 3200G (4C/4T @ 4.0 GHz, AVX2) | 32 GB DDR4 RAM | RX 6500 XT"]
        TP_ROLE["Role: Docker BuildKit Runner, MLOps Continuous Training, Heavy Synthetic Data Generation"]
        TP_NET["IP: 192.168.1.35 | Engine: Docker 29.7.2 Native"]
    end

    subgraph ProductionEdge["Node 2: LATE5530 (Production Workload Deployment)"]
        E5530_HW["Dell Latitude E5530 (2C/4T, AVX1) | 7.4 GB DDR3 RAM | Rocky Linux 9"]
        E5530_ROLE["Role: Live Production Stack (Server, ML, Postgres, Client, Dataset-Worker)"]
        E5530_INGRESS["Public Ingress: Cloudflare Tunnel + Nginx (:80) -> https://hormuzwatch.aburcloud.com"]
        E5530_NET["IP: 192.168.1.40 / 100.66.64.31 (Tailscale) | Engine: Podman 5.8"]
    end

    subgraph ObservabilityHub["Node 3: tunkstun (Personal Workstation & Observability Hub)"]
        TNK_ROLE["Role: Central Observability, Prometheus, Grafana, OpenTelemetry, SRE Telemetry Metrics"]
        TNK_NET["IP: 192.168.1.46 / 100.126.193.36 (Tailscale)"]
    end

    BuildRunner -->|Push Verified Images / Models| ProductionEdge
    ObservabilityHub -->|Scrape Metrics (:9090 / :3001 / :10020)| ProductionEdge
    ObservabilityHub -->|Scrape Training Telemetry| BuildRunner
```

- **Node 1 (`tp24` @ `192.168.1.35`):** Heavy Operations & Build Runner. Runs parallel Docker builds, MLOps continuous training daemon, feature matrix synthesis, and dev verification deployments.
- **Node 2 (`LATE5530` @ `192.168.1.40` / `100.66.64.31`):** Production Workload Node. Hosts the live containers with hardened 3.45GB memory ceiling, Cloudflare tunnel ingress (`hormuzwatch.aburcloud.com`), and WireGuard/Tailscale connectivity.
- **Node 3 (`tunkstun` @ `192.168.1.46` / `100.126.193.36`):** Personal Workstation & Observability Hub. Runs Prometheus, Grafana, SRE dashboards, and monitoring telemetry.

---

## Completed Sprints Archive (Milestones Summary)
- [x] **K8S Cluster Orchestration (K8S-01 – K8S-05):** K3s control plane on `tunkstun`, production worker on `LATE5530`, production namespace deployed with 0 restarts, runbooks authored.
- [x] **3-Node Topology Migration (TASK-01 – TASK-06):** Edge container stack running under rootless Podman 5.8, dev workloads verified on `tp24`, Prometheus scrape targets active.
- [x] **CI/CD Pipeline Remediation (AUDIT-01 – AUDIT-08):** GHCR container registry integration, zero-downtime blue/green cutover engine, Trivy CVE gates, Gitleaks allowlist, non-root DinD build sidecar.
- [x] **MLOps & Continuous Training (Track B):** ZenML pipeline integration, DVC dataset tracking, drift remediation loop (PSI/KS), slice-based evaluation, cryptographic model manifests.
- [x] **Server Reliability & Bug Fixes (Track C/E/F):** 90s time-shifted playback buffer, kinematic dead-reckoning extrapolation, OpenSky leniency with 429 jitter backoff, WebSocket channel panic resolution, bulk telemetry micro-batching.
- [x] **Client Build & Bundle Optimization (CLIENT-01 – CLIENT-07):** MapLibre GL dynamic isolation, Biome compliance (0 errors), chunk optimization (99.8% entry reduction), Vitest unit test suite (10/10 passing).
- [x] **Dual Chokepoint & Map Hardening Sprint (CHOKE/NEWS/BOUNDS/PERF/CACHE):**
  - Added `AREA-BAB-EL-MANDEB` watch zone & sector coordinates to [`LeafletMapInner.tsx`](file:///home/yahya/SHARED/Projects/HormuzWatch/client/src/components/maps/LeafletMapInner.tsx) and [`region.tsx`](file:///home/yahya/SHARED/Projects/HormuzWatch/client/src/app/routes/public/intelligence/region.tsx).
  - Configured `CHOKEPOINT_VIEWPORTS` presets (`hormuz`, `bab-el-mandeb`, `persian-gulf`, `gulf-of-oman`, `all`) in [`map.store.ts`](file:///home/yahya/SHARED/Projects/HormuzWatch/client/src/stores/slices/map.store.ts).
  - Restricted OpenRouter OSINT prompts and filtered events strictly to Strait of Hormuz and Bab al-Mandab in [`conflict_feed.go`](file:///home/yahya/SHARED/Projects/HormuzWatch/server/internal/api/conflict_feed.go).
  - Expanded gazetteer with Bab al-Mandab ports in [`geocode.go`](file:///home/yahya/SHARED/Projects/HormuzWatch/server/internal/intelligence/news/geocode.go) and added `ChokepointTerms` in [`keywords.go`](file:///home/yahya/SHARED/Projects/HormuzWatch/server/internal/intelligence/news/keywords.go).
  - Expanded theater bounds to `[11.0, 41.5]` – `[31.8, 62.5]` and added TileLayer `bounds` clipping and `preferCanvas: true` to prevent off-theater tile downloads.
  - Implemented bounded `ObjectLRUCache<T>` and predictive pre-fetching helpers in [`cache.ts`](file:///home/yahya/SHARED/Projects/HormuzWatch/client/src/lib/cache.ts).

---

## Active Sprint: Real-Time Stream Fusion & Operational Intelligence Dashboard Enhancements

### Workstream 1: Dual-Chokepoint AIS/ADS-B Live Stream Routing
- [ ] **STREAM-01 (Bab al-Mandab & Hormuz Telemetry Partitioning):**
  - Implement dynamic stream partition tagging on incoming AIS & ADS-B packets in [`server/internal/intelligence/pipeline.go`](file:///home/yahya/SHARED/Projects/HormuzWatch/server/internal/intelligence/pipeline.go) (`chokepoint: "hormuz" | "bab_al_mandab" | "gulf_basin"`).
  - Expose stream subscription filtering in [`server/internal/websocket/hub/hub.go`](file:///home/yahya/SHARED/Projects/HormuzWatch/server/internal/websocket/hub/hub.go) to allow client WebSockets to request partitioned sub-streams.
- [ ] **STREAM-02 (Client HUD Dual-Chokepoint Toggle & Metric Ribbon):**
  - Add quick-switch chokepoint buttons (`[HORMUZ TSS]` / `[BAB AL-MANDAB]`) directly into the map HUD header.
  - Display live transit density and anomaly rates per chokepoint in [`IntelligenceStatusBar.tsx`](file:///home/yahya/SHARED/Projects/HormuzWatch/client/src/components/intelligence/IntelligenceStatusBar.tsx).

---

### Workstream 2: Predictive Collision & Corridor Deviation Alarms
- [ ] **ALERT-01 (Bab al-Mandab Inbound/Outbound Traffic Separation Monitoring):**
  - Implement lane compliance evaluation for the Bab al-Mandab TSS in [`server/internal/anomaly/vessel.go`](file:///home/yahya/SHARED/Projects/HormuzWatch/server/internal/anomaly/vessel.go) (detecting wrong-way transits and rogue vessels outside designated corridors).
  - Trigger high-severity anomaly alerts when a vessel deviates from standard transit courses near Perim Island.
- [ ] **ALERT-02 (Asymmetric Threat Proximity Detection):**
  - Evaluate dynamic distance thresholds between commercial tankers and known military exclusion zones or suspicious loitering tracks in [`server/internal/anomaly/geofence.go`](file:///home/yahya/SHARED/Projects/HormuzWatch/server/internal/anomaly/geofence.go).
