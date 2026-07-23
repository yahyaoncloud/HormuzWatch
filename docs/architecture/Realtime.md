# Real-time Telemetry & Stream Architecture

## Communication Channels
HormuzWatch handles real-time streams across three primary backplane protocols:

1. **WebSocket (`/ws/stream`)**:
   - Transmits live AIS vessel positions and ADSB aircraft telemetry.
   - Channel subscription message model: `{ type: "subscribe", channels: ["telemetry", "anomaly"] }`.
   - Token authentication attached via query parameter (`?token=...`).

2. **Server-Sent Events (SSE) (`/public/stream`)**:
   - Stream public trace data for anonymous and unauthenticated users without full socket handshake overhead.

3. **gRPC-web Interface**:
   - Serves high-throughput binary telemetry aggregation from the Go streaming engine (`proto/ml_service.proto`).

## Reliability & Performance Controls
- **Exponential Backoff Reconnect**: Base delay of 2.0s up to a maximum cap of 60s with max 10 retries before status degradation.
- **Render Decoupling**: Real-time websocket payloads are processed via an event listener sub-layer to directly update MapLibre GL layer sources and atomic stores, preventing full React DOM re-renders on high-frequency (50Hz+) telemetry spikes.
- **Heartbeat & Queueing**: Outgoing websocket messages queue locally if disconnected and drain automatically upon reconnection.
