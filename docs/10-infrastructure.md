# Infrastructure & Cloud Architecture

HormuzWatch uses **Microsoft Azure** as its primary cloud provider, provisioned entirely through **Terraform** (`/terraform/`).

---

## 1. Cloud Resources

### Azure Container Apps (ACA)
Used to host both the Go backend and the Python ML service.
- **Why ACA?** It provides serverless container scaling (including scaling to 0 to save costs), native HTTP ingress, Dapr integration if needed, and managed SSL certificates.
- **Go Backend**: Requires persistent network connections for WebSocket streaming. Minimum replicas typically set to 1.
- **ML Service**: Stateless REST API. Can scale based on HTTP concurrent requests.

### Azure Static Web Apps (SWA)
Hosts the React Vite frontend.
- **Why SWA?** Global edge CDN delivery for static assets. Built-in CI/CD integration with GitHub Actions. Free tier covers standard usage.

### Azure Container Registry (ACR)
Private Docker registry to store built images for the backend and ML services.

### Azure Key Vault (AKV)
Securely stores secrets (Database credentials, JWT keys, API keys).
- **Access**: Container Apps use Managed Identity to read secrets from AKV at runtime, preventing secrets from living in Terraform state or environment variables in plain text.

### Azure Application Insights & Log Analytics
Provides centralized logging, APM (Application Performance Monitoring), and live metrics for the container apps.

---

## 2. Infrastructure as Code (Terraform)

The `/terraform/` directory contains modular IaC definitions.

```
terraform/
├── main.tf                 # Root module, connects sub-modules
├── variables.tf            # Global variables
├── outputs.tf              # Global outputs
└── modules/
    ├── app/                # Azure Container Apps & Environment
    ├── networking/         # VNet, Subnets, NSGs, Private DNS
    ├── security/           # Key Vault, Managed Identities, RBAC
    ├── storage/            # Azure Storage Accounts (for ML artifacts)
    ├── monitoring/         # Log Analytics Workspace, App Insights
    └── ai-services/        # Azure Cognitive Services (Future expansion)
```

### Module Highlights
1. **Networking (`modules/networking`)**: Configures a VNet to ensure secure, private communication between Container Apps if necessary, isolating backend services from the public internet (except for the API ingress).
2. **Security (`modules/security`)**: Sets up the Key Vault and grants the Container App's Managed Identity the `Key Vault Secrets User` role.
3. **App (`modules/app`)**: Provisions the Container Apps Environment, binds it to the Log Analytics workspace, and configures the two container apps (API + ML).

---

## 3. Storage Strategy

Currently, HormuzWatch uses an **Embedded SQLite database (WAL mode)** for extreme simplicity and cost reduction during the portfolio stage.

**In Production (Azure):**
- Container Apps have ephemeral filesystems by default.
- To persist the SQLite `.db` file across container restarts or scales, an **Azure File Share** must be mounted to the Container App at the `/app/data` directory (where the DB file is configured to reside).
- *Alternatively*, the system is fully configured to accept a Supabase/PostgreSQL connection string via the `DATABASE_URL` environment variable, bypassing the need for local Azure volume mounts.

---

## 4. Alternative Deployment (Render)

As a fallback or alternative for the ML Service, a `render.yaml` blueprint is included in the repository.
This allows the FastAPI Python service to be deployed seamlessly to Render's free or hobby tiers, providing an easy way to decouple the ML compute from Azure if preferred.
