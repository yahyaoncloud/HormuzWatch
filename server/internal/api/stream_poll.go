package api

import (
	"encoding/json"
	"net/http"
	"time"

	"Geospatial-harmuz-watch/server/internal/anomaly"
	"Geospatial-harmuz-watch/server/internal/db"

	"github.com/gin-gonic/gin"
)

type streamPollResponse struct {
	Since     string              `json:"since"`
	Timestamp string              `json:"timestamp"`
	Tracks    []TelemetryPayload  `json:"tracks"`
	Anomalies []anomaly.Result    `json:"anomalies"`
}

// StreamPoll returns recent telemetry and anomalies for clients that cannot use WebSockets.
// Render free-tier web services do not reliably support long-lived WebSocket connections.
func (h *Handlers) StreamPoll(c *gin.Context) {
	sinceParam := c.DefaultQuery("since", time.Now().UTC().Add(-2*time.Hour).Format(time.RFC3339))
	since, err := time.Parse(time.RFC3339, sinceParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid since timestamp; use RFC3339"})
		return
	}

	resp := streamPollResponse{
		Since:     since.UTC().Format(time.RFC3339),
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Tracks:    []TelemetryPayload{},
		Anomalies: []anomaly.Result{},
	}

	trackRows, err := db.Query(`
		SELECT track_id, asset_name, timestamp, lat, lon, speed, previous_speed, heading, course_delta, ais_age_minutes, hot_zone_distance_nm
		FROM tracks
		WHERE last_updated >= ?
		ORDER BY last_updated ASC
	`, since.UTC())
	if err == nil {
		defer trackRows.Close()
		for trackRows.Next() {
			var payload TelemetryPayload
			if err := trackRows.Scan(
				&payload.TrackID, &payload.AssetName, &payload.Timestamp,
				&payload.Lat, &payload.Lon, &payload.Speed, &payload.PreviousSpeed,
				&payload.Heading, &payload.CourseDelta, &payload.AisAgeMinutes, &payload.HotZoneDistanceNm,
			); err == nil {
				resp.Tracks = append(resp.Tracks, payload)
			}
		}
	}

	anomalyRows, err := db.Query(`
		SELECT track_id, score, severity, reasons, actions
		FROM anomalies
		WHERE last_updated >= ?
		ORDER BY last_updated ASC
	`, since.UTC())
	if err == nil {
		defer anomalyRows.Close()
		for anomalyRows.Next() {
			var result anomaly.Result
			var reasonsJSON, actionsJSON string
			if err := anomalyRows.Scan(&result.ID, &result.Score, &result.Severity, &reasonsJSON, &actionsJSON); err == nil {
				_ = json.Unmarshal([]byte(reasonsJSON), &result.Reasons)
				_ = json.Unmarshal([]byte(actionsJSON), &result.Actions)
				resp.Anomalies = append(resp.Anomalies, result)
			}
		}
	}

	c.JSON(http.StatusOK, resp)
}
