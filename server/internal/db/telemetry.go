package db

import (
	"context"
	"errors"
	"fmt"

	"Geospatial-harmuz-watch/server/internal/domain/telemetry"
)

// PersistTelemetry keeps the current track projection and append-only history
// consistent. The current projection serves the application; the immutable
// observation history serves curation, replay, and model training.
func PersistTelemetry(ctx context.Context, observation telemetry.Observation) error {
	if PGX == nil {
		return errors.New("pgx pool is not initialized")
	}

	observation.Normalize(telemetry.SourceWebApp)
	if observation.TrackID == "" || observation.AssetName == "" {
		return errors.New("track_id and asset_name are required")
	}

	tx, err := PGX.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin telemetry transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, upsertTrackQuery,
		observation.TrackID, observation.AssetName, observation.Timestamp,
		observation.Lat, observation.Lon, observation.Speed, observation.PreviousSpeed,
		observation.Heading, observation.CourseDelta, observation.AisAgeMinutes,
		observation.HotZoneDistanceNm, observation.Domain(), observation.Source,
	); err != nil {
		return fmt.Errorf("upsert current track: %w", err)
	}

	if _, err := tx.Exec(ctx, insertTelemetryObservationQuery,
		observation.TrackID, observation.AssetName, observation.Domain(), observation.Source,
		observation.ObservedAt(), observation.Lat, observation.Lon, observation.Speed,
		observation.PreviousSpeed, observation.Heading, observation.CourseDelta,
		observation.AisAgeMinutes, observation.HotZoneDistanceNm, observation.Altitude,
		observation.Squawk, observation.OnGround,
	); err != nil {
		return fmt.Errorf("append telemetry observation: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit telemetry transaction: %w", err)
	}
	return nil
}
