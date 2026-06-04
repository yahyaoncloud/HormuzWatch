package geo

import "math"

const (
	// EarthRadiusNM is the Earth's mean radius in nautical miles.
	EarthRadiusNM = 3440.065
	// EarthRadiusKM is the Earth's mean radius in kilometers.
	EarthRadiusKM = 6371.0
	// DegToRad converts degrees to radians.
	DegToRad = math.Pi / 180.0
)

// HaversineNM returns the great-circle distance in nautical miles between two
// lat/lon coordinates (in degrees).
func HaversineNM(lat1, lon1, lat2, lon2 float64) float64 {
	dLat := (lat2 - lat1) * DegToRad
	dLon := (lon2 - lon1) * DegToRad
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*DegToRad)*math.Cos(lat2*DegToRad)*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return EarthRadiusNM * c
}

// HaversineKM returns the great-circle distance in kilometers.
func HaversineKM(lat1, lon1, lat2, lon2 float64) float64 {
	dLat := (lat2 - lat1) * DegToRad
	dLon := (lon2 - lon1) * DegToRad
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*DegToRad)*math.Cos(lat2*DegToRad)*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return EarthRadiusKM * c
}

// BearingDeg returns the initial bearing (in degrees, 0-360) from point 1 to point 2.
func BearingDeg(lat1, lon1, lat2, lon2 float64) float64 {
	lat1r := lat1 * DegToRad
	lat2r := lat2 * DegToRad
	dLon := (lon2 - lon1) * DegToRad

	y := math.Sin(dLon) * math.Cos(lat2r)
	x := math.Cos(lat1r)*math.Sin(lat2r) - math.Sin(lat1r)*math.Cos(lat2r)*math.Cos(dLon)
	brng := math.Atan2(y, x) / DegToRad

	// Normalize to 0-360
	return math.Mod(brng+360, 360)
}
