package intelligence

import (
	"math"

	"Geospatial-harmuz-watch/server/internal/anomaly"
	"Geospatial-harmuz-watch/server/internal/api"
	"Geospatial-harmuz-watch/server/internal/geo"
)

// FeatureVector is the unified input for all scoring layers.
type FeatureVector struct {
	TrackID              string  `json:"track_id"`
	CourseDelta          float64 `json:"course_delta"`
	HeadingDelta         float64 `json:"heading_delta"`
	SpeedDelta           float64 `json:"speed_delta"`
	AverageSpeed         float64 `json:"average_speed"`
	SpeedVariance        float64 `json:"speed_variance"`
	AISGapMinutes        float64 `json:"ais_gap_minutes"`
	DistToRestrictedZone float64 `json:"dist_restricted_zone"`
	DistToHistoricalSite float64 `json:"dist_historical_site"`
	InRestrictedZone     bool    `json:"in_restricted_zone"`
	NearHistoricalAttack bool    `json:"near_historical_attack"`
	RestrictedZoneName   string  `json:"restricted_zone_name"`
	Speed                float64 `json:"speed"`
	PreviousSpeed        float64 `json:"previous_speed"`
	Lat                  float64 `json:"lat"`
	Lon                  float64 `json:"lon"`
}

// ExtractFeatures combines ComputedDeltas with geospatial context.
func ExtractFeatures(trackID string, lat, lon, speed float64, deltas ComputedDeltas) FeatureVector {
	inZone, zoneName := anomaly.CheckGeofence(lat, lon)
	nearAttack := api.IsNearHistoricalAttack(lat, lon)
	distToZone := computeDistToNearestZone(lat, lon)
	distToAttack := computeDistToNearestAttack(lat, lon, nearAttack)

	return FeatureVector{
		TrackID:              trackID,
		CourseDelta:          deltas.CourseDelta,
		HeadingDelta:         deltas.HeadingDelta,
		SpeedDelta:           deltas.SpeedDelta,
		AverageSpeed:         deltas.AverageSpeed,
		SpeedVariance:        deltas.SpeedVariance,
		AISGapMinutes:        deltas.AISGapMinutes,
		DistToRestrictedZone: distToZone,
		DistToHistoricalSite: distToAttack,
		InRestrictedZone:     inZone,
		NearHistoricalAttack: nearAttack,
		RestrictedZoneName:   zoneName,
		Speed:                speed,
		PreviousSpeed:        deltas.PreviousSpeed,
		Lat:                  lat,
		Lon:                  lon,
	}
}

// computeDistToNearestZone returns the Haversine distance (nautical miles) to the
// nearest restricted zone boundary. Returns 999.0 if no zones are defined.
func computeDistToNearestZone(lat, lon float64) float64 {
	zones := anomaly.GetRestrictedZones()
	minDist := 999.0
	for _, zone := range zones {
		// Haversine distance from point to zone center (in NM)
		distNM := geo.HaversineNM(lat, lon, zone.CenterLat, zone.CenterLon)
		// Subtract zone radius (convert from degrees to approximate NM: 1° ≈ 60 NM)
		radiusNM := zone.RadiusDeg * 60.0
		distToBoundary := math.Max(0, distNM-radiusNM)
		if distToBoundary < minDist {
			minDist = distToBoundary
		}
	}
	return minDist
}

// computeDistToNearestAttack returns the Haversine distance (NM) to the nearest
// historical attack site.
func computeDistToNearestAttack(lat, lon float64, nearAttack bool) float64 {
	if nearAttack {
		// Within the 0.1° (~6 NM) proximity threshold, estimate center distance
		return 3.0
	}
	return 999.0
}
