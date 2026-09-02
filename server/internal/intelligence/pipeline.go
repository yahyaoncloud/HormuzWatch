package intelligence

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"sync/atomic"
	"time"

	"Geospatial-harmuz-watch/server/internal/anomaly"
	"Geospatial-harmuz-watch/server/internal/db"
	"Geospatial-harmuz-watch/server/internal/domain/telemetry"
	"Geospatial-harmuz-watch/server/internal/geo"
	"Geospatial-harmuz-watch/server/internal/heatmap"
	"Geospatial-harmuz-watch/server/internal/observability"
	"Geospatial-harmuz-watch/server/internal/websocket/hub"
)

// ── Queue metrics (exposed via centralized observability package) ────────────

// QueueMetrics returns a snapshot of the worker pool queue.
func QueueMetrics() map[string]int64 {
	return map[string]int64{
		"enqueued":  observability.QueueEnqueuedTotal.Load(),
		"dropped":   observability.QueueDroppedTotal.Load(),
		"processed": observability.QueueProcessedTotal.Load(),
		"depth":     observability.QueueDepth.Load(),
		"capacity":  observability.QueueCapacity.Load(),
	}
}

// Pipeline bundles the shared references needed to execute the full
// intelligence pipeline (kinematic deltas → features → rule + ML + geo
// scoring → composite assessment → publish + persist).
//
// Queue-based architecture:
//
//	[AIS / ADS-B Ingest] → EnqueueObservation() → [Bounded buffered Go channel] → worker pool
//	                                                                               │
//	                                                                               ├─ gRPC → Python ML
//	                                                                               ├─ PostgreSQL INSERT
//	                                                                               └─ WebSocket broadcast
//
// Decoupling shields downstream services from ingestion spikes.
// Overload behavior: Drop-tail backpressure when the bounded buffer channel is full,
// incrementing observability.QueueDroppedTotal.
type Pipeline struct {
	Hub      *hub.Hub
	TSM      *TrackStateManager
	MLClient *MLClient

	// ── Worker pool (bounded buffered channel work queue) ────────
	jobQueue         chan *telemetry.Observation
	blockadeFeatures sync.Map
	ctx              context.Context
	cancel           context.CancelFunc
	active           atomic.Int32 // current active workers
}

// NewPipeline is the single constructor for the intelligence pipeline.
// Creates a bounded worker pool with workerCount goroutines and queueSize buffer capacity.
// Defaults: 20 workers, 5000 queue depth.
func NewPipeline(h *hub.Hub, tsm *TrackStateManager, ml *MLClient) *Pipeline {
	return NewPipelineWithQueue(h, tsm, ml, 20, 5000)
}

// NewPipelineWithQueue creates a Pipeline with explicit worker pool tuning.
func NewPipelineWithQueue(h *hub.Hub, tsm *TrackStateManager, ml *MLClient, workerCount, queueSize int) *Pipeline {
	ctx, cancel := context.WithCancel(context.Background())

	observability.QueueCapacity.Store(int64(queueSize))

	p := &Pipeline{
		Hub:      h,
		TSM:      tsm,
		MLClient: ml,
		jobQueue: make(chan *telemetry.Observation, queueSize),
		ctx:      ctx,
		cancel:   cancel,
	}

	// Start worker goroutines
	for i := 0; i < workerCount; i++ {
		go p.worker(i)
	}
	p.active.Store(int32(workerCount))

	log.Printf("[pipeline] Worker pool started: %d workers, %d buffer queue capacity", workerCount, queueSize)
	return p
}

// ── Public API ────────────────────────────────────────────────────────────

// EnqueueObservation pushes an observation into the bounded buffered Go channel.
// Non-blocking. If the queue is saturated, the observation is dropped under drop-tail backpressure.
func (p *Pipeline) EnqueueObservation(obs *telemetry.Observation) {
	observability.QueueEnqueuedTotal.Add(1)

	select {
	case p.jobQueue <- obs:
		observability.QueueDepth.Add(1)
	default:
		// Channel saturated — drop-tail backpressure
		dropped := observability.QueueDroppedTotal.Add(1)
		if dropped%100 == 1 {
			log.Printf("[pipeline] BACKPRESSURE WARNING: queue saturated (%d drops total) — dropping observation for %s",
				dropped, obs.TrackID)
		}
	}
}

// EnqueueBlockadeObservation creates a synthetic observation from blockade features
// and enqueues it for ML prediction. Used for ArcGIS chokepoint daily aggregates.
func (p *Pipeline) EnqueueBlockadeObservation(trackID string, features BlockadeFeatures, payload *telemetry.Observation) {
	p.blockadeFeatures.Store(trackID, features)

	obs := &telemetry.Observation{
		TrackID:           trackID,
		AssetName:         payload.AssetName,
		Timestamp:         payload.Timestamp,
		Lat:               payload.Lat,
		Lon:               payload.Lon,
		Speed:             payload.Speed,
		COG:               payload.COG,
		Heading:           payload.Heading,
		AisAgeMinutes:     payload.AisAgeMinutes,
		HotZoneDistanceNm: payload.HotZoneDistanceNm,
		ObjectType:        payload.ObjectType,
		Source:            payload.Source,
	}

	p.EnqueueObservation(obs)
}

// ProcessObservation runs the full pipeline synchronously (blocking).
// Preserved for backward compatibility with callers that need the return
// value (ThreatAssessment) immediately. For high-throughput ingestion,
// prefer EnqueueObservation.
func (p *Pipeline) ProcessObservation(ctx context.Context, payload *telemetry.Observation) ThreatAssessment {
	return p.process(payload)
}

// Shutdown gracefully drains the worker pool. Call during server shutdown.
// Waits up to timeout for workers to finish processing in-flight messages.
func (p *Pipeline) Shutdown(timeout time.Duration) {
	log.Println("[pipeline] Shutting down worker pool...")
	p.cancel()

	// Wait for workers to drain with timeout
	done := make(chan struct{})
	go func() {
		for p.active.Load() > 0 {
			time.Sleep(100 * time.Millisecond)
		}
		close(done)
	}()

	select {
	case <-done:
		log.Println("[pipeline] All workers drained gracefully")
	case <-time.After(timeout):
		remaining := p.active.Load()
		log.Printf("[pipeline] Shutdown timeout after %v — %d workers still active", timeout, remaining)
	}
}

// ── Worker ────────────────────────────────────────────────────────────────

func (p *Pipeline) worker(id int) {
	defer p.active.Add(-1)

	for {
		select {
		case <-p.ctx.Done():
			return
		case obs := <-p.jobQueue:
			observability.QueueDepth.Add(-1)
			observability.QueueProcessedTotal.Add(1)

			start := time.Now()
			p.process(obs)
			elapsed := time.Since(start)

			// Log slow processing (>500ms) for observability
			if elapsed > 500*time.Millisecond {
				log.Printf("[pipeline] SLOW worker-%d: %s took %v", id, obs.TrackID, elapsed)
			}
		}
	}
}

// ── Core pipeline (runs inside worker or synchronously) ────────────────────
func (p *Pipeline) process(payload *telemetry.Observation) ThreatAssessment {
	observability.ObservationsProcessed.Add(1)

	// Handle ArcGIS blockade observations separately (no kinematic features)
	if payload.Source == telemetry.SourceArcGIS {
		return p.processBlockadeObservation(payload)
	}

	// Filter out impossible vessel positions on land (evaluating chart datum offset vs GPS multi-path)
	if payload.Domain() == telemetry.DomainVessel && geo.IsOnLand(payload.Lat, payload.Lon) {
		return ThreatAssessment{}
	}

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

	// ── 4. ML prediction (gRPC to Python — the bottleneck this queue protects) ─
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
	if err := db.PersistTelemetry(context.Background(), *payload); err != nil {
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
		db.Exec(
			`INSERT INTO anomalies (track_id, score, severity, reasons, actions, last_updated)
			 VALUES ($1, $2, $3, $4, $5, NOW())
			 ON CONFLICT(track_id) DO UPDATE SET
				score=EXCLUDED.score, severity=EXCLUDED.severity,
				reasons=EXCLUDED.reasons, actions=EXCLUDED.actions,
				last_updated=NOW()`,
			assessment.TrackID, assessment.FinalScore, assessment.Severity,
			string(reasonsJSON), string(actionsJSON),
		)
	}

	return assessment
}

// processBlockadeObservation handles ArcGIS chokepoint daily aggregate data
func (p *Pipeline) processBlockadeObservation(payload *telemetry.Observation) ThreatAssessment {
	rawFeatures, ok := p.blockadeFeatures.LoadAndDelete(payload.TrackID)
	if !ok {
		log.Printf("[pipeline] missing blockade features for %s", payload.TrackID)
		return ThreatAssessment{}
	}
	blockadeFeatures, ok := rawFeatures.(BlockadeFeatures)
	if !ok {
		log.Printf("[pipeline] invalid blockade feature payload for %s", payload.TrackID)
		return ThreatAssessment{}
	}

	ruleScore := 0
	mlScore, explanation := p.MLClient.PredictBlockade(blockadeFeatures)

	geoScore := GeoStore.ScoreForLocation(payload.Lat, payload.Lon)
	features := FeatureVector{
		TrackID: payload.TrackID,
		Lat:     payload.Lat,
		Lon:     payload.Lon,
	}

	assessment := ComputeComposite(features, ruleScore, mlScore, geoScore, explanation)
	assessment.TrackID = payload.TrackID

	// Publish telemetry
	p.Hub.Publish(hub.Message{
		Type: "telemetry",
		Data: payload,
	})

	if err := db.PersistTelemetry(context.Background(), *payload); err != nil {
		log.Printf("[pipeline] persist telemetry %s: %v", payload.TrackID, err)
	}

	if assessment.FinalScore > 0 {
		observability.AnomaliesDetected.Add(1)
		p.Hub.Publish(hub.Message{
			Type: "anomaly",
			Data: assessment,
		})

		reasonsJSON, _ := json.Marshal(assessment.Reasons)
		actionsJSON, _ := json.Marshal(assessment.Actions)
		db.Exec(
			`INSERT INTO anomalies (track_id, score, severity, reasons, actions, last_updated)
			 VALUES ($1, $2, $3, $4, $5, NOW())
			 ON CONFLICT(track_id) DO UPDATE SET
				score=EXCLUDED.score, severity=EXCLUDED.severity,
				reasons=EXCLUDED.reasons, actions=EXCLUDED.actions,
				last_updated=NOW()`,
			assessment.TrackID, assessment.FinalScore, assessment.Severity,
			string(reasonsJSON), string(actionsJSON),
		)
	}

	return assessment
}
