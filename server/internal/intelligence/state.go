package intelligence

import (
	"math"
	"sync"
	"time"
)

const (
	// MaxHistory is the number of observations retained per track
	MaxHistory = 20
	// StaleThreshold is the duration after which a track is considered stale
	StaleThreshold = 2 * time.Hour
)

// Observation represents a single telemetry snapshot
type Observation struct {
	Lat       float64
	Lon       float64
	Speed     float64
	Heading   float64
	Timestamp time.Time
}

// TrackState holds the sliding window for a single track
type TrackState struct {
	TrackID     string
	AssetName   string
	History     []Observation // Ring buffer, most recent last
	LastUpdated time.Time
}

// TrackStateManager is a thread-safe, in-memory track state store.
type TrackStateManager struct {
	mu     sync.RWMutex
	tracks map[string]*TrackState
}

// NewTrackStateManager creates an initialized manager.
func NewTrackStateManager() *TrackStateManager {
	return &TrackStateManager{
		tracks: make(map[string]*TrackState),
	}
}

// ComputedDeltas is the output of the state manager — raw material for scoring.
type ComputedDeltas struct {
	CourseDelta   float64 // Absolute heading change since last observation (degrees)
	HeadingDelta  float64 // Signed heading change
	SpeedDelta    float64 // speed_current - speed_previous (knots)
	PreviousSpeed float64 // Speed at last observation
	AverageSpeed  float64 // Mean speed over the window
	SpeedVariance float64 // Variance of speed over the window
	AISGapMinutes float64 // Minutes since last observation
	IsFirstReport bool    // True if this is the first observation for this track
}

// Update ingests a new observation and returns the computed deltas.
// This is the PRIMARY integration point for aisstream.go and opensky.go.
func (m *TrackStateManager) Update(trackID, assetName string, lat, lon, speed, heading float64) ComputedDeltas {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	obs := Observation{
		Lat: lat, Lon: lon,
		Speed: speed, Heading: heading,
		Timestamp: now,
	}

	state, exists := m.tracks[trackID]
	if !exists {
		state = &TrackState{
			TrackID:   trackID,
			AssetName: assetName,
			History:   make([]Observation, 0, MaxHistory),
		}
		m.tracks[trackID] = state
	}

	// Compute deltas BEFORE appending the new observation
	deltas := m.computeDeltas(state, obs)

	// Append to ring buffer
	if len(state.History) >= MaxHistory {
		state.History = state.History[1:] // Drop oldest
	}
	state.History = append(state.History, obs)
	state.LastUpdated = now
	state.AssetName = assetName

	return deltas
}

func (m *TrackStateManager) computeDeltas(state *TrackState, current Observation) ComputedDeltas {
	d := ComputedDeltas{}

	if len(state.History) == 0 {
		d.IsFirstReport = true
		d.AverageSpeed = current.Speed
		return d
	}

	prev := state.History[len(state.History)-1]

	// Course delta: shortest angular distance
	rawDelta := current.Heading - prev.Heading
	if rawDelta > 180 {
		rawDelta -= 360
	} else if rawDelta < -180 {
		rawDelta += 360
	}
	d.HeadingDelta = rawDelta
	d.CourseDelta = math.Abs(rawDelta)

	// Speed delta
	d.PreviousSpeed = prev.Speed
	d.SpeedDelta = current.Speed - prev.Speed

	// AIS gap
	d.AISGapMinutes = current.Timestamp.Sub(prev.Timestamp).Minutes()

	// Compute average speed and variance over the full window (including current)
	allSpeeds := make([]float64, 0, len(state.History)+1)
	for _, obs := range state.History {
		allSpeeds = append(allSpeeds, obs.Speed)
	}
	allSpeeds = append(allSpeeds, current.Speed)

	sum := 0.0
	for _, s := range allSpeeds {
		sum += s
	}
	d.AverageSpeed = sum / float64(len(allSpeeds))

	varSum := 0.0
	for _, s := range allSpeeds {
		varSum += (s - d.AverageSpeed) * (s - d.AverageSpeed)
	}
	d.SpeedVariance = varSum / float64(len(allSpeeds))

	return d
}

// PurgeStaleTracks removes tracks not updated within StaleThreshold.
// Call this periodically from a background goroutine.
func (m *TrackStateManager) PurgeStaleTracks() int {
	m.mu.Lock()
	defer m.mu.Unlock()

	cutoff := time.Now().Add(-StaleThreshold)
	purged := 0
	for id, state := range m.tracks {
		if state.LastUpdated.Before(cutoff) {
			delete(m.tracks, id)
			purged++
		}
	}
	return purged
}

// TrackCount returns the number of active tracks.
func (m *TrackStateManager) TrackCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.tracks)
}
