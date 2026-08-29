package anomaly

import (
	"fmt"
	"math"
)

// Score calculates the anomaly score for a vessel based on multiple factors
// Returns a score 0-100
func Score(courseDelta, aisGapMinutes, speed, previousSpeed, distToZone float64, inRestrictedZone bool, nearHistoricalAttack bool) int {
	score := 0.0

	// ── Factor 1: Course deviation (max 34 pts) ─────────────────────
	// Proportional: ramps linearly from 0 at 10° to max at 90°
	if courseDelta > 10 {
		score += math.Min(34, (courseDelta-10)/(90-10)*34)
	}

	// ── Factor 2: AIS signal staleness (max 26 pts) ─────────────────
	// Proportional: ramps from 0 at 5 min to max at 30 min
	if aisGapMinutes > 5 {
		score += math.Min(26, (aisGapMinutes-5)/(30-5)*26)
	}

	// ── Factor 3: Speed anomaly (max 22 pts) ────────────────────────
	// Deceleration: proportional to the magnitude of the drop
	speedDrop := previousSpeed - speed
	if speedDrop > 2 {
		score += math.Min(22, (speedDrop-2)/(15-2)*22)
	}
	// Excessive speed (> 25 kts in strait): partial contribution
	if speed > 25 {
		score += math.Min(11, (speed-25)/(40-25)*11)
	}

	// ── Factor 4: Proximity to restricted zone (max 30 pts) ─────────
	if inRestrictedZone {
		score += 30
	} else if distToZone < 0.3 { // Approaching zone (< ~18nm)
		score += (0.3 - distToZone) / 0.3 * 15 // up to 15 pts
	}

	// ── Factor 5: Historical attack proximity (max 15 pts) ──────────
	if nearHistoricalAttack {
		score += 15
	}

	// Cap at 100
	result := int(math.Round(score))
	if result > 100 {
		result = 100
	}
	return result
}

// SeverityLevel returns the severity classification for a score
func SeverityLevel(score int) string {
	switch {
	case score >= 75:
		return "critical"
	case score >= 55:
		return "high"
	case score >= 30:
		return "medium"
	default:
		return "low"
	}
}

// GetReasons returns the list of reasons for the anomaly score, maintaining clear
// distinction between kinematic/continuity anomalies and confirmed hostile intent.
func GetReasons(score int, courseDelta, aisGapMinutes, speed, previousSpeed, distToZone float64, inRestrictedZone bool, nearHistoricalAttack bool, restrictedZoneName string) []string {
	var reasons []string

	if courseDelta > 10 {
		reasons = append(reasons, fmt.Sprintf("Kinematic course deviation: %.1f° change (> 10° threshold)", courseDelta))
	}

	if aisGapMinutes > 5 {
		reasons = append(reasons, fmt.Sprintf("AIS continuity anomaly: %.0f min gap (evaluating VHF propagation shadow vs dark period)", aisGapMinutes))
	}

	speedDrop := previousSpeed - speed
	if speedDrop > 2 {
		reasons = append(reasons, fmt.Sprintf("Kinematic speed transition: deceleration from %.1f to %.1f kts (delta: %.1f)", previousSpeed, speed, speedDrop))
	}

	if speed > 25 {
		reasons = append(reasons, fmt.Sprintf("High-speed kinematic indicator: %.1f kts (> 25 kts in transit corridor)", speed))
	}

	if inRestrictedZone {
		reasons = append(reasons, fmt.Sprintf("Geofence boundary breach: inside %s", restrictedZoneName))
	} else if distToZone < 0.3 {
		reasons = append(reasons, fmt.Sprintf("Geofence proximity indicator: %.2f° from restricted zone", distToZone))
	}

	if nearHistoricalAttack {
		reasons = append(reasons, "Geospatial proximity indicator: near historical incident location")
	}

	if len(reasons) == 0 && score > 0 {
		reasons = append(reasons, "Sub-threshold multi-factor kinematic variation")
	}

	return reasons
}

// GetActions returns recommended operational actions based on anomaly score severity.
// Note: Anomaly indications require cross-sensor validation (radar, visual, VHF) before establishing intent.
func GetActions(severity string) []string {
	switch severity {
	case "critical":
		return []string{
			"Escalate track for multi-sensor radar/optical cross-validation",
			"Query coastal AIS station logs for VHF slot collision or terrain masking",
			"Attempt VHF voice contact on Channel 16 / regional traffic management",
			"Notify watch officer and log track for situational review",
		}
	case "high":
		return []string{
			"Flag track for continuous trajectory monitoring",
			"Cross-reference satellite SAR and terrestrial AIS feeds",
			"Evaluate historical pattern of life for MMSI",
			"Log telemetry continuity status",
		}
	case "medium":
		return []string{
			"Add to active operational watchlist",
			"Monitor for persistent course or speed divergence",
		}
	default:
		return []string{
			"Maintain routine baseline tracking",
		}
	}
}

// Result represents the output of anomaly analysis
type Result struct {
	ID       string   `json:"id"`
	Score    int      `json:"score"`
	Severity string   `json:"severity"`
	Reasons  []string `json:"reasons"`
	Actions  []string `json:"actions"`
}
