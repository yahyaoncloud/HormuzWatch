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
	"Geospatial-harmuz-watch/server/internal/intelligence"
	"Geospatial-harmuz-watch/server/internal/version"
	"Geospatial-harmuz-watch/server/internal/websocket/hub"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

func safeSend(ctx context.Context, ch chan hub.Message, msg hub.Message) (sent bool) {
	defer func() {
		if r := recover(); r != nil {
			sent = false
		}
	}()
	select {
	case <-ctx.Done():
		return false
	case ch <- msg:
		return true
	case <-time.After(1 * time.Second):
		return false
	}
}

var GlobalTSM *intelligence.TrackStateManager

type Handlers struct {
	hub      *hub.Hub
	tsm      *intelligence.TrackStateManager
	mlClient *intelligence.MLClient
}

func NewHandlers(h *hub.Hub, tsm *intelligence.TrackStateManager, ml *intelligence.MLClient) *Handlers {
	GlobalTSM = tsm
	return &Handlers{hub: h, tsm: tsm, mlClient: ml}
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

// LiveHealth handles liveness probes (HTTP 200 if container process is running).
func (h *Handlers) LiveHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "alive",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// ReadyHealth handles readiness probes (checks DB connection, WebSocket Hub, and ML service health).
func (h *Handlers) ReadyHealth(c *gin.Context) {
	dbHealthy := true
	dbLatency := ""
	dbStart := time.Now()
	if err := db.Ping(); err != nil {
		dbHealthy = false
		dbLatency = err.Error()
	}
	dbPingMs := time.Since(dbStart).Milliseconds()

	mlHealthy := true
	mlCircuit := "CLOSED"
	if h.mlClient != nil {
		mlHealthy = h.mlClient.IsHealthy()
		mlCircuit = h.mlClient.CircuitState()
	}

	overallHealthy := dbHealthy && h.hub != nil
	statusCode := http.StatusOK
	status := "healthy"
	if !overallHealthy {
		statusCode = http.StatusServiceUnavailable
		status = "unhealthy"
	}

	c.JSON(statusCode, gin.H{
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
			"ml_service": gin.H{
				"healthy": mlHealthy,
				"circuit": mlCircuit,
			},
		},
		"version":    "2.0.0",
		"build_time": version.BuildTime,
		"git_commit": version.GitCommit,
	})
}

// Health returns the comprehensive readiness status of the server for backward compatibility.
func (h *Handlers) Health(c *gin.Context) {
	h.ReadyHealth(c)
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

	// Create an independent context that will be cancelled only when the client disconnects
	ctx, cancel := context.WithCancel(context.Background())

	client := &hub.Client{
		Hub:  h.hub,
		Conn: ws,
		Send: make(chan hub.Message, 1024),
	}
	h.hub.Register <- client

	// Start client read/write loops. ReadPump exits when client disconnects, triggering cancel().
	go func() {
		defer cancel()
		client.ReadPump()
	}()
	go client.WritePump()

	// Hydrate the dashboard from Database in batched chunks (async to prevent blocking the HTTP handler)
	go func() {
		var telemetryBatch []TelemetryPayload
		flushTelemetry := func() bool {
			if len(telemetryBatch) == 0 {
				return true
			}
			msg := hub.Message{Type: "telemetry", Data: telemetryBatch}
			telemetryBatch = nil
			return safeSend(ctx, client.Send, msg)
		}

		// Fetch tracks updated in the last 24 hours (with fallback to latest recorded tracks)
		query := `
			SELECT track_id, asset_name, timestamp, lat, lon, speed, previous_speed, heading, course_delta, ais_age_minutes, hot_zone_distance_nm, COALESCE(object_type, 'vessel'), COALESCE(source, 'ais') 
			FROM tracks 
			WHERE last_updated >= NOW() - INTERVAL '24 hours'
			ORDER BY last_updated DESC
			LIMIT 2500
		`
		rows, err := db.Query(query)
		if err != nil {
			log.Printf("[WebSocketStream] Error querying tracks: %v", err)
		}
		trackCount := 0
		if err == nil && rows != nil {
			for rows.Next() {
				select {
				case <-ctx.Done():
					rows.Close()
					return
				default:
				}
				var p TelemetryPayload
				if err := rows.Scan(&p.TrackID, &p.AssetName, &p.Timestamp, &p.Lat, &p.Lon, &p.Speed, &p.PreviousSpeed, &p.Heading, &p.CourseDelta, &p.AisAgeMinutes, &p.HotZoneDistanceNm, &p.ObjectType, &p.Source); err == nil {
					trackCount++
					telemetryBatch = append(telemetryBatch, p)
					if len(telemetryBatch) >= 50 {
						if !flushTelemetry() {
							rows.Close()
							return
						}
					}
				} else {
					log.Printf("[WebSocketStream] Scan error on track: %v", err)
				}
			}
			rows.Close()
			if !flushTelemetry() {
				return
			}
		}
		log.Printf("[WebSocketStream] Hydrated %d tracks to client", trackCount)

		// Fallback if 24h window had 0 tracks
		if trackCount == 0 {
			fallbackQuery := `
				SELECT track_id, asset_name, timestamp, lat, lon, speed, previous_speed, heading, course_delta, ais_age_minutes, hot_zone_distance_nm, COALESCE(object_type, 'vessel'), COALESCE(source, 'ais') 
				FROM tracks 
				ORDER BY last_updated DESC
				LIMIT 2500
			`
			fbRows, fbErr := db.Query(fallbackQuery)
			if fbErr == nil && fbRows != nil {
				for fbRows.Next() {
					select {
					case <-ctx.Done():
						fbRows.Close()
						return
					default:
					}
					var p TelemetryPayload
					if err := fbRows.Scan(&p.TrackID, &p.AssetName, &p.Timestamp, &p.Lat, &p.Lon, &p.Speed, &p.PreviousSpeed, &p.Heading, &p.CourseDelta, &p.AisAgeMinutes, &p.HotZoneDistanceNm, &p.ObjectType, &p.Source); err == nil {
						telemetryBatch = append(telemetryBatch, p)
						if len(telemetryBatch) >= 50 {
							if !flushTelemetry() {
								fbRows.Close()
								return
							}
						}
					}
				}
				fbRows.Close()
				if !flushTelemetry() {
					return
				}
			}
		}

		var anomalyBatch []anomaly.Result
		flushAnomaly := func() bool {
			if len(anomalyBatch) == 0 {
				return true
			}
			msg := hub.Message{Type: "anomaly", Data: anomalyBatch}
			anomalyBatch = nil
			return safeSend(ctx, client.Send, msg)
		}

		// Fetch anomalies updated in the last 24 hours (with fallback to latest)
		anomalyQuery := `
			SELECT track_id, score, severity, reasons, actions 
			FROM anomalies 
			WHERE last_updated >= NOW() - INTERVAL '24 hours'
			ORDER BY last_updated DESC
			LIMIT 1000
		`
		aRows, aErr := db.Query(anomalyQuery)
		anomalyCount := 0
		if aErr == nil && aRows != nil {
			for aRows.Next() {
				select {
				case <-ctx.Done():
					aRows.Close()
					return
				default:
				}
				var res anomaly.Result
				var reasonsJSON, actionsJSON string
				if err := aRows.Scan(&res.ID, &res.Score, &res.Severity, &reasonsJSON, &actionsJSON); err == nil {
					anomalyCount++
					json.Unmarshal([]byte(reasonsJSON), &res.Reasons)
					json.Unmarshal([]byte(actionsJSON), &res.Actions)
					anomalyBatch = append(anomalyBatch, res)
					if len(anomalyBatch) >= 50 {
						if !flushAnomaly() {
							aRows.Close()
							return
						}
					}
				}
			}
			aRows.Close()
			if !flushAnomaly() {
				return
			}
		}

		if anomalyCount == 0 {
			fbAnomalyQuery := `
				SELECT track_id, score, severity, reasons, actions 
				FROM anomalies 
				ORDER BY last_updated DESC
				LIMIT 1000
			`
			fbARows, fbAErr := db.Query(fbAnomalyQuery)
			if fbAErr == nil && fbARows != nil {
				for fbARows.Next() {
					select {
					case <-ctx.Done():
						fbARows.Close()
						return
					default:
					}
					var res anomaly.Result
					var reasonsJSON, actionsJSON string
					if err := fbARows.Scan(&res.ID, &res.Score, &res.Severity, &reasonsJSON, &actionsJSON); err == nil {
						json.Unmarshal([]byte(reasonsJSON), &res.Reasons)
						json.Unmarshal([]byte(actionsJSON), &res.Actions)
						anomalyBatch = append(anomalyBatch, res)
						if len(anomalyBatch) >= 50 {
							if !flushAnomaly() {
								fbARows.Close()
								return
							}
						}
					}
				}
				fbARows.Close()
				flushAnomaly()
			}
		}
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

// GetRealtimeStats returns live in-memory pipeline statistics — no DB queries.
func (h *Handlers) GetRealtimeStats(c *gin.Context) {
	stats := h.tsm.GetStats()

	// Enrich with queue metrics (atomic counters, no DB)
	qm := intelligence.QueueMetrics()

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"stats":  stats,
		"queue": gin.H{
			"enqueued":  qm["enqueued"],
			"dropped":   qm["dropped"],
			"processed": qm["processed"],
			"depth":     qm["depth"],
		},
	})
}
