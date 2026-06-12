package integrations

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"Geospatial-harmuz-watch/server/internal/anomaly"
	"Geospatial-harmuz-watch/server/internal/api"
	"Geospatial-harmuz-watch/server/internal/db"
	"Geospatial-harmuz-watch/server/internal/heatmap"
	"Geospatial-harmuz-watch/server/internal/intelligence"
	"Geospatial-harmuz-watch/server/internal/websocket/hub"
)

type OpenSkyResponse struct {
	Time   int             `json:"time"`
	States [][]interface{} `json:"states"`
}

func StartOpenSky(h *hub.Hub, tsm *intelligence.TrackStateManager, mlClient *intelligence.MLClient) {
	username := os.Getenv("OPENSKY_USERNAME")
	password := os.Getenv("OPENSKY_PASSWORD")

	if username == "your_opensky_username" {
		username = ""
	}

	// Middle East Bounding Box: 22°N to 30°N, 48°E to 60°E
	url := "https://opensky-network.org/api/states/all?lamin=22&lomin=48&lamax=30&lomax=60"

	// Rate limit: every 5 minutes to avoid hitting OpenSky limits
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	client := &http.Client{Timeout: 10 * time.Second}

	for {
		log.Println("Fetching OpenSky data...")

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			log.Printf("OpenSky Request error: %v", err)
			<-ticker.C
			continue
		}

		if username != "" && password != "" {
			req.SetBasicAuth(username, password)
		}

		resp, err := client.Do(req)
		if err != nil {
			log.Printf("OpenSky Do error: %v", err)
			<-ticker.C
			continue
		}

		if resp.StatusCode != http.StatusOK {
			log.Printf("OpenSky non-200 status: %v", resp.StatusCode)
			resp.Body.Close()
			<-ticker.C
			continue
		}

		var data OpenSkyResponse
		if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
			log.Printf("OpenSky decode error: %v", err)
			resp.Body.Close()
			<-ticker.C
			continue
		}
		resp.Body.Close()

		for _, state := range data.States {
			if len(state) < 11 {
				continue
			}

			icao24, _ := state[0].(string)
			callsign, _ := state[1].(string)
			lon, _ := state[5].(float64)
			lat, _ := state[6].(float64)
			velocity, _ := state[9].(float64)
			heading, _ := state[10].(float64)

			if callsign == "" {
				callsign = "Unknown Aircraft"
			}

			payload := api.TelemetryPayload{
				TrackID:           fmt.Sprintf("FLIGHT-%s", icao24),
				AssetName:         callsign,
				Timestamp:         time.Now().UTC().Format(time.RFC3339),
				Lat:               lat,
				Lon:               lon,
				Speed:             velocity,
				Heading:           heading,
				AisAgeMinutes:     0,
				HotZoneDistanceNm: 0,
			}

			heatmap.AddTelemetry(payload.Lat, payload.Lon)

			// ── Intelligence Pipeline ──────────────────────────
			deltas := tsm.Update(payload.TrackID, payload.AssetName,
				payload.Lat, payload.Lon, payload.Speed, payload.Heading)
			payload.CourseDelta = deltas.CourseDelta
			payload.PreviousSpeed = deltas.PreviousSpeed

			features := intelligence.ExtractFeatures(
				payload.TrackID, payload.Lat, payload.Lon,
				payload.Speed, deltas)

			ruleScore := anomaly.Score(
				features.CourseDelta, features.AISGapMinutes,
				features.Speed, features.PreviousSpeed,
				features.DistToRestrictedZone,
				features.InRestrictedZone, features.NearHistoricalAttack)

			mlScore, explanation := mlClient.Predict(context.Background(), features)
			geoScore := intelligence.GeoStore.ScoreForLocation(payload.Lat, payload.Lon)

			assessment := intelligence.ComputeComposite(features, ruleScore, mlScore, geoScore, explanation)

			h.Broadcast <- hub.Message{
				Type: "telemetry",
				Data: payload,
			}

			// Persist to SQLite
			trackQuery := `
				INSERT INTO tracks (track_id, asset_name, timestamp, lat, lon, speed, previous_speed, heading, course_delta, ais_age_minutes, hot_zone_distance_nm, last_updated)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
				ON CONFLICT(track_id) DO UPDATE SET
					asset_name=excluded.asset_name,
					timestamp=excluded.timestamp,
					lat=excluded.lat,
					lon=excluded.lon,
					speed=excluded.speed,
					previous_speed=excluded.previous_speed,
					heading=excluded.heading,
					course_delta=excluded.course_delta,
					ais_age_minutes=excluded.ais_age_minutes,
					hot_zone_distance_nm=excluded.hot_zone_distance_nm,
					last_updated=CURRENT_TIMESTAMP;
			`
			db.Exec(trackQuery, payload.TrackID, payload.AssetName, payload.Timestamp, payload.Lat, payload.Lon, payload.Speed, payload.PreviousSpeed, payload.Heading, payload.CourseDelta, payload.AisAgeMinutes, payload.HotZoneDistanceNm)

			// Broadcast anomaly if score > 0
			if assessment.FinalScore > 0 {
				h.Broadcast <- hub.Message{
					Type: "anomaly",
					Data: assessment,
				}
				reasonsJSON, _ := json.Marshal(assessment.Reasons)
				actionsJSON, _ := json.Marshal(assessment.Actions)
				anomalyQuery := `
					INSERT INTO anomalies (track_id, score, severity, reasons, actions, last_updated)
					VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
					ON CONFLICT(track_id) DO UPDATE SET
						score=excluded.score,
						severity=excluded.severity,
						reasons=excluded.reasons,
						actions=excluded.actions,
						last_updated=CURRENT_TIMESTAMP;
				`
				db.Exec(anomalyQuery, assessment.TrackID, assessment.FinalScore, assessment.Severity, string(reasonsJSON), string(actionsJSON))
			}
		}

		<-ticker.C
	}
}
