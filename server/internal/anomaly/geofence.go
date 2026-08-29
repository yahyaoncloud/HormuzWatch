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

// ── Strategic Maritime Watch Zones ──────────────────────────────────────────

type WatchZone struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	Label       string       `json:"label"`
	Color       string       `json:"color"`
	Coordinates [][2]float64 `json:"coords"`
	Description string       `json:"desc"`
}

var DefaultWatchZones = []WatchZone{
	{
		ID:    "AREA-HORMUZ",
		Name:  "Strait of Hormuz",
		Label: "HORMUZ CHOKEPOINT",
		Color: "#FF0055",
		Coordinates: [][2]float64{
			{27.05, 56.1}, {27.05, 56.4}, {27.0, 56.8}, {26.85, 57.05},
			{26.65, 57.1}, {26.3, 57.0}, {26.0, 56.75}, {25.85, 56.45},
			{25.95, 56.15}, {26.15, 55.85}, {26.4, 55.6}, {26.75, 55.5},
		},
		Description: "Critical Maritime Chokepoint & TSS",
	},
	{
		ID:    "AREA-PGULF",
		Name:  "Persian Gulf (North)",
		Label: "PERSIAN GULF",
		Color: "#FF9900",
		Coordinates: [][2]float64{
			{30.0, 48.7}, {29.95, 49.3}, {29.6, 49.9}, {29.1, 50.5},
			{28.5, 51.0}, {27.8, 51.8}, {27.2, 52.4}, {26.7, 53.5},
			{26.4, 54.2}, {26.35, 54.8}, {26.2, 55.3}, {25.8, 55.2},
			{25.3, 54.6}, {24.8, 53.5}, {24.4, 52.3}, {24.8, 51.4},
			{25.5, 50.8}, {26.3, 50.4}, {27.2, 49.9}, {28.1, 49.3},
			{29.2, 48.6}, {29.7, 48.3},
		},
		Description: "Northern Energy & Tanker Basin",
	},
	{
		ID:    "AREA-GOMAN",
		Name:  "Gulf of Oman",
		Label: "GULF OF OMAN",
		Color: "#00E5FF",
		Coordinates: [][2]float64{
			{25.8, 56.85}, {26.2, 57.0}, {26.6, 57.1}, {26.5, 57.5},
			{25.8, 58.2}, {25.4, 59.2}, {25.1, 60.5}, {24.8, 61.7},
			{22.8, 60.5}, {22.5, 59.2}, {22.8, 58.3}, {23.6, 57.5},
			{24.1, 56.9}, {24.5, 56.55}, {25.0, 56.3}, {25.5, 56.4},
		},
		Description: "Deep-Water Ingress & Egress",
	},
	{
		ID:    "AREA-FUJAIRAH",
		Name:  "Fujairah Anchorage Hub",
		Label: "FUJAIRAH ANCHORAGE",
		Color: "#00E676",
		Coordinates: [][2]float64{
			{25.45, 56.35}, {25.45, 56.75}, {24.95, 56.75}, {24.95, 56.35},
		},
		Description: "Global Bunkering & STS Anchorage",
	},
	{
		ID:    "AREA-JEBELALI",
		Name:  "Jebel Ali Corridor",
		Label: "JEBEL ALI CORRIDOR",
		Color: "#10B981",
		Coordinates: [][2]float64{
			{25.25, 54.85}, {25.25, 55.25}, {24.85, 55.25}, {24.85, 54.85},
		},
		Description: "Container Terminal Approach",
	},
	{
		ID:    "AREA-RASTANURA",
		Name:  "Ras Tanura Terminal",
		Label: "RAS TANURA HUB",
		Color: "#F59E0B",
		Coordinates: [][2]float64{
			{27.15, 49.95}, {27.15, 50.45}, {26.60, 50.45}, {26.60, 49.95},
		},
		Description: "Major Offshore Crude Loading Port",
	},
	{
		ID:    "AREA-QATAR-LNG",
		Name:  "Ras Laffan / North Field",
		Label: "RAS LAFFAN LNG",
		Color: "#3B82F6",
		Coordinates: [][2]float64{
			{26.45, 51.35}, {26.45, 52.35}, {25.80, 52.35}, {25.80, 51.35},
		},
		Description: "LNG Export & Offshore Gas Basin",
	},
	{
		ID:    "AREA-KHARG",
		Name:  "Kharg Island Terminal",
		Label: "KHARG TERMINAL",
		Color: "#EC4899",
		Coordinates: [][2]float64{
			{29.40, 50.15}, {29.40, 50.55}, {29.10, 50.55}, {29.10, 50.15},
		},
		Description: "Heavy Crude Deepwater Terminal",
	},
	{
		ID:    "AREA-BANDARABBAS",
		Name:  "Bandar Abbas / Qeshm",
		Label: "BANDAR ABBAS",
		Color: "#E11D48",
		Coordinates: [][2]float64{
			{27.25, 55.80}, {27.25, 56.55}, {26.70, 56.55}, {26.70, 55.80},
		},
		Description: "Naval Station & Ingress Pass",
	},
	{
		ID:    "AREA-RS-SOUTH",
		Name:  "Bab-el-Mandeb",
		Label: "BAB-EL-MANDEB",
		Color: "#DC2626",
		Coordinates: [][2]float64{
			{13.5, 42.8}, {13.5, 43.6}, {12.3, 43.6}, {12.3, 42.8},
		},
		Description: "Southern Red Sea Chokepoint",
	},
	{
		ID:    "AREA-RS-NORTH",
		Name:  "Red Sea & Suez Approach",
		Label: "SUEZ APPROACH",
		Color: "#8B5CF6",
		Coordinates: [][2]float64{
			{28.8, 32.8}, {28.8, 35.2}, {26.5, 36.5}, {26.5, 34.0},
		},
		Description: "Suez Canal Maritime Approach",
	},
	{
		ID:    "AREA-ADEN-IRTC",
		Name:  "Gulf of Aden IRTC Corridor",
		Label: "GULF OF ADEN IRTC",
		Color: "#06B6D4",
		Coordinates: [][2]float64{
			{13.2, 45.0}, {13.2, 51.5}, {11.8, 51.5}, {11.8, 45.0},
		},
		Description: "Maritime Security Transit Corridor",
	},
}

func GetDefaultWatchZones() []WatchZone {
	return DefaultWatchZones
}
