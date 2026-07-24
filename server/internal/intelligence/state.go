package intelligence

import (
	"math"
	"strings"
	"sync"
	"time"
)

const (
	// MaxHistory is the number of observations retained per track
	MaxHistory = 20
	// StaleThreshold is the duration after which a track is considered stale
	StaleThreshold = 2 * time.Hour
	// EWMAAlpha is the smoothing factor for Exponentially Weighted Moving Average
	// Alpha = 2 / (N + 1) where N is the effective window. Alpha=0.15 ≈ N=12
	EWMAAlpha = 0.15
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

	// EWMA baseline for anomaly detection (per-track adaptive baseline)
	EWMACourse   float64 // EWMA of course delta
	EWMAHeading  float64 // EWMA of heading delta
	EWMASpeed    float64 // EWMA of speed delta
	EWMAVariance float64 // EWMA of speed variance
	EWMACount    int     // Number of observations incorporated into EWMA
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
	// EWMA deviation: z-score of current kinematic state vs per-track EWMA baseline
	EWMADeviation float64
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
		// Initialize EWMA with first observation
		state.EWMACourse = 0
		state.EWMAHeading = 0
		state.EWMASpeed = 0
		state.EWMAVariance = 0
		state.EWMACount = 1
		d.EWMADeviation = 0
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

	// ── EWMA Update ─────────────────────────────────────────────────────
	// Update per-track EWMA baseline with current deltas
	alpha := EWMAAlpha
	if state.EWMACount == 0 {
		// First update after initialization
		state.EWMACourse = d.CourseDelta
		state.EWMAHeading = math.Abs(d.HeadingDelta)
		state.EWMASpeed = math.Abs(d.SpeedDelta)
		state.EWMAVariance = d.SpeedVariance
		state.EWMACount = 1
	} else {
		state.EWMACourse = alpha*d.CourseDelta + (1-alpha)*state.EWMACourse
		state.EWMAHeading = alpha*math.Abs(d.HeadingDelta) + (1-alpha)*state.EWMAHeading
		state.EWMASpeed = alpha*math.Abs(d.SpeedDelta) + (1-alpha)*state.EWMASpeed
		state.EWMAVariance = alpha*d.SpeedVariance + (1-alpha)*state.EWMAVariance
		state.EWMACount++
	}

	// Compute EWMA deviation as z-score of current kinematic state vs baseline
	// We combine normalized deviations across course, heading, speed, and variance
	courseDev := 0.0
	headingDev := 0.0
	speedDev := 0.0
	varianceDev := 0.0

	if state.EWMACourse > 0 {
		courseDev = (d.CourseDelta - state.EWMACourse) / state.EWMACourse
	}
	if state.EWMAHeading > 0 {
		headingDev = (math.Abs(d.HeadingDelta) - state.EWMAHeading) / state.EWMAHeading
	}
	if state.EWMASpeed > 0 {
		speedDev = (math.Abs(d.SpeedDelta) - state.EWMASpeed) / state.EWMASpeed
	}
	if state.EWMAVariance > 0 {
		varianceDev = (d.SpeedVariance - state.EWMAVariance) / state.EWMAVariance
	}

	// RMS of normalized deviations → dimensionless z-score
	d.EWMADeviation = math.Sqrt(
		(courseDev*courseDev + headingDev*headingDev + speedDev*speedDev + varianceDev*varianceDev) / 4.0,
	)

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

// RealtimeStats holds live in-memory statistics computed from the track state.
type RealtimeStats struct {
	TotalTracks      int     `json:"totalTracks"`
	MaritimeCount    int     `json:"maritimeCount"`
	AviationCount    int     `json:"aviationCount"`
	AnchoredCount    int     `json:"anchoredCount"`
	SlowCount        int     `json:"slowCount"`
	ManeuveringCount int     `json:"maneuveringCount"`
	TransitingCount  int     `json:"transitingCount"`
	AvgSpeed         float64 `json:"avgSpeed"`
	HighAnomalyCount int     `json:"highAnomalyCount"`
	TotalAnomalies   int     `json:"totalAnomalies"`
	AvgEWMA          float64 `json:"avgEWMA"`
	UpdatedAt        string  `json:"updatedAt"`
}

// GetStats returns real-time statistics computed entirely from in-memory track state.
func (m *TrackStateManager) GetStats() RealtimeStats {
	m.mu.RLock()
	defer m.mu.RUnlock()

	s := RealtimeStats{
		TotalTracks: len(m.tracks),
		UpdatedAt:   time.Now().UTC().Format(time.RFC3339),
	}

	var totalSpeed float64
	speedCount := 0
	var totalEWMA float64

	for _, t := range m.tracks {
		if strings.HasPrefix(t.TrackID, "FLIGHT-") || strings.HasPrefix(t.TrackID, "ADS-") || strings.HasPrefix(t.TrackID, "ICAO-") {
			s.AviationCount++
		} else {
			s.MaritimeCount++
		}

		if len(t.History) > 0 {
			lastSpeed := t.History[len(t.History)-1].Speed
			totalSpeed += lastSpeed
			speedCount++
			switch {
			case lastSpeed < 0.5:
				s.AnchoredCount++
			case lastSpeed < 3:
				s.SlowCount++
			case lastSpeed < 8:
				s.ManeuveringCount++
			default:
				s.TransitingCount++
			}
		}

		if t.EWMACount > 1 {
			dev := math.Abs(t.EWMAVariance)
			if t.EWMASpeed > 10 {
				dev *= 2
			}
			totalEWMA += dev
			if dev > 2.0 {
				s.HighAnomalyCount++
			}
			if dev > 1.0 {
				s.TotalAnomalies++
			}
		}
	}

	if speedCount > 0 {
		s.AvgSpeed = totalSpeed / float64(speedCount)
	}
	if len(m.tracks) > 0 {
		s.AvgEWMA = totalEWMA / float64(len(m.tracks))
	}

	return s
}
