package integrations

import (
	"log"

	"Geospatial-harmuz-watch/server/internal/websocket/hub"
)

// StartWorkers initializes and runs all background data ingestion goroutines.
func StartWorkers(h *hub.Hub) {
	log.Println("Starting background integration workers...")

	// 1. Start AISStream for live vessel telemetry
	go StartAISStream(h)

	// 2. Start OpenSky for live aircraft telemetry
	go StartOpenSky(h)

	// 3. Start GDELT for geopolitical event danger zones (heatmaps)
	go StartGDELT()

	log.Println("All background integration workers dispatched.")
}
