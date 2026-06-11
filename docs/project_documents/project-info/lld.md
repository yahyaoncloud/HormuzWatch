# Low-Level Design

## Telemetry Contract

```json
{
  "imo": "IMO-9824130",
  "vesselName": "Al Safina Trader",
  "timestamp": "2026-06-01T00:42:00Z",
  "lat": 26.35,
  "lon": 56.72,
  "speed": 7.1,
  "previousSpeed": 14.8,
  "heading": 238,
  "courseDelta": 58,
  "aisAgeMinutes": 1,
  "hotZoneDistanceNm": 4.2
}
```

## Function Endpoints

- `GET /api/health`: returns health and managed identity detection.
- `POST /api/analyze`: validates telemetry with Zod and returns anomaly score, severity, reasons, and recommended safety actions.

## Stream Analytics

`stream-analytics/ais-anomaly-query.sql` groups AIS telemetry into two-minute tumbling windows and sends suspicious behavior to the Function API.

## Dashboard

The frontend is a React single-page application with dashboard, analytics, alerts, system health, audit logs, AI insights, and documentation views.
