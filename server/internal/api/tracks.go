package api

import (
	"Geospatial-harmuz-watch/server/internal/db"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// ActiveTrack represents a live track with anomaly data for the API response.
type ActiveTrack struct {
	TrackID      string  `json:"trackId"`
	AssetName    string  `json:"assetName"`
	Timestamp    string  `json:"timestamp"`
	Lat          float64 `json:"lat"`
	Lon          float64 `json:"lon"`
	Speed        float64 `json:"speed"`
	Heading      float64 `json:"heading"`
	AnomalyScore int     `json:"anomalyScore"`
	Severity     string  `json:"severity"`
	LastUpdated  string  `json:"lastUpdated"`
	Altitude     float64 `json:"altitude,omitempty"`
	Squawk       string  `json:"squawk,omitempty"`
	OnGround     bool    `json:"onGround,omitempty"`
	ObjectType   string  `json:"objectType,omitempty"`
}

// GetActiveVessels returns all active maritime tracks (non-aircraft).
func GetActiveVessels(c *gin.Context) {
	tracks := queryActiveTracks("vessel")
	c.JSON(http.StatusOK, gin.H{
		"type":      "vessels",
		"count":     len(tracks),
		"data":      tracks,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// GetActiveAircraft returns all active aviation tracks.
func GetActiveAircraft(c *gin.Context) {
	tracks := queryActiveTracks("aircraft")
	c.JSON(http.StatusOK, gin.H{
		"type":      "aircraft",
		"count":     len(tracks),
		"data":      tracks,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// GetAllActiveTracks returns all active tracks (both vessels and aircraft).
func GetAllActiveTracks(c *gin.Context) {
	tracks := queryActiveTracks("")
	c.JSON(http.StatusOK, gin.H{
		"type":      "tracks",
		"count":     len(tracks),
		"data":      tracks,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// queryActiveTracks fetches active tracks from the database, optionally filtered by type.
// filter: "vessel" (non-aircraft), "aircraft", or "" for all.
func queryActiveTracks(filter string) []ActiveTrack {
	baseQuery := `
		SELECT t.track_id, t.asset_name, t.timestamp, t.lat, t.lon,
			   t.speed, COALESCE(t.heading, 0),
			   COALESCE(a.score, 0) AS score,
			   COALESCE(a.severity, 'low') AS severity,
			   t.last_updated
	`
	filterClause := ""
	if filter == "aircraft" {
		filterClause = "AND (t.track_id LIKE 'FLIGHT-%' OR t.track_id LIKE 'ADS-%' OR t.track_id LIKE 'ICAO-%')"
	} else if filter == "vessel" {
		filterClause = "AND t.track_id NOT LIKE 'FLIGHT-%' AND t.track_id NOT LIKE 'ADS-%' AND t.track_id NOT LIKE 'ICAO-%'"
	}
	limitClause := "LIMIT 100"
	if filter == "" {
		limitClause = "LIMIT 200"
	}

	query := baseQuery + `
		FROM tracks t
		LEFT JOIN anomalies a ON t.track_id = a.track_id
		WHERE t.last_updated >= NOW() - INTERVAL '2 hours'
		` + filterClause + `
		ORDER BY score DESC
		` + limitClause

	rows, err := db.DB.Query(query)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var tracks []ActiveTrack
	for rows.Next() {
		var t ActiveTrack
		if err := rows.Scan(&t.TrackID, &t.AssetName, &t.Timestamp, &t.Lat, &t.Lon,
			&t.Speed, &t.Heading, &t.AnomalyScore, &t.Severity, &t.LastUpdated); err == nil {
			tracks = append(tracks, t)
		}
	}
	if tracks == nil {
		tracks = []ActiveTrack{}
	}
	return tracks
}
