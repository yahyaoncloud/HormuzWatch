package api

import (
	"log/slog"
	"net/http"

	"Geospatial-harmuz-watch/server/internal/db"
	"Geospatial-harmuz-watch/server/internal/intelligence/news"

	"github.com/gin-gonic/gin"
)

// CountrySummary is the API response for /countries.
type CountrySummary struct {
	Code      string  `json:"code"`
	Name      string  `json:"name"`
	Region    string  `json:"region"`
	RiskLevel float64 `json:"risk_level"`
}

// ── Country handlers ───────────────────────────────────────────────

// GetCountries returns all tracked countries.
func GetCountries(c *gin.Context) {
	rows, err := db.Query("SELECT code, name, region, risk_level FROM countries ORDER BY name")
	if err != nil {
		slog.Error("failed to fetch countries", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch countries"})
		return
	}
	defer rows.Close()

	var countries []CountrySummary
	for rows.Next() {
		var cs CountrySummary
		if err := rows.Scan(&cs.Code, &cs.Name, &cs.Region, &cs.RiskLevel); err != nil {
			continue
		}
		countries = append(countries, cs)
	}
	if countries == nil {
		countries = []CountrySummary{}
	}

	c.JSON(http.StatusOK, gin.H{"count": len(countries), "countries": countries})
}

// GetCountryDetail returns a single country's profile with recent intelligence.
func GetCountryDetail(c *gin.Context) {
	code := c.Param("code")

	row := db.QueryRow("SELECT code, name, region, risk_level FROM countries WHERE code = ?", code)
	var cs CountrySummary
	if err := row.Scan(&cs.Code, &cs.Name, &cs.Region, &cs.RiskLevel); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Country not found"})
		return
	}

	// Fetch recent articles for this country
	articleRows, err := db.GetLatestArticles(10, 0, "", "", cs.Name)
	if err != nil {
		slog.Warn("failed to fetch articles for country", "country", cs.Name, "error", err)
	}
	var articles []gin.H
	if articleRows != nil {
		defer articleRows.Close()
		for articleRows.Next() {
			var id, sourceID, title, url, summary string
			var pubDate interface{}
			var language, category, country string
			var riskScore float64
			var lat, lon *float64
			if err := articleRows.Scan(&id, &sourceID, &title, &url, &summary,
				&pubDate, &language, &category, &riskScore, &country,
				&lat, &lon); err != nil {
				continue
			}
			articles = append(articles, gin.H{
				"id": id, "title": title, "url": url,
				"category": category, "risk_score": riskScore,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"code":        cs.Code,
		"name":        cs.Name,
		"region":      cs.Region,
		"risk_level":  cs.RiskLevel,
		"recent_news": articles,
		"source_risk": news.CountryRisk(cs.Code),
	})
}

// ── Category handlers ──────────────────────────────────────────────

// GetCategories returns all intelligence categories with article counts.
func GetCategories(c *gin.Context) {
	rows, err := db.Query(`
		SELECT category, COUNT(*) AS article_count
		FROM articles
		WHERE category IS NOT NULL AND category != ''
		GROUP BY category
		ORDER BY article_count DESC
	`)
	if err != nil {
		slog.Error("failed to fetch categories", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch categories"})
		return
	}
	defer rows.Close()

	var categories []gin.H
	for rows.Next() {
		var cat string
		var count int
		if err := rows.Scan(&cat, &count); err != nil {
			continue
		}
		categories = append(categories, gin.H{"name": cat, "article_count": count})
	}
	if categories == nil {
		categories = []gin.H{}
	}

	c.JSON(http.StatusOK, gin.H{"categories": categories})
}

// ── Source handlers ────────────────────────────────────────────────

// GetSources returns all configured intelligence sources.
func GetSources(c *gin.Context) {
	rows, err := db.Query(`
		SELECT s.id, s.name, s.type, s.url, s.country, s.language,
		       s.reliability, s.enabled, s.last_fetched_at,
		       (SELECT COUNT(*) FROM articles a WHERE a.source_id = s.id) AS article_count
		FROM sources s
		ORDER BY s.name
	`)
	if err != nil {
		slog.Error("failed to fetch sources", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sources"})
		return
	}
	defer rows.Close()

	type SourceInfo struct {
		ID            string  `json:"id"`
		Name          string  `json:"name"`
		Type          string  `json:"type"`
		URL           string  `json:"url"`
		Country       *string `json:"country"`
		Language      *string `json:"language"`
		Reliability   float64 `json:"reliability"`
		Enabled       bool    `json:"enabled"`
		LastFetchedAt *string `json:"last_fetched_at"`
		ArticleCount  int     `json:"article_count"`
	}

	var sources []SourceInfo
	for rows.Next() {
		var s SourceInfo
		if err := rows.Scan(&s.ID, &s.Name, &s.Type, &s.URL,
			&s.Country, &s.Language, &s.Reliability, &s.Enabled,
			&s.LastFetchedAt, &s.ArticleCount); err != nil {
			continue
		}
		sources = append(sources, s)
	}
	if sources == nil {
		sources = []SourceInfo{}
	}

	c.JSON(http.StatusOK, gin.H{"data": sources, "total": len(sources)})
}
