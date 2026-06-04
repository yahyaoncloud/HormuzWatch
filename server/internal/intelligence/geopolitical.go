package intelligence

import (
	"math"
	"sync"
	"time"
)

// GeoEvent represents a geopolitical or fire event with location and recency.
type GeoEvent struct {
	Lat       float64
	Lon       float64
	Weight    float64 // 1.0 for GDELT, 2.0 for FIRMS fire
	Timestamp time.Time
}

// GeopoliticalStore accumulates recent geopolitical events.
type GeopoliticalStore struct {
	mu     sync.RWMutex
	events []GeoEvent
}

var GeoStore = &GeopoliticalStore{}

// AddEvent records a geopolitical event (called from gdelt.go and firms.go).
func (s *GeopoliticalStore) AddEvent(lat, lon, weight float64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.events = append(s.events, GeoEvent{
		Lat:       lat,
		Lon:       lon,
		Weight:    weight,
		Timestamp: time.Now(),
	})
}

// ScoreForLocation returns a 0-100 geopolitical threat score for a coordinate.
// Uses a distance-weighted kernel: events closer in space AND time contribute more.
func (s *GeopoliticalStore) ScoreForLocation(lat, lon float64) float64 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	now := time.Now()
	oneHourAgo := now.Add(-time.Hour)
	totalWeight := 0.0

	for _, e := range s.events {
		if e.Timestamp.Before(oneHourAgo) {
			continue
		}
		dist := math.Sqrt(math.Pow(lat-e.Lat, 2) + math.Pow(lon-e.Lon, 2))
		if dist > 2.0 { // Beyond ~120nm, no influence
			continue
		}
		// Inverse-distance weighting with temporal decay
		spatialFactor := 1.0 / (1.0 + dist*10) // Sharper falloff
		timeFactor := 1.0 - now.Sub(e.Timestamp).Minutes()/60.0
		totalWeight += e.Weight * spatialFactor * math.Max(0, timeFactor)
	}

	// Normalize: 10+ weighted events in proximity → score 100
	return math.Min(100, totalWeight*10)
}

// PurgeOld removes events older than 1 hour.
func (s *GeopoliticalStore) PurgeOld() {
	s.mu.Lock()
	defer s.mu.Unlock()
	cutoff := time.Now().Add(-time.Hour)
	filtered := s.events[:0]
	for _, e := range s.events {
		if e.Timestamp.After(cutoff) {
			filtered = append(filtered, e)
		}
	}
	s.events = filtered
}
