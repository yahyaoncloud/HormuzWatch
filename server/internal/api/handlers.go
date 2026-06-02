package api

import (
	"log"
	"net/http"

	"Geospatial-harmuz-watch/server/internal/anomaly"
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
	IMO               string  `json:"imo" binding:"required"`
	VesselName        string  `json:"vesselName" binding:"required"`
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

	// Broadcast to WebSocket clients (non-blocking)
	select {
	case h.hub.Broadcast <- hub.Message{
		Type: "telemetry",
		Data: payload,
	}:
	default:
		log.Printf("[Handler] Hub broadcast channel full, dropping telemetry for %s", payload.IMO)
	}

	// Return 202 Accepted
	c.JSON(http.StatusAccepted, gin.H{
		"status": "accepted",
		"imo":    payload.IMO,
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

	// Calculate anomaly score
	score := anomaly.Score(
		payload.CourseDelta,
		float64(payload.AisAgeMinutes),
		payload.Speed,
		payload.PreviousSpeed,
		payload.HotZoneDistanceNm,
	)

	// Create anomaly response
	anomalyResult := anomaly.Result{
		ID:       payload.IMO,
		Score:    score,
		Severity: anomaly.SeverityLevel(score),
		Reasons:  anomaly.GetReasons(score, payload.CourseDelta, float64(payload.AisAgeMinutes), payload.Speed, payload.PreviousSpeed, payload.HotZoneDistanceNm),
		Actions:  anomaly.GetActions(anomaly.SeverityLevel(score)),
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
		Timestamp:              "2025-06-02T00:00:00Z",
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
}

// GetHeatmap returns current heatmap data
func (h *Handlers) GetHeatmap(c *gin.Context) {
	gridData := heatmap.GetGridData()
	c.JSON(http.StatusOK, gin.H{
		"type": "heatmap",
		"data": gridData,
	})
}
