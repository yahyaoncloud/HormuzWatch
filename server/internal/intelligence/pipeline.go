package intelligence

import (
	"context"
	"encoding/json"
	"log"

	"Geospatial-harmuz-watch/server/internal/anomaly"
	"Geospatial-harmuz-watch/server/internal/db"
	"Geospatial-harmuz-watch/server/internal/domain/telemetry"
	"Geospatial-harmuz-watch/server/internal/heatmap"
	"Geospatial-harmuz-watch/server/internal/observability"
	"Geospatial-harmuz-watch/server/internal/websocket/hub"
)

// Pipeline bundles the shared references needed to execute the full
// intelligence pipeline (kinematic deltas → features → rule + ML + geo
// scoring → composite assessment → publish + persist).  Every integration
// worker (AISStream, OpenSky, Kystverket, Simulator) calls ProcessObservation
// instead of copy-pasting the same ~40 lines.
type Pipeline struct {
	Hub      *hub.Hub
	TSM      *TrackStateManager
	MLClient *MLClient
}

// NewPipeline is the single constructor for the intelligence pipeline.
func NewPipeline(h *hub.Hub, tsm *TrackStateManager, ml *MLClient) *Pipeline {
	return &Pipeline{Hub: h, TSM: tsm, MLClient: ml}
}

// ProcessObservation runs the full intelligence pipeline for one position
// report.  It enriches the payload with computed deltas, persists telemetry,
// and returns the composite threat assessment.
func (p *Pipeline) ProcessObservation(ctx context.Context, payload *telemetry.Observation) ThreatAssessment {
	observability.ObservationsProcessed.Add(1)
	heatmap.AddTelemetry(payload.Lat, payload.Lon)

	// ── 1. Kinematic deltas ───────────────────────────────────
	deltas := p.TSM.Update(payload.TrackID, payload.AssetName,
		payload.Lat, payload.Lon, payload.Speed, payload.Heading)

	// Enrich payload with computed deltas
	payload.CourseDelta = deltas.CourseDelta
	payload.PreviousSpeed = deltas.PreviousSpeed
	payload.AisAgeMinutes = int(deltas.AISGapMinutes)

	// ── 2. Feature vector ─────────────────────────────────────
	features := ExtractFeatures(payload.TrackID, payload.Lat, payload.Lon,
		payload.Speed, deltas)

	// ── 3. Rule-based score ───────────────────────────────────
	ruleScore := anomaly.Score(
		features.CourseDelta, features.AISGapMinutes,
		features.Speed, features.PreviousSpeed,
		features.DistToRestrictedZone,
		features.InRestrictedZone, features.NearHistoricalAttack,
	)

	// ── 4. ML prediction ──────────────────────────────────────
	mlScore, explanation := p.MLClient.Predict(features)

	// ── 5. Geopolitical context ───────────────────────────────
	geoScore := GeoStore.ScoreForLocation(payload.Lat, payload.Lon)

	// ── 6. Composite assessment ───────────────────────────────
	assessment := ComputeComposite(features, ruleScore, mlScore, geoScore, explanation)

	// ── 7. Publish live telemetry (non-blocking) ──────────────
	p.Hub.Publish(hub.Message{
		Type: "telemetry",
		Data: payload,
	})

	// ── 8. Persist telemetry ──────────────────────────────────
	if err := db.PersistTelemetry(ctx, *payload); err != nil {
		log.Printf("[pipeline] persist telemetry %s: %v", payload.TrackID, err)
	}

	// ── 9. Publish & persist anomaly if above threshold ───────
	if assessment.FinalScore > 0 {
		observability.AnomaliesDetected.Add(1)
		p.Hub.Publish(hub.Message{
			Type: "anomaly",
			Data: assessment,
		})

		reasonsJSON, _ := json.Marshal(assessment.Reasons)
		actionsJSON, _ := json.Marshal(assessment.Actions)
		anomalyQuery := `
			INSERT INTO anomalies (track_id, score, severity, reasons, actions, last_updated)
			VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(track_id) DO UPDATE SET
				score=excluded.score,
				severity=excluded.severity,
				reasons=excluded.reasons,
				actions=excluded.actions,
				last_updated=CURRENT_TIMESTAMP;
		`
		db.Exec(anomalyQuery,
			assessment.TrackID, assessment.FinalScore, assessment.Severity,
			string(reasonsJSON), string(actionsJSON),
		)
	}

	return assessment
}
