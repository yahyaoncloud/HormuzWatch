package anomaly

import (
	"strings"
	"testing"
)

func TestScoreAndReasons(t *testing.T) {
	// Case 1: Normal transit (0 course delta, 1 min gap, steady speed 12 kts, far from zones)
	normalScore := Score(0.0, 1.0, 12.0, 12.0, 10.0, false, false)
	if normalScore > 10 {
		t.Errorf("Normal transit score should be <= 10; got %d", normalScore)
	}

	// Case 2: AIS gap anomaly (25 min gap, 45 deg course delta)
	score := Score(45.0, 25.0, 14.0, 14.0, 5.0, false, false)
	if score < 30 {
		t.Errorf("Expected elevated anomaly score for AIS gap + course delta; got %d", score)
	}

	reasons := GetReasons(score, 45.0, 25.0, 14.0, 14.0, 5.0, false, false, "")
	foundAISReason := false
	for _, r := range reasons {
		if strings.Contains(r, "AIS continuity anomaly") {
			foundAISReason = true
			break
		}
	}
	if !foundAISReason {
		t.Errorf("Expected reason to mention 'AIS continuity anomaly', got: %v", reasons)
	}

	// Case 3: Action recommendations
	actions := GetActions("critical")
	if len(actions) == 0 {
		t.Fatalf("Expected actions for critical severity")
	}
	if !strings.Contains(actions[0], "radar/optical cross-validation") {
		t.Errorf("Expected critical action to mention cross-sensor validation, got: %s", actions[0])
	}
}
