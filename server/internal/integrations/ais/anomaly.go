package ais

import (
	"fmt"
	"math"
	"os"
	"strconv"
	"time"
)

// AnomalyEvent represents a detected rule-based maritime movement event.
type AnomalyEvent struct {
	ID             string    `json:"id"`
	MMSI           string    `json:"mmsi"`
	VesselName     string    `json:"vesselName"`
	ShipGroup      string    `json:"shipGroup"`
	AnomalyType    string    `json:"anomalyType"`    // speed_drop, course_deviation, heading_deviation, loitering, zone_transition, ais_gap
	Severity       string    `json:"severity"`       // info, low, medium, high
	Title          string    `json:"title"`          // Neutral description e.g. "Rapid Course Alteration"
	Description    string    `json:"description"`
	Lat            float64   `json:"lat"`
	Lon            float64   `json:"lon"`
	SOG            float64   `json:"sog"`
	COG            float64   `json:"cog"`
	DeltaValue     float64   `json:"deltaValue,omitempty"` // Speed drop magnitude or course change angle
	MonitoredZone  string    `json:"monitoredZone"`
	Timestamp      time.Time `json:"timestamp"`
	ConfidenceTier string    `json:"confidenceTier"` // "INFERRED_MOVEMENT_ANOMALY"
}

// AnomalyThresholds holds configurable limits for heuristic rule evaluation.
type AnomalyThresholds struct {
	SpeedDropThresholdKnots float64 // e.g., 6.0 kn drop
	CourseDeltaThresholdDeg float64 // e.g., 45.0 degrees
	HeadingDeltaThresholdDeg float64 // e.g., 40.0 degrees
	LoiteringSpeedMaxKnots  float64 // e.g., 1.5 kn
	LoiteringDurationMin    float64 // e.g., 60 minutes
	AisGapThresholdMin      float64 // e.g., 30 minutes
}

// DefaultThresholds loads thresholds from environment variables or sensible maritime defaults.
func DefaultThresholds() AnomalyThresholds {
	return AnomalyThresholds{
		SpeedDropThresholdKnots:  getEnvFloat("AIS_ANOMALY_SPEED_DROP_KNOTS", 6.0),
		CourseDeltaThresholdDeg:  getEnvFloat("AIS_ANOMALY_COURSE_DELTA_DEG", 45.0),
		HeadingDeltaThresholdDeg: getEnvFloat("AIS_ANOMALY_HEADING_DELTA_DEG", 40.0),
		LoiteringSpeedMaxKnots:   getEnvFloat("AIS_ANOMALY_LOITER_SPEED_KNOTS", 1.5),
		LoiteringDurationMin:     getEnvFloat("AIS_ANOMALY_LOITER_MINUTES", 60.0),
		AisGapThresholdMin:       getEnvFloat("AIS_ANOMALY_GAP_MINUTES", 30.0),
	}
}

// GlobalAnomalyDetector evaluates vessel states against heuristic rules.
type AnomalyDetector struct {
	thresholds AnomalyThresholds
}

var GlobalAnomalyDetector = NewAnomalyDetector(DefaultThresholds())

// NewAnomalyDetector creates an anomaly detector instance.
func NewAnomalyDetector(t AnomalyThresholds) *AnomalyDetector {
	return &AnomalyDetector{thresholds: t}
}

// Evaluate checks a vessel against rule-based criteria and returns any new anomaly events.
func (d *AnomalyDetector) Evaluate(v *NormalizedVesselState, prevSOG, prevCOG, prevHeading float64, prevTimestamp time.Time) []AnomalyEvent {
	if v == nil {
		return nil
	}

	var events []AnomalyEvent
	now := time.Now().UTC()

	// 1. Sudden Speed Reduction (SOG drop > threshold while previously underway)
	if prevSOG > 5.0 && (prevSOG-v.SOG) >= d.thresholds.SpeedDropThresholdKnots {
		drop := prevSOG - v.SOG
		sev := "medium"
		if drop > 10.0 {
			sev = "high"
		}
		events = append(events, AnomalyEvent{
			ID:             fmt.Sprintf("ANOM-SPD-%s-%d", v.MMSI, now.Unix()),
			MMSI:           v.MMSI,
			VesselName:     v.VesselName,
			ShipGroup:      v.ShipGroup,
			AnomalyType:    "speed_drop",
			Severity:       sev,
			Title:          "Rapid reduction in SOG",
			Description:    fmt.Sprintf("Vessel speed decreased by %.1f knots (from %.1f to %.1f kn) in %s", drop, prevSOG, v.SOG, v.MonitoredZone),
			Lat:            v.Lat,
			Lon:            v.Lon,
			SOG:            v.SOG,
			COG:            v.COG,
			DeltaValue:     math.Round(drop*10) / 10,
			MonitoredZone:  v.MonitoredZone,
			Timestamp:      now,
			ConfidenceTier: "INFERRED_MOVEMENT_ANOMALY",
		})
	}

	// 2. Sharp Course Alteration (Shortest-arc change in COG > threshold)
	if prevSOG > 1.5 && (v.SOG > 1.5 || prevSOG > 3.0) {
		courseDelta := math.Abs(v.COG - prevCOG)
		if courseDelta > 180.0 {
			courseDelta = 360.0 - courseDelta
		}

		if courseDelta >= d.thresholds.CourseDeltaThresholdDeg {
			sev := "low"
			if courseDelta > 90.0 {
				sev = "medium"
			}
			events = append(events, AnomalyEvent{
				ID:             fmt.Sprintf("ANOM-CRS-%s-%d", v.MMSI, now.Unix()),
				MMSI:           v.MMSI,
				VesselName:     v.VesselName,
				ShipGroup:      v.ShipGroup,
				AnomalyType:    "course_deviation",
				Severity:       sev,
				Title:          "Rapid course alteration",
				Description:    fmt.Sprintf("Vessel altered course by %.0f° (from %.0f° to %.0f°) in %s", courseDelta, prevCOG, v.COG, v.MonitoredZone),
				Lat:            v.Lat,
				Lon:            v.Lon,
				SOG:            v.SOG,
				COG:            v.COG,
				DeltaValue:     math.Round(courseDelta),
				MonitoredZone:  v.MonitoredZone,
				Timestamp:      now,
				ConfidenceTier: "INFERRED_MOVEMENT_ANOMALY",
			})
		}
	}

	// 3. AIS Signal Gap (Transponder quiet interval > threshold before resuming)
	if !prevTimestamp.IsZero() {
		gapMinutes := v.AisTimestamp.Sub(prevTimestamp).Minutes()
		if gapMinutes >= d.thresholds.AisGapThresholdMin {
			events = append(events, AnomalyEvent{
				ID:             fmt.Sprintf("ANOM-GAP-%s-%d", v.MMSI, now.Unix()),
				MMSI:           v.MMSI,
				VesselName:     v.VesselName,
				ShipGroup:      v.ShipGroup,
				AnomalyType:    "ais_gap",
				Severity:       "low",
				Title:          "AIS transmission gap",
				Description:    fmt.Sprintf("AIS signal resumed after %.0f minute transmission gap", gapMinutes),
				Lat:            v.Lat,
				Lon:            v.Lon,
				SOG:            v.SOG,
				COG:            v.COG,
				DeltaValue:     math.Round(gapMinutes),
				MonitoredZone:  v.MonitoredZone,
				Timestamp:      now,
				ConfidenceTier: "INFERRED_MOVEMENT_ANOMALY",
			})
		}
	}

	// Update vessel's active anomaly list for quick UI lookup
	if len(events) > 0 {
		anomalyLabels := make([]string, 0, len(events))
		for _, e := range events {
			anomalyLabels = append(anomalyLabels, e.Title)
		}
		v.ActiveAnomalies = anomalyLabels
	}

	return events
}

func getEnvFloat(key string, fallback float64) float64 {
	val := os.Getenv(key)
	if val == "" {
		return fallback
	}
	f, err := strconv.ParseFloat(val, 64)
	if err != nil {
		return fallback
	}
	return f
}
