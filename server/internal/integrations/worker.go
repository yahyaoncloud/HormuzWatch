package integrations

import (
	"context"
	"log"
	"time"

	"Geospatial-harmuz-watch/server/internal/intelligence"
	"Geospatial-harmuz-watch/server/internal/websocket/hub"
)

// StartWorkers initializes and runs all background data ingestion goroutines with context cancellation.
// Returns the Pipeline so the caller can defer its Shutdown on exit.
func StartWorkers(ctx context.Context, h *hub.Hub, tsm *intelligence.TrackStateManager, mlClient *intelligence.MLClient) *intelligence.Pipeline {
	log.Println("Starting background integration workers...")

	pipeline := intelligence.NewPipeline(h, tsm, mlClient)

	// 1. Start AISStream for live vessel telemetry
	go StartAISStream(ctx, pipeline)

	// 2. Start OpenSky for live aircraft telemetry
	go StartOpenSky(ctx, pipeline)

	// 3. Start GDELT for geopolitical event danger zones (heatmaps)
	go StartGDELT(ctx)

	// 4. Start Weather integration
	go StartWeather(ctx, h)

	// 5. Start FIRMS integration
	go StartFIRMS(ctx, h)

	// 6. Start ArcGIS Chokepoints for daily transit aggregates
	go StartArcGISChokepointsWorker(ctx, pipeline)

	// Periodic stale track purge
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				log.Println("[TSM] Context canceled, stopping stale track purge worker.")
				return
			case <-ticker.C:
				purged := tsm.PurgeStaleTracks()
				if purged > 0 {
					log.Printf("[TSM] Purged %d stale tracks. Active: %d", purged, tsm.TrackCount())
				}
				intelligence.GeoStore.PurgeOld()
			}
		}
	}()

	log.Println("All background integration workers dispatched.")
	return pipeline
}
