# HormuzWatch — End-to-End Azure Cloud Deployment Guide

> **Version**: 1.0 | **Branch**: `azure-dep` | **Last Updated**: June 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Azure Resource Inventory](#2-azure-resource-inventory)
3. [Network Architecture](#3-network-architecture)
4. [Prerequisites](#4-prerequisites)
5. [Initial Bootstrap (One-Time)](#5-initial-bootstrap-one-time)
6. [Terraform Deployment](#6-terraform-deployment)
7. [CI/CD Pipelines (GitHub Actions)](#7-cicd-pipelines-github-actions)
8. [Ansible Configuration Management](#8-ansible-configuration-management)
9. [Observability & Monitoring](#9-observability--monitoring)
10. [Security Model](#10-security-model)
11. [Backup & Restore](#11-backup--restore)
12. [Android One-Click Deploy App](#12-android-one-click-deploy-app)
13. [Cost Estimates](#13-cost-estimates)
14. [Destroy / Teardown Procedure](#14-destroy--teardown-procedure)
15. [Secrets Reference](#15-secrets-reference)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│            Azure Application Gateway (WAF v2)                    │
│         agw-hormuzwatch-prod  |  pip-hormuzwatch-prod-appgw      │
│    WAF Rules: OWASP 3.2  |  HTTP→HTTPS redirect  |  TLS 1.2+    │
└────────────┬──────────────────────────┬────────────────────────┘
             │                          │
             ▼                          ▼
┌────────────────────────┐   ┌─────────────────────────────────────┐
│  Azure Static Web Apps │   │    Container Apps Environment        │
│  (React SPA Frontend)  │   │    cae-hormuzwatch-prod              │
│  hormuzwatch.azuresta  │   │    (VNet-integrated: snet-aca)       │
│  ticapps.net           │   │                                      │
│  CDN: Global PoPs      │   │  ┌──────────────────────────────┐   │
└────────────────────────┘   │  │  ca-hormuzwatch-prod-api      │   │
                             │  │  Go Backend  :8080            │   │
                             │  │  Min: 1  |  Max: 5 replicas   │   │
                             │  │  CPU autoscale @ 70%          │   │
                             │  └──────────┬───────────────────┘   │
                             │             │ internal               │
                             │  ┌──────────▼───────────────────┐   │
                             │  │  ca-hormuzwatch-prod-ml       │   │
                             │  │  FastAPI ML Service  :8090    │   │
                             │  │  Min: 0 (scale to zero)       │   │
                             │  │  Max: 2 replicas              │   │
                             │  └──────────────────────────────┘   │
                             └──────────────────────────────────────┘
                                          │ Private VNet
                          ┌───────────────┼───────────────────┐
                          │               │                   │
                          ▼               ▼                   ▼
             ┌────────────────┐  ┌──────────────┐  ┌──────────────────┐
             │  Azure DB for  │  │ Azure Cache  │  │  Azure Key Vault │
             │  PostgreSQL    │  │  for Redis   │  │  kv-hormuzwatch  │
             │  Flexible Srv  │  │  Basic C1    │  │  Secrets+TLS     │
             │  16 GB  B1ms   │  │  1 GB        │  │                  │
             │  Private EP    │  │  Private EP  │  │  Private EP      │
             └────────────────┘  └──────────────┘  └──────────────────┘
                          │
                          ▼
             ┌────────────────────────────────────────┐
             │  Azure Container Registry (ACR)        │
             │  acrhormuwatch-prod                    │
             │  Standard SKU  |  Geo-replication off  │
             └────────────────────────────────────────┘
                          │
                          ▼
             ┌────────────────────────────────────────┐
             │  Log Analytics Workspace               │
             │  + Application Insights                │
             │  + Azure Monitor Alerts                │
             └────────────────────────────────────────┘
```

---

## 2. Azure Resource Inventory

| Resource | Name Pattern | SKU | Purpose |
|----------|-------------|-----|---------|
| Resource Group | `rg-hormuzwatch-{env}` | — | Resource container |
| Virtual Network | `vnet-hormuzwatch-{env}` | — | Private network backbone |
| Application Gateway | `agw-hormuzwatch-{env}` | WAF_v2 | L7 LB, WAF, TLS termination |
| Public IP (AppGw) | `pip-hormuzwatch-{env}-appgw` | Standard | Static IP for AppGw |
| Container Registry | `acrhormuwatch{env}` | Standard | Docker image store |
| Container Apps Env | `cae-hormuzwatch-{env}` | — | ACA hosting env |
| Backend Container App | `ca-hormuzwatch-{env}-api` | 1 vCPU / 2 GiB | Go server |
| ML Container App | `ca-hormuzwatch-{env}-ml` | 0.5 vCPU / 1 GiB | FastAPI ML |
| PostgreSQL Flex Server | `psql-hormuzwatch-{env}` | B_Standard_B1ms | Primary DB |
| Redis Cache | `redis-hormuzwatch-{env}` | Basic C1 | Live telemetry cache |
| Key Vault | `kv-hormuzwatch-{env}` | Standard | Secrets management |
| Storage Account | `st-hormuzwatch-{env}` | Standard LRS | ML artifacts + backups |
| Event Hub Namespace | `evh-hormuzwatch-{env}` | Standard | AIS stream ingestion |
| Log Analytics WS | `law-hormuzwatch-{env}` | PerGB2018 | Centralized logs |
| Application Insights | `ai-hormuzwatch-{env}` | — | APM traces |
| Static Web App | `swa-hormuzwatch-{env}` | Free | React frontend CDN |
| Bastion Host | `bas-hormuzwatch-{env}` | Basic | Secure VM access |

---

## 3. Network Architecture

```
VNet: 10.42.0.0/16
│
├── snet-public          10.42.1.0/24   Public-facing resources
├── snet-functions       10.42.2.0/24   Function apps (delegated: Web/serverFarms)
├── snet-private-ep      10.42.3.0/24   Private endpoints (KV, Blob, Redis)
├── snet-aca             10.42.5.0/23   Container Apps (delegated: App/environments)
├── snet-appgw           10.42.7.0/24   Application Gateway (NSG required)
├── snet-postgres        10.42.8.0/24   PostgreSQL (delegated: DBforPostgreSQL)
├── AzureFirewallSubnet  10.42.10.0/26  Azure Firewall
└── AzureBastionSubnet   10.42.11.0/26  Azure Bastion

Private DNS Zones:
  privatelink.blob.core.windows.net
  privatelink.vaultcore.azure.net
  privatelink.servicebus.windows.net
  privatelink.cognitiveservices.azure.com
  privatelink.redis.cache.windows.net
  privatelink.postgres.database.azure.com
```

**Traffic flow (inbound)**:
```
Internet → AppGw (WAF) → ACA internal LB → Go Backend
                                         → ML Service (internal only)
```

**Data flow (backend)**:
```
Go Backend ──writes──► PostgreSQL (private endpoint, snet-postgres)
Go Backend ──cache──► Redis (private endpoint, snet-private-ep)
Go Backend ──calls──► ML Service (ACA internal FQDN)
Go Backend ──logs──►  Log Analytics via OTEL Collector
```

---

## 4. Prerequisites

### Required Tools
```bash
# Azure CLI (≥ 2.60)
az --version

# Terraform (≥ 1.8)
terraform --version

# Ansible (≥ 2.16)
ansible --version

# Docker (≥ 26)
docker --version

# GitHub CLI (optional, for workflow triggers)
gh --version
```

### Required Azure Permissions
- Subscription Contributor (for resource creation)
- User Access Administrator (for managed identity RBAC)

---

## 5. Initial Bootstrap (One-Time)

### 5.1 Create Service Principal

```bash
# Login
az login

SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create SP for Terraform + CI/CD
SP=$(az ad sp create-for-rbac \
  --name "sp-hormuzwatch-cicd" \
  --role "Contributor" \
  --scopes "/subscriptions/$SUBSCRIPTION_ID" \
  --json-auth)

echo $SP
# Save output — this is your AZURE_CREDENTIALS GitHub secret
```

### 5.2 Create Terraform Remote State Backend

```bash
# One-time — creates storage for TF state
BACKEND_RG="rg-hormuzwatch-tfstate"
BACKEND_SA="sthormuztfstate$(openssl rand -hex 4)"
LOCATION="eastus"

az group create --name $BACKEND_RG --location $LOCATION
az storage account create \
  --name $BACKEND_SA \
  --resource-group $BACKEND_RG \
  --sku Standard_LRS \
  --allow-blob-public-access false

az storage container create \
  --name tfstate \
  --account-name $BACKEND_SA

echo "TF_BACKEND_SA=$BACKEND_SA"
echo "TF_BACKEND_RG=$BACKEND_RG"
# Add these to GitHub secrets
```

### 5.3 Set GitHub Secrets

Go to **GitHub → Settings → Secrets and Variables → Actions** and add:

| Secret | Value | Description |
|--------|-------|-------------|
| `AZURE_CREDENTIALS` | SP JSON from step 5.1 | Full Azure credentials |
| `AZURE_CLIENT_ID` | SP appId | For ARM provider |
| `AZURE_CLIENT_SECRET` | SP password | For ARM provider |
| `AZURE_SUBSCRIPTION_ID` | Subscription ID | Azure subscription |
| `AZURE_TENANT_ID` | Tenant ID | Azure AD tenant |
| `TF_BACKEND_RG` | `rg-hormuzwatch-tfstate` | TF state RG |
| `TF_BACKEND_SA` | Storage account name | TF state storage |
| `POSTGRES_ADMIN_PASSWORD` | Strong password | DB admin (16+ chars) |
| `AVM_SSH_PRIVATE_KEY` | SSH private key | Ansible → AVM access |

---

## 6. Terraform Deployment

### 6.1 Local First Run (Dev)

```bash
cd terraform

# Copy and fill dev tfvars
cp environments/dev/terraform.tfvars.example environments/dev/terraform.tfvars
# Edit: set alert_email

# Init with remote state
terraform init \
  -backend-config="resource_group_name=rg-hormuzwatch-tfstate" \
  -backend-config="storage_account_name=<YOUR_SA_NAME>" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=hormuzwatch/dev/terraform.tfstate"

# Review
terraform plan -var-file="environments/dev/terraform.tfvars" \
  -var="postgres_admin_password=$PG_PASSWORD"

# Apply
terraform apply -var-file="environments/dev/terraform.tfvars" \
  -var="postgres_admin_password=$PG_PASSWORD" -auto-approve
```

### 6.2 GitOps Deployment (Recommended)

| Action | How |
|--------|-----|
| **Preview changes** | Open PR → `azure-dep` → auto `terraform plan` comment |
| **Deploy dev** | Push to `mvp` branch → auto `terraform apply` |
| **Deploy prod** | Merge to `azure-dep` → auto `terraform apply` |
| **Destroy prod** | GitHub Actions → "Terraform Apply/Destroy" → select `destroy` + `prod` |
| **Destroy dev** | GitHub Actions → "Terraform Apply/Destroy" → select `destroy` + `dev` |

### 6.3 Expected Apply Time

| Phase | Duration |
|-------|----------|
| Networking + DNS | ~3 min |
| Key Vault + ACR | ~2 min |
| PostgreSQL Flex Server | ~8 min |
| Redis Cache | ~3 min |
| Container Apps Env | ~5 min |
| Application Gateway | ~7 min |
| **Total (first run)** | **~30 min** |

> Re-applies (no infra changes, just code): **~2–3 min**

---

## 7. CI/CD Pipelines (GitHub Actions)

### Pipeline Overview

```
                    ┌─────────────────┐
                    │   Developer     │
                    │   git push      │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        Push to mvp    PR → azure-dep   Push to azure-dep
              │              │              │
              ▼              ▼              ▼
       [deploy-dev]   [terraform-plan]  [terraform-apply]
       terraform        Post plan        Apply prod infra
       apply dev         to PR
              │                            │
              ▼                            ▼
       [deploy-backend]           [deploy-backend]
       Build + push               Build + push
       backend:sha                backend:sha
       ml-service:sha             ml-service:sha
              │                            │
              ▼                            ▼
       Deploy to ACA dev          Deploy to ACA prod
       Update AppGw pool          Update AppGw pool
```

### Workflow Files

| File | Trigger | Purpose |
|------|---------|---------|
| `terraform-plan.yml` | PR to `azure-dep` or `mvp` | Plan + post to PR |
| `terraform-apply.yml` | Push or workflow_dispatch | Apply or Destroy |
| `deploy-backend.yml` | Push to `mvp`/`azure-dep` or dispatch | Build + deploy containers |
| `deploy-frontend.yml` | Push to client/ | Deploy to SWA |
| `ansible-config.yml` | workflow_dispatch | Push configs via Ansible |
| `security-scan.yml` | Push / PR | tfsec + Trivy + OWASP |

### Button-Click Operations (workflow_dispatch)

```
GitHub → Actions tab → Select workflow → "Run workflow" button

Available operations:
  Terraform Apply/Destroy
    ├─ action: [apply | destroy]
    └─ environment: [dev | prod]

  Ansible Config Push  
    ├─ playbook: [deploy | backup | destroy | site]
    ├─ environment: [dev | prod]
    └─ dry_run: [true | false]

  Deploy Backend
    └─ environment: [dev | prod]
```

---

## 8. Ansible Configuration Management

### Directory Structure

```
ansible/
├── ansible.cfg            # SSH pipelining, host key disabled
├── inventory/
│   ├── dev.ini            # Dev AVM IP
│   └── prod.ini           # Prod AVM IP
├── group_vars/
│   ├── all.yml            # Shared vars (ports, paths)
│   └── prod.yml           # Prod overrides
└── playbooks/
    ├── deploy.yml          # Full deploy (common + docker + secrets + ml)
    ├── backup.yml          # pg_dump → Azure Blob
    ├── destroy.yml         # Stop containers, remove configs
    └── site.yml            # Master (calls all roles)
```

### Manual Playbook Run

```bash
# Install Ansible
pip install ansible

# Set vars
export KV_NAME="kv-hormuzwatch-dev"
export ACR_NAME="acrhormuwatch-dev"

# Deploy
ansible-playbook \
  -i ansible/inventory/dev.ini \
  ansible/playbooks/deploy.yml \
  --extra-vars "env=dev kv_name=$KV_NAME acr_name=$ACR_NAME" \
  -v

# Backup
ansible-playbook \
  -i ansible/inventory/prod.ini \
  ansible/playbooks/backup.yml \
  --extra-vars "env=prod kv_name=kv-hormuzwatch-prod storage_account_name=sthormuwatch" \
  -v
```

---

## 9. Observability & Monitoring

### Stack

```
Application → OpenTelemetry SDK
    │
    ▼
OTel Collector (4317/4318)
    ├─► Prometheus (scrape pull)
    └─► Azure Monitor (push via OTLP exporter)

Prometheus → Grafana Dashboards
          → Alertmanager → Email / PagerDuty
```

### Start Observability Stack

```bash
cd infra-observability

# Set env vars
export DATABASE_URL="postgres://..."
export REDIS_ADDR="redis://..."
export GRAFANA_ADMIN_PASSWORD="your-password"

docker compose up -d

# Access
# Grafana:       http://localhost:3000   (admin / $GRAFANA_ADMIN_PASSWORD)
# Prometheus:    http://localhost:9090
# Alertmanager:  http://localhost:9093
```

### Key Metrics

| Metric | Alert Threshold |
|--------|----------------|
| `hormuzwatch_tracks_active` | > 500 = warn |
| `hormuzwatch_anomaly_score_p95` | > 80 = critical |
| `hormuzwatch_websocket_connections` | > 200 = warn |
| `http_request_duration_seconds_p95` | > 2s = warn |
| `redis_connected_clients` | > 100 = warn |
| `pg_up` | 0 = critical |

---

## 10. Security Model

### Defence in Depth

```
Layer 1: WAF (Application Gateway)
  - OWASP 3.2 ruleset in Prevention mode
  - Rate limiting per IP

Layer 2: Network
  - All data services on private endpoints
  - No public internet access for DB/Redis/KeyVault
  - NSG rules on all subnets

Layer 3: Identity
  - System-assigned managed identities for ACA
  - Key Vault access policies (Get/List secrets only)
  - No credentials stored in code

Layer 4: Data
  - PostgreSQL: TLS required (sslmode=require)
  - Redis: TLS only (port 6380), no plain-text port
  - Storage: Private endpoint, no public access

Layer 5: CI/CD
  - GitHub environments with required reviewers for prod
  - Trivy image scanning on every push
  - tfsec on every terraform change
  - Secrets masked in logs (::add-mask::)
```

### Key Vault Secrets

| Secret Name | Used By |
|-------------|---------|
| `database-url` | Go backend (DATABASE_URL) |
| `redis-connection-string` | Go backend (REDIS_URL) |
| `aisstream-api-key` | AIS integration |
| `jwt-secret` | Auth token signing |
| `admin-password-hash` | Initial admin seed |

---

## 11. Backup & Restore

### Automated Backup (GitHub Actions Schedule)

Add to `.github/workflows/ansible-config.yml`:
```yaml
schedule:
  - cron: '0 2 * * *'  # 2 AM UTC daily
```
With `inputs.playbook = backup`.

### Manual Backup

```bash
# Trigger via GitHub Actions button
# OR run directly:
ansible-playbook ansible/playbooks/backup.yml \
  -i ansible/inventory/prod.ini \
  --extra-vars "env=prod kv_name=kv-hormuzwatch-prod storage_account_name=sthormuwatch"
```

### Restore Procedure

```bash
# 1. Download backup from blob storage
az storage blob download \
  --account-name sthormuwatch \
  --container-name backups \
  --name "prod/hormuzwatch_prod_2026-06-12_020000.dump.gz" \
  --file /tmp/backup.dump.gz

# 2. Decompress
gunzip /tmp/backup.dump.gz

# 3. Restore to PostgreSQL
pg_restore \
  --no-acl \
  --no-owner \
  --dbname "$DATABASE_URL" \
  --verbose \
  /tmp/backup.dump

echo "✅ Restore complete"
```

### Backup Retention

| Data | Location | Retention |
|------|----------|-----------|
| DB snapshots (pg_dump) | Azure Blob `backups/` | 14 days |
| Point-in-time recovery | PostgreSQL built-in | 7 days |
| ML model artifacts | Azure Blob `ml-models/` | 30 days |
| Container images | ACR | Last 10 tags |
| Log Analytics | Log Analytics WS | 90 days |

---

## 12. Android One-Click Deploy App

### Architecture

The **HormuzWatch Deploy Android App** is a Kotlin Android application that:
- Authenticates with GitHub API (Personal Access Token or OAuth)
- Displays current infrastructure state (via Azure SDK or GitHub Actions API)
- Provides **Deploy** and **Destroy** buttons that trigger `workflow_dispatch`
- Shows real-time workflow progress via GitHub Actions API polling
- Triggers backup before destroy

### App Structure

```
android-deploy-app/
├── app/
│   ├── src/main/
│   │   ├── java/io/hormuzwatch/deploy/
│   │   │   ├── MainActivity.kt          # Main deploy/destroy UI
│   │   │   ├── api/GitHubApiService.kt  # Retrofit GitHub Actions API
│   │   │   ├── ui/DeployScreen.kt       # Compose UI screen
│   │   │   └── viewmodel/DeployVM.kt    # ViewModel + state
│   │   └── res/
│   │       └── layout/
└── build.gradle.kts
```

### Core Functionality

```kotlin
// DeployVM.kt
class DeployViewModel : ViewModel() {

    fun deployInfra(env: String) = viewModelScope.launch {
        _state.value = DeployState.Running("🚀 Deploying ${env}...")
        githubApi.triggerWorkflow(
            repo = "yahyaoncloud/HormuzWatch",
            workflow = "terraform-apply.yml",
            ref = if (env == "prod") "azure-dep" else "mvp",
            inputs = mapOf("action" to "apply", "environment" to env)
        )
        pollWorkflowStatus()
    }

    fun destroyInfra(env: String) = viewModelScope.launch {
        // Step 1: Backup first
        _state.value = DeployState.Running("💾 Backing up data...")
        githubApi.triggerWorkflow(
            workflow = "ansible-config.yml",
            inputs = mapOf("playbook" to "backup", "environment" to env)
        )
        awaitWorkflowComplete()

        // Step 2: Destroy
        _state.value = DeployState.Running("🗑️ Destroying ${env} infra...")
        githubApi.triggerWorkflow(
            workflow = "terraform-apply.yml",
            inputs = mapOf("action" to "destroy", "environment" to env)
        )
        pollWorkflowStatus()
    }
}
```

### App Screens

```
┌─────────────────────────────────┐
│  HormuzWatch Deploy             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                 │
│  Environment:  [Dev ▼]          │
│                                 │
│  Status:  ● LIVE                │
│  Backend: ✅  Frontend: ✅       │
│  DB: ✅     Redis: ✅            │
│                                 │
│  ┌─────────────────────────┐   │
│  │   🚀  DEPLOY INFRA      │   │
│  │   (~5 min to live site) │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │   🗑️  DESTROY INFRA     │   │
│  │   (backs up first)      │   │
│  └─────────────────────────┘   │
│                                 │
│  Last deploy: 2h ago            │
│  Est. monthly cost: $45/mo      │
└─────────────────────────────────┘
```

### Build the Android App

```bash
# The app source lives in android-deploy-app/
cd android-deploy-app

# Set GitHub token in local.properties:
echo "github.token=ghp_YOUR_PAT_HERE" >> local.properties
echo "github.repo=yahyaoncloud/HormuzWatch" >> local.properties

# Build APK
./gradlew assembleRelease

# Install on device
adb install app/build/outputs/apk/release/app-release.apk
```

---

## 13. Cost Estimates

### Dev Environment (monthly)

| Resource | SKU | Cost/mo |
|----------|-----|---------|
| Container Apps (api) | 1 vCPU / 2 GiB × 1 min replica | ~$15 |
| Container Apps (ml) | 0.5 vCPU / 1 GiB (scale-to-zero) | ~$3 |
| PostgreSQL Flex Server | B_Standard_B1ms | ~$15 |
| Redis Cache | Basic C0 (250 MB) | ~$16 |
| Container Registry | Standard | ~$5 |
| Application Gateway | WAF_v2 (1 capacity unit) | ~$35 |
| Storage (backups) | LRS 10 GB | ~$1 |
| Static Web Apps | Free tier | $0 |
| **Total Dev** | | **~$90/mo** |

### Prod Environment (monthly)

| Resource | SKU | Cost/mo |
|----------|-----|---------|
| Container Apps (api) | 1 vCPU / 2 GiB × 1-5 replicas | ~$30-75 |
| Container Apps (ml) | 0.5 vCPU / 1 GiB × 0-2 replicas | ~$5-15 |
| PostgreSQL Flex Server | GP_Standard_D2s_v3, 128 GB | ~$120 |
| Redis Cache | Standard C1 (1 GB, replicated) | ~$55 |
| Container Registry | Standard | ~$5 |
| Application Gateway | WAF_v2 | ~$35 |
| Storage + Blob | 50 GB | ~$3 |
| Log Analytics | PerGB2018 (5 GB) | ~$5 |
| Static Web Apps | Free | $0 |
| **Total Prod** | | **~$260-315/mo** |

> 💡 **Cost tip**: Destroy dev when not in use (save ~$90/mo). Android app makes this one tap.

---

## 14. Destroy / Teardown Procedure

### One-Click via Android App

1. Open HormuzWatch Deploy app
2. Select environment (Dev or Prod)
3. Tap **Destroy Infra**
4. App automatically: backs up DB → triggers Terraform destroy
5. All Azure resources deleted within ~15 minutes

### Via GitHub Actions

```
GitHub → Actions → "Terraform Apply / Destroy"
→ Run workflow
→ action: destroy
→ environment: prod
→ Run workflow
```

### Via CLI (Emergency)

```bash
cd terraform

terraform destroy \
  -var-file="environments/prod/terraform.tfvars" \
  -var="postgres_admin_password=$PG_PASSWORD" \
  -auto-approve
```

> ⚠️ `prevent_destroy = true` is set on the PostgreSQL server — remove this lifecycle rule before destroying if intentional.

---

## 15. Secrets Reference

### Environment Variables (Server)

| Variable | Source | Required |
|----------|--------|----------|
| `DATABASE_URL` | Key Vault → ACA secret | ✅ |
| `REDIS_URL` | Key Vault → ACA secret | ✅ |
| `PORT` | ACA env var | ✅ (8080) |
| `GIN_MODE` | ACA env var | ✅ (release) |
| `AUTH_DISABLED` | ACA env var | ✅ (false) |
| `AISSTREAM_API_KEY` | Key Vault | Optional |
| `ALLOWED_ORIGINS` | ACA env var | Optional |
| `JWT_SECRET` | Key Vault | ✅ |

### GitHub Actions Secrets Checklist

```
☐ AZURE_CREDENTIALS         (SP JSON)
☐ AZURE_CLIENT_ID
☐ AZURE_CLIENT_SECRET
☐ AZURE_SUBSCRIPTION_ID
☐ AZURE_TENANT_ID
☐ TF_BACKEND_RG
☐ TF_BACKEND_SA
☐ POSTGRES_ADMIN_PASSWORD
☐ AVM_SSH_PRIVATE_KEY
☐ GITHUB_TOKEN              (auto-provided)
```

---

## 16. Troubleshooting

### Container App not starting

```bash
# Check logs
az containerapp logs show \
  --name ca-hormuzwatch-prod-api \
  --resource-group rg-hormuzwatch-prod \
  --follow

# Check revision status
az containerapp revision list \
  --name ca-hormuzwatch-prod-api \
  --resource-group rg-hormuzwatch-prod \
  --output table
```

### Database connection failed

```bash
# Verify private endpoint DNS resolution (from inside VNet)
nslookup psql-hormuzwatch-prod.postgres.database.azure.com
# Should resolve to 10.42.8.x (private IP)

# Check firewall rules
az postgres flexible-server firewall-rule list \
  --name psql-hormuzwatch-prod \
  --resource-group rg-hormuzwatch-prod
```

### Redis connection failed

```bash
# Test from ACA container (exec into it)
az containerapp exec \
  --name ca-hormuzwatch-prod-api \
  --resource-group rg-hormuzwatch-prod \
  --command "/bin/sh"

# Inside container:
# redis-cli -u $REDIS_URL ping
```

### Application Gateway 502

Common causes:
1. ACA backend pool FQDN changed after re-deploy → re-run deploy-backend workflow
2. Backend health probe failing → check `/health` endpoint returns 200
3. TLS mismatch → ensure ACA ingress is HTTPS and backend http-settings `pick_host_name_from_backend_address = true`

---

*Generated by HormuzWatch Platform Engineering | `azure-dep` branch*
