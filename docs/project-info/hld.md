# High-Level Design

HormuzShield ingests telemetry and imagery, scores anomalies, and displays operational insights in a secure web dashboard.

## Core Services

- Event Hubs receives AIS telemetry.
- Blob Storage stores imagery and manifests.
- Stream Analytics performs windowed rules and routes suspicious events to Functions.
- Azure Functions orchestrates enrichment, model inference, and alert creation.
- Azure ML handles vessel behavior anomaly inference.
- Azure AI Vision handles mock object-detection workloads.
- Azure OpenAI creates concise safety briefings from structured alerts.
- Static Web Apps hosts the React dashboard.
- Azure Monitor, Log Analytics, and Application Insights capture telemetry.

## Security Model

- Private endpoints for storage, Event Hubs, Key Vault, and AI services.
- Managed identities for app-to-service calls.
- Key Vault for external API credentials and endpoint secrets.
- Entra ID and RBAC for dashboard access.
- Azure Firewall and route tables for controlled egress.
