# Go data pipeline and pgx migration

## Ownership

Go owns live ingestion, current-track projection, append-only observation
history, curation, and external export. Python consumes immutable curated
snapshots for offline ML training; it does not write production telemetry.

## Data flow

```text
AIS / OpenSky / Kystverket / simulator / web API
                    |
                    v
        domain.telemetry.Observation
                    |
                    v
       db.PersistTelemetry (pgx transaction)
          |                         |
          v                         v
   tracks (current UI)    telemetry_observations (history)
                                      |
                                      v
                 datasets.Service (domain curation)
                                      |
                         CSV + JSON manifest to Drive
                                      |
                    dataset_snapshots audit table
```

## Query ownership

- `server/internal/db/queries_telemetry.go`: live projection and observation
  history writes.
- `server/internal/datasets/queries.go`: curated vessel, aircraft, heatmap,
  and snapshot-status queries.
- `server/internal/domain/telemetry`: shared types and domain/source constants.

The legacy `database/sql` helper remains for existing query families. New
telemetry and dataset code uses `pgxpool` with simple protocol configured for
Supabase/PgBouncer. Move other domains one query family at a time; do not mix
placeholder styles in a single repository.

## Operations

- `POST /datasets/snapshot` with `{"domain":"vessel|aircraft|heatmap"}` queues
  a curated export and returns `snapshot_id`.
- `GET /datasets/status` reports queue and external-storage configuration.
- `DATASET_SNAPSHOT_INTERVAL_MINUTES` enables scheduled exports; zero disables
  them.
- `DATASET_ROW_LIMIT` caps each export; `DATASET_RETENTION` controls the number
  of Drive exports retained per domain.

Every export uploads a CSV and adjacent JSON manifest containing snapshot ID,
domain, creation time, row count, and schema. The database records whether it
was queued, uploaded, or spilled locally if Drive is unavailable.
