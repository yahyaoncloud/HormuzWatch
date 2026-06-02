package integrations

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"Geospatial-harmuz-watch/server/internal/api"
	"Geospatial-harmuz-watch/server/internal/heatmap"
	"Geospatial-harmuz-watch/server/internal/websocket/hub"
)

type OpenSkyResponse struct {
	Time   int             `json:"time"`
	States [][]interface{} `json:"states"`
}

func StartOpenSky(h *hub.Hub) {
	username := os.Getenv("OPENSKY_USERNAME")
	password := os.Getenv("OPENSKY_PASSWORD")

	if username == "your_opensky_username" {
		username = ""
	}

	// Middle East Bounding Box: 22°N to 30°N, 48°E to 60°E
	url := "https://opensky-network.org/api/states/all?lamin=22&lomin=48&lamax=30&lomax=60"

	// Rate limit: every 30 seconds to avoid hitting OpenSky limits
	ticker := time.NewTicker(30 * time.Second)
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

			h.Broadcast <- hub.Message{
				Type: "telemetry",
				Data: payload,
			}
		}

		<-ticker.C
	}
}
