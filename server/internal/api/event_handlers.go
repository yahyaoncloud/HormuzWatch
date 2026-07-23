package api

import (
	"log/slog"
	"net/http"

	"Geospatial-harmuz-watch/server/internal/db"

	"github.com/gin-gonic/gin"
)

// ── Event handlers ──────────────────────────────────────────────────

// GetEvents returns aggregated intelligence events with optional filtering.
func GetEvents(c *gin.Context) {
	eventType := c.Query("type")
	severity := c.Query("severity")
	country := c.Query("country")
	limit := queryInt(c, "limit", 50)
	offset := queryInt(c, "offset", 0)
	if limit > 200 {
		limit = 200
	}

	rows, err := db.GetEvents(eventType, severity, country, limit, offset)
	if err != nil {
		slog.Error("failed to fetch events", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch events"})
		return
	}
	defer rows.Close()

	var events []gin.H
	for rows.Next() {
		var id, title, description, et, sev, country string
		var lat, lon float64
		var startTime, endTime, createdAt interface{}
		var sourceIDs string
		if err := rows.Scan(&id, &title, &description, &et, &sev,
			&lat, &lon, &country, &startTime, &endTime, &sourceIDs,
			&createdAt); err != nil {
			continue
		}
		events = append(events, gin.H{
			"id":          id,
			"title":       title,
			"description": description,
			"type":        et,
			"severity":    sev,
			"location":    []float64{lat, lon},
			"country":     country,
			"occurredAt":  startTime,
			"sources":     []string{sourceIDs},
		})
	}
	if events == nil {
		events = []gin.H{}
	}

	c.JSON(http.StatusOK, gin.H{"data": events, "total": len(events)})
}

// GetEventDetail returns a single event by ID.
func GetEventDetail(c *gin.Context) {
	id := c.Param("id")

	row := db.QueryRow(
		`SELECT id, title, description, event_type, severity, lat, lon,
		        country, start_time, end_time, source_article_ids, metadata, created_at
		 FROM events WHERE id = ?`, id,
	)
	scanRowAndRespond(c, row)
}

func scanRowAndRespond(c *gin.Context, row interface{ Scan(...interface{}) error }) {
	var eid, title, description, et, sev, country, sourceIDs, metadata string
	var lat, lon float64
	var startTime, endTime, createdAt interface{}

	if err := row.Scan(&eid, &title, &description, &et, &sev,
		&lat, &lon, &country, &startTime, &endTime, &sourceIDs,
		&metadata, &createdAt); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                 eid,
		"title":              title,
		"description":        description,
		"event_type":         et,
		"severity":           sev,
		"lat":                lat,
		"lon":                lon,
		"country":            country,
		"start_time":         startTime,
		"end_time":           endTime,
		"source_article_ids": sourceIDs,
		"created_at":         createdAt,
	})
}

// GetTimeline returns a chronological feed of articles and events.
func GetTimeline(c *gin.Context) {
	limit := queryInt(c, "limit", 50)
	if limit > 200 {
		limit = 200
	}

	rows, err := db.GetTimeline(limit)
	if err != nil {
		slog.Error("failed to fetch timeline", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch timeline"})
		return
	}
	defer rows.Close()

	var items []gin.H
	for rows.Next() {
		var id, title, summary, url, itemType, category, country string
		var pubDate interface{}
		var riskScore float64

		if err := rows.Scan(&id, &title, &summary, &url, &pubDate,
			&itemType, &riskScore, &category, &country); err != nil {
			continue
		}
		items = append(items, gin.H{
			"id":         id,
			"title":      title,
			"summary":    summary,
			"url":        url,
			"timestamp":  pubDate,
			"item_type":  itemType,
			"risk_score": riskScore,
			"category":   category,
			"country":    country,
		})
	}
	if items == nil {
		items = []gin.H{}
	}

	c.JSON(http.StatusOK, gin.H{"data": items, "total": len(items)})
}

// GetThreats returns the current threat board — high-severity anomalies + high-risk articles.
func GetThreats(c *gin.Context) {
	limit := queryInt(c, "limit", 20)
	if limit > 100 {
		limit = 100
	}

	// Fetch critical/high anomalies
	anomalyRows, err := db.Query(
		`SELECT t.track_id, t.asset_name, a.score, a.severity, a.reasons, a.last_updated
		 FROM anomalies a
		 JOIN tracks t ON a.track_id = t.track_id
		 WHERE a.severity IN ('critical', 'high')
		   AND t.last_updated >= NOW() - INTERVAL '24 hours'
		 ORDER BY a.score DESC LIMIT ?`, limit,
	)
	var threats []gin.H
	if err == nil && anomalyRows != nil {
		defer anomalyRows.Close()
		for anomalyRows.Next() {
			var trackID, assetName, severity, reasons, lastUpdated string
			var score float64
			if err := anomalyRows.Scan(&trackID, &assetName, &score, &severity, &reasons, &lastUpdated); err != nil {
				continue
			}
			threats = append(threats, gin.H{
				"id":          trackID,
				"title":       assetName + " — Anomaly Detected",
				"description": reasons,
				"level":       severity,
				"region":      "Gulf / Strait of Hormuz",
				"reportedAt":  lastUpdated,
			})
		}
	}

	// Fetch high-risk articles
	articleRows, err := db.GetTrendingArticles(50, limit)
	if err == nil && articleRows != nil {
		defer articleRows.Close()
		for articleRows.Next() {
			var a NewsArticle
			if err := articleRows.Scan(&a.ID, &a.SourceID, &a.Title, &a.URL, &a.Summary,
				&a.PublishedAt, &a.Language, &a.Category, &a.RiskScore, &a.Country,
				&a.Lat, &a.Lon); err != nil {
				continue
			}
			level := "medium"
			if a.RiskScore >= 75 {
				level = "critical"
			} else if a.RiskScore >= 55 {
				level = "high"
			}
			threats = append(threats, gin.H{
				"id":          a.ID,
				"title":       a.Title,
				"description": a.Summary,
				"level":       level,
				"region":      a.Country,
				"reportedAt":  a.PublishedAt,
			})
		}
	}

	if threats == nil {
		threats = []gin.H{}
	}

	c.JSON(http.StatusOK, gin.H{"data": threats, "total": len(threats)})
}
