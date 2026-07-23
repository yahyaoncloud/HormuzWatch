package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"Geospatial-harmuz-watch/server/internal/anomaly"
	"Geospatial-harmuz-watch/server/internal/db"
	"Geospatial-harmuz-watch/server/internal/domain/telemetry"
	"Geospatial-harmuz-watch/server/internal/geo"
	"Geospatial-harmuz-watch/server/internal/heatmap"
	"Geospatial-harmuz-watch/server/internal/version"
	"Geospatial-harmuz-watch/server/internal/websocket/hub"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

func safeSendNonBlocking(ch chan hub.Message, msg hub.Message) (sent bool) {
	defer func() {
		if r := recover(); r != nil {
			sent = false
		}
	}()
	select {
	case ch <- msg:
		return true
	default:
		return false
	}
}

type Handlers struct {
	hub *hub.Hub
}

func NewHandlers(h *hub.Hub) *Handlers {
	return &Handlers{hub: h}
}

// TelemetryPayload is retained as the HTTP name for the shared telemetry
// domain contract. Integration workers use the same type and storage path.
type TelemetryPayload = telemetry.Observation

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
	payload.Normalize(telemetry.SourceWebApp)

	// Store telemetry for heatmap aggregation
	heatmap.AddTelemetry(payload.Lat, payload.Lon)

	if err := db.PersistTelemetry(c.Request.Context(), payload); err != nil {
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
	nearHistoricalAttack := geo.IsNearHistoricalAttack(payload.Lat, payload.Lon)

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
		VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
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

// Health returns the health status of the server with component checks.
func (h *Handlers) Health(c *gin.Context) {
	dbHealthy := true
	dbLatency := ""
	dbStart := time.Now()
	if err := db.Ping(); err != nil {
		dbHealthy = false
		dbLatency = err.Error()
	}
	dbPingMs := time.Since(dbStart).Milliseconds()

	status := "healthy"
	if !dbHealthy {
		status = "degraded"
	}

	c.JSON(http.StatusOK, gin.H{
		"status":                   status,
		"timestamp":                time.Now().UTC().Format(time.RFC3339),
		"managed_identity_enabled": false,
		"components": gin.H{
			"database": gin.H{
				"healthy": dbHealthy,
				"latency": dbLatency,
				"ping_ms": dbPingMs,
			},
			"websocket": gin.H{
				"healthy": h.hub != nil,
			},
		},
		"version":    "2.0.0",
		"build_time": version.BuildTime,
		"git_commit": version.GitCommit,
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

	// Create a context that will be cancelled when the client disconnects
	ctx, cancel := context.WithCancel(c.Request.Context())

	client := &hub.Client{
		Hub:  h.hub,
		Conn: ws,
		Send: make(chan hub.Message, 256),
	}
	h.hub.Register <- client

	// Start client read/write loops
	go client.ReadPump()
	go client.WritePump()

	// Register a cleanup callback to cancel context when client unregisters
	// We do this by wrapping the original Unregister to also cancel our context
	go func() {
		// Wait for the client to be unregistered by watching the hub's unregister channel
		// Actually, the simplest approach: when ReadPump finishes, it sends to Unregister
		// We can't easily hook into that without modifying hub, so we'll use a different approach
	}()

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
				select {
				case <-ctx.Done():
					rows.Close()
					return
				default:
				}
				var p TelemetryPayload
				if err := rows.Scan(&p.TrackID, &p.AssetName, &p.Timestamp, &p.Lat, &p.Lon, &p.Speed, &p.PreviousSpeed, &p.Heading, &p.CourseDelta, &p.AisAgeMinutes, &p.HotZoneDistanceNm); err == nil {
					select {
					case <-ctx.Done():
						rows.Close()
						return
					default:
						if !safeSendNonBlocking(client.Send, hub.Message{Type: "telemetry", Data: p}) {
							rows.Close()
							return
						}
					}
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
				select {
				case <-ctx.Done():
					rows.Close()
					return
				default:
				}
				var res anomaly.Result
				var reasonsJSON, actionsJSON string
				if err := rows.Scan(&res.ID, &res.Score, &res.Severity, &reasonsJSON, &actionsJSON); err == nil {
					json.Unmarshal([]byte(reasonsJSON), &res.Reasons)
					json.Unmarshal([]byte(actionsJSON), &res.Actions)
					select {
					case <-ctx.Done():
						rows.Close()
						return
					default:
						if !safeSendNonBlocking(client.Send, hub.Message{Type: "anomaly", Data: res}) {
							rows.Close()
							return
						}
					}
				}
			}
			rows.Close()
		} else {
			log.Printf("[Hydration] Failed to fetch anomalies: %v", err)
		}
	}()

	// Monitor for client disconnect and cancel context
	go func() {
		<-c.Request.Context().Done()
		cancel()
	}()
}

// GetHeatmap returns current heatmap data, optionally filtered by source type.
func (h *Handlers) GetHeatmap(c *gin.Context) {
	source := c.DefaultQuery("source", "vessel") // vessel, fire, geo, or all
	gridData := heatmap.GetGridDataBySource(source)
	c.JSON(http.StatusOK, gin.H{
		"type":   "heatmap",
		"source": source,
		"data":   gridData,
	})
}
