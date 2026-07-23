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
	Heading           float64 `json:"heading"`
	CourseDelta       float64 `json:"courseDelta"`
	AisAgeMinutes     int     `json:"aisAgeMinutes"`
	HotZoneDistanceNm float64 `json:"hotZoneDistanceNm"`
	Altitude          float64 `json:"altitude,omitempty"`
	Squawk            string  `json:"squawk,omitempty"`
	OnGround          bool    `json:"onGround,omitempty"`
	ObjectType        string  `json:"objectType,omitempty"`
	Source            string  `json:"source,omitempty"`
}

// Domain returns the curation domain derived from the stable object type.
func (o Observation) Domain() string {
	if strings.EqualFold(strings.TrimSpace(o.ObjectType), DomainAircraft) {
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
