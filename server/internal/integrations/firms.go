package integrations

import (
	"encoding/csv"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"Geospatial-harmuz-watch/server/internal/heatmap"
	"Geospatial-harmuz-watch/server/internal/intelligence"
	"Geospatial-harmuz-watch/server/internal/websocket/hub"
)

// StartFIRMS polls the NASA FIRMS API for active fire data
func StartFIRMS(h *hub.Hub) {
	apiKey := os.Getenv("MAP_KEY")
	if apiKey == "" || apiKey == "your_firms_api_key" {
		log.Println("MAP_KEY not configured. Skipping NASA FIRMS integration.")
		return
	}

	// Bounding box for Middle East: West,South,East,North (48,22,60,30)
	// API format: https://firms.modaps.eosdis.nasa.gov/api/area/csv/[MAP_KEY]/VIIRS_SNPP_NRT/[WEST],[SOUTH],[EAST],[NORTH]/1
	url := fmt.Sprintf("https://firms.modaps.eosdis.nasa.gov/api/area/csv/%s/VIIRS_SNPP_NRT/48,22,60,30/1", apiKey)

	// Poll every 10 minutes
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()

	client := &http.Client{Timeout: 30 * time.Second}

	for {
		log.Println("Fetching NASA FIRMS active fire data...")

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			log.Printf("FIRMS Request error: %v", err)
			<-ticker.C
			continue
		}

		resp, err := client.Do(req)
		if err != nil {
			log.Printf("FIRMS Do error: %v", err)
			<-ticker.C
			continue
		}

		if resp.StatusCode != http.StatusOK {
			log.Printf("FIRMS non-200 status: %v", resp.StatusCode)
			resp.Body.Close()
			<-ticker.C
			continue
		}

		reader := csv.NewReader(resp.Body)
		records, err := reader.ReadAll()
		resp.Body.Close()

		if err != nil {
			log.Printf("FIRMS CSV parse error: %v", err)
			<-ticker.C
			continue
		}

		count := 0
		// First row is header
		for i, row := range records {
			if i == 0 {
				continue
			}

			// Expected format: latitude(0), longitude(1), brightness(2), ...
			if len(row) < 3 {
				continue
			}

			latStr := row[0]
			lonStr := row[1]
			brightStr := row[2]

			lat, err1 := strconv.ParseFloat(latStr, 64)
			lon, err2 := strconv.ParseFloat(lonStr, 64)
			brightness, err3 := strconv.ParseFloat(brightStr, 64)

			if err1 != nil || err2 != nil || err3 != nil {
				continue
			}

			// High brightness = active fire / explosion
			if brightness > 300.0 { // threshold in Kelvin
				// Add to heatmap 3 times to create a stronger signal
				for j := 0; j < 3; j++ {
					heatmap.AddTelemetry(lat, lon)
				}

				payload := map[string]interface{}{
					"lat":        lat,
					"lon":        lon,
					"brightness": brightness,
					"timestamp":  time.Now().UTC().Format(time.RFC3339),
					"type":       "fire_anomaly",
				}

				select {
				case h.Broadcast <- hub.Message{
					Type: "telemetry",
					Data: payload,
				}:
				default:
					log.Printf("[Integration] Hub broadcast channel full, dropping FIRMS update")
				}
				
				intelligence.GeoStore.AddEvent(lat, lon, 2.0)
				
				count++
			}
		}

		log.Printf("Processed %d NASA FIRMS active fire anomalies.", count)

		<-ticker.C
	}
}
