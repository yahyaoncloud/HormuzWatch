package ais

import (
	"context"
	"time"
)

// ProviderHealth represents the operational telemetry of a single AIS data provider.
type ProviderHealth struct {
	Provider        string    `json:"provider"`
	Status          string    `json:"status"` // "connected", "connecting", "reconnecting", "degraded", "active", "stopped"
	IsConnected     bool      `json:"isConnected"`
	TotalMessages   uint64    `json:"totalMessages"`
	DroppedMessages uint64    `json:"droppedMessages"`
	LastEventAt     time.Time `json:"lastEventAt"`
	ReconnectCount  uint32    `json:"reconnectCount"`
	LastError       string    `json:"lastError,omitempty"`
}

// NormalizedAISObservation is the unified, provider-agnostic telemetry unit ingested into HormuzWatch.
type NormalizedAISObservation struct {
	MMSI            string    `json:"mmsi"`
	VesselName      string    `json:"vesselName"`
	Callsign        string    `json:"callsign,omitempty"`
	IMO             int       `json:"imo,omitempty"`
	ShipTypeID      int       `json:"shipTypeId,omitempty"`
	ShipTypeName    string    `json:"shipTypeName"`
	ShipGroup       string    `json:"shipGroup"`
	DimensionA      int       `json:"dimA,omitempty"`
	DimensionB      int       `json:"dimB,omitempty"`
	DimensionC      int       `json:"dimC,omitempty"`
	DimensionD      int       `json:"dimD,omitempty"`
	LengthMeters    float64   `json:"lengthMeters,omitempty"`
	BeamMeters      float64   `json:"beamMeters,omitempty"`
	DraughtMeters   float64   `json:"draughtMeters,omitempty"`
	Destination     string    `json:"destination,omitempty"`
	ETA             string    `json:"eta,omitempty"`
	Lat             float64   `json:"lat"`
	Lon             float64   `json:"lon"`
	SOG             float64   `json:"sog"`
	COG             float64   `json:"cog"`
	TrueHeading     float64   `json:"heading"`
	NavStatusID     int       `json:"navStatusId"`
	NavStatusText   string    `json:"navStatusText"`
	RateOfTurn      float64   `json:"rateOfTurn,omitempty"`
	AisTimestamp    time.Time `json:"aisTimestamp"`
	LastSeen        time.Time `json:"lastSeen"`
	MessageType     string    `json:"messageType"`
	MonitoredZone   string    `json:"monitoredZone"`

	// Provenance metadata
	Provider        string    `json:"provider"`         // "openwaters", "aisstream", "mock"
	Source          string    `json:"source,omitempty"` // Feeder/receiver source identifier
	Station         string    `json:"station,omitempty"`// Feeder ground station ID (e.g. "DXB-04")
}

// AISProvider defines the interchangeable provider contract for all maritime telemetry sources.
type AISProvider interface {
	Name() string
	Start(ctx context.Context, onObservation func(*NormalizedAISObservation)) error
	Stop() error
	Health() ProviderHealth
	GetSnapshot(ctx context.Context) ([]*NormalizedAISObservation, error)
}
