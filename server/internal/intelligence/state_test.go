package intelligence

import (
	"math"
	"testing"
)

func TestTrackStateManager_RunningMomentsAndZScore(t *testing.T) {
	tsm := NewTrackStateManager()
	trackID := "TEST_VESSEL_001"
	assetName := "Container Ship Alfa"

	// Feed 15 steady observations (Speed = 15.0 kts, Heading = 90.0°)
	for i := 0; i < 15; i++ {
		lat := 26.50 + float64(i)*0.001
		lon := 56.25 + float64(i)*0.001
		tsm.Update(trackID, assetName, lat, lon, 15.0, 90.0)
	}

	state := tsm.GetState(trackID)
	if state == nil {
		t.Fatalf("Expected state for %s to exist", trackID)
	}

	// Speed mean should be ~15.0 kts, variance ~0
	if math.Abs(state.MeanSpeed-15.0) > 0.1 {
		t.Errorf("MeanSpeed = %v; expected ~15.0", state.MeanSpeed)
	}

	// Now introduce an anomalous speed jump (Speed = 28.0 kts)
	deltas := tsm.Update(trackID, assetName, 26.52, 56.27, 28.0, 90.0)

	// Speed delta should be 13.0
	if math.Abs(deltas.SpeedDelta-13.0) > 0.01 {
		t.Errorf("SpeedDelta = %v; expected 13.0", deltas.SpeedDelta)
	}

	// Standardized residual / composite EWMA deviation should be significantly elevated (> 2.0)
	if deltas.EWMADeviation < 2.0 {
		t.Errorf("EWMADeviation = %v; expected > 2.0 on 13 kt abrupt surge", deltas.EWMADeviation)
	}
}

func TestTrackStateManager_CircularHeadingEWMA(t *testing.T) {
	tsm := NewTrackStateManager()
	trackID := "CIRCULAR_HEADING_VESSEL"
	assetName := "Patrol Craft Bravo"

	// Feed headings oscillating around North: 355° -> 5° -> 358° -> 2°
	headings := []float64{355.0, 5.0, 358.0, 2.0, 356.0, 4.0}
	for i, h := range headings {
		lat := 26.0 + float64(i)*0.001
		lon := 56.0
		tsm.Update(trackID, assetName, lat, lon, 12.0, h)
	}

	state := tsm.GetState(trackID)
	if state == nil {
		t.Fatalf("Expected state to exist")
	}

	// Circular mean heading should be near 0° / 360° (not ~180° arithmetic average)
	smoothedHeading := state.EWMAHeading
	if smoothedHeading > 20.0 && smoothedHeading < 340.0 {
		t.Errorf("Circular EWMA failed: smoothed heading is %v° (expected within [340, 360] or [0, 20])", smoothedHeading)
	}
}
