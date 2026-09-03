// Package telemetry contains the stable telemetry contract shared by HTTP,
// integration workers, storage, and dataset curation.
package telemetry

import (
	"strings"
	"time"
)

const (
	DomainVessel   = "vessel"
	DomainAircraft = "aircraft"

	SourceWebApp     = "webapp"
	SourceAISStream  = "aisstream"
	SourceOpenSky    = "opensky"
	SourceKystverket = "kystverket"
	SourceSimulator  = "simulator"
	SourceArcGIS     = "arcgis"

	// HeadingUnavailable is the standard AIS sentinel value (511°) indicating heading is unavailable.
	HeadingUnavailable = 511.0

	// COGUnavailable is the sentinel value indicating Course Over Ground is unavailable (>= 360.0°).
	COGUnavailable = 360.0
)

// Observation is one position update flowing through HormuzWatch.
// Timestamp is retained as an RFC3339 JSON field for API compatibility;
// ObservedAt converts it to a database-safe UTC value.
type Observation struct {
	TrackID           string  `json:"trackId" binding:"required"`
	AssetName         string  `json:"assetName" binding:"required"`
	Timestamp         string  `json:"timestamp" binding:"required"`
	Lat               float64 `json:"lat" binding:"required"`
	Lon               float64 `json:"lon" binding:"required"`
	Speed             float64 `json:"speed"`
	PreviousSpeed     float64 `json:"previousSpeed"`
	COG               float64 `json:"cog,omitempty"` // Course Over Ground (degrees 0-359.9)
	Heading           float64 `json:"heading"`       // True Heading / Vessel Orientation (degrees 0-359 or 511 if unavailable)
	CourseDelta       float64 `json:"courseDelta"`   // Shortest-arc change in COG / motion course (degrees)
	AisAgeMinutes     int     `json:"aisAgeMinutes"`
	HotZoneDistanceNm float64 `json:"hotZoneDistanceNm"`
	Altitude          float64 `json:"altitude,omitempty"`
	Squawk            string  `json:"squawk,omitempty"`
	OnGround          bool    `json:"onGround,omitempty"`
	ObjectType        string  `json:"objectType,omitempty"`
	Source            string  `json:"source,omitempty"`
}

// HasValidHeading returns true if the heading is available and within valid physical bounds [0, 360).
func (o Observation) HasValidHeading() bool {
	return o.Heading >= 0 && o.Heading < 360.0
}

// HasValidCOG returns true if Course Over Ground is available and within valid bounds [0, 360).
func (o Observation) HasValidCOG() bool {
	return o.COG >= 0 && o.COG < 360.0
}

// Domain returns the curation domain derived from the stable object type.
func (o Observation) Domain() string {
	if strings.EqualFold(strings.TrimSpace(o.ObjectType), DomainAircraft) ||
		strings.HasPrefix(o.TrackID, "FLIGHT-") ||
		strings.HasPrefix(o.TrackID, "ADS-") ||
		strings.HasPrefix(o.TrackID, "ICAO-") ||
		o.Altitude > 0 ||
		o.Speed > 80.0 {
		return DomainAircraft
	}
	return DomainVessel
}

// Normalize fills values that must be present before durable storage.
func (o *Observation) Normalize(defaultSource string) {
	o.TrackID = strings.TrimSpace(o.TrackID)
	o.AssetName = strings.TrimSpace(o.AssetName)
	o.ObjectType = o.Domain()
	if strings.TrimSpace(o.Source) == "" {
		o.Source = defaultSource
	}
	if strings.TrimSpace(o.Timestamp) == "" {
		o.Timestamp = time.Now().UTC().Format(time.RFC3339)
	}
}

// ObservedAt parses the source timestamp. Invalid source timestamps are
// retained in the API payload but stored using the receipt time.
func (o Observation) ObservedAt() time.Time {
	if value, err := time.Parse(time.RFC3339, o.Timestamp); err == nil {
		return value.UTC()
	}
	return time.Now().UTC()
}
