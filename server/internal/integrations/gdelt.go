package integrations

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"Geospatial-harmuz-watch/server/internal/heatmap"
	"Geospatial-harmuz-watch/server/internal/intelligence"
)

type GDELTGeoJSON struct {
	Features []struct {
		Geometry struct {
			Coordinates []float64 `json:"coordinates"`
		} `json:"geometry"`
		Properties struct {
			Name string `json:"name"`
		} `json:"properties"`
	} `json:"features"`
}

func StartGDELT(ctx context.Context) {
	// GDELT 2.0 GEO API: Geospatial and conflict events in the Middle East
	url := "https://api.gdeltproject.org/api/v2/geo/geo?query=Geospatial&format=GeoJSON"

	// Rate limit: Poll every 15 minutes
	ticker := time.NewTicker(15 * time.Minute)
	defer ticker.Stop()

	client := &http.Client{Timeout: 15 * time.Second}

	for {
		log.Println("Fetching GDELT geopolitical data...")

		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			log.Printf("GDELT Request error: %v", err)
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
				log.Printf("GDELT API error: %v", err)
				select {
				case <-ctx.Done():
					return
				case <-ticker.C:
					continue
				}
			}
		}

		if resp.StatusCode == http.StatusOK {
			var gdeltData GDELTGeoJSON
			if err := json.NewDecoder(resp.Body).Decode(&gdeltData); err == nil {
				pointsCount := 0
				for _, f := range gdeltData.Features {
					if len(f.Geometry.Coordinates) >= 2 {
						lon := f.Geometry.Coordinates[0]
						lat := f.Geometry.Coordinates[1]

						// Filter to Middle East / Persian Gulf / Gulf of Oman
						if lat >= 20.0 && lat <= 32.0 && lon >= 45.0 && lon <= 65.0 {
							heatmap.AddGeoEvent(lat, lon)
							intelligence.GeoStore.AddEvent(lat, lon, 0.8)
							pointsCount++
						}
					}
				}
				log.Printf("Ingested %d geopolitical points from GDELT", pointsCount)
			}
		}
		resp.Body.Close()

		select {
		case <-ctx.Done():
			log.Println("[GDELT] Context canceled, stopping worker.")
			return
		case <-ticker.C:
		}
	}
}
