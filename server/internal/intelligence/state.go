package intelligence

import (
	"math"
	"strings"
	"sync"
	"time"

	"Geospatial-harmuz-watch/server/internal/geo"
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

	// EWMA adaptive baselines (first moments μ and second moments σ²)
	// Course delta moments
	MeanCourseDelta float64
	VarCourseDelta  float64

	// Speed delta moments
	MeanSpeedDelta float64
	VarSpeedDelta  float64

	// Speed moments
	MeanSpeed float64
	VarSpeed  float64

	// Circular directional statistics for absolute heading on S¹ torus:
	// Tracks unit vector components (cos θ, sin θ) to avoid branch cut discontinuity at 359° ↔ 0°
	CosHeadingMean float64
	SinHeadingMean float64

	// Legacy fields maintained for stats aggregation
	EWMACourse   float64 // Running mean of course delta
	EWMAHeading  float64 // Running mean of heading delta
	EWMASpeed    float64 // Running mean of speed delta
	EWMAVariance float64 // Running variance of speed
	EWMACount    int     // Number of observations incorporated into moments
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
	CourseDelta        float64 // Absolute shortest-arc heading/course change (degrees, 0-180)
	HeadingDelta       float64 // Signed shortest-arc heading change (-180 to +180)
	SpeedDelta         float64 // speed_current - speed_previous (knots)
	PreviousSpeed      float64 // Speed at last observation (knots)
	AverageSpeed       float64 // Mean speed over the sliding window
	SpeedVariance      float64 // Variance of speed over the sliding window
	AISGapMinutes      float64 // Minutes since last observation
	IsFirstReport      bool    // True if this is the first observation for this track
	CircularMeanHeading float64 // Directional circular mean heading [0, 360) on S¹
	// EWMADeviation is the true Multi-Dimensional Standardized Residual (Z-score)
	// computed against the adaptive running moments (μ_t, σ²_t) with variance stabilization.
	EWMADeviation float64
	// RelativeDeviation is the normalized fractional error (x - μ) / max(μ, ε)
	RelativeDeviation float64
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
		d.CircularMeanHeading = current.Heading

		// Initialize moments with first observation
		state.MeanCourseDelta = 0
		state.VarCourseDelta = 1.0 // Prior variance to avoid zero-variance on cold start
		state.MeanSpeedDelta = 0
		state.VarSpeedDelta = 1.0
		state.MeanSpeed = current.Speed
		state.VarSpeed = 1.0

		// Circular directional initialization on unit circle
		rad := current.Heading * geo.DegToRad
		state.CosHeadingMean = math.Cos(rad)
		state.SinHeadingMean = math.Sin(rad)

		state.EWMACourse = 0
		state.EWMAHeading = 0
		state.EWMASpeed = 0
		state.EWMAVariance = 0
		state.EWMACount = 1
		d.EWMADeviation = 0
		d.RelativeDeviation = 0
		return d
	}

	prev := state.History[len(state.History)-1]

	// ── 1. Shortest-arc Angular Delta Calculation ──────────────────────────
	// Standardized modular difference across branch cut [359° ↔ 1°]
	signedDelta := geo.ShortestArcDeg(prev.Heading, current.Heading)
	d.HeadingDelta = signedDelta
	d.CourseDelta = math.Abs(signedDelta)

	// ── 2. Speed Delta ───────────────────────────────────────────────────
	d.PreviousSpeed = prev.Speed
	d.SpeedDelta = current.Speed - prev.Speed

	// ── 3. AIS Gap ───────────────────────────────────────────────────────
	d.AISGapMinutes = current.Timestamp.Sub(prev.Timestamp).Minutes()

	// ── 4. Sliding Window Speed Mean & Variance ──────────────────────────
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

	// ── 5. Circular Directional Statistics (Absolute Heading on S¹) ───────
	alpha := EWMAAlpha
	curRad := current.Heading * geo.DegToRad
	curCos := math.Cos(curRad)
	curSin := math.Sin(curRad)

	state.CosHeadingMean = alpha*curCos + (1-alpha)*state.CosHeadingMean
	state.SinHeadingMean = alpha*curSin + (1-alpha)*state.SinHeadingMean
	meanHeadingRad := math.Atan2(state.SinHeadingMean, state.CosHeadingMean)
	d.CircularMeanHeading = math.Mod(meanHeadingRad*geo.RadToDeg+360.0, 360.0)

	// ── 6. Adaptive Moment Updates (Mean μ_t and Running Variance σ²_t) ───
	// Course delta moments
	state.MeanCourseDelta = alpha*d.CourseDelta + (1-alpha)*state.MeanCourseDelta
	courseResid := d.CourseDelta - state.MeanCourseDelta
	state.VarCourseDelta = alpha*(courseResid*courseResid) + (1-alpha)*state.VarCourseDelta

	// Speed delta moments
	absSpeedDelta := math.Abs(d.SpeedDelta)
	state.MeanSpeedDelta = alpha*absSpeedDelta + (1-alpha)*state.MeanSpeedDelta
	speedDeltaResid := absSpeedDelta - state.MeanSpeedDelta
	state.VarSpeedDelta = alpha*(speedDeltaResid*speedDeltaResid) + (1-alpha)*state.VarSpeedDelta

	// Speed moments
	state.MeanSpeed = alpha*current.Speed + (1-alpha)*state.MeanSpeed
	speedResid := current.Speed - state.MeanSpeed
	state.VarSpeed = alpha*(speedResid*speedResid) + (1-alpha)*state.VarSpeed

	// Legacy fields for backward compatibility
	state.EWMACourse = state.MeanCourseDelta
	state.EWMAHeading = alpha*math.Abs(d.HeadingDelta) + (1-alpha)*state.EWMAHeading
	state.EWMASpeed = state.MeanSpeedDelta
	state.EWMAVariance = state.VarSpeed
	state.EWMACount++

	// ── 7. True Standardized Residual Z-Score Formulation ────────────────
	// Standardize each residual by dividing by the running standard deviation sqrt(σ² + ε)
	// ε = 1e-4 protects against division by zero in steady-state straight cruising.
	const epsilonVar = 1e-4

	zCourse := (d.CourseDelta - state.MeanCourseDelta) / math.Sqrt(state.VarCourseDelta+epsilonVar)
	zSpeedDelta := (absSpeedDelta - state.MeanSpeedDelta) / math.Sqrt(state.VarSpeedDelta+epsilonVar)
	zSpeed := (current.Speed - state.MeanSpeed) / math.Sqrt(state.VarSpeed+epsilonVar)

	// Multi-dimensional RMS Composite Standardized Residual
	d.EWMADeviation = math.Sqrt((zCourse*zCourse + zSpeedDelta*zSpeedDelta + zSpeed*zSpeed) / 3.0)

	// Relative Fractional Deviation (safe division with floor baseline)
	const epsBase = 0.5
	courseRel := d.CourseDelta / math.Max(state.MeanCourseDelta, epsBase)
	speedRel := absSpeedDelta / math.Max(state.MeanSpeedDelta, epsBase)
	d.RelativeDeviation = math.Sqrt((courseRel*courseRel + speedRel*speedRel) / 2.0)

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

// GetState returns the current track state for a given trackID, or nil if absent.
func (m *TrackStateManager) GetState(trackID string) *TrackState {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.tracks[trackID]
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
