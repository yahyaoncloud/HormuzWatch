package integrations

import (
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

func StartWeather(h *hub.Hub) {
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

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			log.Printf("Weather Request error: %v", err)
			<-ticker.C
			continue
		}

		resp, err := client.Do(req)
		if err != nil {
			log.Printf("Weather Do error: %v", err)
			<-ticker.C
			continue
		}

		if resp.StatusCode != http.StatusOK {
			log.Printf("Weather non-200 status: %v", resp.StatusCode)
			resp.Body.Close()
			<-ticker.C
			continue
		}

		var data WeatherResponse
		if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
			log.Printf("Weather decode error: %v", err)
			resp.Body.Close()
			<-ticker.C
			continue
		}
		resp.Body.Close()

		severity := "low"
		if data.Current.WaveHeight >= 4.0 {
			severity = "critical"
		} else if data.Current.WaveHeight >= 2.5 {
			severity = "high"
		} else if data.Current.WaveHeight >= 1.5 {
			severity = "medium"
		}

		payload := WeatherPayload{
			Timestamp:     data.Current.Time,
			Lat:           lat,
			Lon:           lon,
			WaveHeight:    data.Current.WaveHeight,
			WaveDirection: data.Current.WaveDirection,
			Severity:      severity,
		}

		select {
		case h.Broadcast <- hub.Message{
			Type: "telemetry",
			Data: payload,
		}:
		default:
			log.Printf("[Integration] Hub broadcast channel full, dropping weather update")
		}

		<-ticker.C
	}
}
