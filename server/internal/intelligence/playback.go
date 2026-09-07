package intelligence

import (
	"log"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"Geospatial-harmuz-watch/server/internal/domain/telemetry"
	"Geospatial-harmuz-watch/server/internal/websocket/hub"
)

// DelayedObservation wraps a telemetry observation with its ML threat assessment and ingress timestamp.
type DelayedObservation struct {
	Payload    *telemetry.Observation
	Assessment *ThreatAssessment
	IngestTime time.Time
}

// PlaybackBuffer pre-gathers live stream telemetry into memory and releases events
// with a comfortable delay (default 90s, i.e. 1.5 minutes) for silky smooth map visualization.
type PlaybackBuffer struct {
	mu            sync.RWMutex
	delay         time.Duration
	queue         []*DelayedObservation
	hub           *hub.Hub
	latestVisible map[string]*ActiveTrackSnapshot
	closed        chan struct{}
}

// GlobalPlayback is the application-wide singleton instance of the time-shifted playback buffer.
var GlobalPlayback *PlaybackBuffer

// NewPlaybackBuffer initializes the time-shifted stream buffer.
func NewPlaybackBuffer(h *hub.Hub, defaultDelay time.Duration) *PlaybackBuffer {
	delay := defaultDelay
	if envSec := os.Getenv("PLAYBACK_DELAY_SECONDS"); envSec != "" {
		if sec, err := strconv.Atoi(envSec); err == nil && sec >= 0 {
			delay = time.Duration(sec) * time.Second
		}
	}
	if delay <= 0 {
		delay = 90 * time.Second // Default 1.5 minutes comfortable pre-gather delay
	}

	pb := &PlaybackBuffer{
		delay:         delay,
		queue:         make([]*DelayedObservation, 0, 4096),
		hub:           h,
		latestVisible: make(map[string]*ActiveTrackSnapshot),
		closed:        make(chan struct{}),
	}

	GlobalPlayback = pb
	go pb.playbackLoop()

	log.Printf("[PlaybackBuffer] Initialized real-time map playback buffer with %v comfortable delay", delay)
	return pb
}

// Push enqueues an evaluated observation into the delayed playback buffer.
func (pb *PlaybackBuffer) Push(payload *telemetry.Observation, assessment *ThreatAssessment) {
	if pb == nil {
		return
	}

	pb.mu.Lock()
	defer pb.mu.Unlock()

	// If delay is disabled (0s), publish immediately
	if pb.delay <= 0 {
		if pb.hub != nil {
			pb.hub.Publish(hub.Message{Type: "telemetry", Data: payload})
			if assessment != nil && assessment.FinalScore > 0 {
				pb.hub.Publish(hub.Message{Type: "anomaly", Data: assessment})
			}
		}
		pb.updateVisible(payload, assessment)
		return
	}

	pb.queue = append(pb.queue, &DelayedObservation{
		Payload:    payload,
		Assessment: assessment,
		IngestTime: time.Now(),
	})
}

// playbackLoop releases telemetry observations whose age in buffer reaches the comfortable delay threshold.
func (pb *PlaybackBuffer) playbackLoop() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-pb.closed:
			return
		case <-ticker.C:
			pb.flushReady()
		}
	}
}

// flushReady evaluates queued items and flushes mature observations to WebSocket clients.
func (pb *PlaybackBuffer) flushReady() {
	pb.mu.Lock()
	if len(pb.queue) == 0 {
		pb.mu.Unlock()
		return
	}

	now := time.Now()
	threshold := now.Add(-pb.delay)

	readyCount := 0
	for _, item := range pb.queue {
		if item.IngestTime.Before(threshold) || item.IngestTime.Equal(threshold) {
			readyCount++
		} else {
			break
		}
	}

	if readyCount == 0 {
		pb.mu.Unlock()
		return
	}

	readyItems := pb.queue[:readyCount]
	pb.queue = pb.queue[readyCount:]

	// Update visible state map
	for _, item := range readyItems {
		pb.updateVisible(item.Payload, item.Assessment)
	}
	pb.mu.Unlock()

	// Broadcast ready items outside lock
	if pb.hub != nil {
		for _, item := range readyItems {
			pb.hub.Publish(hub.Message{
				Type: "telemetry",
				Data: item.Payload,
			})
			if item.Assessment != nil && item.Assessment.FinalScore > 0 {
				pb.hub.Publish(hub.Message{
					Type: "anomaly",
					Data: item.Assessment,
				})
			}
		}
	}
}

// updateVisible updates the presented track state (called while holding pb.mu).
func (pb *PlaybackBuffer) updateVisible(payload *telemetry.Observation, assessment *ThreatAssessment) {
	if payload == nil {
		return
	}

	score := 0
	sev := "low"
	if assessment != nil {
		score = assessment.FinalScore
		sev = assessment.Severity
	}

	pb.latestVisible[payload.TrackID] = &ActiveTrackSnapshot{
		TrackID:      payload.TrackID,
		AssetName:    payload.AssetName,
		Timestamp:    payload.Timestamp,
		Lat:          payload.Lat,
		Lon:          payload.Lon,
		Speed:        payload.Speed,
		Heading:      payload.Heading,
		AnomalyScore: score,
		Severity:     sev,
		LastUpdated:  time.Now().UTC().Format(time.RFC3339),
	}
}

// GetActiveTracksSnapshot returns currently visible presentation tracks with zero DB egress.
func (pb *PlaybackBuffer) GetActiveTracksSnapshot(filter string) []ActiveTrackSnapshot {
	if pb == nil {
		return nil
	}

	pb.mu.RLock()
	defer pb.mu.RUnlock()

	res := make([]ActiveTrackSnapshot, 0, len(pb.latestVisible))
	for _, t := range pb.latestVisible {
		isAir := strings.HasPrefix(t.TrackID, "FLIGHT-") || strings.HasPrefix(t.TrackID, "ADS-") || strings.HasPrefix(t.TrackID, "ICAO-") || t.Speed > 80.0
		if filter == "aircraft" && !isAir {
			continue
		}
		if filter == "vessel" && isAir {
			continue
		}
		res = append(res, *t)
	}
	return res
}

// TrackCount returns the number of visible presentation tracks in memory.
func (pb *PlaybackBuffer) TrackCount() int {
	if pb == nil {
		return 0
	}
	pb.mu.RLock()
	defer pb.mu.RUnlock()
	return len(pb.latestVisible)
}

// Close gracefully terminates the playback buffer.
func (pb *PlaybackBuffer) Close() {
	if pb == nil {
		return
	}
	close(pb.closed)
}
