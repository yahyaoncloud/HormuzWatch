package heatmap

import (
	"fmt"
	"sync"
	"time"
)

// GridCell represents a geographic grid cell for heatmap
type GridCell struct {
	Lat       float64 `json:"lat"`
	Lon       float64 `json:"lon"`
	Intensity int     `json:"intensity"` // count of events in this cell (last 1 hour)
}

// HeatmapStore manages the heatmap grid data
type HeatmapStore struct {
	mu    sync.RWMutex
	cells map[string]*GridCell
	// Store timestamps for each entry to calculate 1-hour window
	timestamps map[string][]time.Time
}

var store = &HeatmapStore{
	cells:      make(map[string]*GridCell),
	timestamps: make(map[string][]time.Time),
}

// AddTelemetry adds a telemetry point to the heatmap
// Grid resolution: 0.5 degrees
func AddTelemetry(lat, lon float64) {
	store.mu.Lock()
	defer store.mu.Unlock()

	// Round to nearest 0.5 degree grid
	gridLat := float64(int((lat + 0.25) * 2)) / 2
	gridLon := float64(int((lon + 0.25) * 2)) / 2

	key := cellKey(gridLat, gridLon)

	// Clean up old timestamps (older than 1 hour)
	now := time.Now()
	oneHourAgo := now.Add(-time.Hour)

	var filteredTimestamps []time.Time
	if timestamps, exists := store.timestamps[key]; exists {
		for _, ts := range timestamps {
			if ts.After(oneHourAgo) {
				filteredTimestamps = append(filteredTimestamps, ts)
			}
		}
	}
	filteredTimestamps = append(filteredTimestamps, now)
	store.timestamps[key] = filteredTimestamps

	// Update or create grid cell
	if cell, exists := store.cells[key]; exists {
		cell.Intensity = len(filteredTimestamps)
	} else {
		store.cells[key] = &GridCell{
			Lat:       gridLat,
			Lon:       gridLon,
			Intensity: 1,
		}
	}
}

// GetGridData returns all current grid cells with non-zero intensity
func GetGridData() []GridCell {
	store.mu.RLock()
	defer store.mu.RUnlock()

	var gridData []GridCell
	for _, cell := range store.cells {
		if cell.Intensity > 0 {
			gridData = append(gridData, *cell)
		}
	}
	return gridData
}

// ClearOldData clears telemetry older than 1 hour (called periodically)
func ClearOldData() {
	store.mu.Lock()
	defer store.mu.Unlock()

	now := time.Now()
	oneHourAgo := now.Add(-time.Hour)

	for key, timestamps := range store.timestamps {
		var filteredTimestamps []time.Time
		for _, ts := range timestamps {
			if ts.After(oneHourAgo) {
				filteredTimestamps = append(filteredTimestamps, ts)
			}
		}

		if len(filteredTimestamps) == 0 {
			delete(store.cells, key)
			delete(store.timestamps, key)
		} else {
			store.timestamps[key] = filteredTimestamps
			if cell, exists := store.cells[key]; exists {
				cell.Intensity = len(filteredTimestamps)
			}
		}
	}
}

// cellKey generates a unique key for a grid cell
func cellKey(lat, lon float64) string {
	// Format with 1 decimal place precision
	return fmt.Sprintf("%.1f,%.1f", lat, lon)
}

// StartCleanupRoutine starts a background routine to clean old data every 5 minutes
func StartCleanupRoutine() {
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			ClearOldData()
		}
	}()
}
