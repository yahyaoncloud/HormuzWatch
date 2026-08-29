package geo

import (
	"math"
	"testing"
)

func TestShortestArcDeg(t *testing.T) {
	tests := []struct {
		name     string
		prev     float64
		curr     float64
		expected float64
	}{
		{"Small clockwise turn", 10.0, 25.0, 15.0},
		{"Small counter-clockwise turn", 25.0, 10.0, -15.0},
		{"Across north clockwise (350 to 10)", 350.0, 10.0, 20.0},
		{"Across north counter-clockwise (10 to 350)", 10.0, 350.0, -20.0},
		{"Exact 180 turn", 0.0, 180.0, 180.0},
		{"Exact 0 delta", 120.0, 120.0, 0.0},
		{"Wrap around multiple 360s", 725.0, 10.0, 5.0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ShortestArcDeg(tt.prev, tt.curr)
			if math.Abs(got-tt.expected) > 1e-6 {
				t.Errorf("ShortestArcDeg(%v, %v) = %v; expected %v", tt.prev, tt.curr, got, tt.expected)
			}
			if got < -180.0 || got > 180.0 {
				t.Errorf("ShortestArcDeg returned out-of-range value %v (must be in [-180, 180])", got)
			}
		})
	}
}

func TestSphericalGeodesic_DistanceNM(t *testing.T) {
	calc := SphericalGeodesic{}

	// Strait of Hormuz representative coordinates:
	// Point A: 26.50° N, 56.25° E
	// Point B: 26.60° N, 56.40° E
	lat1, lon1 := 26.50, 56.25
	lat2, lon2 := 26.60, 56.40

	distNM := calc.DistanceNM(lat1, lon1, lat2, lon2)

	// Approximate distance is ~10.08 nautical miles
	if distNM < 8.0 || distNM > 12.0 {
		t.Errorf("Unexpected distance in Hormuz Strait: %v NM", distNM)
	}

	// Zero distance test
	if d := calc.DistanceNM(lat1, lon1, lat1, lon1); d != 0.0 {
		t.Errorf("Distance to same point must be 0; got %v", d)
	}
}
