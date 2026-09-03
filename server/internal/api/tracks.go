package api

import (
	"Geospatial-harmuz-watch/server/internal/db"
	"Geospatial-harmuz-watch/server/internal/integrations/ais"
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

// isGulfCoordinate checks if a coordinate is strictly within the Gulf watch region.
func isGulfCoordinate(lat, lon float64) bool {
	return lat >= 21.0 && lat <= 32.5 && lon >= 46.5 && lon <= 62.5
}

// queryActiveTracks fetches active tracks from in-memory state (0 DB egress), falling back to DB only if empty.
func queryActiveTracks(filter string) []ActiveTrack {
	seen := make(map[string]bool)
	var tracks []ActiveTrack

	// 1. Ingest vessels from GlobalVesselCache
	if filter != "aircraft" && ais.GlobalVesselCache != nil {
		vessels := ais.GlobalVesselCache.GetAllActiveVessels()
		for _, v := range vessels {
			if !isGulfCoordinate(v.Lat, v.Lon) {
				continue
			}
			seen[v.MMSI] = true
			tracks = append(tracks, ActiveTrack{
				TrackID:      v.MMSI,
				AssetName:    v.VesselName,
				Timestamp:    v.AisTimestamp.Format(time.RFC3339),
				Lat:          v.Lat,
				Lon:          v.Lon,
				Speed:        v.SOG,
				Heading:      v.TrueHeading,
				AnomalyScore: len(v.ActiveAnomalies) * 20,
				Severity:     "nominal",
				LastUpdated:  v.LastSeen.Format(time.RFC3339),
				ObjectType:   "vessel",
			})
		}
	}

	// 2. Ingest tracks from GlobalTSM
	if GlobalTSM != nil && GlobalTSM.TrackCount() > 0 {
		snapshots := GlobalTSM.GetActiveTracksSnapshot(filter)
		for _, s := range snapshots {
			if !isGulfCoordinate(s.Lat, s.Lon) || seen[s.TrackID] {
				continue
			}
			seen[s.TrackID] = true
			tracks = append(tracks, ActiveTrack{
				TrackID:      s.TrackID,
				AssetName:    s.AssetName,
				Timestamp:    s.Timestamp,
				Lat:          s.Lat,
				Lon:          s.Lon,
				Speed:        s.Speed,
				Heading:      s.Heading,
				AnomalyScore: s.AnomalyScore,
				Severity:     s.Severity,
				LastUpdated:  s.LastUpdated,
			})
		}
	}

	if len(tracks) > 0 {
		return tracks
	}

	baseQuery := `
		SELECT t.track_id, t.asset_name, t.timestamp, t.lat, t.lon,
			   t.speed, COALESCE(t.heading, 0),
			   COALESCE(a.score, 0) AS score,
			   COALESCE(a.severity, 'low') AS severity,
			   t.last_updated,
			   COALESCE(t.object_type, 'vessel') AS object_type
	`
	filterClause := ""
	if filter == "aircraft" {
		filterClause = "AND (t.object_type = 'aircraft' OR t.track_id LIKE 'FLIGHT-%' OR t.track_id LIKE 'ADS-%' OR t.track_id LIKE 'ICAO-%' OR t.speed > 80.0)"
	} else if filter == "vessel" {
		filterClause = "AND t.object_type != 'aircraft' AND t.track_id NOT LIKE 'FLIGHT-%' AND t.track_id NOT LIKE 'ADS-%' AND t.track_id NOT LIKE 'ICAO-%' AND (t.speed <= 80.0 OR t.speed IS NULL)"
	}
	limitClause := "LIMIT 3500"
	if filter == "" {
		limitClause = "LIMIT 3500"
	}

	query := baseQuery + `
		FROM tracks t
		LEFT JOIN anomalies a ON t.track_id = a.track_id
		WHERE t.last_updated >= NOW() - INTERVAL '24 hours'
		  AND t.lat >= 21.0 AND t.lat <= 32.5 AND t.lon >= 46.5 AND t.lon <= 62.5
		` + filterClause + `
		ORDER BY t.last_updated DESC
		` + limitClause

	rows, err := db.DB.Query(query)
	if err == nil && rows != nil {
		for rows.Next() {
			var t ActiveTrack
			if err := rows.Scan(&t.TrackID, &t.AssetName, &t.Timestamp, &t.Lat, &t.Lon,
				&t.Speed, &t.Heading, &t.AnomalyScore, &t.Severity, &t.LastUpdated, &t.ObjectType); err == nil {
				tracks = append(tracks, t)
			}
		}
		rows.Close()
	}

	// If no tracks found within 24h or query errored, fallback to Gulf-bounded historical tracks
	if len(tracks) == 0 {
		fallbackQuery := baseQuery + `
			FROM tracks t
			LEFT JOIN anomalies a ON t.track_id = a.track_id
			WHERE t.lat >= 21.0 AND t.lat <= 32.5 AND t.lon >= 46.5 AND t.lon <= 62.5
			` + filterClause + `
			ORDER BY t.last_updated DESC
			` + limitClause
		fbRows, fbErr := db.DB.Query(fallbackQuery)
		if fbErr == nil && fbRows != nil {
			for fbRows.Next() {
				var t ActiveTrack
				if err := fbRows.Scan(&t.TrackID, &t.AssetName, &t.Timestamp, &t.Lat, &t.Lon,
					&t.Speed, &t.Heading, &t.AnomalyScore, &t.Severity, &t.LastUpdated, &t.ObjectType); err == nil {
					if isGulfCoordinate(t.Lat, t.Lon) {
						tracks = append(tracks, t)
					}
				}
			}
			fbRows.Close()
		}
	}

	if tracks == nil {
		tracks = []ActiveTrack{}
	}
	return tracks
}
