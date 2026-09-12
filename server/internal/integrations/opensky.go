package integrations

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"sync"
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

// activeFlightState tracks live flight kinematics for dead-reckoning during poll intervals and 429 backoff
type activeFlightState struct {
	TrackID      string
	Callsign     string
	Lat          float64
	Lon          float64
	SpeedKnots   float64
	HeadingDeg   float64
	AltitudeM    float64
	VerticalRate float64
	LastUpdated  time.Time
}

type FlightRegistry struct {
	mu      sync.RWMutex
	flights map[string]*activeFlightState
}

func newFlightRegistry() *FlightRegistry {
	return &FlightRegistry{
		flights: make(map[string]*activeFlightState),
	}
}

func (r *FlightRegistry) update(f *activeFlightState) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.flights[f.TrackID] = f
}

func (r *FlightRegistry) snapshot() []*activeFlightState {
	r.mu.RLock()
	defer r.mu.RUnlock()
	list := make([]*activeFlightState, 0, len(r.flights))
	cutoff := time.Now().Add(-20 * time.Minute)
	for id, f := range r.flights {
		if f.LastUpdated.Before(cutoff) {
			delete(r.flights, id)
			continue
		}
		cp := *f
		list = append(list, &cp)
	}
	return list
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

	// Lenient rate limit intervals to strictly prevent 429 Too Many Requests:
	// Anonymous quota: 400 requests/day (~3.6 min/req). We use 6.0m (360s) to guarantee ample headroom.
	// Authenticated quota: 4000 requests/day. We use 5.0m (300s).
	pollInterval := 360 * time.Second
	if !isAnonymous {
		pollInterval = 300 * time.Second
	}
	currentInterval := pollInterval

	client := &http.Client{Timeout: 15 * time.Second}
	registry := newFlightRegistry()

	log.Printf("[OpenSky] Starting lenient poll loop (base interval=%v, anonymous=%v, boxes=%d)", pollInterval, isAnonymous, len(urls))

	// Background dead-reckoning extrapolator: advances flight paths every 15s so the map stays
	// silky smooth and realistic without needing aggressive upstream API calls.
	go func() {
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case now := <-ticker.C:
				flights := registry.snapshot()
				for _, f := range flights {
					dtHours := now.Sub(f.LastUpdated).Hours()
					if dtHours <= 0 || dtHours > 1.0 {
						continue
					}

					// Dead-reckon position along great circle vector
					distNm := f.SpeedKnots * dtHours
					rad := f.HeadingDeg * (math.Pi / 180.0)
					dLat := (distNm * math.Cos(rad)) / 60.0
					cosLat := math.Cos(f.Lat * (math.Pi / 180.0))
					if cosLat < 0.1 {
						cosLat = 0.1
					}
					dLon := (distNm * math.Sin(rad)) / (60.0 * cosLat)

					newLat := f.Lat + dLat
					newLon := f.Lon + dLon

					// Check bounds
					if newLat < 20.0 || newLat > 33.5 || newLon < 46.0 || newLon > 63.0 {
						continue
					}

					payload := api.TelemetryPayload{
						TrackID:           f.TrackID,
						AssetName:         f.Callsign,
						Timestamp:         now.UTC().Format(time.RFC3339),
						Lat:               newLat,
						Lon:               newLon,
						Speed:             f.SpeedKnots,
						Heading:           f.HeadingDeg,
						Altitude:          f.AltitudeM,
						AisAgeMinutes:     0,
						HotZoneDistanceNm: 0,
						ObjectType:        telemetry.DomainAircraft,
						Source:            telemetry.SourceOpenSky,
					}
					p.EnqueueObservation(&payload)
				}
			}
		}
	}()

	for {
		select {
		case <-ctx.Done():
			log.Println("[OpenSky] Context canceled, stopping worker.")
			return
		default:
		}

		for _, url := range urls {
			log.Println("[OpenSky] Fetching OpenSky telemetry snapshot...")

			req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
			if err != nil {
				log.Printf("[OpenSky] Request creation error: %v", err)
				continue
			}

			req.Header.Set("User-Agent", "HormuzWatch/2.4 (Maritime & Aviation Intelligence; contact@hormuzwatch.internal)")
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

			// Handle HTTP 429 Too Many Requests with leniency & backoff
			if resp.StatusCode == http.StatusTooManyRequests {
				resp.Body.Close()
				backoffDuration := 15 * time.Minute
				if retryAfter := resp.Header.Get("Retry-After"); retryAfter != "" {
					if sec, err := strconv.Atoi(retryAfter); err == nil && sec > 0 {
						backoffDuration = time.Duration(sec)*time.Second + time.Duration(rand.Intn(30))*time.Second
					}
				}
				currentInterval = backoffDuration
				log.Printf("[OpenSky] Rate limited (HTTP 429). Dead-reckoning cache active. Backing off to %v", currentInterval)
				continue
			}

			if resp.StatusCode != http.StatusOK {
				log.Printf("[OpenSky] API error: HTTP %d (%s)", resp.StatusCode, resp.Status)
				resp.Body.Close()
				continue
			}

			// Reset interval to base pollInterval on success
			currentInterval = pollInterval

			var openSkyData OpenSkyResponse
			if err := json.NewDecoder(resp.Body).Decode(&openSkyData); err != nil {
				log.Printf("[OpenSky] JSON parse error: %v", err)
				resp.Body.Close()
				continue
			}
			resp.Body.Close()

			observations := 0
			now := time.Now()
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

				var vertRate float64
				if vr, ok := state[11].(float64); ok {
					vertRate = vr
				}

				if callsign == "" {
					callsign = fmt.Sprintf("ICAO-%s", icao24)
				}

				trackID := fmt.Sprintf("FLIGHT-%s", icao24)

				// Reject obvious sensor errors (aircraft > Mach 3 / ~2000 kn)
				if speedKnots > 2000.0 {
					continue
				}

				// Data Quality: Reject positions on ocean if altitude is below -100m
				if altMeters < -100 && !geo.IsOnLand(lat, lon) {
					continue
				}

				// Update registry for smooth dead reckoning
				registry.update(&activeFlightState{
					TrackID:      trackID,
					Callsign:     callsign,
					Lat:          lat,
					Lon:          lon,
					SpeedKnots:   speedKnots,
					HeadingDeg:   heading,
					AltitudeM:    altMeters,
					VerticalRate: vertRate,
					LastUpdated:  now,
				})

				payload := api.TelemetryPayload{
					TrackID:           trackID,
					AssetName:         callsign,
					Timestamp:         now.UTC().Format(time.RFC3339),
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
