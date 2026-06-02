package integrations

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"Geospatial-harmuz-watch/server/internal/api"
	"Geospatial-harmuz-watch/server/internal/heatmap"
	"Geospatial-harmuz-watch/server/internal/websocket/hub"
)

const (
	AISHubBaseURL    = "https://data.aishub.net"
	AISHubPollInterval = 60 * time.Second // Cache refresh interval
)

// AISHubClient handles communication with AISHub API
type AISHubClient struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

// AISHubResponse represents the JSON response from AISHub API
type AISHubResponse struct {
	Success bool        `json:"success"`
	Data    [][]interface{} `json:"data"` // Array of vessel data arrays
}

// NewAISHubClient creates a new AISHub API client
func NewAISHubClient() *AISHubClient {
	apiKey := os.Getenv("AISHUB_API_KEY")
	baseURL := os.Getenv("AISHUB_BASE_URL")
	
	if baseURL == "" {
		baseURL = AISHubBaseURL
	}

	return &AISHubClient{
		apiKey:  apiKey,
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// FetchVessels retrieves vessel positions from AISHub API
// Bounding box: Middle East region (22°N to 30°N, 48°E to 60°E)
func (c *AISHubClient) FetchVessels() ([]api.TelemetryPayload, error) {
	if c.apiKey == "" || c.apiKey == "your_api_key_here" {
		return nil, fmt.Errorf("AISHUB_API_KEY not configured")
	}

	// AISHub API endpoint for vessel positions
	// Format: https://data.aishub.net/ws.php?format=1&key=API_KEY
	url := fmt.Sprintf("%s/ws.php?format=1&key=%s", c.baseURL, c.apiKey)

	resp, err := c.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch from AISHub: %w", err)
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusOK:
		// Success - process response
	case http.StatusUnauthorized:
		return nil, fmt.Errorf("AISHub unauthorized: check API key")
	case http.StatusForbidden:
		return nil, fmt.Errorf("AISHub access denied: verify permissions")
	case http.StatusTooManyRequests:
		return nil, fmt.Errorf("AISHub rate limit exceeded: increase cache interval")
	default:
		return nil, fmt.Errorf("AISHub non-200 status: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var aisResp AISHubResponse
	if err := json.Unmarshal(body, &aisResp); err != nil {
		return nil, fmt.Errorf("failed to parse AISHub response: %w", err)
	}

	if !aisResp.Success {
		return nil, fmt.Errorf("AISHub returned unsuccessful response")
	}

	var vessels []api.TelemetryPayload
	
	// Parse vessel data
	// AISHub returns array of arrays with vessel information
	// Typical format: [MMSI, Timestamp, Lat, Lon, COG, SOG, ShipName, ...]
	for _, vesselData := range aisResp.Data {
		if len(vesselData) < 7 {
			continue // Skip incomplete records
		}

		// Extract vessel fields
		mmsi, ok := vesselData[0].(float64)
		if !ok {
			continue
		}

		timestamp, ok := vesselData[1].(string)
		if !ok {
			continue
		}

		lat, ok := vesselData[2].(float64)
		if !ok {
			continue
		}

		lon, ok := vesselData[3].(float64)
		if !ok {
			continue
		}

		cog, ok := vesselData[4].(float64)
		if !ok {
			cog = 0
		}

		sog, ok := vesselData[5].(float64)
		if !ok {
			sog = 0
		}

		shipName, ok := vesselData[6].(string)
		if !ok {
			shipName = "Unknown Vessel"
		}

		// Filter by bounding box (Middle East: 22°N to 30°N, 48°E to 60°E)
		if lat < 22.0 || lat > 30.0 || lon < 48.0 || lon > 60.0 {
			continue
		}

		// Calculate AIS age in minutes (approximate)
		aisAgeMinutes := calculateAISAge(timestamp)

		vessel := api.TelemetryPayload{
			TrackID:           strconv.FormatFloat(mmsi, 'f', 0, 64),
			AssetName:         shipName,
			Timestamp:         timestamp,
			Lat:               lat,
			Lon:               lon,
			Speed:             sog,
			Heading:           cog,
			AisAgeMinutes:     aisAgeMinutes,
			HotZoneDistanceNm: 0, // Calculated later if needed
		}

		vessels = append(vessels, vessel)
	}

	return vessels, nil
}

// calculateAISAge calculates the age of AIS data in minutes
func calculateAISAge(timestamp string) int {
	// Parse timestamp (format varies, try common formats)
	var t time.Time
	var err error

	// Try ISO 8601 format
	t, err = time.Parse(time.RFC3339, timestamp)
	if err != nil {
		// Try other common formats
		formats := []string{
			"2006-01-02 15:04:05",
			"2006-01-02T15:04:05Z",
			"02/01/2006 15:04:05",
		}
		
		for _, format := range formats {
			t, err = time.Parse(format, timestamp)
			if err == nil {
				break
			}
		}
		
		if err != nil {
			return 0 // Return 0 if parsing fails
		}
	}

	age := time.Since(t)
	return int(age.Minutes())
}

// StartAISHubWorker runs the AISHub polling loop with caching
func StartAISHubWorker(h *hub.Hub) {
	client := NewAISHubClient()
	
	if client.apiKey == "" || client.apiKey == "your_api_key_here" {
		log.Println("AISHUB_API_KEY not configured. Skipping AISHub integration.")
		return
	}

	log.Println("Starting AISHub worker with %d second poll interval", AISHubPollInterval/time.Second)

	// Cache for vessel positions
	vesselCache := make(map[string]api.TelemetryPayload)

	for {
		log.Printf("Fetching vessel data from AISHub...")
		
		vessels, err := client.FetchVessels()
		if err != nil {
			log.Printf("AISHub fetch error: %v", err)
			
			// Handle rate limiting with backoff
			if strings.Contains(err.Error(), "rate limit") {
				log.Println("Rate limited - extending poll interval")
				time.Sleep(2 * AISHubPollInterval)
				continue
			}
			
			time.Sleep(AISHubPollInterval)
			continue
		}

		log.Printf("Received %d vessels from AISHub", len(vessels))

		// Process each vessel
		for _, vessel := range vessels {
			// Update cache
			vesselCache[vessel.TrackID] = vessel

			// Add to heatmap
			heatmap.AddTelemetry(vessel.Lat, vessel.Lon)

			// Broadcast to WebSocket clients
			select {
			case h.hub.Broadcast <- hub.Message{
				Type: "telemetry",
				Data: vessel,
			}:
			default:
				log.Printf("[AISHub] Hub broadcast channel full, dropping telemetry for %s", vessel.TrackID)
			}
		}

		log.Printf("AISHub cache updated with %d vessels", len(vesselCache))

		// Wait for next poll
		time.Sleep(AISHubPollInterval)
	}
}
