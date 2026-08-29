# HormuzWatch — Azure Terraform Infrastructure

## Architecture

```
Resource Group: hormuzwatch-prod
│
├── Networking
│   ├── VNet (10.0.0.0/16)
│   ├── Subnet: app (10.0.1.0/24)     — Container Apps
│   ├── Subnet: data (10.0.2.0/24)    — PostgreSQL Flexible Server
│   ├── Subnet: monitoring (10.0.3.0/24)
│   └── NSG (network security groups per subnet)
│
├── Compute
│   ├── Container App: hormuzwatch-server (Go backend)
│   ├── Container App: hormuzwatch-ml (Python ML)
│   ├── Container Registry (ACR) — hormuzwatch.azurecr.io
│   └── Environment — managed K8s
│
├── Data & Streaming
│   ├── PostgreSQL Flexible Server (v14, 2 vCPU, 8 GB)
│   ├── Event Hub: telemetry-ingest (64 partitions)
│   ├── Event Hub: anomaly-events (8 partitions)
│   └── Storage Account: backups, datasets (RA-GRS)
│
├── AI/ML
│   ├── Azure OpenAI: gpt-4o-mini (threat classification)
│   ├── Cognitive Services: translation (multi-language news)
│   └── ML Workspace (model registry + training)
│
├── Monitoring
│   ├── Log Analytics Workspace
│   ├── Application Insights (Go + Python)
│   ├── Alert Rules (pipeline health, anomaly spikes)
│   └── Dashboard (pipeline overview, API latency)
│
└── Security
    ├── Key Vault (secrets: DB password, API keys, JWT secret)
    ├── Managed Identity (Container Apps → Key Vault)
    ├── Private Endpoints (PostgreSQL, Storage, Key Vault)
    └── WAF Policy (front door DDoS + rate limiting)
```

## Module Overview

```
terraform/
├── environments/
│   ├── dev/          # Development (minimal resources)
│   ├── test/         # Testing (mirrors prod at smaller scale)
│   └── prod/         # Production (full HA deployment)
├── modules/
│   ├── networking/   # VNet, subnets, NSG, private endpoints
│   ├── app/          # Container Apps, ACR, Environment
│   ├── storage/      # Storage accounts, backups
│   ├── event_hubs/   # Event Hub namespaces + hubs
│   ├── ai-services/   # OpenAI, Cognitive Services, ML Workspace
│   ├── monitoring/   # Log Analytics, App Insights, Alerts
│   └── security/     # Key Vault, Managed Identity, WAF
├── pipelines/
│   └── terraform-plan.yml  # GitHub Actions — plan on PR
├── scripts/
│   └── bootstrap-state.ps1 # Initialize remote state in Azure Storage
└── *.tf              # Root module composition
```

## Quick Start

### 1. Bootstrap Remote State

```powershell
cd terraform
.\scripts\bootstrap-state.ps1
```

Creates:
- Resource Group: `hormuzwatch-tfstate`
- Storage Account + Container for Terraform remote state

### 2. Deploy Environment

```bash
# Development
cd terraform/environments/dev
terraform init
terraform plan -out=tfplan
terraform apply tfplan

# Production
cd terraform/environments/prod
terraform init
terraform plan -out=tfplan -var-file=prod.tfvars
terraform apply tfplan
```

### 3. CI/CD (GitHub Actions)

Plan runs automatically on PR to main:
```yaml
# .github/workflows/terraform-plan.yml
on:
  pull_request:
    branches: [main]
    paths: ["terraform/**"]
```

Apply runs manually via workflow dispatch.

## Module Details

### `modules/networking`

| Resource | Purpose |
|----------|---------|
| `azurerm_virtual_network` | VNet with address space |
| `azurerm_subnet` × 3 | app, data, monitoring subnets with delegations |
| `azurerm_network_security_group` | Per-subnet NSG rules |
| `azurerm_private_dns_zone` | PostgreSQL, Storage, Key Vault private DNS |
| `azurerm_private_endpoint` | Private connectivity to PaaS services |

### `modules/app`

| Resource | Purpose |
|----------|---------|
| `azurerm_container_app_environment` | Managed K8s environment |
| `azurerm_container_app` × 2 | server + ml containers |
| `azurerm_container_registry` | Docker image storage |
| `azurerm_role_assignment` | ACR pull for Container Apps |

Container App configuration:
```hcl
resource "azurerm_container_app" "server" {
  template {
    container {
      name   = "hormuzwatch-server"
      image  = "${acr_url}/hormuzwatch-server:${var.version}"
      cpu    = 1.0
      memory = "2Gi"
    }
  }

  ingress {
    target_port = 10020
    traffic_weight {
      percentage = 100
    }
  }
}
```

### `modules/event_hubs`

| Resource | Purpose |
|----------|---------|
| `azurerm_eventhub_namespace` | Standard SKU, 20 TU |
| `azurerm_eventhub` × 2 | telemetry-ingest (64 partitions), anomaly-events (8 partitions) |
| `azurerm_eventhub_authorization_rule` | Send/Listen policies |

### `modules/ai-services`

| Resource | Purpose |
|----------|---------|
| `azurerm_cognitive_account` | OpenAI deployment (gpt-4o-mini) |
| `azurerm_cognitive_account` | Translator (news translation) |
| `azurerm_machine_learning_workspace` | ML training + model registry |

### `modules/monitoring`

| Resource | Purpose |
|----------|---------|
| `azurerm_log_analytics_workspace` | Centralized log storage |
| `azurerm_application_insights` | Go + Python telemetry |
| `azurerm_monitor_metric_alert` × 3 | Pipeline backlog, source failure, service down |
| `azurerm_portal_dashboard` | Pipeline health + anomaly dashboard |

### `modules/security`

| Resource | Purpose |
|----------|---------|
| `azurerm_key_vault` | Secrets: DB password, JWT, API keys |
| `azurerm_key_vault_secret` × N | Individual secrets |
| `azurerm_user_assigned_identity` | Container App → Key Vault access |
| `azurerm_role_assignment` | RBAC for managed identity |
| `azurerm_web_application_firewall_policy` | Rate limiting + SQL injection + XSS |

## Variables

Key variables in `terraform.tfvars.example`:

```hcl
environment     = "prod"
location        = "westeurope"
version         = "2.0.0"
postgres_sku    = "GP_Standard_D2s_v3"  # 2 vCPU, 8 GB
container_cpu   = 1.0
container_memory = "2Gi"
event_hub_tu    = 20
openai_model    = "gpt-4o-mini"
log_retention   = 30  # days
```

## Cost Estimation (Production)

| Resource | SKU | Monthly (est.) |
|----------|-----|---------------|
| Container Apps × 2 | 1 vCPU, 2 GB | $120 |
| PostgreSQL Flexible | GP 2 vCPU, 8 GB | $150 |
| Event Hub | Standard 20 TU | $250 |
| Storage Account | LRS, 500 GB | $15 |
| Key Vault | Standard | $3 |
| Log Analytics | 30 day retention | $30 |
| Application Insights | 5 GB/month | $15 |
| OpenAI | gpt-4o-mini, 100K tokens/day | $60 |
| Azure Container Registry | Basic | $5 |
| **Total** | | **~$650/month** |
