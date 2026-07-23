package db

const upsertTrackQuery = `
	INSERT INTO tracks (
		track_id, asset_name, timestamp, lat, lon, speed, previous_speed,
		heading, course_delta, ais_age_minutes, hot_zone_distance_nm,
		object_type, source, last_updated
	)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
	ON CONFLICT (track_id) DO UPDATE SET
		asset_name = EXCLUDED.asset_name,
		timestamp = EXCLUDED.timestamp,
		lat = EXCLUDED.lat,
		lon = EXCLUDED.lon,
		speed = EXCLUDED.speed,
		previous_speed = EXCLUDED.previous_speed,
		heading = EXCLUDED.heading,
		course_delta = EXCLUDED.course_delta,
		ais_age_minutes = EXCLUDED.ais_age_minutes,
		hot_zone_distance_nm = EXCLUDED.hot_zone_distance_nm,
		object_type = EXCLUDED.object_type,
		source = EXCLUDED.source,
		last_updated = NOW()`

const insertTelemetryObservationQuery = `
	INSERT INTO telemetry_observations (
		track_id, asset_name, domain, source, observed_at, lat, lon, speed,
		previous_speed, heading, course_delta, ais_age_minutes,
		hot_zone_distance_nm, altitude, squawk, on_ground
	)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`
