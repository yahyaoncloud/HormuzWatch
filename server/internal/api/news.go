package api

import (
	"net/http"
	"time"

	"Geospatial-harmuz-watch/server/internal/db"

	"github.com/gin-gonic/gin"
)

type NewsItem struct {
	ID      string    `json:"id"`
	Title   string    `json:"title"`
	Link    string    `json:"link"`
	PubDate time.Time `json:"pub_date"`
	Source  string    `json:"source"`
	Summary string    `json:"summary"`
}

// GetNews returns the latest intelligence briefing news from the database.
func GetNews(c *gin.Context) {
	query := `
		SELECT id, title, link, pub_date, source, summary 
		FROM news 
		ORDER BY pub_date DESC 
		LIMIT 100
	`
	rows, err := db.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch news", "details": err.Error()})
		return
	}
	defer rows.Close()

	var news []NewsItem
	for rows.Next() {
		var item NewsItem
		if err := rows.Scan(&item.ID, &item.Title, &item.Link, &item.PubDate, &item.Source, &item.Summary); err != nil {
			continue
		}
		news = append(news, item)
	}

	if len(news) == 0 {
		news = []NewsItem{}
	}

	c.JSON(http.StatusOK, gin.H{"news": news})
}
