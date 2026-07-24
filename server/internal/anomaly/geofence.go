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
		switch zone.Type {
		case ZoneTypeRadius:
			distNM := geo.HaversineNM(lat, lon, zone.CenterLat, zone.CenterLon)
			radiusNM := zone.RadiusDeg * 60.0
			if distNM <= radiusNM {
				return true, zone.Name
			}
		case ZoneTypePolygon:
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

// ── Anchorage Zones ───────────────────────────────────────────────────────
// Commercial anchorage and waiting areas for congestion monitoring.
// These are separate from restricted zones which are military/naval exclusion
// areas. Each zone is defined by center + radius (nautical miles).

type AnchorageZone struct {
	Name     string  `json:"name"`
	Lat      float64 `json:"lat"`
	Lon      float64 `json:"lon"`
	RadiusNM float64 `json:"radius_nm"`
}

var AnchorageZones = []AnchorageZone{
	{Name: "Fujairah Anchorage", Lat: 25.15, Lon: 56.40, RadiusNM: 10},
	{Name: "Khor Fakkan", Lat: 25.35, Lon: 56.40, RadiusNM: 5},
	{Name: "Dubai / Jebel Ali", Lat: 25.05, Lon: 55.05, RadiusNM: 12},
	{Name: "Sharjah / Ajman", Lat: 25.40, Lon: 55.45, RadiusNM: 6},
	{Name: "Bandar Abbas", Lat: 27.15, Lon: 56.30, RadiusNM: 8},
	{Name: "Strait Waiting Area", Lat: 26.30, Lon: 56.80, RadiusNM: 10},
	{Name: "Abu Dhabi", Lat: 24.50, Lon: 54.40, RadiusNM: 10},
	{Name: "Ras Al Khaimah", Lat: 25.80, Lon: 56.05, RadiusNM: 6},
	{Name: "Mina Al Ahmadi (Kuwait)", Lat: 29.05, Lon: 48.20, RadiusNM: 8},
	{Name: "Ras Tanura (Saudi)", Lat: 26.65, Lon: 50.15, RadiusNM: 6},
	{Name: "Doha (Qatar)", Lat: 25.30, Lon: 51.55, RadiusNM: 8},
}

// IdentifyAnchorageZone returns the name of the anchorage zone a position falls within.
// Returns empty string if the position is not in any defined anchorage zone.
func IdentifyAnchorageZone(lat, lon float64) string {
	for _, zone := range AnchorageZones {
		distNM := geo.HaversineNM(lat, lon, zone.Lat, zone.Lon)
		if distNM <= zone.RadiusNM {
			return zone.Name
		}
	}
	return ""
}

// GetAnchorageZones returns all defined anchorage zones.
func GetAnchorageZones() []AnchorageZone {
	return AnchorageZones
}

// GetAnchorageZoneVesselCounts returns vessel counts per anchorage zone.
// Requires external DB callers; the zone definitions are public.
func GetAnchorageZoneVesselCounts(lat, lon float64) map[string]int {
	counts := make(map[string]int)
	zone := IdentifyAnchorageZone(lat, lon)
	if zone != "" {
		counts[zone]++
	}
	return counts
}
