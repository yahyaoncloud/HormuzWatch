# HormuzWatch — Stream Analytics

Real-time AIS vessel anomaly detection queries for PostgreSQL + PostGIS.

## Queries

| # | Query | Purpose |
|---|-------|---------|
| 1 | AIS Gap Detection | Vessels that stopped transmitting for > 15 min in sensitive zones |
| 2 | Course Deviation | Heading change > 30° from rolling 5-point average |
| 3 | Speed Anomaly | Overspeed (>25kn), loitering (<2kn), stopped in Strait |
| 4 | Geofence Proximity | Vessels within 10nm of restricted naval zones |
| 5 | Anomaly Aggregation | Hourly anomaly counts by severity |
| 6 | Track History | Full path reconstruction for a single vessel |
| 7 | Threat Density Heatmap | Grid-based anomaly density for map overlay |

## Usage

```sql
-- Run in Supabase SQL Editor or psql connected to your database
\i stream-analytics/ais-anomaly-queries.sql
```

## Integration Points

- **WebSocket:** Query results streamed to frontend via `/ws/stream`
- **Admin Dashboard:** Anomaly counts displayed in `/admin` overview cards
- **Map Overlay:** Grid-based threat density rendered as heatmap layer
- **Alerting:** Results fed into Prometheus alert rules via `/public/metrics`
