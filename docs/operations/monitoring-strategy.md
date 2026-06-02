# Monitoring Strategy

## Azure Native

- Azure Monitor for metrics and alerts.
- Log Analytics for centralized diagnostics.
- Application Insights for API traces, dependencies, failures, and availability tests.
- Action Groups for email notifications.

## Open Source

- Prometheus scrapes local API and infrastructure exporters.
- Grafana visualizes SLOs, event rates, and latency.
- Fluent Bit forwards app logs.
- OpenSearch stores searchable operational logs.
- Jaeger and OpenTelemetry trace request paths.

## Key Alerts

- Event Hub incoming server errors above threshold.
- Stream Analytics job stopped.
- Function App HTTP 5xx above 2 percent for 5 minutes.
- Key Vault denied operations.
- AI endpoint p95 latency above 2 seconds.
