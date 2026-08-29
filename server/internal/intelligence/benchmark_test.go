package intelligence

import (
	"fmt"
	"testing"
)

func BenchmarkTrackStateManager_Update(b *testing.B) {
	tsm := NewTrackStateManager()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		trackID := fmt.Sprintf("VESSEL_%d", i%1000)
		lat := 26.50 + float64(i%100)*0.001
		lon := 56.25 + float64(i%100)*0.001
		speed := 12.0 + float64(i%10)*0.5
		heading := float64((i * 15) % 360)
		_ = tsm.Update(trackID, "Vessel Name", lat, lon, speed, heading)
	}
}

func BenchmarkRuleBasedAnomalyScore(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = ExtractFeatures("TRACK_1", 26.5, 56.2, 14.0, ComputedDeltas{
			CourseDelta:   25.0,
			HeadingDelta:  15.0,
			SpeedDelta:    2.5,
			AverageSpeed:  13.0,
			SpeedVariance: 4.0,
			AISGapMinutes: 8.0,
			EWMADeviation: 1.5,
		})
	}
}
