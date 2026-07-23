package api

import (
	"net/http"
	"time"

	"Geospatial-harmuz-watch/server/internal/db"

	"github.com/gin-gonic/gin"
)

// GetNews returns the latest intelligence articles from the articles table.
func GetNews(c *gin.Context) {
	query := `
		SELECT id, title, url, published_at, source_id, summary 
		FROM articles 
		ORDER BY published_at DESC 
		LIMIT 100
	`
	rows, err := db.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch news", "details": err.Error()})
		return
	}
	defer rows.Close()

	var news []gin.H
	for rows.Next() {
		var id, title, url, source string
		var publishedAt time.Time
		var summary *string
		if err := rows.Scan(&id, &title, &url, &publishedAt, &source, &summary); err != nil {
			continue
		}
		summaryVal := ""
		if summary != nil {
			summaryVal = *summary
		}
		news = append(news, gin.H{
			"id":      id,
			"title":   title,
			"link":    url,
			"pubDate": publishedAt,
			"source":  source,
			"summary": summaryVal,
		})
	}

	if len(news) == 0 {
		news = []gin.H{}
	}

	c.JSON(http.StatusOK, gin.H{"news": news})
}
