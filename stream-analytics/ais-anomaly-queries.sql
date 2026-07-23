-- ────────────────────────────────────────────────────────────
-- HormuzWatch — Stream Analytics Queries
-- Purpose: Real-time anomaly detection patterns for AIS
--          vessel telemetry streams using PostgreSQL.
-- ────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════
-- 1. AIS Gap Anomaly Detection
-- Detects vessels that stopped transmitting AIS for > 15
-- minutes in sensitive zones (Strait of Hormuz, Bab-el-Mandeb).
-- ═══════════════════════════════════════════════════════════

WITH gaps AS (
    SELECT
        track_id,
        vessel_name,
        lag(timestamp) OVER (PARTITION BY track_id ORDER BY timestamp) AS prev_ts,
        timestamp AS curr_ts,
        lat, lon
    FROM telemetry
    WHERE timestamp > NOW() - INTERVAL '2 hours'
),
ais_drops AS (
    SELECT
        track_id,
        vessel_name,
        EXTRACT(EPOCH FROM (curr_ts - prev_ts)) / 60 AS gap_minutes,
        lat, lon,
        curr_ts
    FROM gaps
    WHERE EXTRACT(EPOCH FROM (curr_ts - prev_ts)) > 900  -- 15 minutes
)
SELECT
    track_id,
    vessel_name,
    gap_minutes,
    lat, lon,
    curr_ts AS detected_at
FROM ais_drops
ORDER BY gap_minutes DESC
LIMIT 20;


-- ═══════════════════════════════════════════════════════════
-- 2. Course Deviation Detection
-- Vessels deviating > 30° from their rolling average heading.
-- ═══════════════════════════════════════════════════════════

WITH rolling_avg AS (
    SELECT
        track_id,
        timestamp,
        heading,
        AVG(heading) OVER (
            PARTITION BY track_id
            ORDER BY timestamp
            ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
        ) AS avg_heading
    FROM telemetry
    WHERE timestamp > NOW() - INTERVAL '1 hour'
),
deviations AS (
    SELECT
        track_id,
        timestamp,
        heading,
        avg_heading,
        ABS(heading - avg_heading) AS delta_degrees
    FROM rolling_avg
)
SELECT
    track_id,
    MIN(timestamp) AS first_seen,
    MAX(delta_degrees) AS max_deviation,
    COUNT(*) AS consecutive_points
FROM deviations
WHERE delta_degrees > 30
GROUP BY track_id
HAVING COUNT(*) >= 3  -- sustained for 3+ points
ORDER BY max_deviation DESC;


-- ═══════════════════════════════════════════════════════════
-- 3. Speed Anomaly Detection
-- Vessels exceeding or dropping below expected speed range
-- for their vessel type in a given zone.
-- ═══════════════════════════════════════════════════════════

WITH speed_stats AS (
    SELECT
        t.track_id,
        t.vessel_name,
        t.speed,
        t.lat,
        t.lon,
        t.timestamp,
        -- Expected speed: 8-18 knots for commercial vessels
        CASE
            WHEN t.speed > 25 THEN 'overspeed'
            WHEN t.speed < 2 AND t.speed > 0 THEN 'loitering'
            WHEN t.speed = 0 AND ST_Contains(
                ST_MakeEnvelope(55.0, 25.0, 57.5, 27.5, 4326),
                ST_SetSRID(ST_MakePoint(t.lon, t.lat), 4326)
            ) THEN 'stopped_in_strait'
            ELSE 'normal'
        END AS speed_status
    FROM telemetry t
    WHERE t.timestamp > NOW() - INTERVAL '1 hour'
)
SELECT
    track_id,
    vessel_name,
    speed_status,
    speed,
    lat, lon,
    timestamp,
    COUNT(*) OVER (PARTITION BY track_id, speed_status) AS duration_points
FROM speed_stats
WHERE speed_status != 'normal'
ORDER BY timestamp DESC
LIMIT 30;


-- ═══════════════════════════════════════════════════════════
-- 4. Geofence Proximity Alerts
-- Vessels within 10nm of restricted naval zones.
-- ═══════════════════════════════════════════════════════════

WITH restricted_zones AS (
    SELECT * FROM (VALUES
        ('Strait of Hormuz N',  26.50, 56.20, 5.0),
        ('Strait of Hormuz S',  26.00, 56.50, 5.0),
        ('IRGC Naval Base',     27.10, 56.20, 8.0),
        ('Bab-el-Mandeb',      12.60, 43.30, 5.0),
        ('Fujairah Anchorage',  25.20, 56.40, 3.0)
    ) AS z(name, lat, lon, radius_nm)
),
proximity AS (
    SELECT
        t.track_id,
        t.vessel_name,
        t.lat,
        t.lon,
        t.speed,
        t.heading,
        t.timestamp,
        z.name AS zone_name,
        -- Haversine distance approximation (degrees)
        60 * SQRT(
            POWER((t.lat - z.lat), 2) +
            POWER((COS(RADIANS(t.lat)) * (t.lon - z.lon)), 2)
        ) AS distance_nm
    FROM telemetry t
    CROSS JOIN restricted_zones z
    WHERE t.timestamp > NOW() - INTERVAL '30 minutes'
)
SELECT
    track_id,
    vessel_name,
    zone_name,
    ROUND(distance_nm::numeric, 2) AS distance_nm,
    speed,
    heading,
    lat, lon,
    timestamp
FROM proximity
WHERE distance_nm < 10
ORDER BY distance_nm ASC
LIMIT 20;


-- ═══════════════════════════════════════════════════════════
-- 5. Anomaly Score Aggregation (Hourly)
-- ═══════════════════════════════════════════════════════════

SELECT
    date_trunc('hour', detected_at) AS hour_bucket,
    severity,
    COUNT(*) AS anomaly_count,
    AVG(score) AS avg_score,
    MAX(score) AS max_score
FROM anomalies
WHERE detected_at > NOW() - INTERVAL '24 hours'
GROUP BY hour_bucket, severity
ORDER BY hour_bucket DESC, severity;


-- ═══════════════════════════════════════════════════════════
-- 6. Vessel Track History (Path Reconstruction)
-- ═══════════════════════════════════════════════════════════

SELECT
    track_id,
    vessel_name,
    lat, lon,
    speed,
    heading,
    timestamp,
    anomaly_score,
    ST_MakeLine(
        ST_MakePoint(lon, lat)
    ) OVER (PARTITION BY track_id ORDER BY timestamp) AS path_geom
FROM telemetry
WHERE track_id = :target_track_id
    AND timestamp > NOW() - INTERVAL '6 hours'
ORDER BY timestamp DESC;


-- ═══════════════════════════════════════════════════════════
-- 7. Regional Threat Density Heatmap
-- ═══════════════════════════════════════════════════════════

SELECT
    ROUND(lat::numeric, 2) AS grid_lat,
    ROUND(lon::numeric, 2) AS grid_lon,
    COUNT(*) AS anomaly_density,
    AVG(score) AS avg_threat_score,
    MAX(severity) AS max_severity
FROM anomalies
WHERE detected_at > NOW() - INTERVAL '6 hours'
    AND lat IS NOT NULL
    AND lon IS NOT NULL
GROUP BY grid_lat, grid_lon
HAVING COUNT(*) >= 2
ORDER BY anomaly_density DESC
LIMIT 100;
