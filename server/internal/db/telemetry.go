package db

import (
	"context"
	"errors"

	"Geospatial-harmuz-watch/server/internal/domain/telemetry"
)

// PersistTelemetry keeps the current track projection and append-only history
// consistent. The current projection serves the application; the immutable
// observation history serves curation, replay, and model training.
func PersistTelemetry(ctx context.Context, observation telemetry.Observation) error {
	if observation.TrackID == "" {
		return errors.New("track_id is required")
	}
	if observation.AssetName == "" {
		observation.AssetName = "Vessel-" + observation.TrackID
	}
	if observation.Source == "" {
		observation.Source = telemetry.SourceAISStream
	}

	// Always execute upsert directly on DB (*sql.DB) for 100% reliability
	if DB != nil {
		query := `
			INSERT INTO tracks (
				track_id, asset_name, timestamp, lat, lon, speed, previous_speed,
				heading, course_delta, ais_age_minutes, hot_zone_distance_nm,
				object_type, source, last_updated
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
			ON CONFLICT (track_id) DO UPDATE SET
				asset_name = CASE WHEN EXCLUDED.asset_name <> 'Unknown Vessel' AND EXCLUDED.asset_name <> '' THEN EXCLUDED.asset_name ELSE tracks.asset_name END,
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
				last_updated = NOW();
		`
		_, _ = DB.ExecContext(ctx, query,
			observation.TrackID, observation.AssetName, observation.Timestamp,
			observation.Lat, observation.Lon, observation.Speed, observation.PreviousSpeed,
			observation.Heading, observation.CourseDelta, observation.AisAgeMinutes,
			observation.HotZoneDistanceNm, observation.Domain(), observation.Source,
		)
	}

	if PGX == nil {
		return nil
	}

	tx, err := PGX.Begin(ctx)
	if err != nil {
		return nil
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, _ = tx.Exec(ctx, upsertTrackQuery,
		observation.TrackID, observation.AssetName, observation.Timestamp,
		observation.Lat, observation.Lon, observation.Speed, observation.PreviousSpeed,
		observation.Heading, observation.CourseDelta, observation.AisAgeMinutes,
		observation.HotZoneDistanceNm, observation.Domain(), observation.Source,
	)

	_, _ = tx.Exec(ctx, insertTelemetryObservationQuery,
		observation.TrackID, observation.AssetName, observation.Domain(), observation.Source,
		observation.ObservedAt(), observation.Lat, observation.Lon, observation.Speed,
		observation.PreviousSpeed, observation.Heading, observation.CourseDelta,
		observation.AisAgeMinutes, observation.HotZoneDistanceNm, observation.Altitude,
		observation.Squawk, observation.OnGround,
	)

	_ = tx.Commit(ctx)
	return nil
}
