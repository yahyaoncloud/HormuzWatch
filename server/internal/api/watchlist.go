package api

import (
	"log"
	"net/http"

	"Geospatial-harmuz-watch/server/internal/db"
	"github.com/gin-gonic/gin"
)

type WatchlistItem struct {
	TrackID   string  `json:"track_id"`
	AssetName string  `json:"asset_name"`
	Notes     string  `json:"notes"`
	AddedAt   string  `json:"added_at"`
	Lat       float64 `json:"lat"`
	Lon       float64 `json:"lon"`
	Speed     float64 `json:"speed"`
	Score     float64 `json:"score"`
	Severity  string  `json:"severity"`
}

func GetWatchlist(c *gin.Context) {
	query := `
		SELECT 
			w.track_id,
			COALESCE(t.asset_name, 'Unknown'),
			COALESCE(w.notes, ''),
			w.added_at,
			COALESCE(t.lat, 0),
			COALESCE(t.lon, 0),
			COALESCE(t.speed, 0),
			COALESCE(a.score, 0),
			COALESCE(a.severity, 'low')
		FROM watchlist w
		LEFT JOIN tracks t ON w.track_id = t.track_id
		LEFT JOIN anomalies a ON w.track_id = a.track_id
		ORDER BY w.added_at DESC
	`
	rows, err := db.DB.Query(query)
	if err != nil {
		log.Printf("[Watchlist] Query error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	items := make([]WatchlistItem, 0)
	for rows.Next() {
		var item WatchlistItem
		if err := rows.Scan(&item.TrackID, &item.AssetName, &item.Notes, &item.AddedAt,
			&item.Lat, &item.Lon, &item.Speed, &item.Score, &item.Severity); err == nil {
			items = append(items, item)
		}
	}

	c.JSON(http.StatusOK, items)
}

func AddToWatchlist(c *gin.Context) {
	trackID := c.Param("id")
	var req struct {
		Notes string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		req.Notes = ""
	}

	query := `
		INSERT INTO watchlist (track_id, notes, added_at)
		VALUES (?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(track_id) DO UPDATE SET notes=excluded.notes;
	`
	_, err := db.DB.Exec(query, trackID, req.Notes)
	if err != nil {
		log.Printf("[Watchlist] Insert error for %s: %v", trackID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add to watchlist"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "track_id": trackID})
}

func RemoveFromWatchlist(c *gin.Context) {
	trackID := c.Param("id")
	_, err := db.DB.Exec("DELETE FROM watchlist WHERE track_id = ?", trackID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove from watchlist"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "track_id": trackID})
}
