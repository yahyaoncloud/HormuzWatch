package datasets

const selectCuratedTelemetryQuery = `
	SELECT track_id, asset_name, domain, source, observed_at, lat, lon, speed,
		previous_speed, heading, course_delta, ais_age_minutes,
		hot_zone_distance_nm, altitude, squawk, on_ground
	FROM telemetry_observations
	WHERE domain = $1
	ORDER BY observed_at DESC
	LIMIT $2`

const selectHeatmapSnapshotQuery = `
	SELECT date_trunc('hour', observed_at) AS window_start,
		round(lat)::integer AS lat_cell,
		round(lon)::integer AS lon_cell,
		count(*) AS observation_count
	FROM telemetry_observations
	WHERE observed_at >= NOW() - INTERVAL '24 hours'
	GROUP BY 1, 2, 3
	ORDER BY window_start DESC, observation_count DESC
	LIMIT $1`

const insertDatasetSnapshotQuery = `
	INSERT INTO dataset_snapshots (snapshot_id, domain, created_at, row_count, status)
	VALUES ($1, $2, $3, $4, $5)`

const updateDatasetSnapshotQuery = `
	UPDATE dataset_snapshots
	SET status = $2, external_file_id = $3, external_manifest_id = $4, error_message = $5
	WHERE snapshot_id = $1`
