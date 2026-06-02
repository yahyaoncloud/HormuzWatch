package integrations

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"Geospatial-harmuz-watch/server/internal/heatmap"
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

func StartGDELT() {
	// GDELT 2.0 GEO API: Geospatial and conflict events in the Middle East
	url := "https://api.gdeltproject.org/api/v2/geo/geo?query=Geospatial&format=GeoJSON"

	// Rate limit: Poll every 15 minutes
	ticker := time.NewTicker(15 * time.Minute)
	defer ticker.Stop()

	client := &http.Client{Timeout: 15 * time.Second}

	for {
		log.Println("Fetching GDELT geopolitical data...")

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			log.Printf("GDELT Request error: %v", err)
			<-ticker.C
			continue
		}

		resp, err := client.Do(req)
		if err != nil {
			log.Printf("GDELT Do error: %v", err)
			<-ticker.C
			continue
		}

		if resp.StatusCode != http.StatusOK {
			log.Printf("GDELT non-200 status: %v", resp.StatusCode)
			resp.Body.Close()
			<-ticker.C
			continue
		}

		var data GDELTGeoJSON
		if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
			log.Printf("GDELT decode error: %v", err)
			resp.Body.Close()
			<-ticker.C
			continue
		}
		resp.Body.Close()

		// Add GDELT events to the heatmap (Danger Zones)
		// We add each event multiple times to artificially increase the "heat" or danger
		count := 0
		for _, feature := range data.Features {
			if len(feature.Geometry.Coordinates) >= 2 {
				lon := feature.Geometry.Coordinates[0]
				lat := feature.Geometry.Coordinates[1]

				// Increase weight of this area in the heatmap
				for i := 0; i < 5; i++ {
					heatmap.AddTelemetry(lat, lon)
				}
				count++
			}
		}

		log.Printf("Processed %d GDELT danger zone events.", count)

		<-ticker.C
	}
}
