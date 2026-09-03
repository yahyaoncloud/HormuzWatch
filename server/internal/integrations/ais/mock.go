package ais

import (
	"context"
	"log"
	"math"
	"math/rand"
	"time"
)

// MockVesselDefinition defines a simulated vessel archetype in the Gulf.
type MockVesselDefinition struct {
	MMSI        string
	Name        string
	Callsign    string
	ShipType    int
	BaseLat     float64
	BaseLon     float64
	Heading     float64
	Speed       float64
	Destination string
}

// DefaultMockFleet represents authentic merchant, energy, and security vessels operating in the Gulf.
var DefaultMockFleet = []MockVesselDefinition{
	{MMSI: "408123456", Name: "AL DAFNA", Callsign: "A7CD", ShipType: 81, BaseLat: 26.25, BaseLon: 52.40, Heading: 75.0, Speed: 14.5, Destination: "RAS LAFFAN -> TOKYO"},
	{MMSI: "636018293", Name: "FRONT ALTAIR", Callsign: "D5TY", ShipType: 80, BaseLat: 26.50, BaseLon: 56.45, Heading: 110.0, Speed: 12.8, Destination: "RAS TANURA -> SINGAPORE"},
	{MMSI: "244182940", Name: "MAERSK MC-KINNEY", Callsign: "OXST", ShipType: 70, BaseLat: 25.10, BaseLon: 54.85, Heading: 45.0, Speed: 16.2, Destination: "JEBEL ALI -> ROTTERDAM"},
	{MMSI: "311000452", Name: "PACIFIC VOYAGER", Callsign: "C6ZX", ShipType: 80, BaseLat: 24.95, BaseLon: 56.55, Heading: 180.0, Speed: 0.5, Destination: "FUJAIRAH ANCHORAGE"},
	{MMSI: "403192841", Name: "SAFANIYA PRODUCER", Callsign: "HZKJ", ShipType: 82, BaseLat: 28.15, BaseLon: 49.60, Heading: 135.0, Speed: 11.0, Destination: "JUBAIL -> RED SEA"},
	{MMSI: "209148201", Name: "STOLT TANKERS PRIDE", Callsign: "5BKY", ShipType: 80, BaseLat: 26.75, BaseLon: 55.85, Heading: 90.0, Speed: 13.4, Destination: "SITRAH -> MUMBAI"},
	{MMSI: "470123982", Name: "DUBAI PILOT 1", Callsign: "A6P1", ShipType: 50, BaseLat: 25.30, BaseLon: 55.15, Heading: 310.0, Speed: 8.5, Destination: "PORT RASHID"},
	{MMSI: "470992110", Name: "COASTAL DEFENDER 4", Callsign: "A6G4", ShipType: 55, BaseLat: 26.35, BaseLon: 56.10, Heading: 220.0, Speed: 22.0, Destination: "HORMUZ PATROL"},
	{MMSI: "211492001", Name: "SEARCH RESCUE 01", Callsign: "DBS1", ShipType: 51, BaseLat: 25.50, BaseLon: 56.80, Heading: 15.0, Speed: 18.5, Destination: "OMAN SAR SECTOR"},
	{MMSI: "636091823", Name: "KHARG TRADER", Callsign: "D5TG", ShipType: 80, BaseLat: 29.25, BaseLon: 50.35, Heading: 160.0, Speed: 10.5, Destination: "KHARG -> ASIA"},
}

// StartMockAISStream runs a background simulated telemetry generator.
func StartMockAISStream(ctx context.Context, cache *VesselCache, onObservation func(*NormalizedVesselState)) {
	log.Println("[MockAIS] Initializing simulated maritime telemetry engine for Gulf waters...")

	type simulatedVessel struct {
		def  MockVesselDefinition
		lat  float64
		lon  float64
		sog  float64
		cog  float64
		hdg  float64
		last time.Time
	}

	simulated := make([]simulatedVessel, len(DefaultMockFleet))
	for i, f := range DefaultMockFleet {
		simulated[i] = simulatedVessel{
			def:  f,
			lat:  f.BaseLat,
			lon:  f.BaseLon,
			sog:  f.Speed,
			cog:  f.Heading,
			hdg:  f.Heading,
			last: time.Now().UTC(),
		}
		// Register initial static data
		cache.UpdateStaticData(
			f.MMSI, f.Name, f.Callsign,
			9000000+i, f.ShipType,
			180, 50, 15, 15, 12.5,
			f.Destination, "2026-09-04 12:00",
			"ShipStaticData",
		)
	}

	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("[MockAIS] Context canceled, stopping mock stream.")
			return
		case t := <-ticker.C:
			// Pick 2-3 vessels to advance each tick
			for i := range simulated {
				sv := &simulated[i]

				// Minor kinematic drift
				driftSog := (rand.Float64() - 0.5) * 0.4
				sv.sog = math.Max(0.2, math.Min(25.0, sv.sog+driftSog))

				driftHdg := (rand.Float64() - 0.5) * 2.0
				sv.cog = math.Mod(sv.cog+driftHdg+360.0, 360.0)
				sv.hdg = sv.cog

				// Advance position based on SOG (knots to degrees/sec: 1 knot = 1/60 NM/min = 1/3600 deg/sec approx)
				dtSec := t.Sub(sv.last).Seconds()
				distDeg := (sv.sog / 3600.0) * dtSec / 60.0

				rad := sv.cog * math.Pi / 180.0
				sv.lat += distDeg * math.Cos(rad)
				sv.lon += distDeg * math.Sin(rad)
				sv.last = t

				// Boundary wrap
				if sv.lat > 31.0 {
					sv.lat = 24.0
				}
				if sv.lon > 61.5 {
					sv.lon = 48.0
				}

				navStatus := NavStatusUnderwayEngine
				if sv.sog < 1.0 {
					navStatus = NavStatusAtAnchor
				}

				// Update cache
				vState := cache.UpdatePosition(
					sv.def.MMSI, sv.def.Name, sv.def.Callsign,
					sv.lat, sv.lon, sv.sog, sv.cog, sv.hdg,
					navStatus, 0.0,
					"PositionReport", t,
				)

				// Run anomaly detector
				if vState != nil {
					anomalies := GlobalAnomalyDetector.Evaluate(vState, sv.sog+driftSog, sv.cog, sv.hdg, t.Add(-3*time.Second))
					if len(anomalies) > 0 {
						vState.ActiveAnomalies = make([]string, 0, len(anomalies))
						for _, a := range anomalies {
							vState.ActiveAnomalies = append(vState.ActiveAnomalies, a.Title)
						}
					}
					if onObservation != nil {
						onObservation(vState)
					}
				}
			}
		}
	}
}
