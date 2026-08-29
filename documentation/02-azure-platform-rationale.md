# 02 — Azure Platform Rationale

> Why Microsoft Azure was chosen as the cloud platform for HormuzWatch — decision record with technical and operational justification.

---

## 1. Decision Summary

HormuzWatch runs exclusively on **Microsoft Azure**. This was not a default choice — it was a deliberate engineering decision evaluated against GCP and AWS across five dimensions: data residency, service fit, cost profile, operational complexity, and portfolio signal.

---

## 2. Primary Reasons for Choosing Azure

### 2.1 India Data Residency (centralindia region)

The operator is India-based. Azure's `centralindia` (Mumbai) region provides:

- **Sub-20ms latency** to Supabase's AWS Mumbai endpoint (Supabase runs on AWS ap-south-1)
- **Data sovereignty compliance** — all compute and storage stays in India
- **Paired region failover** — `centralindia` pairs with `southindia` for geo-redundancy

GCP's Mumbai region (`asia-south1`) is a viable alternative, but Azure has broader enterprise adoption in India and stronger SLA coverage for the service mix used here. AWS would work but adds cost via double-cloud complexity (Supabase already runs on AWS; adding another AWS account creates IAM confusion).

### 2.2 Azure Container Apps — Best Fit for This Workload

The two core services (Go backend, Python ML) are long-running stateful containers:

| Requirement | Azure Container Apps (ACA) | Cloud Run (GCP) | ECS Fargate (AWS) |
|-------------|---------------------------|-----------------|-------------------|
| Persistent WebSocket connections | ✅ Session affinity built-in | ⚠️ Requires min instances + config | ✅ Yes |
| Scale to zero for ML service | ✅ Yes | ✅ Yes | ❌ No (always-on) |
| gRPC between containers | ✅ Internal VNET routing | ⚠️ Requires VPC Connector | ✅ Yes |
| Managed ingress + TLS | ✅ Built-in | ✅ Built-in | ❌ Requires ALB |
| Dapr sidecar support | ✅ Native | ❌ No | ❌ No |
| Cost (2 containers, 0.5 vCPU each) | ~$15/month | ~$12/month | ~$45/month |

ACA's internal VNET routing between the Go backend and Python ML service over gRPC is a critical design requirement. Cloud Run requires a VPC Connector (additional cost and latency). ECS Fargate does not support scale-to-zero.

### 2.3 Azure Container Registry — Integrated Auth

ACR integrates natively with ACA via Managed Identity — no credentials to rotate, no secrets in CI:

```bash
# GitHub Actions — no stored credentials needed:
az acr login --name hormuzwatchprod --identity
docker push hormuzwatchprod.azurecr.io/hormuzwatch-server:sha-abc123
```

On GCP, this requires Workload Identity Federation setup (more complex for a single engineer). On AWS, ECR requires IAM role chaining that adds configuration surface area.

### 2.4 Azure Monitor + Application Insights — Unified Observability

HormuzWatch uses OpenTelemetry for distributed traces and metrics. Azure Monitor is the best
native target because:

- **Zero-config ingestion**: ACA exports container logs to Log Analytics automatically
- **Application Insights**: OTLP endpoint accepts traces from Go and Python with no additional infrastructure
- **Kusto Query Language (KQL)**: Powerful log analytics built-in
- **Alert rules → Action Groups → Email/Slack**: Full alerting pipeline without a separate tool

On GCP, this requires setting up Cloud Trace + Cloud Monitoring separately. On AWS, CloudWatch + X-Ray have separate SDKs and a fragmented setup for cross-language tracing.

### 2.5 Terraform Azure Provider — Mature and Well-Documented

The `azurerm` Terraform provider (HashiCorp-maintained) is the most mature cloud provider
plugin with:
- Full ACA, ACR, Log Analytics, Monitor support
- First-class support for Managed Identity resource assignments
- Extensive HormuzWatch usage already started in `terraform/`

The existing Terraform codebase (`terraform/main.tf`, `variables.tf`, `providers.tf`) is already
Azure-native. Migrating to GCP/AWS would require a full rewrite of all IaC.

### 2.6 Azure Free + Pay-As-You-Go — Cost Control

Azure's free tier and PAYG pricing for the exact services used:

| Service | Free Tier | PAYG Production |
|---------|-----------|-----------------|
| Container Apps | 180,000 vCPU-seconds/month free | ~$0.000024/vCPU-s |
| Container Registry (Basic) | — | $5/month |
| Log Analytics | 5 GB/month free | $2.76/GB |
| Blob Storage (GRS) | — | $0.019/GB/month |
| Azure Front Door (Standard) | — | $35/month (optional) |
| **Total (light traffic)** | **~$0-20/month** | **~$30-60/month** |

This makes it viable for a solo engineer to run a production-grade system at near-zero cost
during development and low-traffic periods.

---

## 3. Service-to-Azure Mapping

| HormuzWatch Component | Azure Service | Justification |
|----------------------|---------------|---------------|
| Go Backend container | Azure Container Apps | WebSocket + gRPC, managed ingress, scale-to-zero |
| Python ML container | Azure Container Apps | Same environment as Go, internal gRPC routing |
| Container images | Azure Container Registry | Managed Identity auth, geo-replicated |
| Model artifacts (joblib) | Azure Blob Storage | Cheap, durable, accessible from ACA via MSI |
| Training datasets | Azure Blob Storage | Parquet exports from Supabase, versioned |
| Structured logs | Azure Log Analytics | Auto-collected from ACA, KQL queries |
| Distributed traces | Azure Application Insights | OTLP endpoint, zero-config from OTel SDK |
| Alerts | Azure Monitor Alerts + Action Groups | CPU, error rate, ML inference latency |
| Terraform state | Azure Blob Storage (tfstate) | Encrypted, locked, versioned |
| Secrets | Azure Key Vault | ACA pulls secrets via Managed Identity |
| CDN / TLS (optional) | Azure Front Door Standard | Global anycast, WAF, custom domain |

---

## 4. Services NOT Used and Why

| Azure Service | Considered | Rejected Because |
|---------------|-----------|------------------|
| Azure Kubernetes Service (AKS) | Yes | Overkill for 2 containers; $70-150/month minimum; operational overhead |
| Azure ML | Yes | Vendor lock-in for MLflow; adds $50+/month; not portable |
| Azure Functions | Yes | Cold starts break WebSocket + gRPC; not suitable for long-running pipelines |
| Azure SQL / CosmosDB | No | Supabase (PostgreSQL) is superior for this use case and already integrated |
| Azure Cache for Redis | No | Go's in-memory structures (maps + sync.RWMutex) sufficient at current scale |
| Azure Event Hubs / Service Bus | No | Go's bounded worker pool with rate limiting is sufficient; adds complexity without value at this data volume |

---

## 5. Comparison Summary

| Criterion | Azure ✅ | GCP | AWS |
|-----------|---------|-----|-----|
| Container orchestration fit | ACA — perfect | Cloud Run — WebSocket workarounds | ECS — no scale-to-zero |
| Internal gRPC routing | ACA VNET native | VPC Connector required | Task networking required |
| Observability integration | App Insights unified | Separate Trace + Monitoring | CloudWatch + X-Ray separate |
| Existing IaC | azurerm provider already written | Full rewrite needed | Full rewrite needed |
| India region latency | centralindia ≈ 15ms to Supabase | asia-south1 ≈ 18ms | ap-south-1 ≈ 12ms (same region as Supabase but account complexity) |
| Free tier value | High (ACA free vCPU-seconds) | Moderate | Low (no free ECS) |
| Engineer familiarity | Primary cloud skill | Secondary | Tertiary |
| Portfolio signal in India | Strong (Azure dominant in enterprise India) | Growing | Strong |

**Verdict:** Azure wins on container workload fit, operational simplicity, existing IaC investment, and cost. The only scenario where GCP would be preferred is if the team were already GCP-native with Cloud Run experience.

---

## 6. Risk Acknowledgements

| Risk | Mitigation |
|------|-----------|
| ACA is a newer service (GA 2022) | All critical features used (ingress, scaling, VNET) are stable |
| Vendor lock-in | Dockerfile-based; containers are portable; Supabase is not Azure-specific |
| centralindia region capacity | Paired with southindia; ACA multi-region can be added via Terraform |
| Azure cost overrun | Budget alerts set at $50/month; ACA scale-to-zero limits idle costs |
