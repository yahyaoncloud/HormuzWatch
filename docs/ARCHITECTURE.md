# HormuzWatch — System Architecture & Topology

## Overview
HormuzWatch is a hybrid intelligence platform integrating real-time telemetry (AIS, ADS-B, VIIRS thermal FIRMS, ArcGIS maritime chokepoints), machine learning anomaly detection, and LLM-assisted analyst reporting for the Strait of Hormuz.

---

## Component Topology

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Cloudflare Edge Network                                                │
│ Public Ingress: https://hormuzwatch.aburcloud.com                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Encrypted Tunnel
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Host: tunkstun (Linux Mint 22.2 / Ubuntu 24.04)                        │
│ systemd: cloudflared.service                                           │
│ Docker Bridge: hormuzwatch-dev-network                                 │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ hormuzwatch-client (:3000)                                   │     │
│   │ • Alpine Nginx Webserver + Static SPA                        │     │
│   │ • Reverse Proxy Rules (/api/, /ws/, /health, /ml/)           │     │
│   └─────────────────┬──────────────────────────┬─────────────────┘     │
│                     │ /api/, /ws/              │ /ml/                  │
│                     ▼                          ▼                       │
│   ┌──────────────────────────────┐   ┌───────────────────────────┐     │
│   │ hormuzwatch-server (:10020)  │   │ hormuzwatch-ml (:8090/:8091)│   │
│   │ • Go 1.24 Gin REST / WS API  │──►│ • FastAPI Health/REST     │     │
│   │ • Telemetry Workers (ArcGIS) │   │ • gRPC Inference Engine   │     │
│   │ • Non-root 'hormuz' user     │   │ • IsolationForest / LOF   │     │
│   └───────────────┬──────────────┘   └───────────────────────────┘     │
│                   │                                                    │
└───────────────────┼────────────────────────────────────────────────────┘
                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ External Cloud Data Layer                                              │
│ • Supabase PostgreSQL (Port 6543 pooled connection)                    │
│ • OpenSky ADS-B API                                                    │
│ • AISStream Live WebSocket                                             │
│ • NASA FIRMS Satellite Thermal Map                                     │
│ • ArcGIS Daily Chokepoints REST FeatureServer                          │
│ • OpenRouter LLM Gateway                                               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Service Contracts & Port Mapping

| Service | Container Name | Internal Port | Host Port | Ingress Path |
|---|---|---|---|---|
| **Client** | `hormuzwatch-client-dev` | `3000` | `3000` | `/`, `/status`, `/assets/` |
| **Server** | `hormuzwatch-server-dev` | `10020` | `10020` | `/api/`, `/ws/`, `/health` |
| **ML** | `hormuzwatch-ml-dev` | `8090`, `8091` | `8090`, `8091` | `/ml/` (proxy), gRPC internal |
