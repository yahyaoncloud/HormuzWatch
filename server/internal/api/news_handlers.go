package api

import (
	"database/sql"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"Geospatial-harmuz-watch/server/internal/db"
	"Geospatial-harmuz-watch/server/internal/intelligence/news"

	"github.com/gin-gonic/gin"
)

// NewsArticle represents an intelligence news article from the enriched pipeline.
type NewsArticle struct {
	ID          string    `json:"id"`
	SourceID    string    `json:"source"`
	Title       string    `json:"title"`
	URL         string    `json:"url"`
	Summary     string    `json:"description"`
	PublishedAt time.Time `json:"publishedAt"`
	Language    string    `json:"language"`
	Category    string    `json:"category"`
	RiskScore   float64   `json:"risk_score"`
	Country     string    `json:"country"`
	Lat         *float64  `json:"lat"`
	Lon         *float64  `json:"lon"`
}

// ── News handlers ──────────────────────────────────────────────────

// GetLatestNews returns paginated articles with optional filters.
func GetLatestNews(c *gin.Context) {
	limit := queryInt(c, "limit", 50)
	offset := queryInt(c, "offset", 0)
	category := c.Query("category")
	language := c.Query("language")
	country := c.Query("country")

	if limit > 200 {
		limit = 200
	}

	rows, err := db.GetLatestArticles(limit, offset, category, language, country)
	if err != nil {
		slog.Error("failed to fetch news", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch news"})
		return
	}
	defer rows.Close()

	articles := scanNewsArticles(rows)
	c.JSON(http.StatusOK, gin.H{
		"data":  articles,
		"total": len(articles),
	})
}

// SearchNews performs full-text search on articles.
func SearchNews(c *gin.Context) {
	keyword := c.Query("q")
	if keyword == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing 'q' query parameter"})
		return
	}
	limit := queryInt(c, "limit", 50)
	if limit > 200 {
		limit = 200
	}

	rows, err := db.SearchArticles(keyword, limit)
	if err != nil {
		slog.Error("failed to search news", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
		return
	}
	defer rows.Close()

	articles := scanNewsArticles(rows)
	c.JSON(http.StatusOK, gin.H{
		"data":  articles,
		"total": len(articles),
		"query": keyword,
	})
}

// GetTrendingNews returns high-risk articles from the last 6 hours.
func GetTrendingNews(c *gin.Context) {
	minScore := queryFloat(c, "min_score", 40)
	limit := queryInt(c, "limit", 20)

	rows, err := db.GetTrendingArticles(minScore, limit)
	if err != nil {
		slog.Error("failed to fetch trending", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch trending news"})
		return
	}
	defer rows.Close()

	articles := scanNewsArticles(rows)
	c.JSON(http.StatusOK, gin.H{
		"data":  articles,
		"total": len(articles),
	})
}

// GetNewsByID returns a single article by its ID.
func GetNewsByID(c *gin.Context) {
	id := c.Param("id")
	row, _ := db.GetArticleByID(id)

	var a struct {
		ID                string
		SourceID          sql.NullString
		Title             string
		URL               string
		Content           sql.NullString
		Summary           sql.NullString
		PublishedAt       sql.NullTime
		FetchedAt         sql.NullTime
		Language          sql.NullString
		Category          sql.NullString
		RiskScore         sql.NullFloat64
		MLScore           sql.NullFloat64
		SourceReliability sql.NullFloat64
		Country           sql.NullString
		Lat               sql.NullFloat64
		Lon               sql.NullFloat64
		Metadata          sql.NullString
	}
	if err := row.Scan(&a.ID, &a.SourceID, &a.Title, &a.URL, &a.Content, &a.Summary,
		&a.PublishedAt, &a.FetchedAt, &a.Language, &a.Category,
		&a.RiskScore, &a.MLScore, &a.SourceReliability, &a.Country,
		&a.Lat, &a.Lon, &a.Metadata); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Article not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                 a.ID,
		"source_id":          a.SourceID,
		"title":              a.Title,
		"url":                a.URL,
		"content":            a.Content.String,
		"summary":            a.Summary.String,
		"published_at":       a.PublishedAt,
		"fetched_at":         a.FetchedAt,
		"language":           a.Language,
		"category":           a.Category,
		"risk_score":         a.RiskScore,
		"ml_score":           a.MLScore,
		"source_reliability": a.SourceReliability,
		"country":            a.Country,
		"lat":                nullFloat64Value(a.Lat),
		"lon":                nullFloat64Value(a.Lon),
	})
}

// ── Helpers ─────────────────────────────────────────────────────────

func queryInt(c *gin.Context, key string, def int) int {
	v := c.Query(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil || n < 0 {
		return def
	}
	return n
}

func queryFloat(c *gin.Context, key string, def float64) float64 {
	v := c.Query(key)
	if v == "" {
		return def
	}
	f, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return def
	}
	return f
}

func nullFloat64Value(n sql.NullFloat64) interface{} {
	if n.Valid {
		return n.Float64
	}
	return nil
}

func scanNewsArticles(rows *sql.Rows) []NewsArticle {
	var articles []NewsArticle
	for rows.Next() {
		var a NewsArticle
		if err := rows.Scan(&a.ID, &a.SourceID, &a.Title, &a.URL, &a.Summary,
			&a.PublishedAt, &a.Language, &a.Category, &a.RiskScore, &a.Country,
			&a.Lat, &a.Lon); err != nil {
			continue
		}
		articles = append(articles, a)
	}
	if articles == nil {
		articles = []NewsArticle{}
	}
	return articles
}

// ── Map / Heatmap handlers ──────────────────────────────────────────

// GetPipelineStatus returns the current health of the news intelligence pipeline.
// GET /news/pipeline/status
func GetPipelineStatus(c *gin.Context) {
	metrics := news.Track().Metrics()
	c.JSON(http.StatusOK, metrics)
}

// GetNewsHeatmap returns geo-tagged articles suitable for map display.
// Supports bounding-box filtering and risk score threshold.
// GET /news/heatmap?north=30&south=22&east=60&west=48&min_score=40&limit=200
func GetNewsHeatmap(c *gin.Context) {
	north := queryFloat(c, "north", 35.0)
	south := queryFloat(c, "south", 10.0)
	east := queryFloat(c, "east", 65.0)
	west := queryFloat(c, "west", 35.0)
	minScore := queryFloat(c, "min_score", 0)
	limit := queryInt(c, "limit", 200)
	if limit > 500 {
		limit = 500
	}

	rows, err := db.GetGeoArticles(north, south, east, west, minScore, limit)
	if err != nil {
		slog.Error("failed to fetch geo articles", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch map data"})
		return
	}
	defer rows.Close()

	features := scanNewsArticles(rows)

	// Compute bounds from actual data if available
	bounds := gin.H{
		"north": north, "south": south,
		"east": east, "west": west,
	}

	c.JSON(http.StatusOK, gin.H{
		"type":     "FeatureCollection",
		"features": features,
		"count":    len(features),
		"bounds":   bounds,
	})
}

// GetNewsMapMetrics returns aggregated map-ready metrics from the news pipeline.
// GET /news/map/metrics?hours=24&min_score=30
func GetNewsMapMetrics(c *gin.Context) {
	hours := queryInt(c, "hours", 24)
	minScore := queryFloat(c, "min_score", 30)

	rows, err := db.GetArticlesWithCoords(hours, minScore)
	if err != nil {
		slog.Error("failed to fetch articles with coords", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch metrics"})
		return
	}
	defer rows.Close()

	features := scanNewsArticles(rows)

	// Compute risk by country/region
	riskByCountry := make(map[string]struct {
		Total float64
		Count int
	})

	var totalRisk float64
	for _, f := range features {
		if f.Country != "" {
			r := riskByCountry[f.Country]
			r.Total += f.RiskScore
			r.Count++
			riskByCountry[f.Country] = r
		}
		totalRisk += f.RiskScore
	}

	// Build risk-by-region map
	riskByRegion := make(map[string]float64)
	for country, r := range riskByCountry {
		if r.Count > 0 {
			riskByRegion[country] = r.Total / float64(r.Count)
		}
	}

	// Compute bounding box from actual data
	var minLat, maxLat, minLon, maxLon float64
	for i, f := range features {
		if f.Lat != nil && f.Lon != nil {
			if i == 0 {
				minLat, maxLat = *f.Lat, *f.Lat
				minLon, maxLon = *f.Lon, *f.Lon
			} else {
				if *f.Lat < minLat {
					minLat = *f.Lat
				}
				if *f.Lat > maxLat {
					maxLat = *f.Lat
				}
				if *f.Lon < minLon {
					minLon = *f.Lon
				}
				if *f.Lon > maxLon {
					maxLon = *f.Lon
				}
			}
		}
	}

	avgRisk := 0.0
	if len(features) > 0 {
		avgRisk = totalRisk / float64(len(features))
	}

	c.JSON(http.StatusOK, gin.H{
		"features":        features,
		"count":           len(features),
		"avg_risk":        avgRisk,
		"risk_by_country": riskByRegion,
		"bounds": gin.H{
			"north": maxLat,
			"south": minLat,
			"east":  maxLon,
			"west":  minLon,
		},
		"hours": hours,
	})
}
