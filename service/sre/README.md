# 🛠️ HormuzWatch SRE CLI & Chaos Suite (`service/sre/`)

A dedicated Site Reliability Engineering (SRE) tool implemented in **Go** with a lightweight **Bash** wrapper for live monitoring, multi-container colorized log tailing, and fault-tolerance chaos testing.

---

## 🚀 Features

- **Multi-Tier Health Audit**: Simultaneously inspects Go API, Python ML Engine, Client Nginx SPA, Supabase PostgreSQL, and Cloudflare Zero-Trust edge tunnel.
- **Fault-Tolerance Benchmark**: Sends concurrent load bursts, measures P50 / P95 / P99 latency percentiles, tracks 5xx error spikes, and computes Availability SLO scores.
- **Multiplexed Color Logs**: Tunnels structured JSON logs from all Docker containers with real-time color highlighting.
- **Interactive TUI Monitor**: Continuous 2-second vital signs display for active operations.

---

## 📖 Usage Guide

```bash
# Display help and command list
./service/sre/sre.sh help

# Run deep health audit
./service/sre/sre.sh health

# Run load and resilience benchmark
./service/sre/sre.sh tolerance -requests 100 -concurrency 10

# Tail live colorized logs
./service/sre/sre.sh logs

# Launch real-time vital signs monitor
./service/sre/sre.sh monitor

# Start Prometheus and Grafana dashboards
./service/sre/sre.sh obs-up
```

---

## 💻 Direct Go Execution

You can compile or run the Go source directly without dependencies:

```bash
cd service/sre
go run main.go health -server "http://192.168.1.51:10020" -ml "http://192.168.1.51:8090" -client "http://192.168.1.51:3000"
```
