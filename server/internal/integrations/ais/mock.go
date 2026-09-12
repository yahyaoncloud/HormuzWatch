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
	// --- Strait of Hormuz TSS Inbound & Outbound Corridors ---
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
	{MMSI: "241412000", Name: "MARAN POSEIDON", Callsign: "SVBC", ShipType: 80, BaseLat: 26.15, BaseLon: 55.95, Heading: 70.0, Speed: 13.2, Destination: "MINA AL AHMADI -> NINGBO"},
	{MMSI: "311000789", Name: "OLYMPIC LEGEND", Callsign: "C6AB", ShipType: 80, BaseLat: 25.85, BaseLon: 56.40, Heading: 125.0, Speed: 11.5, Destination: "DAS ISLAND -> CHENNAI"},
	{MMSI: "477123400", Name: "DHT SCANDINAVIA", Callsign: "VROL", ShipType: 80, BaseLat: 26.65, BaseLon: 56.15, Heading: 85.0, Speed: 14.1, Destination: "JUBAIL -> ULSAN"},
	{MMSI: "636019944", Name: "PETROSTAR", Callsign: "A8TT", ShipType: 82, BaseLat: 27.20, BaseLon: 52.10, Heading: 115.0, Speed: 12.0, Destination: "ASSALUYEH -> COLOMBO"},
	{MMSI: "403889123", Name: "GULF GLORY", Callsign: "HZMM", ShipType: 80, BaseLat: 26.42, BaseLon: 56.32, Heading: 95.0, Speed: 12.6, Destination: "YANBU -> YOKOHAMA"},
	{MMSI: "408456789", Name: "AL SHAHANIYA", Callsign: "A7AA", ShipType: 81, BaseLat: 26.35, BaseLon: 54.10, Heading: 80.0, Speed: 17.0, Destination: "RAS LAFFAN -> ZEEBRUGGE"},
	{MMSI: "408991234", Name: "RASHEEDA", Callsign: "A7BB", ShipType: 81, BaseLat: 26.48, BaseLon: 56.22, Heading: 105.0, Speed: 16.5, Destination: "RAS LAFFAN -> INCHEON"},
	// --- Gulf of Oman & Fujairah Anchorage ---
	{MMSI: "566781200", Name: "EAGLE BURLINGTON", Callsign: "9VYY", ShipType: 80, BaseLat: 25.60, BaseLon: 56.90, Heading: 315.0, Speed: 13.8, Destination: "SINGAPORE -> HORMUZ TSS"},
	{MMSI: "470554321", Name: "FALCON PRIDE", Callsign: "A6FP", ShipType: 80, BaseLat: 25.15, BaseLon: 56.42, Heading: 20.0, Speed: 0.8, Destination: "FUJAIRAH BUNKERS"},
	{MMSI: "470987654", Name: "HORIZON STAR", Callsign: "A6HS", ShipType: 82, BaseLat: 24.85, BaseLon: 56.65, Heading: 170.0, Speed: 10.2, Destination: "FUJAIRAH -> SOHAR"},
	{MMSI: "461009876", Name: "MUSCAT GUARDIAN", Callsign: "A4MG", ShipType: 55, BaseLat: 23.65, BaseLon: 58.55, Heading: 45.0, Speed: 20.0, Destination: "GULF OF OMAN PATROL"},
	{MMSI: "470667788", Name: "FUJAIRAH TUG 3", Callsign: "A6FT", ShipType: 52, BaseLat: 25.18, BaseLon: 56.38, Heading: 190.0, Speed: 6.5, Destination: "FUJAIRAH OFFSHORE"},
	{MMSI: "470332211", Name: "GULF RESCUE 2", Callsign: "A6GR", ShipType: 51, BaseLat: 25.40, BaseLon: 56.50, Heading: 350.0, Speed: 15.0, Destination: "FUJAIRAH STANDBY"},
	// --- Persian Gulf Basin & Commercial Terminals ---
	{MMSI: "353136000", Name: "EVER GIVEN", Callsign: "H3RC", ShipType: 70, BaseLat: 25.75, BaseLon: 55.45, Heading: 65.0, Speed: 15.5, Destination: "JEBEL ALI -> HAMBURG"},
	{MMSI: "413456780", Name: "COSCO EXCELLENCE", Callsign: "VRZZ", ShipType: 70, BaseLat: 26.10, BaseLon: 55.70, Heading: 55.0, Speed: 16.0, Destination: "DAMMAM -> SHANGHAI"},
	{MMSI: "228345000", Name: "CMA CGM ADONIS", Callsign: "FNND", ShipType: 70, BaseLat: 25.35, BaseLon: 55.05, Heading: 240.0, Speed: 14.8, Destination: "PORT KLANG -> JEBEL ALI"},
	{MMSI: "355992000", Name: "MSC GULSUN", Callsign: "3FDF", ShipType: 70, BaseLat: 24.65, BaseLon: 57.30, Heading: 310.0, Speed: 17.5, Destination: "SALALAH -> JEBEL ALI"},
	{MMSI: "211889000", Name: "HAPAG LLOYD EXPRESS", Callsign: "DJAA", ShipType: 70, BaseLat: 26.80, BaseLon: 55.30, Heading: 120.0, Speed: 15.2, Destination: "HAMAD PORT -> BUSAN"},
	{MMSI: "422001999", Name: "HORMUZ SENTINEL", Callsign: "EPMS", ShipType: 55, BaseLat: 26.55, BaseLon: 56.25, Heading: 270.0, Speed: 24.0, Destination: "CHOKEPOINT RECON"},
	{MMSI: "408112233", Name: "AL MAJED", Callsign: "A7MJ", ShipType: 55, BaseLat: 26.05, BaseLon: 52.15, Heading: 330.0, Speed: 21.0, Destination: "HALUL SECTOR PATROL"},
	{MMSI: "470778899", Name: "ADNOC WORKER 12", Callsign: "A6AW", ShipType: 53, BaseLat: 24.55, BaseLon: 53.40, Heading: 40.0, Speed: 11.2, Destination: "DAS ISLAND OFFSHORE"},
	{MMSI: "461223344", Name: "SULAIMAN 1", Callsign: "A4SL", ShipType: 53, BaseLat: 25.80, BaseLon: 56.70, Heading: 140.0, Speed: 18.0, Destination: "KHASAB -> SOHAR"},
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
			f.Destination, "2026-09-12 12:00",
			"ShipStaticData",
		)
		// Register initial position immediately so cache is hot at t=0
		vState := cache.UpdatePosition(
			f.MMSI, f.Name, f.Callsign,
			f.BaseLat, f.BaseLon, f.Speed, f.Heading, f.Heading,
			NavStatusUnderwayEngine, 0.0,
			"PositionReport", time.Now().UTC(),
		)
		if vState != nil && onObservation != nil {
			onObservation(vState)
		}
	}

	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("[MockAIS] Context canceled, stopping mock stream.")
			return
		case t := <-ticker.C:
			// Advance all fleet vessels smoothly
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

				// Boundary wrap within Gulf operational coordinates (Lat: 21.0..32.5, Lon: 46.5..62.5)
				if sv.lat > 31.0 {
					sv.lat = 23.5
				} else if sv.lat < 21.5 {
					sv.lat = 27.5
				}
				if sv.lon > 62.0 {
					sv.lon = 48.0
				} else if sv.lon < 47.0 {
					sv.lon = 58.5
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
