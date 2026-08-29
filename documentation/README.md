# HormuzWatch — Production Documentation Index

**HormuzWatch** is a production-grade maritime threat intelligence platform built on Azure.
It ingests multi-source news and real-time AIS vessel data, runs an ensemble ML anomaly detection
pipeline, and surfaces actionable risk signals for the Strait of Hormuz region.

> **Platform:** Microsoft Azure · **Runtime:** Go 1.25 + Python 3.11 · **DB:** Supabase (PostgreSQL)

---

## Documentation Map

| Document | Audience | Purpose |
|----------|----------|---------|
| [01-product-overview.md](01-product-overview.md) | All | What it is, why it exists, what it does |
| [02-azure-platform-rationale.md](02-azure-platform-rationale.md) | Engineering / Architecture | Why Azure was chosen, service-by-service justification |
| [03-system-architecture.md](03-system-architecture.md) | Engineering | End-to-end system design, data flows, component contracts |
| [04-ml-pipeline.md](04-ml-pipeline.md) | ML / Engineering | ML lifecycle — features, training, inference, drift detection |
| [05-azure-infrastructure.md](05-azure-infrastructure.md) | Cloud / DevOps | Terraform IaC, Azure services, networking, IAM |
| [06-cicd-pipeline.md](06-cicd-pipeline.md) | DevOps | GitHub Actions, Docker, zero-downtime deploys |
| [07-observability.md](07-observability.md) | DevOps / SRE | OpenTelemetry, Azure Monitor, alerts, SLOs |
| [08-reliability-engineering.md](08-reliability-engineering.md) | Engineering / SRE | Circuit breakers, AIS buffer, graceful shutdown, fault tolerance |
| [09-api-reference.md](09-api-reference.md) | Developers | Full REST + WebSocket + gRPC API surface |
| [10-operations-runbook.md](10-operations-runbook.md) | Ops | Day-to-day procedures, incident response, rollback |

---

## Quick Navigation

### I want to deploy the platform
→ [05-azure-infrastructure.md](05-azure-infrastructure.md) → [06-cicd-pipeline.md](06-cicd-pipeline.md)

### I want to understand the ML system
→ [04-ml-pipeline.md](04-ml-pipeline.md)

### I want to understand why Azure was chosen
→ [02-azure-platform-rationale.md](02-azure-platform-rationale.md)

### Something is broken in production
→ [10-operations-runbook.md](10-operations-runbook.md)

### I want to add a new API endpoint or feature
→ [03-system-architecture.md](03-system-architecture.md) → [09-api-reference.md](09-api-reference.md)

---

## Project Metadata

| Field | Value |
|-------|-------|
| Repository | `HormuzWatch/product/` |
| Current Version | See `product/VERSION` |
| Cloud Region | `centralindia` (Mumbai) |
| Terraform State | Azure Blob Storage |
| Container Registry | Azure Container Registry (`hormuzwatchprod.azurecr.io`) |
| Managed DB | Supabase (PostgreSQL 15) |
| Domain | `api.hormuzwatch.app` (Azure Front Door) |

---

*Documentation maintained by the engineering team. Last updated: August 2026.*
