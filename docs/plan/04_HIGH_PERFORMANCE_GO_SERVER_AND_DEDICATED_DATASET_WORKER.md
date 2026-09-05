# ⚡ High-Performance Go Server & Dedicated Dataset Worker

> **Date:** September 5, 2026  
> **Status:** Systems Engineering Blueprint  
> **Targets:** `server/internal/intelligence/`, `server/internal/geo/`, `server/cmd/dataset_generator/`  

---

## 1. Objective & Performance Goals

The Go backend (`hormuzwatch-server`) is the real-time operational heart of HormuzWatch. It ingests thousands of live telemetry points per minute from AISStream and OpenSky, executes sub-second ML anomaly scoring via gRPC, and broadcasts live state updates to hundreds of concurrent WebSockets and SSE clients.

To operate at maximum capacity with minimal resource utilization:
1. **Reduce GC pauses and heap churn by $> 80\%$** via zero-allocation memory pooling and fixed circular ring buffers.
2. **Eliminate lock contention** on track state by replacing the monolithic mutex with a sharded partition map.
3. **Achieve lock-free read paths** for `/public/tracks/active` and WebSocket broadcasts using `atomic.Pointer`.
4. **Isolate heavy dataset creation** from the core Go API server to a dedicated, standalone dataset worker service.

---

## 2. Memory Management & Zero-Allocation Optimization

```
┌────────────────────────────────────────────────────────────────────────┐
│               Core Ingestion Hot-Path Memory Architecture              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
                     ┌──────────────────────────────┐
                     │ Incoming Telemetry (AIS/ADS) │
                     └──────────────┬───────────────┘
                                    │
                       Get from sync.Pool (Zero Alloc)
                                    │
                                    ▼
                     ┌──────────────────────────────┐
                     │   Sharded Track State Map    │
                     │  (32 Shards, FNV-1a Hash)    │
                     └──────────────┬───────────────┘
                                    │
                                    ▼
                     ┌──────────────────────────────┐
                     │ Fixed Array [20]Observation  │
                     │  Circular Ring Buffer (Zero) │
                     └──────────────┬───────────────┘
                                    │
                                    ▼
                     ┌──────────────────────────────┐
                     │ Atomic Snapshot Pointer Swap │
                     │   (Lock-Free WebSocket Read) │
                     └──────────────────────────────┘
```

### 2.1. Fixed Circular Ring Buffer (Replacing Slice Reallocations)
* **Current Issue:** `History = append(s.History[1:], obs)` re-allocates and copies slices on every telemetry frame, generating millions of heap allocations under sustained traffic.
* **Optimization:** Replace dynamic slices with a fixed-size array and modular head pointer:
```go
type ObservationRingBuffer struct {
    entries [20]Observation
    head    uint8
    count   uint8
}

func (rb *ObservationRingBuffer) Push(obs Observation) {
    rb.entries[rb.head] = obs
    rb.head = (rb.head + 1) % 20
    if rb.count < 20 {
        rb.count++
    }
}
```
* **Impact:** 0 bytes allocated per telemetry observation update.

### 2.2. Sharded Concurrency Map (Eliminating Monolithic Mutex Contention)
* **Current Issue:** A single `sync.RWMutex` guards `tracks map[string]*TrackState`. A write lock during an AIS burst blocks read locks needed by the WebSocket broadcaster and API clients.
* **Optimization:** Partition the state into 32 independent shards based on the track ID hash:
```go
const ShardCount = 32

type ShardedTrackStateManager struct {
    shards [ShardCount]*trackShard
}

type trackShard struct {
    mu     sync.RWMutex
    tracks map[string]*TrackState
}

func (m *ShardedTrackStateManager) getShard(trackID string) *trackShard {
    hash := fnv32(trackID)
    return m.shards[hash%ShardCount]
}
```
* **Impact:** Lock contention drops by $97\%$; reads and writes in different sectors execute completely in parallel.

### 2.3. Buffer Pooling with `sync.Pool`
* **Optimization:** Recycle JSON encoder byte buffers, telemetry frame structs, and gRPC request objects:
```go
var bufferPool = sync.Pool{
    New: func() any {
        return bytes.NewBuffer(make([]byte, 0, 4096))
    },
}
```

### 2.4. Lock-Free Atomic Snapshots for Read Endpoints
* Store the active snapshot in an `atomic.Pointer[ActiveTracksSnapshot]`.
* When state is updated, a copy-on-write worker periodically publishes the latest immutable slice.
* Handlers for `/public/tracks/active` and WebSocket broadcasts load the atomic pointer with **zero lock acquisition**, ensuring sub-millisecond response times even under severe ingestion load.

---

## 3. Spatial Processing Optimization

* **Axis-Aligned Bounding Box (AABB) Pre-Filtering:** Checking whether a ship coordinate is inside a complex 50-vertex zone polygon (e.g. Strait of Hormuz TSS or Iranian Military Zone) requires Ray-Casting.
* **Optimization:** Cache the min/max latitude and longitude for each zone. If `lat < minLat || lat > maxLat || lon < minLon || lon > maxLon`, the check returns `false` in $O(1)$ time without evaluating polygon vertices.
* **Grid Landmask:** Retain the $0.05^\circ$ direct lookup bitmask in `server/internal/geo/landmask.go` for instant $O(1)$ land/sea determination.

---

## 4. Dedicated Server for Dataset Creation (Decoupled ETL)

### 4.1. The Conflict: Operational vs. Analytical Workloads
Running dataset generation inside the operational API server causes:
* **Connection Pool Starvation:** Supabase pooler connections are consumed by massive historical queries (`SELECT ... WHERE timestamp BETWEEN ... LIMIT 200000`), starving live ingestion writes.
* **CPU & Memory Spikes:** Extracting rolling kinematics and compressing Snappy Parquet files consumes 1.5+ GB RAM and 100% CPU during cycles, causing WebSocket drop frames and API latency spikes.

### 4.2. Decoupled Dedicated Dataset Worker Architecture

```text
┌────────────────────────────────────────────────────────┐
│               HormuzWatch Infrastructure               │
├────────────────────────────┬───────────────────────────┤
│ Core Server Container      │ Dedicated Dataset Worker  │
│ (hormuzwatch-server)       │ (hormuzwatch-dataset-wkr) │
│                            │                           │
│ - Port 10020 (REST / WS)   │ - Isolated process/cgroup │
│ - In-Memory TSM (Zero-Alloc)│ - Nice priority (nice -n 10)│
│ - gRPC Client to ML Engine │ - Dedicated DB pool (pgx) │
│ - 0 Analytical Queries     │ - Nightly / Scheduled ETL │
│ - Low Memory Footprint     │ - Parquet compression     │
│                            │ - Direct write to         │
│                            │   /server/datasets/       │
└────────────────────────────┴───────────────────────────┘
```

### 4.3. Implementation Specification
1. **Binary Extraction:** Package `server/cmd/dataset_generator/main.go` into a dedicated container image: `Dockerfile.dataset-worker`.
2. **Service Definition:** Add `dataset-worker` to `docker-compose.yml` with:
   * Memory limit: `2G`
   * CPU reservation: `1.0` (with nice priority)
   * Shared volume: `/server/datasets` mounted to `/datasets`
   * Environment variables: `DATABASE_URL` (direct transaction pooler), `DATASET_OUTPUT_DIR=/datasets`.
3. **Core Server Cleanup:** Remove dataset snapshot schedules from `server/internal/bootstrap/app.go` (`a.DatasetSvc.StartSnapshotSchedule`). Core server memory remains lean and dedicated purely to real-time operations.
