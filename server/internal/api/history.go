package api

import (
	"net/http"

	"Geospatial-harmuz-watch/server/internal/anomaly"
	"Geospatial-harmuz-watch/server/internal/db"
	"Geospatial-harmuz-watch/server/internal/geo"
	"github.com/gin-gonic/gin"
)

// GetHistoricalAttacks returns the historical attacks list.
func GetHistoricalAttacks(c *gin.Context) {
	c.JSON(http.StatusOK, geo.GetHistoricalAttacks())
}

// GetRestrictedZones returns the active geofence restricted zones.
func GetRestrictedZones(c *gin.Context) {
	c.JSON(http.StatusOK, anomaly.GetRestrictedZones())
}

// GetTrackHistory returns the telemetry details and anomaly data for a specific track
func GetTrackHistory(c *gin.Context) {
	trackID := c.Param("id")

	// Get the track telemetry record
	type TrackRecord struct {
		TrackID           string  `json:"track_id"`
		AssetName         string  `json:"asset_name"`
		Timestamp         string  `json:"timestamp"`
		Lat               float64 `json:"lat"`
		Lon               float64 `json:"lon"`
		Speed             float64 `json:"speed"`
		PreviousSpeed     float64 `json:"previous_speed"`
		Heading           float64 `json:"heading"`
		CourseDelta       float64 `json:"course_delta"`
		AisAgeMinutes     int     `json:"ais_age_minutes"`
		HotZoneDistanceNm float64 `json:"hot_zone_distance_nm"`
	}

	query := `
		SELECT track_id, asset_name, timestamp, lat, lon, speed,
		       previous_speed, heading, course_delta, ais_age_minutes,
		       hot_zone_distance_nm
		FROM tracks
		WHERE track_id = ?
	`
	row := db.QueryRow(query, trackID)

	var track TrackRecord
	if err := row.Scan(
		&track.TrackID, &track.AssetName, &track.Timestamp,
		&track.Lat, &track.Lon, &track.Speed,
		&track.PreviousSpeed, &track.Heading, &track.CourseDelta,
		&track.AisAgeMinutes, &track.HotZoneDistanceNm,
	); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Track not found"})
		return
	}

	c.JSON(http.StatusOK, track)
}
