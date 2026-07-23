package news

import "time"

// NewsFeatureVector is the structured feature set sent to the Python ML
// service for news intelligence scoring. All features are computed in Go.
type NewsFeatureVector struct {
	// Structural features
	KeywordCount    int     `json:"keyword_count"`
	EntityCount     int     `json:"entity_count"`
	ArticleLength   int     `json:"article_length"`
	PublicationAge  float64 `json:"publication_age_hours"`

	// Content features
	MilitaryTermCount int `json:"military_term_count"`
	EnergyTermCount   int `json:"energy_term_count"`
	ShippingTermCount int `json:"shipping_term_count"`
	CyberTermCount    int `json:"cyber_term_count"`

	// Context features
	CountryRiskScore  float64 `json:"country_risk_score"`
	SourceReliability float64 `json:"source_reliability"`
	Category          string  `json:"category"`
	Language          string  `json:"language"`
	SentimentScore    float64 `json:"sentiment_score"`

	// Enrichment features
	OrganizationCount int `json:"organization_count"`
	CompanyCount      int `json:"company_count"`
	PortMentions      int `json:"port_mentions"`
	AirportMentions   int `json:"airport_mentions"`
	ShipMentions      int `json:"ship_mentions"`
	AircraftMentions  int `json:"aircraft_mentions"`

	// Publisher weight
	PublisherWeight float64 `json:"publisher_weight"`
}

// ExtractNewsFeatures computes the full NewsFeatureVector from cleaned article
// text, metadata, and entity extraction results.
func ExtractNewsFeatures(
	cleanedText string,
	title string,
	publishedAt time.Time,
	sourceName string,
	language string,
	entities EntityResult,
	category Category,
) NewsFeatureVector {
	keywords := ExtractKeywords(cleanedText, 15)
	ageHours := time.Since(publishedAt).Hours()
	if ageHours < 0 {
		ageHours = 0
	}

	return NewsFeatureVector{
		KeywordCount:       len(keywords),
		EntityCount:        CountEntities(entities),
		ArticleLength:      len(cleanedText),
		PublicationAge:     ageHours,
		MilitaryTermCount:  CountTermCategory(cleanedText, MilitaryTerms),
		EnergyTermCount:    CountTermCategory(cleanedText, EnergyTerms),
		ShippingTermCount:  CountTermCategory(cleanedText, ShippingTerms),
		CyberTermCount:     CountTermCategory(cleanedText, CyberTerms),
		CountryRiskScore:   CountryRisk(language), // approximate by language
		SourceReliability:  GetReliability(sourceName),
		Category:           string(category),
		Language:           language,
		SentimentScore:     0.5, // placeholder — use NLPSentiment when available
		OrganizationCount:  len(entities.Organizations),
		CompanyCount:       len(entities.Companies),
		PortMentions:       len(entities.Ports),
		AirportMentions:    len(entities.Airports),
		ShipMentions:       len(entities.Ships),
		AircraftMentions:   len(entities.Aircraft),
		PublisherWeight:    GetReliability(sourceName),
	}
}
