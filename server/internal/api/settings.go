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

func getSetting(key, fallback string) string {
	var val string
	err := db.DB.QueryRow("SELECT value FROM settings WHERE key = ?", key).Scan(&val)
	if err != nil {
		return fallback
	}
	return val
}

func GetSettings(c *gin.Context) {
	retDays, _ := strconv.Atoi(getSetting("retention_days", "30"))
	autoThresh, _ := strconv.Atoi(getSetting("auto_watchlist_threshold", "75"))

	c.JSON(http.StatusOK, SettingsData{
		RetentionDays:          retDays,
		OpenSkyEnabled:         getSetting("opensky_enabled", "true") == "true",
		AISStreamEnabled:       getSetting("aisstream_enabled", "true") == "true",
		AutoWatchlistThreshold: autoThresh,
		HeatmapEnabled:         getSetting("heatmap_enabled", "true") == "true",
		NewsEnabled:            getSetting("news_enabled", "true") == "true",
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

	for key, val := range updates {
		_, err := db.DB.Exec("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", key, val)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update setting: " + key})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
