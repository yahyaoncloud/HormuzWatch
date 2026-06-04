package api

import (
	"encoding/json"
	"math"
	"net/http"
	"os"

	"Geospatial-harmuz-watch/server/internal/anomaly"
	"Geospatial-harmuz-watch/server/internal/db"
	"github.com/gin-gonic/gin"
)

type HistoricalAttack struct {
	SiteName          string  `json:"site_name"`
	Country           string  `json:"country"`
	Latitude          float64 `json:"latitude"`
	Longitude         float64 `json:"longitude"`
	PrimaryTargetType string  `json:"primary_target_type"`
	ConflictContext   string  `json:"conflict_context"`
	ReportedDate      string  `json:"reported_date"`
}

var historicalAttacks []HistoricalAttack

// LoadHistoricalData parses the local json file
func LoadHistoricalData(filepath string) error {
	data, err := os.ReadFile(filepath)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, &historicalAttacks)
}

// GetHistoricalAttacks returns the historical attacks list
func GetHistoricalAttacks(c *gin.Context) {
	c.JSON(http.StatusOK, historicalAttacks)
}

// GetRestrictedZones returns the active geofence restricted zones
func GetRestrictedZones(c *gin.Context) {
	c.JSON(http.StatusOK, anomaly.GetRestrictedZones())
}

// IsNearHistoricalAttack checks if the given coordinate is within a 0.1 degree radius of a past attack
func IsNearHistoricalAttack(lat, lon float64) bool {
	for _, attack := range historicalAttacks {
		dist := math.Sqrt(math.Pow(lat-attack.Latitude, 2) + math.Pow(lon-attack.Longitude, 2))
		if dist <= 0.1 { // Approx 6nm
			return true
		}
	}
	return false
}

// GetTrackHistory returns the telemetry details and anomaly data for a specific track
func GetTrackHistory(c *gin.Context) {
	trackID := c.Param("id")

	// Get the track telemetry record
	type TrackRecord struct {
		TrackID           string  `json:"trackId"`
		AssetName         string  `json:"assetName"`
		Lat               float64 `json:"lat"`
		Lon               float64 `json:"lon"`
		Speed             float64 `json:"speed"`
		Heading           float64 `json:"heading"`
		CourseDelta       float64 `json:"courseDelta"`
		AisAgeMinutes     int     `json:"aisAgeMinutes"`
		HotZoneDistanceNm float64 `json:"hotZoneDistanceNm"`
		LastUpdated       string  `json:"lastUpdated"`
	}

	var track TrackRecord
	err := db.DB.QueryRow(`
		SELECT track_id, asset_name, lat, lon, speed, heading, course_delta, ais_age_minutes, hot_zone_distance_nm, last_updated 
		FROM tracks WHERE track_id = ?`, trackID).
		Scan(&track.TrackID, &track.AssetName, &track.Lat, &track.Lon, &track.Speed, &track.Heading, &track.CourseDelta, &track.AisAgeMinutes, &track.HotZoneDistanceNm, &track.LastUpdated)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Track not found"})
		return
	}

	// Get anomaly info
	type AnomalyRecord struct {
		Score    float64  `json:"score"`
		Severity string   `json:"severity"`
		Reasons  []string `json:"reasons"`
		Actions  []string `json:"actions"`
	}

	anomalyRec := AnomalyRecord{
		Score:    0,
		Severity: "low",
		Reasons:  []string{},
		Actions:  []string{},
	}

	var reasonsJSON, actionsJSON string
	err = db.DB.QueryRow(`
		SELECT score, severity, reasons, actions 
		FROM anomalies WHERE track_id = ?`, trackID).
		Scan(&anomalyRec.Score, &anomalyRec.Severity, &reasonsJSON, &actionsJSON)

	if err == nil {
		_ = json.Unmarshal([]byte(reasonsJSON), &anomalyRec.Reasons)
		_ = json.Unmarshal([]byte(actionsJSON), &anomalyRec.Actions)
	}

	c.JSON(http.StatusOK, gin.H{
		"track":   track,
		"anomaly": anomalyRec,
	})
}
