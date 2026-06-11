# CI/CD & Automation Pipelines

This document details the GitHub Actions workflows required to automate the build, test, and deployment phases of the Geospatial HormuzWatch platform.

## Branching Strategy
- `main`: Production environment (Azure ACA).
- `develop`: Staging environment (Optional, for integration testing).
- Feature branches (`feat/*`, `fix/*`): Merged via PR into `develop`.

## CI Pipeline (Continuous Integration)
**Trigger**: Push or PR to `main` or `develop`.

### Backend (Go)
1. **Linting & Formatting**: `golangci-lint` and `go fmt`.
2. **Unit Testing**: `go test ./...`
3. **Security Scan**: `gosec` to scan for vulnerabilities.

### Frontend (React)
1. **Linting**: `npm run lint` (ESLint)
2. **Type Checking**: `npx tsc --noEmit`
3. **Build Test**: `npm run build`

## CD Pipeline (Continuous Deployment)
**Trigger**: Push to `main`.

### 1. Build and Push Docker Images
We will use Docker Buildx within GitHub Actions to build and push our containers to Azure Container Registry (ACR).
- `Geospatial-hormuzwatch-go-server:latest`
- `Geospatial-hormuzwatch-react-frontend:latest`

Authentication to ACR will be handled via **OIDC (OpenID Connect)** federated credentials linked to the GitHub repository, eliminating the need to store long-lived registry passwords in GitHub Secrets.

### 2. Infrastructure as Code (Terraform)
- **Terraform Plan**: Generates an execution plan.
- **Terraform Apply**: Applies the infrastructure changes, deploying the latest image tags from ACR to the Azure Container Apps.

### 3. Database/State Migrations
(Future Phase): Run any required state migrations automatically post-deployment.

## Security Practices in Automation
- No secrets stored in GitHub Actions except the Azure Client ID and Tenant ID for OIDC federation.
- Terraform state is stored securely in an Azure Storage Account container with state locking.
