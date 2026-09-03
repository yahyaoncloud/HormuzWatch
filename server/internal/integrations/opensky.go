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
	"Geospatial-harmuz-watch/server/internal/geo"
	"Geospatial-harmuz-watch/server/internal/intelligence"
)

type OpenSkyResponse struct {
	Time   int64           `json:"time"`
	States [][]interface{} `json:"states"`
}

func StartOpenSky(ctx context.Context, p *intelligence.Pipeline) {
	username := os.Getenv("OPENSKY_USERNAME")
	password := os.Getenv("OPENSKY_PASSWORD")

	isAnonymous := username == "" || username == "your_opensky_username"
	if isAnonymous {
		username = ""
	}

	// Targeted Gulf Airspace bounding box: Persian Gulf, Strait of Hormuz, UAE, Qatar, Bahrain, Kuwait, Oman (21N-32.5N, 47E-62E)
	urls := []string{
		"https://opensky-network.org/api/states/all?lamin=21&lomin=47&lamax=32.5&lomax=62",
	}

	// Rate limit: anonymous users get 400 requests/day (~1 call per 3.6 min)
	// Authenticated users get 4000 requests/day. Use 4-min for anon, 2-min for auth.
	pollInterval := 4 * time.Minute
	if !isAnonymous {
		pollInterval = 2 * time.Minute
	}
	currentInterval := pollInterval

	client := &http.Client{Timeout: 15 * time.Second}

	log.Printf("[OpenSky] Starting poll loop (interval=%v, anonymous=%v, boxes=%d)", pollInterval, isAnonymous, len(urls))

	for {
		select {
		case <-ctx.Done():
			log.Println("[OpenSky] Context canceled, stopping worker.")
			return
		default:
		}

		for _, url := range urls {
			log.Println("[OpenSky] Fetching OpenSky data...")

			req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
			if err != nil {
				log.Printf("[OpenSky] Request creation error: %v", err)
				continue
			}

			req.Header.Set("User-Agent", "HormuzWatch/2.0 (Maritime & Aviation Intelligence; contact@hormuzwatch.internal)")
			if !isAnonymous {
				req.SetBasicAuth(username, password)
			}

			resp, err := client.Do(req)
			if err != nil {
				select {
				case <-ctx.Done():
					return
				default:
					log.Printf("[OpenSky] Fetch error: %v", err)
					continue
				}
			}

			if resp.StatusCode != http.StatusOK {
				log.Printf("[OpenSky] API error: HTTP %d (%s)", resp.StatusCode, resp.Status)
				if resp.StatusCode == 429 {
					currentInterval = 10 * time.Minute
					log.Printf("[OpenSky] Rate limited (429). Backing off to %v", currentInterval)
				}
				resp.Body.Close()
				continue
			}
			currentInterval = pollInterval

			var openSkyData OpenSkyResponse
			if err := json.NewDecoder(resp.Body).Decode(&openSkyData); err != nil {
				log.Printf("[OpenSky] JSON parse error: %v", err)
				resp.Body.Close()
				continue
			}
			resp.Body.Close()

			observations := 0
			for _, state := range openSkyData.States {
				if len(state) < 17 {
					continue
				}

				icao24, _ := state[0].(string)
				callsign, _ := state[1].(string)
				onGround, _ := state[8].(bool)
				if onGround {
					continue
				}

				lon, okLon := state[5].(float64)
				lat, okLat := state[6].(float64)
				if !okLon || !okLat {
					continue
				}

				var speedKnots float64
				if velocity, ok := state[9].(float64); ok {
					speedKnots = velocity * 1.94384
				}

				var heading float64
				if track, ok := state[10].(float64); ok {
					heading = track
				}

				var altMeters float64
				if baroAlt, ok := state[7].(float64); ok {
					altMeters = baroAlt
				}

				if callsign == "" {
					callsign = fmt.Sprintf("ICAO-%s", icao24)
				}

				payload := api.TelemetryPayload{
					TrackID:           fmt.Sprintf("FLIGHT-%s", icao24),
					AssetName:         callsign,
					Timestamp:         time.Now().UTC().Format(time.RFC3339),
					Lat:               lat,
					Lon:               lon,
					Speed:             speedKnots,
					Heading:           heading,
					Altitude:          altMeters,
					AisAgeMinutes:     0,
					HotZoneDistanceNm: 0,
					ObjectType:        telemetry.DomainAircraft,
					Source:            telemetry.SourceOpenSky,
				}

				// Reject obvious sensor errors (aircraft > Mach 3 / ~2000 kn)
				if speedKnots > 2000.0 {
					continue
				}

				// Data Quality: Reject positions on ocean if altitude is below 0
				if altMeters < -100 && !geo.IsOnLand(lat, lon) {
					continue
				}

				p.EnqueueObservation(&payload)
				observations++
			}

			log.Printf("[OpenSky] Ingested %d aircraft observations from %s", observations, url)
		}

		select {
		case <-ctx.Done():
			log.Println("[OpenSky] Context canceled, stopping worker.")
			return
		case <-time.After(currentInterval):
		}
	}
}
