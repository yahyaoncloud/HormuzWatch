package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"Geospatial-harmuz-watch/server/internal/db"

	"github.com/gin-gonic/gin"
)

// TopTrace represents a vessel trace with its anomaly data for public display.
type TopTrace struct {
	TrackID     string  `json:"trackId"`
	AssetName   string  `json:"assetName"`
	Timestamp   string  `json:"timestamp"`
	Lat         float64 `json:"lat"`
	Lon         float64 `json:"lon"`
	Speed       float64 `json:"speed"`
	Heading     float64 `json:"heading"`
	Score       float64 `json:"score"`
	Severity    string  `json:"severity"`
	Reasons     string  `json:"reasons"`
	UpdatedAt   string  `json:"updatedAt"`
}

// GetTopTraces returns the current top 10 traces by anomaly score (public, no auth).
func GetTopTraces(c *gin.Context) {
	traces := queryTopTraces()
	if traces == nil {
		traces = []TopTrace{}
	}
	c.JSON(http.StatusOK, gin.H{
		"status":    "success",
		"count":     len(traces),
		"traces":    traces,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// PublicTopTracesStream streams the top 10 traces via Server-Sent Events (public, no auth).
func PublicTopTracesStream(c *gin.Context) {
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("X-Accel-Buffering", "no")

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "streaming not supported"})
		return
	}

	// Send initial data immediately
	traces := queryTopTraces()
	if traces == nil {
		traces = []TopTrace{}
	}
	sendSSEEvent(c, flusher, "traces", map[string]interface{}{
		"traces":    traces,
		"count":     len(traces),
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})

	// Stream updates every 5 seconds
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	// Also listen for client disconnect
	clientGone := c.Request.Context().Done()

	for {
		select {
		case <-clientGone:
			log.Printf("[PublicStream] Client disconnected from public top-traces stream")
			return
		case <-ticker.C:
			traces := queryTopTraces()
			if traces == nil {
				traces = []TopTrace{}
			}
			if !sendSSEEvent(c, flusher, "traces", map[string]interface{}{
				"traces":    traces,
				"count":     len(traces),
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			}) {
				return // client disconnected
			}
		}
	}
}

// queryTopTraces fetches the top 10 tracks joined with anomaly data, ordered by score desc.
func queryTopTraces() []TopTrace {
	query := `
		SELECT 
			t.track_id, t.asset_name, t.timestamp, t.lat, t.lon, 
			t.speed, t.heading,
			COALESCE(a.score, 0) AS score,
			COALESCE(a.severity, 'unknown') AS severity,
			COALESCE(a.reasons, '[]') AS reasons,
			t.last_updated
		FROM tracks t
		LEFT JOIN anomalies a ON t.track_id = a.track_id
		WHERE t.last_updated >= NOW() - INTERVAL '24 hours'
		ORDER BY score DESC
		LIMIT 10
	`
	rows, err := db.DB.Query(query)
	if err != nil {
		log.Printf("[PublicStream] Failed to query top traces: %v", err)
		return nil
	}
	defer rows.Close()

	var traces []TopTrace
	for rows.Next() {
		var t TopTrace
		if err := rows.Scan(&t.TrackID, &t.AssetName, &t.Timestamp, &t.Lat, &t.Lon, &t.Speed, &t.Heading, &t.Score, &t.Severity, &t.Reasons, &t.UpdatedAt); err == nil {
			traces = append(traces, t)
		}
	}
	return traces
}

// sendSSEEvent writes a single SSE event to the response. Returns false if the client disconnected.
func sendSSEEvent(c *gin.Context, flusher http.Flusher, event string, data interface{}) bool {
	jsonData, err := json.Marshal(data)
	if err != nil {
		log.Printf("[PublicStream] Failed to marshal SSE data: %v", err)
		return false
	}

	_, err = fmt.Fprintf(c.Writer, "event: %s\ndata: %s\n\n", event, string(jsonData))
	if err != nil {
		log.Printf("[PublicStream] Failed to write SSE event: %v", err)
		return false
	}
	flusher.Flush()
	return true
}