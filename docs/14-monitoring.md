# Observability & Monitoring

HormuzWatch is designed to run in a cloud-native environment (Azure) and leverages standard stdout/stderr logging, coupled with Azure Application Insights, for observability.

---

## 1. Application Logging

Both the Go Backend and the Python ML service follow the **12-Factor App** methodology regarding logging:
- They do not manage log files locally.
- All logs are written asynchronously to `stdout` and `stderr`.

**Go Logging Example:**
```go
log.Printf("[AISStream] Successfully connected to %s", url)
log.Printf("[ML] Training job failed: %v", err)
```
- Tags like `[AISStream]`, `[ML]`, `[Websocket]` are used as prefixes to easily grep streams.

**Python Logging Example:**
```python
logger = logging.getLogger("hormuzwatch.app")
logger.info("Successfully trained new Isolation Forest model.")
```

---

## 2. Infrastructure Monitoring (Azure)

When deployed via the Terraform definitions in this repository, Azure automatically handles log ingestion.

### Azure Log Analytics Workspace
- Collects `stdout` and `stderr` from the Azure Container Apps.
- Logs can be queried using Kusto Query Language (KQL).

**Sample KQL Query (Find ML Training Failures):**
```kql
ContainerAppConsoleLogs_CL
| where ContainerAppName_s == "ca-hormuzwatch-prod-api"
| where Log_s contains "[ML] Training job failed"
| order by TimeGenerated desc
```

### Azure Application Insights
- Tied to the Container Apps environment.
- Tracks HTTP request durations, failure rates, and dependency calls (e.g., HTTP calls from the Go server to the Python ML server).

---

## 3. Application Health Checks

Both services expose `/health` endpoints. These are utilized by Docker Compose (locally) and Azure Container Apps (production) for liveness and readiness probes.

**Go Backend:** `GET /health`
```json
{"status": "ok", "time": "2026-06-11T12:00:00Z"}
```

**Python ML Service:** `GET /health`
```json
{"status": "healthy", "service": "ml-inference"}
```

If a probe fails consecutively, the container runtime will automatically kill and restart the container instance.

---

## 4. Business Metrics & Dashboarding

While infrastructure metrics live in Azure, **Business Metrics** (e.g., total tracks, anomalies by severity) are surfaced directly within the application's React frontend.

- **Analytics Page (`/analytics`)**: Renders Recharts visualizations of historical anomalies grouped by day and severity.
- **Top Traces (`/live`)**: Shows the most severe active threats across the entire system.

This "in-app observability" allows operators to monitor the system's operational health without needing access to the Azure Portal.
