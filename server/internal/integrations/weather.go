package integrations

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"Geospatial-harmuz-watch/server/internal/websocket/hub"
)

type WeatherResponse struct {
	Current struct {
		Time          string  `json:"time"`
		WaveHeight    float64 `json:"wave_height"`
		WaveDirection float64 `json:"wave_direction"`
	} `json:"current"`
}

type WeatherPayload struct {
	Timestamp     string  `json:"timestamp"`
	Lat           float64 `json:"lat"`
	Lon           float64 `json:"lon"`
	WaveHeight    float64 `json:"waveHeight"`
	WaveDirection float64 `json:"waveDirection"`
	Severity      string  `json:"severity"`
}

func StartWeather(ctx context.Context, h *hub.Hub) {
	// Center of Strait of Hormuz
	lat := 26.5
	lon := 56.0
	url := "https://marine-api.open-meteo.com/v1/marine?latitude=26.5&longitude=56.0&current=wave_height,wave_direction"

	// Poll every 5 minutes
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	client := &http.Client{Timeout: 10 * time.Second}

	for {
		log.Println("Fetching Open-Meteo Marine weather data...")

		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			log.Printf("Weather Request error: %v", err)
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				continue
			}
		}

		resp, err := client.Do(req)
		if err != nil {
			select {
			case <-ctx.Done():
				return
			default:
				log.Printf("Weather API error: %v", err)
				select {
				case <-ctx.Done():
					return
				case <-ticker.C:
					continue
				}
			}
		}

		if resp.StatusCode == http.StatusOK {
			var weatherData WeatherResponse
			if err := json.NewDecoder(resp.Body).Decode(&weatherData); err == nil {
				severity := "nominal"
				if weatherData.Current.WaveHeight > 2.5 {
					severity = "severe"
				} else if weatherData.Current.WaveHeight > 1.5 {
					severity = "moderate"
				}

				payload := WeatherPayload{
					Timestamp:     time.Now().UTC().Format(time.RFC3339),
					Lat:           lat,
					Lon:           lon,
					WaveHeight:    weatherData.Current.WaveHeight,
					WaveDirection: weatherData.Current.WaveDirection,
					Severity:      severity,
				}

				// Broadcast to all connected WebSocket clients
				h.Publish(hub.Message{
					Type: "weather",
					Data: payload,
				})

				log.Printf("Weather Updated: Wave Height %.2fm, Severity: %s", payload.WaveHeight, payload.Severity)
			}
		}
		resp.Body.Close()

		select {
		case <-ctx.Done():
			log.Println("[Weather] Context canceled, stopping worker.")
			return
		case <-ticker.C:
		}
	}
}
