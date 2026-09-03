package ais

import (
	"bytes"
	"compress/zlib"
	"encoding/json"
	"testing"
	"time"
)

func TestHaversineDistanceNM(t *testing.T) {
	// Distance between Strait of Hormuz (26.56, 56.45) and Fujairah Anchorage (25.18, 56.55)
	dist := HaversineDistanceNM(26.56, 56.45, 25.18, 56.55)
	if dist < 75.0 || dist > 90.0 {
		t.Errorf("Expected distance ~83 NM, got %.2f NM", dist)
	}
}

func TestInitialBearing(t *testing.T) {
	// Due East
	brng := InitialBearing(25.0, 55.0, 25.0, 56.0)
	if brng < 85.0 || brng > 95.0 {
		t.Errorf("Expected bearing ~90°, got %.2f°", brng)
	}
}

func TestVesselCacheOperations(t *testing.T) {
	cache := NewVesselCache(1*time.Minute, 50)
	now := time.Now().UTC()

	// 1. Initial position update
	v := cache.UpdatePosition("408123456", "AL DAFNA", "A7CD", 26.5, 56.4, 14.5, 90.0, 90.0, NavStatusUnderwayEngine, 0.0, "PositionReport", now)
	if v == nil {
		t.Fatal("Expected non-nil vessel state")
	}
	if v.VesselName != "AL DAFNA" {
		t.Errorf("Expected AL DAFNA, got %s", v.VesselName)
	}
	if v.MonitoredZone != "AREA-HORMUZ" {
		t.Errorf("Expected AREA-HORMUZ, got %s", v.MonitoredZone)
	}

	// 2. Static data enrichment
	cache.UpdateStaticData("408123456", "AL DAFNA", "A7CD", 9123456, 81, 200, 50, 15, 15, 12.5, "TOKYO", "2026-09-05", "ShipStaticData")
	vRetrieved, found := cache.GetVessel("408123456")
	if !found {
		t.Fatal("Expected to find vessel 408123456 in cache")
	}
	if vRetrieved.ShipGroup != ShipGroupTanker {
		t.Errorf("Expected ShipGroupTanker, got %s", vRetrieved.ShipGroup)
	}
	if vRetrieved.Destination != "TOKYO" {
		t.Errorf("Expected destination TOKYO, got %s", vRetrieved.Destination)
	}

	// 3. Track point addition
	for i := 1; i <= 5; i++ {
		cache.UpdatePosition("408123456", "AL DAFNA", "A7CD", 26.5+float64(i)*0.01, 56.4+float64(i)*0.01, 14.5, 90.0, 90.0, NavStatusUnderwayEngine, 0.0, "PositionReport", now.Add(time.Duration(i*35)*time.Second))
	}

	track := cache.GetVesselTrack("408123456")
	if len(track) < 2 {
		t.Errorf("Expected multiple track points, got %d", len(track))
	}

	// 4. Proximity query
	nearby := cache.GetVesselsNear(26.5, 56.4, 20.0)
	if len(nearby) != 1 {
		t.Errorf("Expected 1 nearby vessel, got %d", len(nearby))
	}
}

func TestIncidentTrafficCorrelation(t *testing.T) {
	cache := NewVesselCache(1*time.Hour, 50)
	now := time.Now().UTC()

	// Insert test vessels
	cache.UpdatePosition("111111111", "TANKER ONE", "CALL1", 26.55, 56.45, 12.0, 90.0, 90.0, NavStatusUnderwayEngine, 0, "PositionReport", now)
	cache.UpdatePosition("222222222", "CARGO TWO", "CALL2", 26.60, 56.50, 15.0, 110.0, 110.0, NavStatusUnderwayEngine, 0, "PositionReport", now)
	cache.UpdatePosition("333333333", "FAR AWAY", "CALL3", 24.00, 58.00, 10.0, 180.0, 180.0, NavStatusUnderwayEngine, 0, "PositionReport", now)

	// Correlate incident at (26.50, 56.40) with 15 NM radius
	corr := CorrelateIncidentTraffic("INC-001", "Mine Strike on Commercial Tanker", 26.50, 56.40, now, 15.0, cache)
	if corr == nil {
		t.Fatal("Expected correlation result")
	}
	if corr.TotalNearby != 2 {
		t.Errorf("Expected 2 nearby vessels within 15 NM, got %d", corr.TotalNearby)
	}
	if corr.NearbyVessels[0].DistanceNm > corr.NearbyVessels[1].DistanceNm {
		t.Errorf("Expected vessels to be sorted ascending by distance")
	}
	if corr.Disclaimer == "" {
		t.Errorf("Expected neutral causality disclaimer to be present")
	}
}

func TestAnomalyEvaluation(t *testing.T) {
	detector := NewAnomalyDetector(DefaultThresholds())
	now := time.Now().UTC()

	v := &NormalizedVesselState{
		MMSI:          "408123456",
		VesselName:    "CRUDE CARRIER",
		ShipGroup:     ShipGroupTanker,
		Lat:           26.5,
		Lon:           56.4,
		SOG:           2.0, // Dropped from 14.0
		COG:           180.0, // Altered from 90.0 (90 deg alteration)
		MonitoredZone: "AREA-HORMUZ",
		AisTimestamp:  now,
	}

	// 1. Evaluate speed drop and course alteration
	anomalies := detector.Evaluate(v, 14.0, 90.0, 90.0, now.Add(-2*time.Minute))
	if len(anomalies) < 2 {
		t.Errorf("Expected at least 2 anomalies (speed drop + course deviation), got %d", len(anomalies))
	}

	hasSpeedDrop := false
	hasCourseDev := false
	for _, a := range anomalies {
		if a.AnomalyType == "speed_drop" {
			hasSpeedDrop = true
		}
		if a.AnomalyType == "course_deviation" {
			hasCourseDev = true
		}
	}

	if !hasSpeedDrop {
		t.Errorf("Expected speed_drop anomaly")
	}
	if !hasCourseDev {
		t.Errorf("Expected course_deviation anomaly")
	}
}

func TestZlibDecompression(t *testing.T) {
	original := []byte(`{"MessageType":"PositionReport","MetaData":{"MMSI":408123456}}`)
	var b bytes.Buffer
	w := zlib.NewWriter(&b)
	w.Write(original)
	w.Close()

	decompressed, err := decompressZlib(b.Bytes())
	if err != nil {
		t.Fatalf("Decompression failed: %v", err)
	}
	if string(decompressed) != string(original) {
		t.Errorf("Expected %s, got %s", string(original), string(decompressed))
	}
}

func TestSubscriptionGeneration(t *testing.T) {
	boxes := DefaultBoundingBoxes()
	sub := AISStreamSubscription{
		APIKey:        "test-key",
		BoundingBoxes: boxes,
		FilterMessageTypes: []string{
			"PositionReport",
			"ShipStaticData",
		},
	}

	data, err := json.Marshal(sub)
	if err != nil {
		t.Fatalf("Failed to marshal subscription: %v", err)
	}
	if !bytes.Contains(data, []byte("test-key")) {
		t.Errorf("Expected APIKey in subscription payload")
	}
}

func TestOpenWatersGeoJSONNormalization(t *testing.T) {
	prov := NewOpenWatersProvider()

	rawGeoJSON := []byte(`{
		"type": "FeatureCollection",
		"features": [
			{
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [56.45, 26.50]
				},
				"properties": {
					"mmsi": 408123456,
					"name": "AL DAFNA",
					"sog": 14.5,
					"cog": 90.0,
					"heading": 90,
					"nav_status": 0,
					"ship_type": 81,
					"station": "DXB-04",
					"source": "feeder-station",
					"timestamp": "2026-09-03T16:00:00Z"
				}
			}
		]
	}`)

	observations, err := prov.parseGeoJSONPayload(rawGeoJSON)
	if err != nil {
		t.Fatalf("GeoJSON parsing failed: %v", err)
	}
	if len(observations) != 1 {
		t.Fatalf("Expected 1 observation, got %d", len(observations))
	}

	obs := observations[0]
	if obs.MMSI != "408123456" {
		t.Errorf("Expected MMSI 408123456, got %s", obs.MMSI)
	}
	if obs.VesselName != "AL DAFNA" {
		t.Errorf("Expected AL DAFNA, got %s", obs.VesselName)
	}
	if obs.Station != "DXB-04" {
		t.Errorf("Expected station DXB-04, got %s", obs.Station)
	}
	if obs.Provider != "openwaters" {
		t.Errorf("Expected provider openwaters, got %s", obs.Provider)
	}
	if obs.MonitoredZone != "AREA-HORMUZ" {
		t.Errorf("Expected AREA-HORMUZ, got %s", obs.MonitoredZone)
	}
}

func TestMultiProviderDeduplication(t *testing.T) {
	multi := NewMultiProvider(NewOpenWatersProvider(), NewAISStreamProvider())
	if multi.Name() != "multi" {
		t.Errorf("Expected provider name multi, got %s", multi.Name())
	}
}
