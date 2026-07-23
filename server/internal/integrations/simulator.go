package integrations

import (
	"context"
	"log"
	"math"
	"math/rand"
	"time"

	"Geospatial-harmuz-watch/server/internal/api"
	"Geospatial-harmuz-watch/server/internal/domain/telemetry"
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

// StartTelemetrySimulator runs a continuous resilience feed ensuring live metrics and
// map streams remain active even if external API limits pause live OpenSky / AISStream feeds.
func StartTelemetrySimulator(p *intelligence.Pipeline) {
	log.Println("[Simulator] Starting telemetry resilience worker...")

	simulatedTracks := []*simulatedTrack{
		// Aviation Corridors
		{TrackID: "FLIGHT-UAE302", AssetName: "Emirates 302", ObjectType: "aircraft", Lat: 25.26, Lon: 55.30, Speed: 420.0, Heading: 315.0, Altitude: 34000, Squawk: "7700"},
		{TrackID: "FLIGHT-IRN881", AssetName: "Iran Air 881", ObjectType: "aircraft", Lat: 27.18, Lon: 56.27, Speed: 380.0, Heading: 180.0, Altitude: 28000, Squawk: "2104"},
		{TrackID: "FLIGHT-QTR008", AssetName: "Qatar Airways 008", ObjectType: "aircraft", Lat: 25.28, Lon: 51.53, Speed: 460.0, Heading: 90.0, Altitude: 36000, Squawk: "1200"},
		{TrackID: "FLIGHT-GFA211", AssetName: "Gulf Air 211", ObjectType: "aircraft", Lat: 26.27, Lon: 50.63, Speed: 390.0, Heading: 135.0, Altitude: 30000, Squawk: "4512"},

		// Maritime Corridors — Strait of Hormuz & Gulf
		{TrackID: "V-9481900", AssetName: "MT Pacific Horizon", ObjectType: "vessel", Lat: 26.40, Lon: 56.25, Speed: 13.5, Heading: 220.0, Altitude: 0, Squawk: ""},
		{TrackID: "V-9312891", AssetName: "VLCC Arabian Star", ObjectType: "vessel", Lat: 25.90, Lon: 55.40, Speed: 11.2, Heading: 45.0, Altitude: 0, Squawk: ""},
		{TrackID: "V-9721094", AssetName: "Gulf Express Container", ObjectType: "vessel", Lat: 26.80, Lon: 53.10, Speed: 16.8, Heading: 110.0, Altitude: 0, Squawk: ""},
		{TrackID: "V-9104823", AssetName: "Red Sea Navigator", ObjectType: "vessel", Lat: 13.10, Lon: 43.15, Speed: 14.0, Heading: 340.0, Altitude: 0, Squawk: ""},
		{TrackID: "V-9551203", AssetName: "Strait Sentinel Patrol", ObjectType: "vessel", Lat: 26.55, Lon: 56.45, Speed: 22.0, Heading: 270.0, Altitude: 0, Squawk: ""},
	}

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))

	for range ticker.C {
		nowStr := time.Now().UTC().Format(time.RFC3339)

		for _, tr := range simulatedTracks {
			// Small realistic kinematic jitter
			headingRad := tr.Heading * math.Pi / 180.0
			speedKts := tr.Speed + (rng.Float64()*2.0 - 1.0)
			if speedKts < 0 {
				speedKts = 1.0
			}

			// Distance covered in 15 sec interval (nautical miles -> degrees approx)
			distNm := (speedKts / 3600.0) * 15.0
			deltaLat := (distNm * math.Cos(headingRad)) / 60.0
			deltaLon := (distNm * math.Sin(headingRad)) / (60.0 * math.Cos(tr.Lat*math.Pi/180.0))

			tr.Lat += deltaLat
			tr.Lon += deltaLon

			// Keep bounded within Middle East watch area
			if tr.Lat < 10.0 || tr.Lat > 32.0 || tr.Lon < 40.0 || tr.Lon > 65.0 {
				// Reverse direction if bounds exceeded
				tr.Heading = math.Mod(tr.Heading+180.0, 360.0)
			}

			payload := api.TelemetryPayload{
				TrackID:           tr.TrackID,
				AssetName:         tr.AssetName,
				Timestamp:         nowStr,
				Lat:               tr.Lat,
				Lon:               tr.Lon,
				Speed:             speedKts,
				Heading:           tr.Heading,
				AisAgeMinutes:     0,
				HotZoneDistanceNm: 0,
				Altitude:          tr.Altitude,
				Squawk:            tr.Squawk,
				OnGround:          false,
				ObjectType:        tr.ObjectType,
				Source:            telemetry.SourceSimulator,
			}
			p.ProcessObservation(context.Background(), &payload)
		}
	}
}
