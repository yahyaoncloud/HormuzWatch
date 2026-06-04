package integrations

import (
	"log"
	"time"

	"Geospatial-harmuz-watch/server/internal/intelligence"
	"Geospatial-harmuz-watch/server/internal/websocket/hub"
)

// StartWorkers initializes and runs all background data ingestion goroutines.
func StartWorkers(h *hub.Hub, tsm *intelligence.TrackStateManager, mlClient *intelligence.MLClient) {
	log.Println("Starting background integration workers...")

	// 1. Start AISStream for live vessel telemetry
	go StartAISStream(h, tsm, mlClient)

	// 2. Start OpenSky for live aircraft telemetry
	go StartOpenSky(h, tsm, mlClient)

	// 3. Start GDELT for geopolitical event danger zones (heatmaps)
	go StartGDELT()
	// 4. Start Weather integration
	go StartWeather(h)

	// 5. Start FIRMS integration
	go StartFIRMS(h)

	// Periodic stale track purge
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		for range ticker.C {
			purged := tsm.PurgeStaleTracks()
			if purged > 0 {
				log.Printf("[TSM] Purged %d stale tracks. Active: %d", purged, tsm.TrackCount())
			}
			intelligence.GeoStore.PurgeOld()
		}
	}()

	log.Println("All background integration workers dispatched.")
}
