package news

import (
	"regexp"
	"strconv"
	"strings"
	"time"
)

// DateFormats lists common date/time formats encountered in RSS feeds and
// news APIs, tried in order during parsing.
var DateFormats = []string{
	time.RFC3339,
	time.RFC3339Nano,
	"2006-01-02T15:04:05Z",
	"2006-01-02T15:04:05-07:00",
	"2006-01-02 15:04:05",
	"2006-01-02 15:04",
	"2006-01-02",
	"02 January 2006",
	"02 Jan 2006 15:04:05 MST",
	"02 Jan 2006 15:04:05 -0700",
	"02 Jan 2006",
	"January 2, 2006",
	"Jan 2, 2006 15:04:05",
	"Jan 2, 2006",
	"Monday, 02 January 2006 15:04:05",
	"Mon, 02 Jan 2006 15:04:05 GMT",
	"Mon, 02 Jan 2006 15:04:05 -0700",
	"2006/01/02 15:04:05",
	"02/01/2006 15:04:05",
	"02/01/2006",
}

// NormalizeDate attempts to parse a date string using common formats.
// Returns the zero time on failure.
func NormalizeDate(raw string) time.Time {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return time.Time{}
	}
	for _, layout := range DateFormats {
		if t, err := time.Parse(layout, raw); err == nil {
			return t.UTC()
		}
	}
	return time.Time{}
}

var (
	coordRE = regexp.MustCompile(`([\d.]+)[°\s]*([NS]?)[,\s]+([\d.]+)[°\s]*([EW]?)`)
	dmsRE   = regexp.MustCompile(`(\d+)°(\d+)'(\d+(?:\.\d+)?)"?\s*([NS])\s*,?\s*(\d+)°(\d+)'(\d+(?:\.\d+)?)"?\s*([EW])`)
)

// NormalizeCoords attempts to extract latitude and longitude from a raw
// coordinate string. Supports decimal and DMS formats.
// Returns (lat, lon, ok).
func NormalizeCoords(raw string) (float64, float64, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0, 0, false
	}

	// Try DMS format first: "25°15'30\"N, 55°18'45\"E"
	if m := dmsRE.FindStringSubmatch(raw); m != nil {
		latDeg, _ := strconv.ParseFloat(m[1], 64)
		latMin, _ := strconv.ParseFloat(m[2], 64)
		latSec, _ := strconv.ParseFloat(m[3], 64)
		lat := dmsToDecimal(latDeg, latMin, latSec, m[4])
		lonDeg, _ := strconv.ParseFloat(m[5], 64)
		lonMin, _ := strconv.ParseFloat(m[6], 64)
		lonSec, _ := strconv.ParseFloat(m[7], 64)
		lon := dmsToDecimal(lonDeg, lonMin, lonSec, m[8])
		return lat, lon, true
	}

	// Try decimal format: "25.2583 N, 55.3125 E" or "25.2583, 55.3125"
	if m := coordRE.FindStringSubmatch(raw); m != nil {
		lat, err1 := strconv.ParseFloat(m[1], 64)
		lon, err2 := strconv.ParseFloat(m[3], 64)
		if err1 == nil && err2 == nil {
			if strings.ToUpper(m[2]) == "S" {
				lat = -lat
			}
			if strings.ToUpper(m[4]) == "W" {
				lon = -lon
			}
			return lat, lon, true
		}
	}

	// Try just two numbers separated by comma
	parts := strings.Split(raw, ",")
	if len(parts) == 2 {
		lat, err1 := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
		lon, err2 := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
		if err1 == nil && err2 == nil {
			return lat, lon, true
		}
	}

	return 0, 0, false
}

// NormalizeNumber strips formatting characters from a numeric string and
// parses it as a float64.
func NormalizeNumber(raw string) (float64, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0, nil
	}
	// Remove thousands separators, percent signs, etc.
	raw = strings.NewReplacer(",", "", "%", "", "$", "", " ", "").Replace(raw)
	return strconv.ParseFloat(raw, 64)
}

// TruncateText shortens text to maxLen characters, appending "..." if
// truncated. Prefers breaking at a word boundary.
func TruncateText(text string, maxLen int) string {
	if len(text) <= maxLen {
		return text
	}
	// Try to break at a space
	cut := maxLen - 3
	for cut > maxLen/2 && text[cut] != ' ' {
		cut--
	}
	if cut <= maxLen/2 {
		cut = maxLen - 3
	}
	return text[:cut] + "..."
}
