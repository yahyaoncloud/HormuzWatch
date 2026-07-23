package geo

import (
	"encoding/json"
	"math"
	"os"
)

// HistoricalAttack represents a past conflict incident.
type HistoricalAttack struct {
	SiteName          string  `json:"site_name"`
	Country           string  `json:"country"`
	Latitude          float64 `json:"latitude"`
	Longitude         float64 `json:"longitude"`
	PrimaryTargetType string  `json:"primary_target_type"`
	ConflictContext   string  `json:"conflict_context"`
	ReportedDate      string  `json:"reported_date"`
}

var historicalAttacks []HistoricalAttack

// LoadHistoricalAttacks parses the local historical attacks JSON file.
func LoadHistoricalAttacks(filepath string) error {
	data, err := os.ReadFile(filepath)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, &historicalAttacks)
}

// GetHistoricalAttacks returns the loaded historical attack records.
func GetHistoricalAttacks() []HistoricalAttack {
	return historicalAttacks
}

// IsNearHistoricalAttack returns true if the coordinate is within 0.1°
// (~6 nm) of a known historical attack site.
func IsNearHistoricalAttack(lat, lon float64) bool {
	for _, attack := range historicalAttacks {
		dist := math.Sqrt(math.Pow(lat-attack.Latitude, 2) + math.Pow(lon-attack.Longitude, 2))
		if dist <= 0.1 {
			return true
		}
	}
	return false
}
