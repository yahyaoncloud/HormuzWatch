# Production Deployment and CI/CD Strategy

## Overview

This project follows a production-oriented deployment model based on immutable container images and automated delivery pipelines.

Rather than manually deploying application code to Azure resources, all services are packaged as Docker images, published to a container registry, and deployed automatically through a CI/CD pipeline.

This approach provides:

* Repeatable deployments
* Version-controlled releases
* Rollback capability
* Consistent runtime environments
* Reduced deployment errors
* Infrastructure automation

---

# Containerization Strategy

Each application component is packaged independently.

```text
apps/
├── frontend/
├── backend/
└── ml/
```

Docker images are built for:

```text
Frontend
Backend
ML Service
```

Each image contains:

* Application code
* Dependencies
* Runtime configuration
* Health checks

This guarantees that the same artifact tested during CI is deployed into production.

---

# Container Registry

## Azure Container Registry (ACR)

Purpose:

* Centralized image storage
* Versioned container artifacts
* Secure image distribution

Example Images:

```text
hormuzwatch/frontend:v1.0.0

hormuzwatch/backend:v1.0.0

hormuzwatch/ml:v1.0.0
```

Benefits:

* Private registry
* Azure-native integration
* Managed authentication
* Image versioning

---

# Continuous Integration

## GitHub Actions

Every commit triggers automated validation.

Pipeline:

```text
Developer Push
        │
        ▼
GitHub Actions
        │
        ├── Go Tests
        ├── Frontend Tests
        ├── ML Tests
        ├── Security Checks
        ├── Docker Build
        └── Push Images
```

Images are tagged using:

```text
Git SHA
Semantic Version
Latest
```

Examples:

```text
backend:latest

backend:v1.2.0

backend:9f6c1a2
```

This allows precise rollback and deployment tracking.

---

# Continuous Delivery

After successful image publication:

```text
GitHub Actions
        │
        ▼
Azure Container Registry
        │
        ▼
Azure Container Apps
```

Container Apps pull the latest approved image from Azure Container Registry.

Deployment process:

```text
1. Build Image

2. Push Image to ACR

3. Update Container App Revision

4. Pull New Image

5. Start New Revision

6. Health Check Validation

7. Route Traffic
```

This creates a controlled deployment workflow without requiring manual intervention.

---

# Managed Identity Authentication

Azure Container Apps use Managed Identities to authenticate against Azure Container Registry.

Benefits:

* No registry passwords
* No service principal secrets
* Reduced credential exposure
* Azure-native authentication

Authentication Flow:

```text
Container App
      │
Managed Identity
      │
      ▼
Azure Container Registry
```

---

# Deployment Architecture

```text
GitHub Repository
        │
        ▼
GitHub Actions
        │
        ▼
Azure Container Registry
        │
        ▼
Azure Container Apps
        │
        ├── Backend Service
        ├── ML Service
        └── Future Services
```

---

# Infrastructure Deployment

Infrastructure is deployed separately from application code.

Terraform manages:

```text
Resource Group
Container Registry
Container Apps
Event Hubs
PostgreSQL
Blob Storage
Key Vault
Application Insights
Managed Identities
```

Workflow:

```text
Terraform
      │
      ▼
Azure Infrastructure

GitHub Actions
      │
      ▼
Application Deployment
```

This separation ensures infrastructure changes and application releases can be managed independently.

---

# Deployment Benefits

This deployment model provides:

* Immutable infrastructure principles
* Container-based releases
* Automated deployments
* Versioned artifacts
* Rapid rollback capability
* Consistent environments
* Reduced operational risk
* Azure-native integration

By combining GitHub Actions, Azure Container Registry, Azure Container Apps, Managed Identities, and Terraform, the platform follows modern cloud-native deployment practices suitable for production environments.
