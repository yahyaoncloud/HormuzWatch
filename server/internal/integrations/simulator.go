package integrations

import (
	"log"

	"Geospatial-harmuz-watch/server/internal/intelligence"
)

type simulatedTrack struct {
	TrackID    string
	AssetName  string
	ObjectType string
	Lat        float64
	Lon        float64
	Speed      float64
	Heading    float64
	Altitude   float64
	Squawk     string
}

// StartTelemetrySimulator is disabled to ensure only real live telemetry feeds (AISStream, OpenSky, FIRMS) are processed.
func StartTelemetrySimulator(p *intelligence.Pipeline) {
	log.Println("[Simulator] Synthetic telemetry simulator disabled (live telemetry feeds active).")
}
