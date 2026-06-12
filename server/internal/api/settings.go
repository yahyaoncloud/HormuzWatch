package api

import (
	"net/http"
	"strconv"

	"Geospatial-harmuz-watch/server/internal/db"

	"github.com/gin-gonic/gin"
)

type SettingsData struct {
	RetentionDays          int    `json:"retention_days"`
	OpenSkyEnabled         bool   `json:"opensky_enabled"`
	AISStreamEnabled       bool   `json:"aisstream_enabled"`
	AutoWatchlistThreshold int    `json:"auto_watchlist_threshold"`
	HeatmapEnabled         bool   `json:"heatmap_enabled"`
	NewsEnabled            bool   `json:"news_enabled"`
}

func getSetting(userID, key, fallback string) string {
	var val string
	err := db.QueryRow("SELECT value FROM settings WHERE user_id = $1 AND key = $2", userID, key).Scan(&val)
	if err != nil {
		return fallback
	}
	return val
}

func GetSettings(c *gin.Context) {
	userID := c.GetString("user_id")
	retDays, _ := strconv.Atoi(getSetting(userID, "retention_days", "30"))
	autoThresh, _ := strconv.Atoi(getSetting(userID, "auto_watchlist_threshold", "75"))

	c.JSON(http.StatusOK, SettingsData{
		RetentionDays:          retDays,
		OpenSkyEnabled:         getSetting(userID, "opensky_enabled", "true") == "true",
		AISStreamEnabled:       getSetting(userID, "aisstream_enabled", "true") == "true",
		AutoWatchlistThreshold: autoThresh,
		HeatmapEnabled:         getSetting(userID, "heatmap_enabled", "true") == "true",
		NewsEnabled:            getSetting(userID, "news_enabled", "true") == "true",
	})
}

func UpdateSettings(c *gin.Context) {
	var req SettingsData
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid settings payload"})
		return
	}

	updates := map[string]string{
		"retention_days":          strconv.Itoa(req.RetentionDays),
		"opensky_enabled":         strconv.FormatBool(req.OpenSkyEnabled),
		"aisstream_enabled":       strconv.FormatBool(req.AISStreamEnabled),
		"auto_watchlist_threshold": strconv.Itoa(req.AutoWatchlistThreshold),
		"heatmap_enabled":         strconv.FormatBool(req.HeatmapEnabled),
		"news_enabled":            strconv.FormatBool(req.NewsEnabled),
	}

	userID := c.GetString("user_id")

	for key, val := range updates {
		_, err := db.Exec("INSERT INTO settings (user_id, key, value) VALUES ($1, $2, $3) ON CONFLICT(user_id, key) DO UPDATE SET value=excluded.value", userID, key, val)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update setting: " + key})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
