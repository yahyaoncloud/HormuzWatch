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

// GetReasons returns the list of reasons for the anomaly score
func GetReasons(score int, courseDelta, aisGapMinutes, speed, previousSpeed, distToZone float64, inRestrictedZone bool, nearHistoricalAttack bool, restrictedZoneName string) []string {
	var reasons []string

	if courseDelta > 10 {
		reasons = append(reasons, fmt.Sprintf("Course deviation: %.1f° (> 10° threshold)", courseDelta))
	}

	if aisGapMinutes > 5 {
		reasons = append(reasons, fmt.Sprintf("Stale AIS data: %.0f minutes old (> 5 min threshold)", aisGapMinutes))
	}

	speedDrop := previousSpeed - speed
	if speedDrop > 2 {
		reasons = append(reasons, fmt.Sprintf("Abrupt deceleration: from %.1f to %.1f knots (delta: %.1f)", previousSpeed, speed, speedDrop))
	}

	if speed > 25 {
		reasons = append(reasons, fmt.Sprintf("Excessive speed: %.1f knots (> 25 kts)", speed))
	}

	if inRestrictedZone {
		reasons = append(reasons, fmt.Sprintf("Inside Restricted Zone: %s", restrictedZoneName))
	} else if distToZone < 0.3 {
		reasons = append(reasons, fmt.Sprintf("Approaching Restricted Zone: %.2f° away", distToZone))
	}

	if nearHistoricalAttack {
		reasons = append(reasons, "Proximity to historical attack site")
	}

	if len(reasons) == 0 && score > 0 {
		reasons = append(reasons, "Minor anomalies detected below individual reporting thresholds")
	}

	return reasons
}

// GetActions returns recommended actions based on severity level
func GetActions(severity string) []string {
	switch severity {
	case "critical":
		return []string{
			"Immediate escalation to duty officer",
			"Request vessel MMSI verification",
			"Prepare intercept vectors",
			"Notify regional command",
		}
	case "high":
		return []string{
			"Alert operations team",
			"Monitor vessel communications",
			"Request AIS update refresh",
			"Log for situational awareness",
		}
	case "medium":
		return []string{
			"Add to watchlist",
			"Cross-reference with intelligence",
			"Monitor for pattern changes",
		}
	default:
		return []string{
			"Continue routine monitoring",
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
