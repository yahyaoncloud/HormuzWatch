package ais

import (
	"fmt"
	"strings"
	"time"
)

// Navigational status codes (ITU-R M.1371)
const (
	NavStatusUnderwayEngine           = 0
	NavStatusAtAnchor                 = 1
	NavStatusNotUnderCommand          = 2
	NavStatusRestrictedManeuverability = 3
	NavStatusConstrainedByDraught     = 4
	NavStatusMoored                   = 5
	NavStatusAground                  = 6
	NavStatusEngagedInFishing         = 7
	NavStatusUnderWaySailing          = 8
	NavStatusReservedHSC              = 9
	NavStatusReservedWIG              = 10
	NavStatusReserved11               = 11
	NavStatusReserved12               = 12
	NavStatusReserved13               = 13
	NavStatusAISSART                  = 14
	NavStatusUndefined                = 15
)

// Ship Type groups
const (
	ShipGroupTanker    = "Tanker"
	ShipGroupCargo     = "Cargo"
	ShipGroupPassenger = "Passenger"
	ShipGroupTugTowing = "Tug / Special Craft"
	ShipGroupMilitary  = "Military / Law Enforcement"
	ShipGroupSAR       = "Search & Rescue"
	ShipGroupFishing   = "Fishing"
	ShipGroupPilot     = "Pilot Vessel"
	ShipGroupPleasure  = "Pleasure / Yacht"
	ShipGroupAtoN      = "Aid to Navigation"
	ShipGroupOther     = "Other / Unknown"
)

// TrackPoint represents a timestamped coordinate in a vessel's historical track.
type TrackPoint struct {
	Lat       float64   `json:"lat"`
	Lon       float64   `json:"lon"`
	SOG       float64   `json:"sog"`
	COG       float64   `json:"cog"`
	Heading   float64   `json:"heading"`
	Timestamp time.Time `json:"timestamp"`
}

// NormalizedVesselState holds the authoritative real-time state of a tracked vessel.
type NormalizedVesselState struct {
	MMSI              string       `json:"mmsi"`
	VesselName        string       `json:"vesselName"`
	Callsign          string       `json:"callsign,omitempty"`
	IMO               int          `json:"imo,omitempty"`
	ShipTypeID        int          `json:"shipTypeId,omitempty"`
	ShipTypeName      string       `json:"shipTypeName"`
	ShipGroup         string       `json:"shipGroup"`
	DimensionA        int          `json:"dimA,omitempty"` // Bow to reference
	DimensionB        int          `json:"dimB,omitempty"` // Reference to Stern
	DimensionC        int          `json:"dimC,omitempty"` // Port to reference
	DimensionD        int          `json:"dimD,omitempty"` // Reference to Starboard
	LengthMeters      float64      `json:"lengthMeters,omitempty"`
	BeamMeters        float64      `json:"beamMeters,omitempty"`
	DraughtMeters     float64      `json:"draughtMeters,omitempty"`
	Destination       string       `json:"destination,omitempty"`
	ETA               string       `json:"eta,omitempty"`
	Lat               float64      `json:"lat"`
	Lon               float64      `json:"lon"`
	PreviousLat       float64      `json:"previousLat,omitempty"`
	PreviousLon       float64      `json:"previousLon,omitempty"`
	SOG               float64      `json:"sog"`       // Speed Over Ground in knots
	COG               float64      `json:"cog"`       // Course Over Ground in degrees [0, 360)
	TrueHeading       float64      `json:"heading"`   // True Heading in degrees [0, 360) (511 if unavailable)
	NavStatusID       int          `json:"navStatusId"`
	NavStatusText     string       `json:"navStatusText"`
	RateOfTurn        float64      `json:"rateOfTurn"` // Degrees per minute
	AisTimestamp      time.Time    `json:"aisTimestamp"`
	LastSeen          time.Time    `json:"lastSeen"`
	LastMessageType   string       `json:"lastMessageType"`
	MonitoredZone     string       `json:"monitoredZone"` // AREA-HORMUZ, AREA-PGULF, AREA-GOMAN, AREA-FUJAIRAH, or Open Waters
	RecentTrack       []TrackPoint `json:"recentTrack,omitempty"`
	ActiveAnomalies   []string     `json:"activeAnomalies,omitempty"`
	IsStale           bool         `json:"isStale"`

	// Provenance metadata
	Provider          string       `json:"provider"`          // "openwaters", "aisstream", "mock"
	Source            string       `json:"source,omitempty"`  // Feeder/receiver source identifier
	Station           string       `json:"station,omitempty"` // Ground station / feeder ID (e.g. "DXB-04")
}

// NavStatusToString maps numeric ITU navigational status code to descriptive English.
func NavStatusToString(status int) string {
	switch status {
	case NavStatusUnderwayEngine:
		return "Under way using engine"
	case NavStatusAtAnchor:
		return "At anchor"
	case NavStatusNotUnderCommand:
		return "Not under command"
	case NavStatusRestrictedManeuverability:
		return "Restricted maneuverability"
	case NavStatusConstrainedByDraught:
		return "Constrained by draught"
	case NavStatusMoored:
		return "Moored"
	case NavStatusAground:
		return "Aground"
	case NavStatusEngagedInFishing:
		return "Engaged in fishing"
	case NavStatusUnderWaySailing:
		return "Under way sailing"
	case NavStatusReservedHSC:
		return "High Speed Craft (HSC)"
	case NavStatusReservedWIG:
		return "Wing In Ground (WIG)"
	case NavStatusAISSART:
		return "AIS-SART / MOB / EPIRB active"
	default:
		return "Not defined / Default"
	}
}

// ShipTypeToGroup maps AIS numeric ship type code to user-friendly group.
func ShipTypeToGroup(typeCode int) (group string, name string) {
	if typeCode >= 80 && typeCode <= 89 {
		return ShipGroupTanker, "Tanker"
	}
	if typeCode >= 70 && typeCode <= 79 {
		return ShipGroupCargo, "Cargo Ship"
	}
	if typeCode >= 60 && typeCode <= 69 {
		return ShipGroupPassenger, "Passenger Ferry / Cruise"
	}
	if typeCode == 50 || typeCode == 52 || typeCode == 53 || typeCode == 31 || typeCode == 32 {
		return ShipGroupTugTowing, "Tug / Towing Vessel"
	}
	if typeCode == 51 {
		return ShipGroupSAR, "Search & Rescue Vessel"
	}
	if typeCode == 55 {
		return ShipGroupMilitary, "Law Enforcement / Patrol"
	}
	if typeCode == 35 {
		return ShipGroupMilitary, "Military Operation Vessel"
	}
	if typeCode == 30 {
		return ShipGroupFishing, "Fishing Vessel"
	}
	if typeCode == 50 {
		return ShipGroupPilot, "Pilot Vessel"
	}
	if typeCode >= 36 && typeCode <= 37 {
		return ShipGroupPleasure, "Pleasure Craft / Sailing"
	}
	if typeCode >= 20 && typeCode <= 29 {
		return ShipGroupOther, "Wing In Ground / Special"
	}
	if typeCode >= 90 && typeCode <= 99 {
		return ShipGroupOther, "Other / Special Craft"
	}
	return ShipGroupOther, "Vessel"
}

// DetermineMonitoredZone returns the strategic watch zone code for given coordinates.
func DetermineMonitoredZone(lat, lon float64) string {
	// Strait of Hormuz TSS
	if lat >= 25.8 && lat <= 27.3 && lon >= 55.5 && lon <= 57.1 {
		return "AREA-HORMUZ"
	}
	// Fujairah Anchorage
	if lat >= 24.8 && lat <= 25.6 && lon >= 56.2 && lon <= 56.8 {
		return "AREA-FUJAIRAH"
	}
	// Persian Gulf Basin
	if lat >= 24.0 && lat <= 30.5 && lon >= 48.0 && lon <= 56.0 {
		return "AREA-PGULF"
	}
	// Gulf of Oman Approach
	if lat >= 22.0 && lat <= 26.5 && lon >= 56.5 && lon <= 62.0 {
		return "AREA-GOMAN"
	}
	return "OPEN-GULF-WATERS"
}

// ServiceHealthStatus exposes runtime telemetry observability metrics.
type ServiceHealthStatus struct {
	Status             string    `json:"status"` // "connected", "connecting", "reconnecting", "degraded", "mock_active", "disabled"
	IsConnected        bool      `json:"isConnected"`
	IsMock             bool      `json:"isMock"`
	TotalMessages      uint64    `json:"totalMessages"`
	MessagesPerSecond  float64   `json:"messagesPerSecond"`
	LastMessageAt      time.Time `json:"lastMessageAt"`
	ReconnectCount     uint32    `json:"reconnectCount"`
	DroppedMessages    uint64    `json:"droppedMessages"`
	ActiveVesselsCount int       `json:"activeVesselsCount"`
	MonitoredZones     []string  `json:"monitoredZones"`
	LastError          string    `json:"lastError,omitempty"`
	UptimeSeconds      int64     `json:"uptimeSeconds"`
}

// AISStreamSubscription matches AISStream.io v0 WebSocket subscription schema.
type AISStreamSubscription struct {
	APIKey             string         `json:"APIKey"`
	BoundingBoxes      [][][2]float64 `json:"BoundingBoxes"`
	FiltersShipMMSI    []string       `json:"FiltersShipMMSI,omitempty"`
	FilterMessageTypes []string       `json:"FilterMessageTypes,omitempty"`
}

// DefaultBoundingBoxes returns the 3 primary operational sectors in the Gulf theater.
func DefaultBoundingBoxes() [][][2]float64 {
	return [][][2]float64{
		// Persian Gulf Basin
		{{23.5, 47.0}, {31.5, 56.5}},
		// Strait of Hormuz Chokepoint & TSS
		{{25.0, 55.0}, {27.5, 57.5}},
		// Gulf of Oman Ingress & Egress
		{{22.0, 56.0}, {26.5, 62.0}},
	}
}

// CleanMMSI ensures MMSI is numeric string.
func CleanMMSI(raw int64) string {
	return fmt.Sprintf("%d", raw)
}

// CleanVesselName removes padding and placeholder characters from AIS strings.
func CleanVesselName(name string) string {
	trimmed := strings.TrimSpace(name)
	trimmed = strings.Trim(trimmed, "@_-\t\r\n ")
	if trimmed == "" || strings.EqualFold(trimmed, "UNKNOWN") || strings.EqualFold(trimmed, "NIL") {
		return "Unknown Vessel"
	}
	return trimmed
}
