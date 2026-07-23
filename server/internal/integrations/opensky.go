package integrations

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"Geospatial-harmuz-watch/server/internal/api"
	"Geospatial-harmuz-watch/server/internal/domain/telemetry"
	"Geospatial-harmuz-watch/server/internal/intelligence"
)

type OpenSkyResponse struct {
	Time   int             `json:"time"`
	States [][]interface{} `json:"states"`
}

func StartOpenSky(p *intelligence.Pipeline) {
	username := os.Getenv("OPENSKY_USERNAME")
	password := os.Getenv("OPENSKY_PASSWORD")

	isAnonymous := username == "" || username == "your_opensky_username"
	if isAnonymous {
		username = ""
	}

	// Middle East Bounding Box: 22°N to 30°N, 48°E to 60°E
	url := "https://opensky-network.org/api/states/all?lamin=22&lomin=48&lamax=30&lomax=60"

	// Rate limit: anonymous users get 400 requests/day (~1 call per 3.6 min)
	// Authenticated users get 4000 requests/day. Use 4-min for anon, 2-min for auth.
	pollInterval := 4 * time.Minute
	if !isAnonymous {
		pollInterval = 2 * time.Minute
	}
	currentInterval := pollInterval

	client := &http.Client{Timeout: 15 * time.Second}

	log.Printf("[OpenSky] Starting poll loop (interval=%v, anonymous=%v)", pollInterval, isAnonymous)

	for {
		log.Println("[OpenSky] Fetching OpenSky data...")

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			log.Printf("[OpenSky] Request creation error: %v", err)
			time.Sleep(currentInterval)
			continue
		}

		// Set standard User-Agent to prevent 403 / 429 blocks from Cloudflare/OpenSky
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 HormuzWatch/2.0")
		req.Header.Set("Accept", "application/json")

		if username != "" && password != "" {
			req.SetBasicAuth(username, password)
		}

		resp, err := client.Do(req)
		if err != nil {
			log.Printf("[OpenSky] Do error: %v", err)
			time.Sleep(currentInterval)
			continue
		}

		if resp.StatusCode == http.StatusTooManyRequests {
			resp.Body.Close()
			currentInterval = currentInterval * 2
			if currentInterval > 10*time.Minute {
				currentInterval = 10 * time.Minute
			}
			log.Printf("[OpenSky] Rate limited (429). Backing off. Waiting %v before retry.", currentInterval)
			time.Sleep(currentInterval)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			log.Printf("[OpenSky] non-200 status: %v", resp.StatusCode)
			resp.Body.Close()
			time.Sleep(currentInterval)
			continue
		}

		// Reset interval on successful HTTP 200 response
		currentInterval = pollInterval

		var data OpenSkyResponse
		if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
			log.Printf("OpenSky decode error: %v", err)
			resp.Body.Close()
			time.Sleep(currentInterval)
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
			baroAlt, _ := state[7].(float64)
			onGround, _ := state[8].(bool)
			velocity, _ := state[9].(float64)
			heading, _ := state[10].(float64)

			// Squawk code (index 14 in OpenSky state vector)
			var squawk string
			if len(state) > 14 {
				if s, ok := state[14].(string); ok {
					squawk = s
				}
			}

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
				Altitude:          baroAlt,
				Squawk:            squawk,
				OnGround:          onGround,
				ObjectType:        "aircraft",
				Source:            telemetry.SourceOpenSky,
			}

			// ── Intelligence Pipeline ──────────────────────────
			p.ProcessObservation(context.Background(), &payload)
		}

		time.Sleep(currentInterval)
	}
}
