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

---

## Workstream 3: SRE Stress Testing, Hardware Profiling & High-Throughput Hardening

### Current Infrastructure & SRE Issues Identified

| # | Issue Identified | Impact | Root Cause |
|---|------------------|--------|------------|
| **ISSUE-01** | Client Socket Exhaustion during 20k RPS | Network errors (`connection refused`, `socket limit`) during multi-thousand RPS runs | Client host default `ulimit -n` is set to `1024`, capping concurrent open file descriptors. |
| **ISSUE-02** | Wi-Fi Latency & Jitter on `LATE5530` | Throughput bottlenecked over LAN (`wlp2s0`) under heavy concurrent socket bursts | `LATE5530` is connected via Wi-Fi with variable ~2-5ms base latency, ballooning under 1,000+ socket concurrency. |
| **ISSUE-03** | Server-Side Rate Limiter Throttling | Returns `HTTP 429 Too Many Requests` during stress runs against backend API (`:30020`) | Gin `RateLimiterMiddleware` enforces per-IP token quotas, blocking high-throughput load tests. |
| **ISSUE-04** | Direct Host Port 80 vs NodePort Routing | Ingress requests directly hitting `http://192.168.1.40:80/` can time out if host Nginx is bound strictly to Cloudflare tunnel | Kubernetes NodePorts (`:30000` client, `:30020` server) are open, but host-level Nginx reverse proxy needs keepalive upstream pooling. |
| **ISSUE-05** | `tp24` Direct Routing to `LATE5530` | Intermittent "No route to host" from `tp24` (`192.168.1.35`) directly to `192.168.1.40` | ARP table stale/subnet isolation on `enp8s0` vs `wlp2s0`. Must route through `tunkstun` or Tailscale overlay (`100.66.64.31`). |

---

### Actionable Remediation Backlog

- [ ] **SRE-01 (Rate Limiter Internal Subnet Whitelist):**
  - Modify [`server/internal/api/middleware.go`](file:///home/yahya/SHARED/Projects/HormuzWatch/server/internal/api/middleware.go) to bypass or elevate rate limits for cluster/RFC1918 internal subnets (`192.168.1.0/24`, `10.42.0.0/16`, `127.0.0.1/8`) to allow unrestricted internal telemetry streaming and benchmark tests.
- [ ] **SRE-02 (Client Socket & Connection Pool Tuning):**
  - Standardize high-concurrency launcher wrapper in [`scripts/mock_load_generator.go`](file:///home/yahya/SHARED/Projects/HormuzWatch/scripts/mock_load_generator.go) with automatic `ulimit -n 65535` checks and pre-allocated TCP keepalive connections.
- [ ] **SRE-03 (Nginx Upstream Keepalive & Micro-Caching):**
  - Update `/etc/nginx/conf.d/upstreams.conf` on `LATE5530` to include `keepalive 256;` in upstream blocks and `proxy_http_version 1.1; proxy_set_header Connection "";` to eliminate TCP handshake overhead on proxied requests.
- [ ] **SRE-04 (Hardware & Network Link Optimization):**
  - Connect `LATE5530` to Gigabit wired Ethernet or bind direct Tailscale subnet route to remove 802.11 Wi-Fi latency jitter during peak vessel telemetry streams.
- [ ] **SRE-05 (Automated SRE Benchmark Pipeline in Jenkins):**
  - Add a dedicated Jenkins pipeline stage on `tp24` (`service/jenkins/`) to trigger automated load generation tests from `tunkstun` and assert P99 latency < 250ms and 0 HTTP 5xx errors.

---

### Machine Benchmark & Overwhelming Stress Test Findings (`LATE5530`)

```mermaid
xychart-beta
    title "LATE5530 Server Latency Percentiles Under Flood Load (1.75k RPS)"
    x-axis ["P50 (Median)", "P90", "P95", "P99", "P99.9 (Tail)"]
    y-axis "Latency (ms)" 0 --> 2500
    bar [102.33, 188.31, 200.36, 270.17, 2433.90]
```

* **Hardware Specs**: Dell Latitude E5530 — 2 Cores / 4 Threads (Intel Core i5-3340M @ 2.70 GHz), 7.4 GB DDR3 RAM, Rocky Linux 9.
* **Peak Measured Flood Throughput**: **1,747.84 Requests/sec** sustained on 300 concurrent workers with unthrottled loop.
* **Success Rate**: **96.77%** HTTP 200 OK (16,937 successful responses in 10 seconds).
* **Latency Profile**:
  * P50 (Median): **102.33 ms**
  * P90: **188.31 ms**
  * P95: **200.36 ms**
  * P99: **270.17 ms**
  * Max / P99.9 Tail: **2,433.90 ms**
* **Memory & Pod Stability**: Memory remained stable at **1.64 GB / 7.55 GB used** with **0 pod restarts or OOM kills** across all K8s containers (`hormuzwatch-client`, `hormuzwatch-server`, `hormuzwatch-ml`, `hormuzwatch-postgres`).
* **Load Average**: Rose to **5.79** under flood bombardment, returning to normal baseline within 60 seconds post-test.
