package news

import (
	"math"
	"regexp"
	"strconv"
	"strings"
	"unicode"
)

// CoordResult holds extracted coordinates from article text.
type CoordResult struct {
	Points     []GeoPoint `json:"points"`      // all extracted coordinate pairs
	EntityGeo  []GeoPoint `json:"entity_geo"`   // geocoded from named entities
	BestPoint  *GeoPoint  `json:"best_point"`   // highest-confidence single point
	Confidence float64    `json:"confidence"`   // 0.0-1.0
	Source     string     `json:"source"`       // "regex_decimal", "regex_dms", "entity_match", "country_centroid"
}

// ── Regex patterns for coordinate extraction ───────────────────────

var (
	// Decimal: 25.2345, 55.3456 or 25.2345°N, 55.3456°E or lat:25.5 lon:55.3
	decimalCoordRE = regexp.MustCompile(
		`(?:lat(?:itude)?[:\s]*)?(-?\d{1,3}\.\d{2,})\s*[,;\s]\s*(?:lon(?:gitude)?[:\s]*)?(-?\d{1,3}\.\d{2,})` +
			`|` +
			`(-?\d{1,3}\.\d{2,})\s*°?\s*[NnSs]\s*[,;\s]\s*(-?\d{1,3}\.\d{2,})\s*°?\s*[EeWw]`,
	)

	// DMS: 25°14'04"N 55°18'22"E
	dmsCoordRE = regexp.MustCompile(
		`(\d{1,3})\s*°\s*(\d{1,2})\s*'\s*(\d{1,2}(?:\.\d+)?)\s*"\s*([NnSs])\s+` +
			`(\d{1,3})\s*°\s*(\d{1,2})\s*'\s*(\d{1,2}(?:\.\d+)?)\s*"\s*([EeWw])`,
	)

	// Coordinates near named places: "near Dubai (25.20, 55.27)"
	namedWithCoordRE = regexp.MustCompile(
		`(?:near|off|at|port of|coast of|vicinity of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4})` +
			`[^.]*?(\d{1,3}\.\d{2,})\s*[,;\s]\s*(\d{1,3}\.\d{2,})`,
	)
)

// ExtractCoordinates parses article text for geographic coordinates.
// Strategy: regex decimal → regex DMS → named entity geocode → country centroid.
func ExtractCoordinates(text string, entities EntityResult, country string) CoordResult {
	result := CoordResult{}

	// ── Phase 1: Regex decimal coordinates ──────────────────
	decMatches := decimalCoordRE.FindAllStringSubmatch(text, -1)
	for _, m := range decMatches {
		var lat, lon float64
		var err error

		// Pattern 1: "lat X, lon Y"
		if m[1] != "" && m[2] != "" {
			lat, err = strconv.ParseFloat(m[1], 64)
			if err == nil {
				lon, err = strconv.ParseFloat(m[2], 64)
			}
		}
		// Pattern 2: "X°N, Y°E"
		if m[3] != "" && m[4] != "" {
			lat, _ = strconv.ParseFloat(m[3], 64)
			lon, _ = strconv.ParseFloat(m[4], 64)
		}

		if err == nil && isValidCoord(lat, lon) {
			result.Points = append(result.Points, GeoPoint{Lat: lat, Lon: lon})
		}
	}

	if len(result.Points) > 0 {
		result.Confidence = 0.85
		result.Source = "regex_decimal"
		result.BestPoint = &result.Points[0]
		return result
	}

	// ── Phase 2: DMS coordinates ───────────────────────────
	dmsMatches := dmsCoordRE.FindAllStringSubmatch(text, -1)
	for _, m := range dmsMatches {
		if len(m) < 9 {
			continue
		}
		latDeg, _ := strconv.ParseFloat(m[1], 64)
		latMin, _ := strconv.ParseFloat(m[2], 64)
		latSec, _ := strconv.ParseFloat(m[3], 64)
		latDir := strings.ToUpper(m[4])

		lonDeg, _ := strconv.ParseFloat(m[5], 64)
		lonMin, _ := strconv.ParseFloat(m[6], 64)
		lonSec, _ := strconv.ParseFloat(m[7], 64)
		lonDir := strings.ToUpper(m[8])

		lat := dmsToDecimal(latDeg, latMin, latSec, latDir)
		lon := dmsToDecimal(lonDeg, lonMin, lonSec, lonDir)

		if isValidCoord(lat, lon) {
			result.Points = append(result.Points, GeoPoint{Lat: lat, Lon: lon})
		}
	}

	if len(result.Points) > 0 {
		result.Confidence = 0.75
		result.Source = "regex_dms"
		result.BestPoint = &result.Points[0]
		return result
	}

	// ── Phase 3: Named entity geocoding ────────────────────
	entityPoints := GeocodeEntity(entities)
	result.EntityGeo = entityPoints

	if len(entityPoints) > 0 {
		// Prefer ports (most specific), then airports, then cities
		result.Points = entityPoints
		result.Confidence = 0.60
		result.Source = "entity_match"
		result.BestPoint = &entityPoints[0]
		return result
	}

	// ── Phase 4: Country centroid fallback ─────────────────
	if country != "" {
		if cp, ok := GeocodeCountry(country); ok {
			result.Points = []GeoPoint{cp}
			result.Confidence = 0.25
			result.Source = "country_centroid"
			result.BestPoint = &cp
			return result
		}
	}

	return result
}

// BestLatLon returns lat, lon from the best coordinate or 0,0.
func (c CoordResult) BestLatLon() (float64, float64) {
	if c.BestPoint != nil {
		return c.BestPoint.Lat, c.BestPoint.Lon
	}
	return 0, 0
}

// ── Helpers ─────────────────────────────────────────────────────────

func dmsToDecimal(deg, min, sec float64, dir string) float64 {
	val := deg + min/60.0 + sec/3600.0
	if dir == "S" || dir == "W" {
		val = -val
	}
	return math.Round(val*10000) / 10000
}

func isValidCoord(lat, lon float64) bool {
	return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 && !(lat == 0 && lon == 0)
}

// NormalizeLocationName lowercases and trims a place name for gazetteer lookup.
func NormalizeLocationName(name string) string {
	return strings.Map(func(r rune) rune {
		if unicode.IsLetter(r) || unicode.IsSpace(r) || unicode.IsDigit(r) {
			return unicode.ToLower(r)
		}
		return -1
	}, name)
}
