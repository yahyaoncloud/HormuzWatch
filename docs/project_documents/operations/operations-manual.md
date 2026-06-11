# Operations Manual

## Daily Checks

- Confirm Event Hubs ingress and consumer lag.
- Confirm Stream Analytics job state is running.
- Confirm Function App error rate is below 1 percent.
- Confirm AI endpoint latency is inside SLO.
- Review denied audit events.

## SLOs

- AIS event processing latency: p95 under 90 seconds.
- Alert API availability: 99.5 percent for portfolio dev, 99.9 percent for production target.
- Dashboard availability: 99.9 percent.

## Escalation

Severity 1 alerts include ingestion outage, Function API unavailable, Key Vault access failure, or repeated denied access attempts.
