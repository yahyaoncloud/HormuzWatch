package integrations

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"Geospatial-harmuz-watch/server/internal/api"
	"Geospatial-harmuz-watch/server/internal/domain/telemetry"
	"Geospatial-harmuz-watch/server/internal/intelligence"
)

const (
	defaultArcGISURL = "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query"
)

// ArcGISChokepointRecord represents a single daily record from the ArcGIS chokepoints dataset
type ArcGISChokepointRecord struct {
	Date              string `json:"date"`
	Year              int    `json:"year"`
	Month             int    `json:"month"`
	Day               int    `json:"day"`
	PortID            string `json:"portid"`
	PortName          string `json:"portname"`
	NContainer        int    `json:"n_container"`
	NDryBulk          int    `json:"n_dry_bulk"`
	NGeneralCargo     int    `json:"n_general_cargo"`
	NRoro             int    `json:"n_roro"`
	NTanker           int    `json:"n_tanker"`
	NCargo            int    `json:"n_cargo"`
	NTotal            int    `json:"n_total"`
	CapacityContainer int    `json:"capacity_container"`
	CapacityDryBulk   int    `json:"capacity_dry_bulk"`
	CapacityGeneral   int    `json:"capacity_general_cargo"`
	CapacityRoro      int    `json:"capacity_roro"`
	CapacityTanker    int    `json:"capacity_tanker"`
	CapacityCargo     int    `json:"capacity_cargo"`
	CapacityTotal     int    `json:"capacity"`
	ObjectID          int    `json:"ObjectId"`
}

// ArcGISResponse is the top-level response from the ArcGIS FeatureServer query
type ArcGISResponse struct {
	Features []struct {
		Attributes ArcGISChokepointRecord `json:"attributes"`
	} `json:"features"`
	ExceededTransferLimit bool `json:"exceededTransferLimit"`
}

// ArcGISChokepointsWorker fetches daily chokepoint transit data from ArcGIS
// and feeds blockade/transit features to the ML pipeline.
func StartArcGISChokepointsWorker(ctx context.Context, pipeline *intelligence.Pipeline) {
	// Get API URL from env or use default
	apiURL := os.Getenv("ARCGIS_CHOKEPOINTS_URL")
	if apiURL == "" {
		apiURL = defaultArcGISURL
	}

	// Parse interval from env (default: 6 hours)
	intervalHours := 6
	if v := os.Getenv("ARCGIS_FETCH_INTERVAL_HOURS"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			intervalHours = parsed
		}
	}

	// Key chokepoints we care about for HormuzWatch
	// Strait of Hormuz (chokepoint6), Suez Canal (chokepoint1),
	// Bab el-Mandeb (chokepoint4), Malacca Strait (chokepoint5)
	targetChokepoints := map[string]bool{
		"chokepoint6": true, // Strait of Hormuz
		"chokepoint1": true, // Suez Canal
		"chokepoint4": true, // Bab el-Mandeb Strait
		"chokepoint5": true, // Malacca Strait
		"chokepoint3": true, // Bosporus Strait
		"chokepoint8": true, // Gibraltar Strait
	}

	log.Printf("[ArcGIS] Starting chokepoints worker: interval=%dh, url=%s", intervalHours, apiURL)

	ticker := time.NewTicker(time.Duration(intervalHours) * time.Hour)
	defer ticker.Stop()

	// Run once immediately on startup
	fetchAndProcessChokepoints(apiURL, targetChokepoints, pipeline)

	for {
		select {
		case <-ctx.Done():
			log.Println("[ArcGIS] Context canceled, stopping chokepoints worker")
			return
		case <-ticker.C:
			fetchAndProcessChokepoints(apiURL, targetChokepoints, pipeline)
		}
	}
}

func fetchAndProcessChokepoints(apiURL string, targetChokepoints map[string]bool, pipeline *intelligence.Pipeline) {
	log.Println("[ArcGIS] Fetching chokepoints data...")

	// Build query URL for last 30 days of data for target chokepoints
	whereClauses := make([]string, 0, len(targetChokepoints))
	for portID := range targetChokepoints {
		whereClauses = append(whereClauses, fmt.Sprintf("portid='%s'", portID))
	}
	whereClause := strings.Join(whereClauses, " OR ")

	// Add date filter for last 30 days
	cutoff := time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	whereClause += fmt.Sprintf(" AND date >= DATE '%s'", cutoff)

	queryURL := fmt.Sprintf("%s?where=%s&outFields=*&outSR=4326&f=json",
		apiURL, whereClause)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(queryURL)
	if err != nil {
		log.Printf("[ArcGIS] HTTP error: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[ArcGIS] HTTP %d", resp.StatusCode)
		return
	}

	var arcgisResp ArcGISResponse
	if err := json.NewDecoder(resp.Body).Decode(&arcgisResp); err != nil {
		log.Printf("[ArcGIS] JSON decode error: %v", err)
		return
	}

	log.Printf("[ArcGIS] Received %d records", len(arcgisResp.Features))

	// Process each record and convert to ML features
	for _, feature := range arcgisResp.Features {
		record := feature.Attributes
		if !targetChokepoints[record.PortID] {
			continue
		}

		// Create blockade features from daily aggregate data
		blockadeFeatures := createBlockadeFeatures(record)

		// Create a synthetic track ID for this chokepoint
		trackID := fmt.Sprintf("chokepoint-%s-%s", record.PortID, record.Date)

		payload := api.TelemetryPayload{
			TrackID:           trackID,
			AssetName:         fmt.Sprintf("Chokepoint: %s", record.PortName),
			Timestamp:         record.Date + "T12:00:00Z", // Midday timestamp for daily aggregate
			Lat:               0, // Will be filled by geofence lookup
			Lon:               0,
			Speed:             0,
			COG:               0,
			Heading:           telemetry.HeadingUnavailable,
			AisAgeMinutes:     0,
			HotZoneDistanceNm: 0,
			ObjectType:        telemetry.DomainVessel,
			Source:            telemetry.SourceArcGIS,
		}

		// Enqueue with custom features for blockade detection
		pipeline.EnqueueBlockadeObservation(trackID, blockadeFeatures, payload)
	}
}

// createBlockadeFeatures converts ArcGIS daily aggregate data to blockade feature vector
func createBlockadeFeatures(record ArcGISChokepointRecord) intelligence.BlockadeFeatures {
	// Calculate anchored ratio: vessels not moving (approximation from cargo vs tanker patterns)
	totalVessels := record.NTotal
	if totalVessels == 0 {
		totalVessels = 1
	}

	// Tankers and cargo vessels more likely to be anchored waiting
	waitingEstimate := record.NTanker + record.NCargo
	anchoredRatio := float64(waitingEstimate) / float64(totalVessels) * 100.0

	// Estimate waiting fleets based on vessel counts
	waiting6h := record.NTanker / 4  // rough estimate
	waiting24h := record.NTanker / 2

	// Flag entropy: diversity of vessel types
	types := []int{record.NContainer, record.NDryBulk, record.NGeneralCargo, record.NRoro, record.NTanker}
	flagEntropy := calculateTypeEntropy(types)

	return intelligence.BlockadeFeatures{
		StraitTransits24h:    record.NTotal,
		AnchoredRatioPct:     anchoredRatio,
		WaitingFleet6h:       waiting6h,
		WaitingFleet24h:      waiting24h,
		ActiveVessels:        record.NTotal,
		AnchorageZoneCount:   1, // Each chokepoint is one zone
		FlagEntropy:          flagEntropy,
	}
}

// calculateTypeEntropy computes Shannon entropy of vessel type distribution
func calculateTypeEntropy(counts []int) float64 {
	total := 0
	for _, c := range counts {
		total += c
	}
	if total == 0 {
		return 0.0
	}

	entropy := 0.0
	for _, c := range counts {
		if c > 0 {
			p := float64(c) / float64(total)
			entropy -= p * log2(p)
		}
	}
	// Normalize to 0-1 range (max entropy for 5 types is log2(5) ≈ 2.32)
	maxEntropy := log2(5.0)
	if maxEntropy > 0 {
		entropy /= maxEntropy
	}
	return entropy
}

func log2(x float64) float64 {
	return math.Log2(x)
}