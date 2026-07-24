package intelligence

import (
	"context"
	"encoding/json"
	"log"
	"sync/atomic"
	"time"

	"Geospatial-harmuz-watch/server/internal/anomaly"
	"Geospatial-harmuz-watch/server/internal/db"
	"Geospatial-harmuz-watch/server/internal/domain/telemetry"
	"Geospatial-harmuz-watch/server/internal/heatmap"
	"Geospatial-harmuz-watch/server/internal/observability"
	"Geospatial-harmuz-watch/server/internal/websocket/hub"
)

// ── Queue metrics (atomic counters, safe for concurrent access) ────────────
var (
	queueEnqueued  atomic.Int64
	queueDropped   atomic.Int64
	queueProcessed atomic.Int64
	queueDepth     atomic.Int64 // current depth approximation
)

// QueueMetrics returns a snapshot of the worker pool queue.
func QueueMetrics() map[string]int64 {
	return map[string]int64{
		"enqueued":  queueEnqueued.Load(),
		"dropped":   queueDropped.Load(),
		"processed": queueProcessed.Load(),
		"depth":     queueDepth.Load(),
	}
}

// Pipeline bundles the shared references needed to execute the full
// intelligence pipeline (kinematic deltas → features → rule + ML + geo
// scoring → composite assessment → publish + persist).  Every integration
// worker (AISStream, OpenSky, Kystverket, Simulator) calls ProcessObservation
// instead of copy-pasting the same ~40 lines.
//
// Queue-based architecture (v2.1):
//
//	[aisstream.io WS] → EnqueueObservation() → [buffered chan] → worker pool
//	                                                              │
//	                                                              ├─ gRPC → Python ML
//	                                                              ├─ PostgreSQL INSERT
//	                                                              └─ WebSocket broadcast
//
// The decoupling shields the Python gRPC service from ingestion bursts.
// Backpressure is handled by dropping messages when the queue is full
// (drops are logged and counted as observable metrics).
type Pipeline struct {
	Hub      *hub.Hub
	TSM      *TrackStateManager
	MLClient *MLClient

	// ── Worker pool (bounded queue) ──────────────────────────────
	jobQueue chan *telemetry.Observation
	ctx      context.Context
	cancel   context.CancelFunc
	active   atomic.Int32 // current active workers
}

// NewPipeline is the single constructor for the intelligence pipeline.
// Creates a bounded worker pool with workerCount goroutines and queueSize
// buffer capacity.
//
// Tuning guidelines:
//
//	workerCount = 2× vCPUs of the Python ML container
//	queueSize   = peak burst capacity (e.g. 5× workerCount)
//
// Defaults: 20 workers, 5000 queue depth (handles ~5 sec of burst at 1000 msg/s).
func NewPipeline(h *hub.Hub, tsm *TrackStateManager, ml *MLClient) *Pipeline {
	return NewPipelineWithQueue(h, tsm, ml, 20, 5000)
}

// NewPipelineWithQueue creates a Pipeline with explicit worker pool tuning.
func NewPipelineWithQueue(h *hub.Hub, tsm *TrackStateManager, ml *MLClient, workerCount, queueSize int) *Pipeline {
	ctx, cancel := context.WithCancel(context.Background())

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

	log.Printf("[pipeline] Worker pool started: %d workers, %d queue depth", workerCount, queueSize)
	return p
}

// ── Public API ────────────────────────────────────────────────────────────

// EnqueueObservation pushes an observation into the bounded worker queue.
// This is non-blocking — the caller returns immediately. If the queue is
// full, the message is dropped and the "dropped" metric is incremented.
// This is the preferred ingestion path for high-throughput sources (AIS, ADS-B).
func (p *Pipeline) EnqueueObservation(obs *telemetry.Observation) {
	queueEnqueued.Add(1)

	select {
	case p.jobQueue <- obs:
		queueDepth.Add(1)
	default:
		// Queue full — backpressure. Drop the message.
		dropped := queueDropped.Add(1)
		if dropped%100 == 1 {
			log.Printf("[pipeline] WARNING: queue full (%d drops total) — dropping message for %s. "+
				"Consider increasing worker count or queue size.", dropped, obs.TrackID)
		}
	}
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
			queueDepth.Add(-1)
			queueProcessed.Add(1)

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
