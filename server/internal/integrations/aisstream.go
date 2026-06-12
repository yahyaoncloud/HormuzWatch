package integrations

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"Geospatial-harmuz-watch/server/internal/anomaly"
	"Geospatial-harmuz-watch/server/internal/api"
	"Geospatial-harmuz-watch/server/internal/db"
	"Geospatial-harmuz-watch/server/internal/heatmap"
	"Geospatial-harmuz-watch/server/internal/intelligence"
	"Geospatial-harmuz-watch/server/internal/websocket/hub"

	"github.com/gorilla/websocket"
)

type AISStreamSubscription struct {
	APIKey             string         `json:"APIKey"`
	BoundingBoxes      [][][2]float64 `json:"BoundingBoxes"`
	FiltersShipMMSI    []string       `json:"FiltersShipMMSI,omitempty"`
	FilterMessageTypes []string       `json:"FilterMessageTypes,omitempty"`
}

type AISMessage struct {
	MessageType string `json:"MessageType"`
	MetaData    struct {
		MMSI      int     `json:"MMSI"`
		ShipName  string  `json:"ShipName"`
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
		TimeUTC   string  `json:"time_utc"`
	} `json:"MetaData"`
	Message struct {
		PositionReport *struct {
			Cog float64 `json:"Cog"`
			Sog float64 `json:"Sog"`
		} `json:"PositionReport"`
	} `json:"Message"`
}

func StartAISStream(h *hub.Hub, tsm *intelligence.TrackStateManager, mlClient *intelligence.MLClient) {
	apiKey := os.Getenv("AISSTREAM_API_KEY")
	if apiKey == "" || apiKey == "your_aisstream_api_key" {
		log.Println("AISSTREAM_API_KEY not configured. Skipping AISStream integration.")
		return
	}

	url := "wss://stream.aisstream.io/v0/stream"

	// Middle East Bounding Box: 22°N to 30°N, 48°E to 60°E
	// Format: [[minLat, minLon], [maxLat, maxLon]]
	boundingBox := [][2]float64{
		{22.0, 48.0}, // Bottom left
		{30.0, 60.0}, // Top right
	}

	for {
		log.Println("[AISStream] Connecting to", url, "...")
		conn, resp, err := websocket.DefaultDialer.Dial(url, nil)
		if err != nil {
			if resp != nil {
				log.Printf("[AISStream] Dial error: %v (HTTP %d)", err, resp.StatusCode)
			} else {
				log.Printf("[AISStream] Dial error: %v (no HTTP response)", err)
			}
			time.Sleep(10 * time.Second)
			continue
		}

		subMsg := AISStreamSubscription{
			APIKey:             apiKey,
			BoundingBoxes:      [][][2]float64{boundingBox},
			FilterMessageTypes: []string{"PositionReport"},
		}

		subJSON, _ := json.Marshal(subMsg)
		log.Printf("[AISStream] Sending subscription: %s", string(subJSON))

		if err := conn.WriteJSON(subMsg); err != nil {
			log.Printf("[AISStream] Subscription write error: %v", err)
			conn.Close()
			time.Sleep(10 * time.Second)
			continue
		}

		log.Println("[AISStream] Connected and subscribed. Awaiting messages...")

		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				log.Printf("[AISStream] Read error: %v", err)
				break
			}

			var aisMsg AISMessage
			if err := json.Unmarshal(message, &aisMsg); err != nil {
				continue
			}

			if aisMsg.MessageType == "PositionReport" && aisMsg.Message.PositionReport != nil {
				speed := aisMsg.Message.PositionReport.Sog
				heading := aisMsg.Message.PositionReport.Cog

				// Handle empty ShipName temporarily (could enrich later)
				shipName := aisMsg.MetaData.ShipName
				if shipName == "" {
					shipName = "Unknown Vessel"
				}

				payload := api.TelemetryPayload{
					TrackID:           fmt.Sprintf("%d", aisMsg.MetaData.MMSI), // Using MMSI as ID
					AssetName:         shipName,
					Timestamp:         aisMsg.MetaData.TimeUTC,
					Lat:               aisMsg.MetaData.Latitude,
					Lon:               aisMsg.MetaData.Longitude,
					Speed:             speed,
					Heading:           heading,
					AisAgeMinutes:     0, // Will be updated by TSM
					HotZoneDistanceNm: 0, // Will be handled by Features
				}

				heatmap.AddTelemetry(payload.Lat, payload.Lon)

				// ── Intelligence Pipeline ──────────────────────────
				deltas := tsm.Update(payload.TrackID, payload.AssetName,
					payload.Lat, payload.Lon, payload.Speed, payload.Heading)

				// Enrich payload with computed values
				payload.CourseDelta = deltas.CourseDelta
				payload.PreviousSpeed = deltas.PreviousSpeed
				payload.AisAgeMinutes = int(deltas.AISGapMinutes)

				features := intelligence.ExtractFeatures(
					payload.TrackID, payload.Lat, payload.Lon,
					payload.Speed, deltas)

				ruleScore := anomaly.Score(
					features.CourseDelta, features.AISGapMinutes,
					features.Speed, features.PreviousSpeed,
					features.DistToRestrictedZone,
					features.InRestrictedZone, features.NearHistoricalAttack)

				mlScore, explanation := mlClient.Predict(features)
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
		}

		conn.Close()
		log.Println("[AISStream] Disconnected. Reconnecting in 10s...")
		time.Sleep(10 * time.Second)
	}
}
