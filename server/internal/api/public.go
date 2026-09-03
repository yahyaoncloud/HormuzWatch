package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"Geospatial-harmuz-watch/server/internal/db"
	"Geospatial-harmuz-watch/server/internal/intelligence"

	"github.com/gin-gonic/gin"
)

var (
	telemetryCacheMu    sync.Mutex
	cachedTopTraces     []TopTrace
	cachedTracesTime    time.Time
	cachedPublicMetrics *PublicMetrics
	cachedMetricsTime   time.Time
)

// TopTrace represents a vessel trace with its anomaly data for public display.
type TopTrace struct {
	TrackID   string  `json:"trackId"`
	AssetName string  `json:"assetName"`
	Timestamp string  `json:"timestamp"`
	Lat       float64 `json:"lat"`
	Lon       float64 `json:"lon"`
	Speed     float64 `json:"speed"`
	Heading   float64 `json:"heading"`
	Score     float64 `json:"score"`
	Severity  string  `json:"severity"`
	Reasons   string  `json:"reasons"`
	UpdatedAt string  `json:"updatedAt"`
}

// GetTopTraces returns the current top 10 traces by anomaly score (public, no auth).
func GetTopTraces(c *gin.Context) {
	cacheEnabled := getSetting("cache_telemetry_findings", "true") == "true"

	telemetryCacheMu.Lock()
	if cacheEnabled && cachedTopTraces != nil && time.Since(cachedTracesTime) < 5*time.Minute {
		traces := cachedTopTraces
		ts := cachedTracesTime.UTC().Format(time.RFC3339)
		telemetryCacheMu.Unlock()

		c.JSON(http.StatusOK, gin.H{
			"status":    "success",
			"count":     len(traces),
			"traces":    traces,
			"timestamp": ts,
			"cached":    true,
		})
		return
	}
	telemetryCacheMu.Unlock()

	traces := queryTopTraces()
	if traces == nil {
		traces = []TopTrace{}
	}

	if cacheEnabled {
		telemetryCacheMu.Lock()
		cachedTopTraces = traces
		cachedTracesTime = time.Now()
		telemetryCacheMu.Unlock()
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "success",
		"count":     len(traces),
		"traces":    traces,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"cached":    false,
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

// queryTopTraces fetches top scored anomaly tracks from in-memory state (0 DB egress), falling back to DB only if empty.
func queryTopTraces() []TopTrace {
	if GlobalTSM != nil && GlobalTSM.TrackCount() > 0 {
		snapshots := GlobalTSM.GetTopTracesSnapshot(3500)
		traces := make([]TopTrace, 0, len(snapshots))
		for _, s := range snapshots {
			traces = append(traces, TopTrace{
				TrackID:   s.TrackID,
				AssetName: s.AssetName,
				Timestamp: s.Timestamp,
				Lat:       s.Lat,
				Lon:       s.Lon,
				Speed:     s.Speed,
				Heading:   s.Heading,
				Score:     float64(s.Score),
				Severity:  s.Severity,
				Reasons:   s.Reasons,
				UpdatedAt: s.UpdatedAt,
			})
		}
		return traces
	}

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
		ORDER BY score DESC
		LIMIT 3500
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

// ── Public Metrics ────────────────────────────────────────────────────────────

// PublicMetrics holds aggregate counts for public dashboard visitors.
type PublicMetrics struct {
	TotalTracks    int     `json:"totalTracks"`
	MaritimeCount  int     `json:"maritimeCount"`
	AviationCount  int     `json:"aviationCount"`
	CriticalCount  int     `json:"criticalCount"`
	HighCount      int     `json:"highCount"`
	MediumCount    int     `json:"mediumCount"`
	LowCount       int     `json:"lowCount"`
	AvgScore       float64 `json:"avgScore"`
	ActiveRegions  int     `json:"activeRegions"`
	Timestamp      string  `json:"timestamp"`
	QueueEnqueued  int64   `json:"queueEnqueued"`
	QueueDropped   int64   `json:"queueDropped"`
	QueueProcessed int64   `json:"queueProcessed"`
	QueueDepth     int64   `json:"queueDepth"`
}

// GetPublicMetrics returns aggregate metrics for public visitors (no auth required).
func GetPublicMetrics(c *gin.Context) {
	cacheEnabled := getSetting("cache_telemetry_findings", "true") == "true"

	telemetryCacheMu.Lock()
	if cacheEnabled && cachedPublicMetrics != nil && time.Since(cachedMetricsTime) < 5*time.Minute {
		m := *cachedPublicMetrics
		ts := cachedMetricsTime.UTC().Format(time.RFC3339)
		telemetryCacheMu.Unlock()

		c.JSON(http.StatusOK, gin.H{
			"status":    "success",
			"metrics":   m,
			"timestamp": ts,
			"cached":    true,
		})
		return
	}
	telemetryCacheMu.Unlock()

	metrics := queryPublicMetrics()

	if cacheEnabled {
		telemetryCacheMu.Lock()
		cachedPublicMetrics = &metrics
		cachedMetricsTime = time.Now()
		telemetryCacheMu.Unlock()
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "success",
		"metrics":   metrics,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"cached":    false,
	})
}

func queryPublicMetrics() PublicMetrics {
	m := PublicMetrics{Timestamp: time.Now().UTC().Format(time.RFC3339)}

	if GlobalTSM != nil && GlobalTSM.TrackCount() > 0 {
		total, maritime, aviation, critical, high, medium, low, activeRegions, avgScore := GlobalTSM.GetPublicMetricsSnapshot()
		m.TotalTracks = total
		m.MaritimeCount = maritime
		m.AviationCount = aviation
		m.CriticalCount = critical
		m.HighCount = high
		m.MediumCount = medium
		m.LowCount = low
		m.AvgScore = avgScore
		m.ActiveRegions = activeRegions

		qm := intelligence.QueueMetrics()
		m.QueueEnqueued = qm["enqueued"]
		m.QueueDropped = qm["dropped"]
		m.QueueProcessed = qm["processed"]
		m.QueueDepth = qm["depth"]
		return m
	}

	// Total active tracks in last 15 minutes (fresh data only)
	db.DB.QueryRow(`SELECT COUNT(*) FROM tracks WHERE last_updated >= NOW() - INTERVAL '15 minutes'`).Scan(&m.TotalTracks)

	// Maritime count (non-flight IDs)
	db.DB.QueryRow(`SELECT COUNT(*) FROM tracks WHERE last_updated >= NOW() - INTERVAL '15 minutes' AND track_id NOT LIKE 'FLIGHT-%' AND track_id NOT LIKE 'ADS-%' AND track_id NOT LIKE 'ICAO-%'`).Scan(&m.MaritimeCount)

	// Aviation count (flight IDs)
	db.DB.QueryRow(`SELECT COUNT(*) FROM tracks WHERE last_updated >= NOW() - INTERVAL '15 minutes' AND (track_id LIKE 'FLIGHT-%' OR track_id LIKE 'ADS-%' OR track_id LIKE 'ICAO-%')`).Scan(&m.AviationCount)

	// Severity breakdown from anomalies
	db.DB.QueryRow(`SELECT COUNT(*) FROM anomalies a JOIN tracks t ON a.track_id = t.track_id WHERE t.last_updated >= NOW() - INTERVAL '15 minutes' AND a.severity = 'critical'`).Scan(&m.CriticalCount)
	db.DB.QueryRow(`SELECT COUNT(*) FROM anomalies a JOIN tracks t ON a.track_id = t.track_id WHERE t.last_updated >= NOW() - INTERVAL '15 minutes' AND a.severity = 'high'`).Scan(&m.HighCount)
	db.DB.QueryRow(`SELECT COUNT(*) FROM anomalies a JOIN tracks t ON a.track_id = t.track_id WHERE t.last_updated >= NOW() - INTERVAL '15 minutes' AND a.severity = 'medium'`).Scan(&m.MediumCount)
	db.DB.QueryRow(`SELECT COUNT(*) FROM anomalies a JOIN tracks t ON a.track_id = t.track_id WHERE t.last_updated >= NOW() - INTERVAL '15 minutes' AND a.severity = 'low'`).Scan(&m.LowCount)

	// Average anomaly score
	db.DB.QueryRow(`SELECT COALESCE(AVG(a.score), 0) FROM anomalies a JOIN tracks t ON a.track_id = t.track_id WHERE t.last_updated >= NOW() - INTERVAL '15 minutes'`).Scan(&m.AvgScore)

	// Active regions: how many of the monitored Gulf regions currently have
	// active track coverage (last 2h), derived from track longitudes instead of
	// a hardcoded constant.
	m.ActiveRegions = queryActiveRegions()

	// Pipeline queue metrics
	qm := intelligence.QueueMetrics()
	m.QueueEnqueued = qm["enqueued"]
	m.QueueDropped = qm["dropped"]
	m.QueueProcessed = qm["processed"]
	m.QueueDepth = qm["depth"]

	return m
}

// queryActiveRegions counts the distinct monitored Gulf regions that have at
// least one active track in the last 15 minutes. Regions are bucketed by
// longitude: Persian Gulf (<56°E), Strait of Hormuz (56–59°E), Gulf of Oman
// (>=59°E). This replaces the previous hardcoded value of 3.
func queryActiveRegions() int {
	rows, err := db.DB.Query(`SELECT lon FROM tracks WHERE last_updated >= NOW() - INTERVAL '15 minutes'`)
	if err != nil {
		log.Printf("[PublicMetrics] failed to query active regions: %v", err)
		return 0
	}
	defer rows.Close()

	const (
		persianGulfMaxLon = 56.0
		hormuzMaxLon      = 59.0
	)
	seen := make(map[string]bool)
	for rows.Next() {
		var lon float64
		if err := rows.Scan(&lon); err != nil {
			continue
		}
		switch {
		case lon < persianGulfMaxLon:
			seen["persian_gulf"] = true
		case lon < hormuzMaxLon:
			seen["hormuz"] = true
		default:
			seen["gulf_of_oman"] = true
		}
	}
	return len(seen)
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
