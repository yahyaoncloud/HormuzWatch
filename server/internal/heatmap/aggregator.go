package heatmap

import (
	"fmt"
	"sync"
	"time"
)

// SourceType identifies the origin of heatmap data.
type SourceType string

const (
	SourceVessel SourceType = "vessel"
	SourceFire   SourceType = "fire"
	SourceGeo    SourceType = "geo"
)

// GridCell represents a geographic grid cell for heatmap
type GridCell struct {
	Lat       float64    `json:"lat"`
	Lon       float64    `json:"lon"`
	Intensity int        `json:"intensity"` // count of events in this cell (last 1 hour)
	Source    SourceType `json:"source,omitempty"`
}

// cellData holds per-cell timestamp tracking
type cellData struct {
	cell       *GridCell
	timestamps []time.Time
}

// HeatmapStore manages the heatmap grid data
type HeatmapStore struct {
	mu    sync.RWMutex
	cells map[string]*cellData
}

var store = &HeatmapStore{
	cells: make(map[string]*cellData),
}

// AddTelemetry adds a vessel telemetry point to the heatmap.
// Grid resolution: 0.5 degrees
func AddTelemetry(lat, lon float64) {
	addEvent(lat, lon, SourceVessel)
}

// AddFireEvent adds a fire/hotspot event (from NASA FIRMS).
func AddFireEvent(lat, lon float64) {
	// Fire events carry 3x weight
	for i := 0; i < 3; i++ {
		addEvent(lat, lon, SourceFire)
	}
}

// AddGeoEvent adds a geopolitical event (from GDELT).
func AddGeoEvent(lat, lon float64) {
	// Geo events carry 5x weight
	for i := 0; i < 5; i++ {
		addEvent(lat, lon, SourceGeo)
	}
}

func addEvent(lat, lon float64, source SourceType) {
	store.mu.Lock()
	defer store.mu.Unlock()

	// Round to nearest 0.5 degree grid
	gridLat := float64(int((lat + 0.25) * 2)) / 2
	gridLon := float64(int((lon + 0.25) * 2)) / 2

	key := cellKey(gridLat, gridLon)

	// Clean up old timestamps (older than 1 hour)
	now := time.Now()
	oneHourAgo := now.Add(-time.Hour)

	if data, exists := store.cells[key]; exists {
		var filtered []time.Time
		for _, ts := range data.timestamps {
			if ts.After(oneHourAgo) {
				filtered = append(filtered, ts)
			}
		}
		filtered = append(filtered, now)
		data.timestamps = filtered
		data.cell.Intensity = len(filtered)
		// Keep the more important source if already set
		if sourcePriority(source) > sourcePriority(data.cell.Source) {
			data.cell.Source = source
		}
	} else {
		store.cells[key] = &cellData{
			cell: &GridCell{
				Lat:       gridLat,
				Lon:       gridLon,
				Intensity: 1,
				Source:    source,
			},
			timestamps: []time.Time{now},
		}
	}
}

func sourcePriority(s SourceType) int {
	switch s {
	case SourceGeo:
		return 3
	case SourceFire:
		return 2
	case SourceVessel:
		return 1
	default:
		return 0
	}
}

// GetGridData returns all current grid cells with non-zero intensity.
func GetGridData() []GridCell {
	return GetGridDataBySource("all")
}

// GetGridDataBySource returns grid cells filtered by source type.
func GetGridDataBySource(source string) []GridCell {
	store.mu.RLock()
	defer store.mu.RUnlock()

	var gridData []GridCell
	for _, data := range store.cells {
		if data.cell.Intensity == 0 {
			continue
		}
		if source != "all" && string(data.cell.Source) != source {
			continue
		}
		gridData = append(gridData, *data.cell)
	}
	return gridData
}

// ClearOldData clears telemetry older than 1 hour (called periodically)
func ClearOldData() {
	store.mu.Lock()
	defer store.mu.Unlock()

	now := time.Now()
	oneHourAgo := now.Add(-time.Hour)

	for key, data := range store.cells {
		var filtered []time.Time
		for _, ts := range data.timestamps {
			if ts.After(oneHourAgo) {
				filtered = append(filtered, ts)
			}
		}
		if len(filtered) == 0 {
			delete(store.cells, key)
		} else {
			data.timestamps = filtered
			data.cell.Intensity = len(filtered)
		}
	}
}

// cellKey generates a unique key for a grid cell
func cellKey(lat, lon float64) string {
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
