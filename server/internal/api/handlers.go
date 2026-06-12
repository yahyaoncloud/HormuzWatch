package api

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"Geospatial-harmuz-watch/server/internal/anomaly"
	"Geospatial-harmuz-watch/server/internal/db"
	"Geospatial-harmuz-watch/server/internal/heatmap"
	"Geospatial-harmuz-watch/server/internal/websocket/hub"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type Handlers struct {
	hub *hub.Hub
}

func NewHandlers(h *hub.Hub) *Handlers {
	return &Handlers{hub: h}
}

// TelemetryPayload represents incoming telemetry data
type TelemetryPayload struct {
	TrackID           string  `json:"trackId" binding:"required"`
	AssetName         string  `json:"assetName" binding:"required"`
	Timestamp         string  `json:"timestamp" binding:"required"`
	Lat               float64 `json:"lat" binding:"required"`
	Lon               float64 `json:"lon" binding:"required"`
	Speed             float64 `json:"speed"`
	PreviousSpeed     float64 `json:"previousSpeed"`
	Heading           float64 `json:"heading"`
	CourseDelta       float64 `json:"courseDelta"`
	AisAgeMinutes     int     `json:"aisAgeMinutes"`
	HotZoneDistanceNm float64 `json:"hotZoneDistanceNm"`
}

// HealthResponse represents the health check response
type HealthResponse struct {
	Status                 string `json:"status"`
	ManagedIdentityEnabled bool   `json:"managedIdentityEnabled"`
	Timestamp              string `json:"timestamp"`
}

// PostTelemetry handles incoming telemetry data
func (h *Handlers) PostTelemetry(c *gin.Context) {
	var payload TelemetryPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation failed",
			"details": err.Error(),
		})
		return
	}

	// Store telemetry for heatmap aggregation
	heatmap.AddTelemetry(payload.Lat, payload.Lon)

	// Persist to SQLite
	query := `
		INSERT INTO tracks (track_id, asset_name, timestamp, lat, lon, speed, previous_speed, heading, course_delta, ais_age_minutes, hot_zone_distance_nm, last_updated)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
		ON CONFLICT(track_id) DO UPDATE SET
			asset_name=excluded.asset_name,
			timestamp=excluded.timestamp,
			lat=excluded.lat,
			lon=excluded.lon,
			speed=excluded.speed,
			previous_speed=excluded.previous_speed,
			heading=excluded.heading,
			course_delta=excluded.course_delta,
			ais_age_minutes=excluded.ais_age_minutes,
			hot_zone_distance_nm=excluded.hot_zone_distance_nm,
			last_updated=CURRENT_TIMESTAMP;
	`
	_, err := db.Exec(query, payload.TrackID, payload.AssetName, payload.Timestamp, payload.Lat, payload.Lon, payload.Speed, payload.PreviousSpeed, payload.Heading, payload.CourseDelta, payload.AisAgeMinutes, payload.HotZoneDistanceNm)
	if err != nil {
		log.Printf("[Handler] Failed to persist track %s: %v", payload.TrackID, err)
	}

	// Broadcast to WebSocket clients (non-blocking)
	select {
	case h.hub.Broadcast <- hub.Message{
		Type: "telemetry",
		Data: payload,
	}:
	default:
		log.Printf("[Handler] Hub broadcast channel full, dropping telemetry for %s", payload.TrackID)
	}

	// Return 202 Accepted
	c.JSON(http.StatusAccepted, gin.H{
		"status":  "accepted",
		"trackId": payload.TrackID,
	})
}

// Analyze performs anomaly analysis on telemetry
func (h *Handlers) Analyze(c *gin.Context) {
	var payload TelemetryPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation failed",
			"details": err.Error(),
		})
		return
	}

	inRestrictedZone, restrictedZoneName := anomaly.CheckGeofence(payload.Lat, payload.Lon)
	nearHistoricalAttack := IsNearHistoricalAttack(payload.Lat, payload.Lon)

	// Calculate anomaly score
	score := anomaly.Score(
		payload.CourseDelta,
		float64(payload.AisAgeMinutes),
		payload.Speed,
		payload.PreviousSpeed,
		payload.HotZoneDistanceNm,
		inRestrictedZone,
		nearHistoricalAttack,
	)

	// Create anomaly response
	anomalyResult := anomaly.Result{
		ID:       payload.TrackID,
		Score:    score,
		Severity: anomaly.SeverityLevel(score),
		Reasons:  anomaly.GetReasons(score, payload.CourseDelta, float64(payload.AisAgeMinutes), payload.Speed, payload.PreviousSpeed, payload.HotZoneDistanceNm, inRestrictedZone, nearHistoricalAttack, restrictedZoneName),
		Actions:  anomaly.GetActions(anomaly.SeverityLevel(score)),
	}

	// Persist to SQLite
	reasonsJSON, _ := json.Marshal(anomalyResult.Reasons)
	actionsJSON, _ := json.Marshal(anomalyResult.Actions)
	query := `
		INSERT INTO anomalies (track_id, score, severity, reasons, actions, last_updated)
		VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
		ON CONFLICT(track_id) DO UPDATE SET
			score=excluded.score,
			severity=excluded.severity,
			reasons=excluded.reasons,
			actions=excluded.actions,
			last_updated=CURRENT_TIMESTAMP;
	`
	_, err := db.Exec(query, anomalyResult.ID, anomalyResult.Score, anomalyResult.Severity, string(reasonsJSON), string(actionsJSON))
	if err != nil {
		log.Printf("[Handler] Failed to persist anomaly %s: %v", anomalyResult.ID, err)
	}

	// Broadcast anomaly to WebSocket clients (non-blocking)
	select {
	case h.hub.Broadcast <- hub.Message{
		Type: "anomaly",
		Data: anomalyResult,
	}:
	default:
		log.Printf("[Handler] Hub broadcast channel full, dropping anomaly for %s", anomalyResult.ID)
	}

	c.JSON(http.StatusOK, anomalyResult)
}

// Health returns the health status of the server
func (h *Handlers) Health(c *gin.Context) {
	c.JSON(http.StatusOK, HealthResponse{
		Status:                 "healthy",
		ManagedIdentityEnabled: false, // TODO: Check actual managed identity availability
		Timestamp:              time.Now().UTC().Format(time.RFC3339),
	})
}

// IdentityTokenCheck verifies managed identity token acquisition
func (h *Handlers) IdentityTokenCheck(c *gin.Context) {
	// TODO: Implement actual Azure managed identity check
	c.JSON(http.StatusOK, gin.H{
		"status":  "not_configured",
		"message": "Managed identity not yet configured in Phase 2",
	})
}

// WebSocketStream upgrades HTTP connection to WebSocket
func (h *Handlers) WebSocketStream(c *gin.Context) {
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins for development
		},
	}

	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "websocket upgrade failed"})
		return
	}

	client := &hub.Client{
		Hub:  h.hub,
		Conn: ws,
		Send: make(chan hub.Message, 256),
	}
	h.hub.Register <- client

	// Start client read/write loops
	go client.ReadPump()
	go client.WritePump()

	// Hydrate the dashboard from SQLite (async to prevent blocking the HTTP handler)
	go func() {
		// Fetch tracks updated in the last 2 hours
		query := `
			SELECT track_id, asset_name, timestamp, lat, lon, speed, previous_speed, heading, course_delta, ais_age_minutes, hot_zone_distance_nm 
			FROM tracks 
			WHERE last_updated >= NOW() - INTERVAL '2 hours'
		`
		rows, err := db.Query(query)
		if err == nil {
			for rows.Next() {
				var p TelemetryPayload
				if err := rows.Scan(&p.TrackID, &p.AssetName, &p.Timestamp, &p.Lat, &p.Lon, &p.Speed, &p.PreviousSpeed, &p.Heading, &p.CourseDelta, &p.AisAgeMinutes, &p.HotZoneDistanceNm); err == nil {
					// Add small delay to prevent overflowing the websocket writer too aggressively
					time.Sleep(2 * time.Millisecond)
					client.Send <- hub.Message{Type: "telemetry", Data: p}
				}
			}
			rows.Close()
		} else {
			log.Printf("[Hydration] Failed to fetch tracks: %v", err)
		}

		// Fetch anomalies updated in the last 2 hours
		query = `
			SELECT track_id, score, severity, reasons, actions 
			FROM anomalies 
			WHERE last_updated >= NOW() - INTERVAL '2 hours'
		`
		rows, err = db.Query(query)
		if err == nil {
			for rows.Next() {
				var res anomaly.Result
				var reasonsJSON, actionsJSON string
				if err := rows.Scan(&res.ID, &res.Score, &res.Severity, &reasonsJSON, &actionsJSON); err == nil {
					json.Unmarshal([]byte(reasonsJSON), &res.Reasons)
					json.Unmarshal([]byte(actionsJSON), &res.Actions)
					time.Sleep(2 * time.Millisecond)
					client.Send <- hub.Message{Type: "anomaly", Data: res}
				}
			}
			rows.Close()
		} else {
			log.Printf("[Hydration] Failed to fetch anomalies: %v", err)
		}
	}()
}

// GetHeatmap returns current heatmap data
func (h *Handlers) GetHeatmap(c *gin.Context) {
	gridData := heatmap.GetGridData()
	c.JSON(http.StatusOK, gin.H{
		"type": "heatmap",
		"data": gridData,
	})
}
