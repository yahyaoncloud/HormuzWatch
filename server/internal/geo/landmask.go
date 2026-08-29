package geo

import (
	"encoding/json"
	"log"
	"math"
	"os"
	"path/filepath"
	"runtime"
)

// ── Land Mask Filter ──────────────────────────────────────────────────────
//
// Uses a pre-computed 0.05° raster grid to quickly determine if a coordinate
// falls on land or at sea. The grid is loaded from a GeoJSON file (Natural
// Earth 10m data, cropped and simplified for the Persian Gulf region).
//
// Alternative: a precise polygon-based check using orb/geojson and R-tree
// can be used, but the grid approach is O(1) and requires no dependencies.
//
// Data source: hormuz-ship-tracker/data/land_mask.geojson (MIT-licensed)

const (
	// Grid bounds: Persian Gulf + Gulf of Oman
	gridLatMin = 10.0
	gridLatMax = 35.0
	gridLonMin = 30.0
	gridLonMax = 75.0
	gridResDeg = 0.05 // ~5.5 km at equator, ~3 NM
)

var (
	landGrid      []bool
	gridLatSteps  int
	gridLonSteps  int
	landGridReady bool
)

// gridIndex converts lat/lon to grid indices.
func gridIndex(lat, lon float64) (int, int, bool) {
	if lat < gridLatMin || lat > gridLatMax || lon < gridLonMin || lon > gridLonMax {
		return 0, 0, false
	}
	latIdx := int(math.Floor((lat - gridLatMin) / gridResDeg))
	lonIdx := int(math.Floor((lon - gridLonMin) / gridResDeg))
	if latIdx < 0 || latIdx >= gridLatSteps || lonIdx < 0 || lonIdx >= gridLonSteps {
		return 0, 0, false
	}
	return latIdx, lonIdx, true
}

// InitLandMask loads the land mask from the GeoJSON file and rasterizes it
// into a boolean grid. Call once at startup.
func InitLandMask(geojsonPath string) error {
	candidatePaths := []string{}
	if geojsonPath != "" {
		candidatePaths = append(candidatePaths, geojsonPath)
	}

	_, filename, _, _ := runtime.Caller(0)
	geoDir := filepath.Dir(filename)
	serverDir := filepath.Dir(filepath.Dir(geoDir))

	candidatePaths = append(candidatePaths,
		filepath.Join(serverDir, "data", "land_mask.geojson"),
		"server/data/land_mask.geojson",
		"data/land_mask.geojson",
		"../data/land_mask.geojson",
		"../../server/data/land_mask.geojson",
		"/run/media/tp24/SHARED/Projects/HormuzWatch/server/data/land_mask.geojson",
	)

	var data []byte
	var err error
	var foundPath string
	for _, p := range candidatePaths {
		if data, err = os.ReadFile(p); err == nil {
			foundPath = p
			break
		}
	}

	if err != nil || len(data) == 0 {
		log.Printf("[landmask] Land mask GeoJSON not found (checked %v): %v — land filtering disabled", candidatePaths, err)
		return err
	}

	var fc GeoJSONFeatureCollection
	if err := json.Unmarshal(data, &fc); err != nil {
		log.Printf("[landmask] Failed to parse land mask (%s): %v", foundPath, err)
		return err
	}

	// Initialize grid
	gridLatSteps = int(math.Ceil((gridLatMax - gridLatMin) / gridResDeg))
	gridLonSteps = int(math.Ceil((gridLonMax - gridLonMin) / gridResDeg))
	landGrid = make([]bool, gridLatSteps*gridLonSteps)

	// Rasterize: for each land polygon, mark covered grid cells
	for _, feature := range fc.Features {
		rasterizePolygon(feature.Geometry)
	}

	landGridReady = true
	landCells := 0
	for _, isLand := range landGrid {
		if isLand {
			landCells++
		}
	}
	log.Printf("[landmask] Land mask loaded: %d grid cells (%dx%d), %d land cells (%.1f%%)",
		len(landGrid), gridLonSteps, gridLatSteps, landCells,
		float64(landCells)/float64(len(landGrid))*100)

	return nil
}

// IsOnLand returns true if the coordinate falls on land.
// Returns false if the land mask is not initialized (fail-open for data collection).
func IsOnLand(lat, lon float64) bool {
	if !landGridReady {
		return false
	}
	latIdx, lonIdx, ok := gridIndex(lat, lon)
	if !ok {
		return false
	}
	return landGrid[latIdx*gridLonSteps+lonIdx]
}

// rasterizePolygon marks grid cells that intersect with a polygon.
func rasterizePolygon(geom GeoJSONGeometry) {
	switch geom.Type {
	case "Polygon":
		for _, ring := range geom.PolygonCoords {
			rasterizeRing(ring)
		}
	case "MultiPolygon":
		for _, poly := range geom.MultiPolygonCoords {
			for _, ring := range poly {
				rasterizeRing(ring)
			}
		}
	}
}

// rasterizeRing processes a GeoJSON polygon ring (outer boundary).
func rasterizeRing(ring [][]float64) {
	if len(ring) == 0 {
		return
	}

	// Find bounding box
	minLat, maxLat := 90.0, -90.0
	minLon, maxLon := 180.0, -180.0
	for _, point := range ring {
		if len(point) < 2 {
			continue
		}
		lon := point[0] // GeoJSON: [lon, lat]
		lat := point[1]
		if lat < minLat {
			minLat = lat
		}
		if lat > maxLat {
			maxLat = lat
		}
		if lon < minLon {
			minLon = lon
		}
		if lon > maxLon {
			maxLon = lon
		}
	}

	// Convert to grid indices
	latStart := int(math.Floor((minLat - gridLatMin) / gridResDeg))
	latEnd := int(math.Ceil((maxLat - gridLatMin) / gridResDeg))
	lonStart := int(math.Floor((minLon - gridLonMin) / gridResDeg))
	lonEnd := int(math.Ceil((maxLon - gridLonMin) / gridResDeg))

	// Clamp
	if latStart < 0 {
		latStart = 0
	}
	if latEnd > gridLatSteps {
		latEnd = gridLatSteps
	}
	if lonStart < 0 {
		lonStart = 0
	}
	if lonEnd > gridLonSteps {
		lonEnd = gridLonSteps
	}

	// Check each cell center against the polygon
	for li := latStart; li < latEnd; li++ {
		for lj := lonStart; lj < lonEnd; lj++ {
			lat := gridLatMin + (float64(li)+0.5)*gridResDeg
			lon := gridLonMin + (float64(lj)+0.5)*gridResDeg
			if pointInPolygonGeoJSON(lat, lon, ring) {
				landGrid[li*gridLonSteps+lj] = true
			}
		}
	}
}

// pointInPolygonGeoJSON uses ray-casting to check if a point is inside a polygon.
func pointInPolygonGeoJSON(lat, lon float64, polygon [][]float64) bool {
	intersectCount := 0
	n := len(polygon)
	for j := 0; j < n; j++ {
		p1 := polygon[j]
		p2 := polygon[(j+1)%n]
		if len(p1) < 2 || len(p2) < 2 {
			continue
		}
		// GeoJSON format: [lon, lat]
		if ((p1[1] > lat) != (p2[1] > lat)) &&
			(lon < (p2[0]-p1[0])*(lat-p1[1])/(p2[1]-p1[1])+p1[0]) {
			intersectCount++
		}
	}
	return intersectCount%2 == 1
}

// GeoJSON types for parsing land mask file.
type GeoJSONFeatureCollection struct {
	Type     string           `json:"type"`
	Features []GeoJSONFeature `json:"features"`
}

type GeoJSONFeature struct {
	Type       string          `json:"type"`
	Properties map[string]any  `json:"properties"`
	Geometry   GeoJSONGeometry `json:"geometry"`
}

type GeoJSONGeometry struct {
	Type               string          `json:"type"`
	PolygonCoords      [][][]float64   `json:"-"` // Polygon: [rings][points][lon, lat]
	MultiPolygonCoords [][][][]float64 `json:"-"` // MultiPolygon: [polygons][rings][points][lon, lat]
}

// UnmarshalJSON handles both Polygon and MultiPolygon coordinate formats.
func (g *GeoJSONGeometry) UnmarshalJSON(data []byte) error {
	type raw struct {
		Type        string          `json:"type"`
		Coordinates json.RawMessage `json:"coordinates"`
	}
	var r raw
	if err := json.Unmarshal(data, &r); err != nil {
		return err
	}
	g.Type = r.Type

	switch g.Type {
	case "Polygon":
		return json.Unmarshal(r.Coordinates, &g.PolygonCoords)
	case "MultiPolygon":
		return json.Unmarshal(r.Coordinates, &g.MultiPolygonCoords)
	}
	return nil
}
