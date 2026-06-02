package integrations

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"Geospatial-harmuz-watch/server/internal/api"
	"Geospatial-harmuz-watch/server/internal/heatmap"
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

func StartAISStream(h *hub.Hub) {
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
		log.Println("Connecting to AISStream...")
		conn, _, err := websocket.DefaultDialer.Dial(url, nil)
		if err != nil {
			log.Printf("AISStream Dial error: %v", err)
			time.Sleep(10 * time.Second)
			continue
		}

		subMsg := AISStreamSubscription{
			APIKey:             apiKey,
			BoundingBoxes:      [][][2]float64{boundingBox},
			FilterMessageTypes: []string{"PositionReport"},
		}

		if err := conn.WriteJSON(subMsg); err != nil {
			log.Printf("AISStream subscription error: %v", err)
			conn.Close()
			time.Sleep(10 * time.Second)
			continue
		}

		log.Println("AISStream connected successfully.")

		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				log.Printf("AISStream Read error: %v", err)
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
					IMO:               fmt.Sprintf("%d", aisMsg.MetaData.MMSI), // Using MMSI as ID
					VesselName:        shipName,
					Timestamp:         aisMsg.MetaData.TimeUTC,
					Lat:               aisMsg.MetaData.Latitude,
					Lon:               aisMsg.MetaData.Longitude,
					Speed:             speed,
					Heading:           heading,
					AisAgeMinutes:     0, // Live data
					HotZoneDistanceNm: 0, // Calculated later if needed
				}

				heatmap.AddTelemetry(payload.Lat, payload.Lon)

				h.Broadcast <- hub.Message{
					Type: "telemetry",
					Data: payload,
				}
			}
		}

		conn.Close()
		log.Println("AISStream disconnected. Reconnecting in 10s...")
		time.Sleep(10 * time.Second)
	}
}
