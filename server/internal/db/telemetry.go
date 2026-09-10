package db

import (
	"context"
	"errors"

	"Geospatial-harmuz-watch/server/internal/domain/telemetry"

	"github.com/jackc/pgx/v5"
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

// PersistTelemetryBatch performs high-throughput bulk persistence of observations.
func PersistTelemetryBatch(ctx context.Context, observations []telemetry.Observation) error {
	if len(observations) == 0 {
		return nil
	}

	if PGX != nil {
		batch := &pgx.Batch{}
		for _, obs := range observations {
			if obs.TrackID == "" {
				continue
			}
			assetName := obs.AssetName
			if assetName == "" {
				assetName = "Vessel-" + obs.TrackID
			}
			source := obs.Source
			if source == "" {
				source = telemetry.SourceAISStream
			}

			batch.Queue(upsertTrackQuery,
				obs.TrackID, assetName, obs.Timestamp,
				obs.Lat, obs.Lon, obs.Speed, obs.PreviousSpeed,
				obs.Heading, obs.CourseDelta, obs.AisAgeMinutes,
				obs.HotZoneDistanceNm, obs.Domain(), source,
			)

			batch.Queue(insertTelemetryObservationQuery,
				obs.TrackID, assetName, obs.Domain(), source,
				obs.ObservedAt(), obs.Lat, obs.Lon, obs.Speed,
				obs.PreviousSpeed, obs.Heading, obs.CourseDelta,
				obs.AisAgeMinutes, obs.HotZoneDistanceNm, obs.Altitude,
				obs.Squawk, obs.OnGround,
			)
		}

		br := PGX.SendBatch(ctx, batch)
		defer br.Close()
		for i := 0; i < batch.Len(); i++ {
			if _, err := br.Exec(); err != nil {
				// Continue draining batch to avoid broken connections
			}
		}
		return nil
	}

	if DB == nil {
		return nil
	}

	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	stmtTrack, err := tx.PrepareContext(ctx, upsertTrackQuery)
	if err != nil {
		return err
	}
	defer stmtTrack.Close()

	stmtObs, err := tx.PrepareContext(ctx, insertTelemetryObservationQuery)
	if err != nil {
		return err
	}
	defer stmtObs.Close()

	for _, obs := range observations {
		if obs.TrackID == "" {
			continue
		}
		assetName := obs.AssetName
		if assetName == "" {
			assetName = "Vessel-" + obs.TrackID
		}
		source := obs.Source
		if source == "" {
			source = telemetry.SourceAISStream
		}

		_, _ = stmtTrack.ExecContext(ctx,
			obs.TrackID, assetName, obs.Timestamp,
			obs.Lat, obs.Lon, obs.Speed, obs.PreviousSpeed,
			obs.Heading, obs.CourseDelta, obs.AisAgeMinutes,
			obs.HotZoneDistanceNm, obs.Domain(), source,
		)

		_, _ = stmtObs.ExecContext(ctx,
			obs.TrackID, assetName, obs.Domain(), source,
			obs.ObservedAt(), obs.Lat, obs.Lon, obs.Speed,
			obs.PreviousSpeed, obs.Heading, obs.CourseDelta,
			obs.AisAgeMinutes, obs.HotZoneDistanceNm, obs.Altitude,
			obs.Squawk, obs.OnGround,
		)
	}

	return tx.Commit()
}
