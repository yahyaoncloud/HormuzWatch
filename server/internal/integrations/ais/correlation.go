package ais

import (
	"math"
	"sort"
	"time"
)

// NearbyVesselResult represents an AIS vessel in the spatial vicinity of an incident.
type NearbyVesselResult struct {
	Vessel         NormalizedVesselState `json:"vessel"`
	DistanceNm     float64               `json:"distanceNm"`
	DistanceKm     float64               `json:"distanceKm"`
	BearingDeg     float64               `json:"bearingDeg"`
	ConfidenceTier string                `json:"confidenceTier"` // OBSERVED_AIS_FACT, CALCULATED_PROXIMITY, INFERRED_MOVEMENT_ANOMALY
	ContextNote    string                `json:"contextNote"`
	TemporalPhase  string                `json:"temporalPhase"`  // DURING_INCIDENT_WINDOW, PRE_INCIDENT_TRANSIT, POST_INCIDENT_TRANSIT, LIVE_PROXIMITY
}

// IncidentTrafficCorrelation represents the full correlation package for a conflict event.
type IncidentTrafficCorrelation struct {
	IncidentID       string               `json:"incidentId"`
	IncidentTitle    string               `json:"incidentTitle"`
	IncidentLat      float64              `json:"incidentLat"`
	IncidentLon      float64              `json:"incidentLon"`
	IncidentTime     time.Time            `json:"incidentTime"`
	RadiusNm         float64              `json:"radiusNm"`
	TotalNearby      int                  `json:"totalNearby"`
	NearbyVessels    []NearbyVesselResult `json:"nearbyVessels"`
	GeneratedAt      time.Time            `json:"generatedAt"`
	ConfidenceLevels map[string]string    `json:"confidenceLevels"`
	Disclaimer       string               `json:"disclaimer"`
}

// Confidence definitions for explicit intelligence breakdown
var DefaultConfidenceBreakdown = map[string]string{
	"OBSERVED_AIS_FACT":                  "Authentic GPS coordinate, transponder timestamp, SOG, and COG broadcast directly by vessel AIS transponder.",
	"CALCULATED_PROXIMITY":              "Great-circle distance (Haversine) and azimuth bearing mathematically derived between incident and vessel coordinates.",
	"INFERRED_MOVEMENT_ANOMALY":         "Algorithmic detection of course alteration or speed variation relative to vessel's kinematic baseline.",
	"EXTERNALLY_REPORTED_CONFLICT_EVENT": "Unclassified security report from OSINT, maritime advisory (UKMTO/IMB), or news agency.",
}

const NeutralCausalityDisclaimer = "HormuzWatch observes maritime telemetry and correlates proximity to public security reports. Spatial proximity indicates co-location in international or regional waterways and does not imply involvement, fault, or hostility."

// CorrelateIncidentTraffic performs spatial-temporal correlation between an incident and cached AIS traffic.
func CorrelateIncidentTraffic(incidentID, title string, lat, lon float64, incidentTime time.Time, radiusNm float64, cache *VesselCache) *IncidentTrafficCorrelation {
	if cache == nil {
		cache = GlobalVesselCache
	}
	if radiusNm <= 0 {
		radiusNm = 15.0 // Default 15 Nautical Miles
	}

	nearby := cache.GetVesselsNear(lat, lon, radiusNm)

	// Sort by distance ascending
	sort.Slice(nearby, func(i, j int) bool {
		return nearby[i].DistanceNm < nearby[j].DistanceNm
	})

	now := time.Now().UTC()

	// Enrich context notes with neutral descriptions and temporal phase
	for i := range nearby {
		v := &nearby[i].Vessel
		dist := nearby[i].DistanceNm

		// 1. Spatial proximity note
		note := ""
		if dist <= 3.0 {
			note = "Immediate vicinity (< 3 NM)"
		} else if dist <= 8.0 {
			note = "Close proximity (3–8 NM)"
		} else {
			note = "Regional transit corridor (8–15 NM)"
		}

		// 2. Temporal phase classification
		temporalPhase := "LIVE_PROXIMITY"
		if !incidentTime.IsZero() {
			timeDiff := v.AisTimestamp.Sub(incidentTime)
			if math.Abs(timeDiff.Minutes()) <= 30.0 {
				temporalPhase = "DURING_INCIDENT_WINDOW"
				note += " [Broadcast concurrent with incident window]"
			} else if timeDiff < -30*time.Minute {
				temporalPhase = "PRE_INCIDENT_TRANSIT"
				note += " [Observed in sector prior to incident timestamp]"
			} else if timeDiff > 30*time.Minute {
				temporalPhase = "POST_INCIDENT_TRANSIT"
				note += " [Observed transiting sector after incident timestamp]"
			}
		}
		nearby[i].TemporalPhase = temporalPhase

		// 3. Anomaly tag
		if len(v.ActiveAnomalies) > 0 {
			note += "; movement anomaly observed"
			nearby[i].ConfidenceTier = "INFERRED_MOVEMENT_ANOMALY"
		} else {
			nearby[i].ConfidenceTier = "CALCULATED_PROXIMITY"
		}
		nearby[i].ContextNote = note
	}

	return &IncidentTrafficCorrelation{
		IncidentID:       incidentID,
		IncidentTitle:    title,
		IncidentLat:      lat,
		IncidentLon:      lon,
		IncidentTime:     incidentTime,
		RadiusNm:         math.Round(radiusNm*10) / 10,
		TotalNearby:      len(nearby),
		NearbyVessels:    nearby,
		GeneratedAt:      now,
		ConfidenceLevels: DefaultConfidenceBreakdown,
		Disclaimer:       NeutralCausalityDisclaimer,
	}
}
