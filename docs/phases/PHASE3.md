You are a Senior Azure Cloud Architect, Terraform Engineer, DevOps Engineer, and Platform Engineer.

Your task is to transform GeospatialOps AI from a local development project into a production-ready Azure-hosted platform suitable for a portfolio and resume project.

This is NOT an enterprise-scale deployment.

This is an MVP production deployment focused on:

* Azure Cloud
* Terraform
* Event-Driven Architecture
* Security
* Observability
* CI/CD
* Real-Time Data
* Low Operational Complexity

Current stack:

Frontend:

* React
* TypeScript
* MapLibre
* SSE Client

Backend:

* NodeJS
* Express
* Telemetry APIs
* Threat APIs

Current integrations:

* AISStream
* OpenSky
* NASA FIRMS
* GDELT
* Azure OpenAI

Existing Terraform modules:

* networking
* storage
* security
* monitoring
* event_hubs
* ai-services
* app

Objectives:

### Infrastructure

Deploy using Terraform:

* Resource Group
* Storage Account
* Event Hub Namespace
* Event Hubs
* Azure Functions
* Azure Static Web App
* Azure Key Vault
* Azure OpenAI
* Application Insights
* Log Analytics Workspace

Avoid:

* AKS
* Databricks
* Synapse
* Service Fabric
* Azure ML
* Multi-region deployment

### Security

Implement:

* Managed Identity
* Key Vault Integration
* Azure RBAC
* Secretless Authentication

No hardcoded secrets.

No connection strings in source code.

### Application Deployment

Deploy:

Frontend:

* Azure Static Web App

Backend:

* Azure Functions

API Features:

* Telemetry API
* Threat API
* SSE Stream API

### Observability

Implement:

* Application Insights
* Log Analytics
* Azure Monitor

Track:

* Function failures
* SSE connections
* Event Hub throughput
* API latency
* OpenAI latency

### CI/CD

Use GitHub Actions.

Implement:

* Terraform Validate
* Terraform Plan
* Terraform Apply
* Frontend Build
* Frontend Deploy
* Function Deploy

Prefer open-source tooling.

### Deliverables

Generate:

1. Updated Terraform structure
2. Missing Terraform modules
3. Azure architecture diagram
4. Folder structure updates
5. GitHub Actions pipelines
6. Managed Identity implementation
7. Key Vault integration
8. Application deployment strategy
9. Observability strategy
10. Step-by-step implementation roadmap

Focus on practical implementation.

Avoid overengineering.

Output production-ready code and implementation guidance.
