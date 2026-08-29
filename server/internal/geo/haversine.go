package geo

import "math"

const (
	// EarthRadiusNM is the Earth's mean spherical radius in nautical miles (IUGG R1 mean radius).
	// NOTE: This is a spherical approximation, not exact WGS-84 ellipsoidal geodesic distance.
	// Spherical approximation introduces an error of up to ±0.35% depending on latitude.
	EarthRadiusNM = 3440.065

	// EarthRadiusKM is the Earth's mean spherical radius in kilometers.
	EarthRadiusKM = 6371.0

	// DegToRad converts degrees to radians.
	DegToRad = math.Pi / 180.0

	// RadToDeg converts radians to degrees.
	RadToDeg = 180.0 / math.Pi
)

// GeodesicCalculator defines the contract for distance and bearing calculations.
// This interface decouples callers from the spherical approximation, allowing future
// integration of WGS-84 ellipsoidal algorithms (e.g. Karney / Vincenty).
type GeodesicCalculator interface {
	DistanceNM(lat1, lon1, lat2, lon2 float64) float64
	DistanceKM(lat1, lon1, lat2, lon2 float64) float64
	InitialBearingDeg(lat1, lon1, lat2, lon2 float64) float64
}

// SphericalGeodesic implements GeodesicCalculator using spherical great-circle formulas.
type SphericalGeodesic struct{}

func (s SphericalGeodesic) DistanceNM(lat1, lon1, lat2, lon2 float64) float64 {
	return HaversineNM(lat1, lon1, lat2, lon2)
}

func (s SphericalGeodesic) DistanceKM(lat1, lon1, lat2, lon2 float64) float64 {
	return HaversineKM(lat1, lon1, lat2, lon2)
}

func (s SphericalGeodesic) InitialBearingDeg(lat1, lon1, lat2, lon2 float64) float64 {
	return BearingDeg(lat1, lon1, lat2, lon2)
}

// DefaultCalculator is the active geodesic implementation.
var DefaultCalculator GeodesicCalculator = SphericalGeodesic{}

// HaversineNM returns the spherical great-circle distance in nautical miles between two
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

// HaversineKM returns the spherical great-circle distance in kilometers.
func HaversineKM(lat1, lon1, lat2, lon2 float64) float64 {
	dLat := (lat2 - lat1) * DegToRad
	dLon := (lon2 - lon1) * DegToRad
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*DegToRad)*math.Cos(lat2*DegToRad)*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return EarthRadiusKM * c
}

// BearingDeg returns the initial great-circle bearing (in degrees, 0-360) from point 1 to point 2.
func BearingDeg(lat1, lon1, lat2, lon2 float64) float64 {
	lat1r := lat1 * DegToRad
	lat2r := lat2 * DegToRad
	dLon := (lon2 - lon1) * DegToRad

	y := math.Sin(dLon) * math.Cos(lat2r)
	x := math.Cos(lat1r)*math.Sin(lat2r) - math.Sin(lat1r)*math.Cos(lat2r)*math.Cos(dLon)
	brng := math.Atan2(y, x) * RadToDeg

	// Normalize to [0, 360)
	return math.Mod(math.Mod(brng, 360.0)+360.0, 360.0)
}

// ShortestArcDeg computes the signed shortest-arc difference from thetaPrevious to thetaCurrent in degrees.
// The result is in [-180, +180].
// Positive indicates clockwise turn, negative indicates counter-clockwise turn.
func ShortestArcDeg(thetaPrevious, thetaCurrent float64) float64 {
	diff := thetaCurrent - thetaPrevious
	// Shortest arc formula: ((diff + 180) mod 360) - 180 with Euclidean modulo handling
	mod := math.Mod(math.Mod(diff+180.0, 360.0)+360.0, 360.0) - 180.0
	if mod == -180.0 && diff > 0 {
		return 180.0
	}
	return mod
}
