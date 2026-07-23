package news

import (
	"math"

	"Geospatial-harmuz-watch/server/internal/intelligence/source"
)

// ThreatAssessment is the output of the news intelligence pipeline.
type NewsAssessment struct {
	ArticleURL   string  `json:"article_url"`
	Title        string  `json:"title"`
	SourceName   string  `json:"source_name"`
	Category     string  `json:"category"`
	RiskScore    float64 `json:"risk_score"`    // 0-100
	Language     string  `json:"language"`
	NeedsTranslate bool  `json:"needs_translate"`

	// Sub-scores for transparency
	KeywordScore       float64 `json:"keyword_score"`
	EntityDensityScore float64 `json:"entity_density_score"`
	SourceScore        float64 `json:"source_score"`
	CountryScore       float64 `json:"country_score"`
	CategoryScore      float64 `json:"category_score"`
	RecencyScore       float64 `json:"recency_score"`
}

// ComputeNewsScore produces a pre-ML heuristic threat score from features.
// This runs in Go and serves as a local fallback when the ML service is
// unreachable — same pattern as localHeuristicScore in ml_client.go.
func ComputeNewsScore(features NewsFeatureVector) NewsAssessment {
	assessment := NewsAssessment{
		Category:     features.Category,
		Language:     features.Language,
		NeedsTranslate: NeedsTranslation(features.Language),
	}

	// ── 1. Keyword density score (0-20) ──────────────────────
	// More keywords → more structured content → potentially more significant
	if features.ArticleLength > 0 {
		density := float64(features.KeywordCount) / float64(features.ArticleLength) * 1000
		assessment.KeywordScore = math.Min(20, density*2)
	}

	// ── 2. Entity density score (0-15) ───────────────────────
	if features.ArticleLength > 0 {
		density := float64(features.EntityCount) / float64(features.ArticleLength) * 1000
		assessment.EntityDensityScore = math.Min(15, density*3)
	}

	// ── 3. Source reliability score (0-25) ───────────────────
	assessment.SourceScore = features.SourceReliability * 25

	// ── 4. Country risk score (0-15) ─────────────────────────
	assessment.CountryScore = features.CountryRiskScore * 15

	// ── 5. Military/conflict term bonus (0-15) ───────────────
	militaryBonus := float64(features.MilitaryTermCount) * 2.0
	assessment.CategoryScore = math.Min(15, militaryBonus)

	// ── 6. Recency bonus (0-10) ──────────────────────────────
	// Fresher articles are more actionable
	if features.PublicationAge < 1 {
		assessment.RecencyScore = 10
	} else if features.PublicationAge < 6 {
		assessment.RecencyScore = 7
	} else if features.PublicationAge < 24 {
		assessment.RecencyScore = 4
	} else if features.PublicationAge < 72 {
		assessment.RecencyScore = 1
	}

	// ── Composite ─────────────────────────────────────────────
	assessment.RiskScore = assessment.KeywordScore +
		assessment.EntityDensityScore +
		assessment.SourceScore +
		assessment.CountryScore +
		assessment.CategoryScore +
		assessment.RecencyScore

	assessment.RiskScore = math.Min(100, assessment.RiskScore)
	assessment.RiskScore = math.Round(assessment.RiskScore*10) / 10

	return assessment
}

// ProcessArticle runs the full news preprocessing pipeline on a raw article
// and returns the feature vector + heuristic assessment.
func ProcessArticle(raw source.RawArticle) (NewsFeatureVector, NewsAssessment) {
	// ── 1. Clean ─────────────────────────────────────────────
	cleaned := Clean(raw.Content)
	if cleaned == "" {
		cleaned = raw.Title
	}

	// ── 2. Dedup check ───────────────────────────────────────
	dedup := CheckDuplicate(DedupArticle{
		URL:        raw.URL,
		Title:      raw.Title,
		Content:    cleaned,
		SourceName: raw.SourceName,
	})
	_ = dedup // dedup result used by the collector to skip duplicates

	// ── 3. Language ──────────────────────────────────────────
	lang := DetectLanguage(cleaned)
	langCode := raw.Language
	if langCode == "" {
		langCode = lang.Language
	}

	// ── 4. Entity extraction ─────────────────────────────────
	entities := ExtractEntities(cleaned)

	// ── 5. Category classification ───────────────────────────
	category := ClassifyCategory(cleaned)

	// ── 6. Feature engineering ───────────────────────────────
	features := ExtractNewsFeatures(
		cleaned,
		raw.Title,
		raw.PublishedAt,
		raw.SourceName,
		langCode,
		entities,
		category,
	)

	// ── 7. Pre-ML heuristic score ────────────────────────────
	assessment := ComputeNewsScore(features)
	assessment.ArticleURL = raw.URL
	assessment.Title = raw.Title
	assessment.SourceName = raw.SourceName

	return features, assessment
}
