package anomaly

import (
	"Geospatial-harmuz-watch/server/internal/geo"
)

type ZoneType string

const (
	ZoneTypeRadius  ZoneType = "radius"
	ZoneTypePolygon ZoneType = "polygon"
)

type GeofenceZone struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	Type        ZoneType     `json:"type"`
	CenterLat   float64      `json:"centerLat,omitempty"`
	CenterLon   float64      `json:"centerLon,omitempty"`
	RadiusDeg   float64      `json:"radiusDeg,omitempty"`
	Coordinates [][2]float64 `json:"coordinates,omitempty"` // For polygon [lat, lon]
}

var RestrictedZones = []GeofenceZone{
	{
		ID:        "ZONE-ABU-MUSA",
		Name:      "Abu Musa Territorial Waters",
		Type:      ZoneTypeRadius,
		CenterLat: 25.8733,
		CenterLon: 55.0333,
		RadiusDeg: 0.20, // Approx 12nm
	},
	{
		ID:        "ZONE-GREATER-TUNB",
		Name:      "Greater Tunb Territorial Waters",
		Type:      ZoneTypeRadius,
		CenterLat: 26.2633,
		CenterLon: 55.3167,
		RadiusDeg: 0.20, // Approx 12nm
	},
	{
		ID:        "ZONE-BANDAR-ABBAS",
		Name:      "Bandar Abbas Naval Exclusion Zone",
		Type:      ZoneTypeRadius,
		CenterLat: 27.1833,
		CenterLon: 56.2667,
		RadiusDeg: 0.25, // Approx 15nm
	},
	{
		ID:        "ZONE-JASK",
		Name:      "Jask Naval Base Perimeter",
		Type:      ZoneTypeRadius,
		CenterLat: 25.64,
		CenterLon: 57.77,
		RadiusDeg: 0.20,
	},
}

// CheckGeofence returns true if the coordinate falls into any restricted zone
func CheckGeofence(lat, lon float64) (bool, string) {
	for _, zone := range RestrictedZones {
		if zone.Type == ZoneTypeRadius {
			distNM := geo.HaversineNM(lat, lon, zone.CenterLat, zone.CenterLon)
			radiusNM := zone.RadiusDeg * 60.0
			if distNM <= radiusNM {
				return true, zone.Name
			}
		} else if zone.Type == ZoneTypePolygon {
			if pointInPolygon(lat, lon, zone.Coordinates) {
				return true, zone.Name
			}
		}
	}
	return false, ""
}

// Ray-casting algorithm for point in polygon
func pointInPolygon(lat, lon float64, polygon [][2]float64) bool {
	intersectCount := 0
	for j := 0; j < len(polygon); j++ {
		p1 := polygon[j]
		p2 := polygon[(j+1)%len(polygon)]

		// p[0] is lat, p[1] is lon
		if ((p1[1] > lon) != (p2[1] > lon)) &&
			(lat < (p2[0]-p1[0])*(lon-p1[1])/(p2[1]-p1[1])+p1[0]) {
			intersectCount++
		}
	}
	return intersectCount%2 == 1
}

// GetRestrictedZones returns the configured zones
func GetRestrictedZones() []GeofenceZone {
	return RestrictedZones
}
