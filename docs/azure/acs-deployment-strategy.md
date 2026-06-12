# Azure Container Apps (ACA) Deployment Strategy

This document outlines the strategic deployment of the Geospatial HormuzWatch project on Microsoft Azure using Azure Container Apps (ACA) instead of Azure Functions, reflecting the transition to a fully containerized Go/React stack.

## Architecture Mapping

### Frontend: React Application
- **Azure Service**: Azure Container Apps (ACA) or Azure Static Web Apps (ASWA). Since we containerized it via NGINX, ACA is the most direct port, though ASWA is more cost-effective for pure static assets. We will use ACA for uniform deployment.
- **Container Registry**: Azure Container Registry (ACR).
- **Scale**: Minimum replica 0 (Scale to zero) for cost saving in Phase 3.

### Backend: Go Server
- **Azure Service**: Azure Container Apps (ACA)
- **Networking**: Configured with Ingress enabled to allow HTTP traffic and WebSocket upgrades (automatically supported by ACA).
- **Scaling**: KEDA-based scaling on HTTP requests.
- **Security**: Managed Identity will be assigned to this Container App to fetch secrets securely.

### Secrets Management
- **Azure Key Vault**: Stores API keys (AISStream, OpenSky, FIRMS). 
- ACA will retrieve secrets directly from Key Vault using its Managed Identity, ensuring zero secrets are stored in environment variables or code.

### Observability
- **Application Insights & Log Analytics Workspace**: ACA natively integrates with Log Analytics. Go backend logs will stream automatically into the workspace for querying.

## Infrastructure as Code (Terraform) Updates
To support this architecture, our `terraform/` folder will be updated in Phase 3 to provision:
1. `azurerm_resource_group`
2. `azurerm_container_registry` (ACR)
3. `azurerm_log_analytics_workspace`
4. `azurerm_container_app_environment`
5. `azurerm_container_app` (Frontend & Backend)
6. `azurerm_key_vault` & `azurerm_key_vault_secret`
7. `azurerm_role_assignment` (for Managed Identity access to ACR and Key Vault)

## Rollout Phases
1. **Provision Infrastructure**: Run Terraform to create ACR, ACA Environment, Key Vault.
2. **Build & Push Images**: GitHub Actions (see `automation/ci-cd-pipelines.md`).
3. **Deploy Apps**: Terraform deploys the ACA resources pointing to the latest ACR images.
4. **Validation**: Test WebSocket connectivity and real-time streaming over the Azure ACA endpoint.
