# ⚙️ HormuzWatch Platform Services (`service/`)

The `service/` directory encapsulates all peripheral microservices, ingress proxies, intelligence ML engines, SRE utilities, and observability stacks.

---

## 🗂️ Service Modules

| Module | Directory | Description |
| :--- | :--- | :--- |
| **ML Intelligence Service** | [`ml-service/`](./ml-service/) | Python 3.11 FastAPI & gRPC 6-model anomaly detection ensemble |
| **SRE CLI & Chaos Suite** | [`sre/`](./sre/) | Go CLI & Bash tool for monitoring, tolerance benchmarking, and log tailing |
| **Observability Stack** | [`observability/`](./observability/) | Prometheus metrics scraper and Grafana SRE dashboards |
| **Cloudflare Ingress** | [`cloudflared/`](./cloudflared/) | Zero-Trust ingress tunnel routing for edge domains |
| **Helper Scripts** | [`scripts/`](./scripts/) | Service management, tunnel status, and healthcheck utilities |

---

## 🚦 Quick Commands

```bash
# Check all system health metrics across all services
./service/sre/sre.sh health

# Run load & fault-tolerance benchmark
./service/sre/sre.sh tolerance

# Launch Prometheus & Grafana dev observability dashboards
./service/sre/sre.sh obs-up

# Stream colorized logs from all containers
./service/sre/sre.sh logs
```
