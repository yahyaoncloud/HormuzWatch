package geo

import (
	"testing"
)

func BenchmarkShortestArcDeg(b *testing.B) {
	prev, curr := 355.0, 15.0
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = ShortestArcDeg(prev, curr)
	}
}

func BenchmarkSphericalGeodesic_DistanceNM(b *testing.B) {
	calc := SphericalGeodesic{}
	lat1, lon1 := 26.50, 56.25
	lat2, lon2 := 26.60, 56.40
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = calc.DistanceNM(lat1, lon1, lat2, lon2)
	}
}
