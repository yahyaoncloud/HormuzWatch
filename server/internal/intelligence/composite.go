package intelligence

import (
	"math"

	"Geospatial-harmuz-watch/server/internal/anomaly"
)

const (
	WeightRule         = 0.4
	WeightML           = 0.4
	WeightGeopolitical = 0.2
)

// ThreatAssessment is the final, composite output of the intelligence pipeline.
type ThreatAssessment struct {
	TrackID           string   `json:"id"`
	FinalScore        int      `json:"score"`
	RuleScore         int      `json:"rule_score"`
	MLScore           float64  `json:"ml_score"`
	GeopoliticalScore float64  `json:"geopolitical_score"`
	Severity          string         `json:"severity"`
	Reasons           []string       `json:"reasons"`
	Actions           []string       `json:"actions"`
	MLExplanation     *MLExplanation `json:"ml_explanation,omitempty"`
}

// ComputeComposite produces the final threat score.
//
// FinalScore = RuleScore × 0.4 + MLScore × 0.4 + GeoPoliticalScore × 0.2
//
// All input scores are normalized to 0-100.
func ComputeComposite(features FeatureVector, ruleScore int, mlScore float64, geoScore float64, explanation *MLExplanation) ThreatAssessment {
	// Clamp inputs to 0-100
	rs := math.Min(100, math.Max(0, float64(ruleScore)))
	ms := math.Min(100, math.Max(0, mlScore))
	gs := math.Min(100, math.Max(0, geoScore))

	final := rs*WeightRule + ms*WeightML + gs*WeightGeopolitical
	finalInt := int(math.Round(math.Min(100, final)))

	severity := anomaly.SeverityLevel(finalInt)
	reasons := anomaly.GetReasons(
		finalInt, features.CourseDelta, features.AISGapMinutes,
		features.Speed, features.PreviousSpeed, features.DistToRestrictedZone,
		features.InRestrictedZone, features.NearHistoricalAttack,
		features.RestrictedZoneName,
	)
	actions := anomaly.GetActions(severity)

	return ThreatAssessment{
		TrackID:           features.TrackID,
		FinalScore:        finalInt,
		RuleScore:         ruleScore,
		MLScore:           mlScore,
		GeopoliticalScore: geoScore,
		Severity:          severity,
		Reasons:           reasons,
		Actions:           actions,
		MLExplanation:     explanation,
	}
}
