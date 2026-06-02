package anomaly

import "fmt"

// Score calculates the anomaly score for a vessel based on multiple factors
// Returns a score 0-100
func Score(courseDelta, aisAgeMinutes, speed, previousSpeed, hotZoneDistanceNm float64) int {
	score := 0

	// Route deviation: +34 points if course delta >= 45 degrees
	if courseDelta >= 45 {
		score += 34
	}

	// Stale AIS: +26 points if age >= 15 minutes
	if aisAgeMinutes >= 15 {
		score += 26
	}

	// Speed drop: +22 points if abrupt deceleration (speed <= 3 knots and delta >= 5 knots)
	speedDelta := previousSpeed - speed
	if speed <= 3 && speedDelta >= 5 {
		score += 22
	}

	// Hot zone: +18 points if distance <= 8 nautical miles
	if hotZoneDistanceNm <= 8 {
		score += 18
	}

	// Cap at 100
	if score > 100 {
		score = 100
	}

	return score
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
func GetReasons(score int, courseDelta, aisAgeMinutes, speed, previousSpeed, hotZoneDistanceNm float64) []string {
	var reasons []string

	if courseDelta >= 45 {
		reasons = append(reasons, fmt.Sprintf("Course deviation: %.1f° (> 45° threshold)", courseDelta))
	}

	if aisAgeMinutes >= 15 {
		reasons = append(reasons, fmt.Sprintf("Stale AIS data: %.0f minutes old (> 15 min threshold)", aisAgeMinutes))
	}

	speedDelta := previousSpeed - speed
	if speed <= 3 && speedDelta >= 5 {
		reasons = append(reasons, fmt.Sprintf("Abrupt deceleration: from %.1f to %.1f knots (delta: %.1f)", previousSpeed, speed, speedDelta))
	}

	if hotZoneDistanceNm <= 8 {
		reasons = append(reasons, fmt.Sprintf("Near Hormuz hot zone: %.1f nm away (< 8 nm threshold)", hotZoneDistanceNm))
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
