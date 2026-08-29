package integrations

import (
	"context"
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
func StartFIRMS(ctx context.Context, _ *hub.Hub) {
	apiKey := os.Getenv("MAP_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("FIRMS_MAP_KEY")
	}
	if apiKey == "" || apiKey == "your_firms_api_key" {
		log.Println("MAP_KEY not configured. Skipping NASA FIRMS integration.")
		return
	}

	// Bounding box for Middle East: West,South,East,North (48,22,60,30)
	url := fmt.Sprintf("https://firms.modaps.eosdis.nasa.gov/api/area/csv/%s/VIIRS_SNPP_NRT/48,22,60,30/1", apiKey)

	// Poll every 10 minutes
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()

	client := &http.Client{Timeout: 30 * time.Second}

	for {
		log.Println("Fetching NASA FIRMS active fire data...")

		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			log.Printf("FIRMS Request error: %v", err)
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
				log.Printf("FIRMS API error: %v", err)
				select {
				case <-ctx.Done():
					return
				case <-ticker.C:
					continue
				}
			}
		}

		if resp.StatusCode == http.StatusOK {
			reader := csv.NewReader(resp.Body)
			records, err := reader.ReadAll()
			if err == nil && len(records) > 1 {
				fireCount := 0
				// Skip header
				for _, row := range records[1:] {
					if len(row) < 3 {
						continue
					}

					lat, errLat := strconv.ParseFloat(row[0], 64)
					lon, errLon := strconv.ParseFloat(row[1], 64)
					brightTi4, _ := strconv.ParseFloat(row[2], 64)

					if errLat == nil && errLon == nil {
						intensity := (brightTi4 - 300.0) / 100.0
						if intensity < 0.1 {
							intensity = 0.1
						}
						if intensity > 1.0 {
							intensity = 1.0
						}

						heatmap.AddFireEvent(lat, lon)
						intelligence.GeoStore.AddEvent(lat, lon, intensity)
						fireCount++
					}
				}
				log.Printf("Ingested %d thermal anomaly points from NASA FIRMS", fireCount)
			}
		}
		resp.Body.Close()

		select {
		case <-ctx.Done():
			log.Println("[FIRMS] Context canceled, stopping worker.")
			return
		case <-ticker.C:
		}
	}
}
