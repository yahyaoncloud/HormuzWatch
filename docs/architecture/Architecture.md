# HormuzWatch Frontend System Architecture

## Overview
HormuzWatch Frontend (`client-v2`) is built on **React Router v8 Framework Mode**, React 19, TypeScript, and Vite. It serves as an enterprise-grade tactical intelligence console for monitoring maritime vessel positions, aviation tracks, anomaly scoring, and conflict intelligence in the Strait of Hormuz and Persian Gulf regions.

## Key Architectural Principles
1. **Framework-First Routing**: Built around React Router v8 nested layouts, route module loaders, actions, and generated route type declarations (`.react-router/types`).
2. **Protocol Boundary Isolation**:
   - **REST API**: Handles CRUD, authentication, configuration, user management, static dataset snapshots.
   - **WebSockets & SSE**: Delivers real-time vessel/aircraft telemetry and public trace event streaming outside React re-render cycles.
   - **gRPC**: Low-latency binary data streaming interface via gRPC-web / Connect-ES for track analysis.
   - **GraphQL Evaluation**: Explicitly rejected due to unnecessary schema translation overhead and client bundle bloat.
3. **Pre-Rendered Authorization & Data Loading**: Authentication guards and data fetching execute in route loaders prior to layout/component rendering.
4. **URL-Driven Navigation State**: Query parameters (`useSearchParams`) control active tabs, threat filters, and map layers.

## High-Level Topology

```
+-----------------------------------------------------------------------------------+
|                                  React Router v8                                  |
|                                  (Framework Mode)                                 |
+-----------------------------------------------------------------------------------+
       |                                  |                                  |
       v                                  v                                  v
+---------------+                +----------------+                +----------------+
| Public Layout |                | Auth Layout    |                | Dashboard Shell|
+---------------+                +----------------+                +----------------+
       |                                  |                                  |
       +----------------------------------+----------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                                    Data Layer                                     |
|  +---------------------+   +--------------------------+   +--------------------+  |
|  | REST Client (Fetch) |   | Event-Driven Realtime Bus|   | gRPC Client Bridge |  |
|  | Trace/Correlation ID|   | Reconnect & Backpressure |   | Binary Telemetry   |  |
|  +---------------------+   +--------------------------+   +--------------------+  |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                                   Go Backend                                      |
+-----------------------------------------------------------------------------------+
```
