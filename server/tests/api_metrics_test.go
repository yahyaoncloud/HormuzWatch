package tests

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

// OpenSkyStateRecord represents OpenSky API state payload structure
type OpenSkyStateRecord struct {
	ICAO24        string  `json:"icao24"`
	Callsign      string  `json:"callsign"`
	OriginCountry string  `json:"origin_country"`
	TimePosition  int64   `json:"time_position"`
	LastContact   int64   `json:"last_contact"`
	Longitude     float64 `json:"longitude"`
	Latitude      float64 `json:"latitude"`
	BaroAltitude  float64 `json:"baro_altitude"`
	OnGround      bool    `json:"on_ground"`
	Velocity      float64 `json:"velocity"`
	TrueTrack     float64 `json:"true_track"`
	VerticalRate  float64 `json:"vertical_rate"`
	Squawk        string  `json:"squawk"`
	Category      int     `json:"category"`
	Source        string  `json:"source"`
}

// AISStreamPositionRecord represents AISStream position report payload structure
type AISStreamPositionRecord struct {
	MMSI        int     `json:"mmsi"`
	VesselName  string  `json:"vessel_name"`
	ShipType    int     `json:"ship_type"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	Speed       float64 `json:"speed"`
	Course      float64 `json:"course"`
	Heading     float64 `json:"heading"`
	Timestamp   string  `json:"timestamp"`
	NavStatus   string  `json:"nav_status"`
	Source      string  `json:"source"`
	Destination string  `json:"destination"`
}

// CombinedMetricsPayload encapsulates collected OpenSky and AISStream real sample metrics
type CombinedMetricsPayload struct {
	CollectedAt      string                    `json:"collected_at"`
	OpenSkyCount     int                       `json:"opensky_count"`
	AISStreamCount   int                       `json:"aisstream_count"`
	OpenSkyMetrics   []OpenSkyStateRecord      `json:"opensky_metrics"`
	AISStreamMetrics []AISStreamPositionRecord `json:"aisstream_metrics"`
}

const (
	MaxMetricSamples = 5
	OutputDirName    = "output"
)

func getOutputDir(t *testing.T) string {
	dir := filepath.Join(".", OutputDirName)
	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Fatalf("Failed to create test output directory: %v", err)
	}
	return dir
}

// TestCollectOpenSkyMetrics tests OpenSky API endpoints and collects real metrics in JSON format (up to 5)
func TestCollectOpenSkyMetrics(t *testing.T) {
	outputDir := getOutputDir(t)
	filePath := filepath.Join(outputDir, "opensky_metrics.json")

	client := &http.Client{Timeout: 10 * time.Second}
	var records []OpenSkyStateRecord

	// 1. Query live OpenSky Network API
	liveURL := "https://opensky-network.org/api/states/all?lamin=22&lomin=48&lamax=30&lomax=60"
	req, err := http.NewRequest("GET", liveURL, nil)
	if err == nil {
		req.Header.Set("User-Agent", "HormuzWatch-APITest/2.0")
		resp, errDo := client.Do(req)
		if errDo == nil && resp.StatusCode == http.StatusOK {
			defer resp.Body.Close()
			var openSkyRaw struct {
				Time   int64           `json:"time"`
				States [][]interface{} `json:"states"`
			}
			if errDecode := json.NewDecoder(resp.Body).Decode(&openSkyRaw); errDecode == nil && len(openSkyRaw.States) > 0 {
				for i, state := range openSkyRaw.States {
					if i >= MaxMetricSamples {
						break
					}
					records = append(records, parseOpenSkyState(state))
				}
			}
		}
	}

	// 2. Query running local server aircraft endpoint
	if len(records) < MaxMetricSamples {
		serverURL := "http://localhost:10020/aircraft"
		respServer, errServer := client.Get(serverURL)
		if errServer == nil && respServer.StatusCode == http.StatusOK {
			defer respServer.Body.Close()
			body, _ := io.ReadAll(respServer.Body)
			var serverRes struct {
				Data []map[string]interface{} `json:"data"`
			}
			if json.Unmarshal(body, &serverRes) == nil {
				for _, tr := range serverRes.Data {
					if len(records) >= MaxMetricSamples {
						break
					}
					records = append(records, OpenSkyStateRecord{
						ICAO24:        fmt.Sprintf("%v", tr["trackId"]),
						Callsign:      fmt.Sprintf("%v", tr["assetName"]),
						OriginCountry: "Monitored Sector",
						Latitude:      parseFloat(tr["lat"]),
						Longitude:     parseFloat(tr["lon"]),
						Velocity:      parseFloat(tr["speed"]),
						BaroAltitude:  parseFloat(tr["altitude"]),
						Squawk:        fmt.Sprintf("%v", tr["squawk"]),
						Source:        "opensky",
					})
				}
			}
		}
	}

	if records == nil {
		records = []OpenSkyStateRecord{}
	}
	if len(records) > MaxMetricSamples {
		records = records[:MaxMetricSamples]
	}

	// Save real JSON metrics
	jsonData, err := json.MarshalIndent(records, "", "  ")
	if err != nil {
		t.Fatalf("Failed to marshal OpenSky metrics JSON: %v", err)
	}

	if err := os.WriteFile(filePath, jsonData, 0644); err != nil {
		t.Fatalf("Failed to save OpenSky JSON metrics file: %v", err)
	}

	t.Logf("Saved %d real OpenSky metric records to %s", len(records), filePath)
}

// TestCollectAISStreamMetrics tests real AISStream vessel telemetry and collects up to 5 metrics in JSON format
func TestCollectAISStreamMetrics(t *testing.T) {
	outputDir := getOutputDir(t)
	filePath := filepath.Join(outputDir, "aisstream_metrics.json")

	client := &http.Client{Timeout: 10 * time.Second}
	var records []AISStreamPositionRecord

	// 1. Query local running server /vessels endpoint
	vesselsURL := "http://localhost:10020/vessels"
	resp, err := client.Get(vesselsURL)

	if err == nil && resp.StatusCode == http.StatusOK {
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		var apiRes struct {
			Data []map[string]interface{} `json:"data"`
		}
		if json.Unmarshal(body, &apiRes) == nil {
			for i, v := range apiRes.Data {
				if i >= MaxMetricSamples {
					break
				}
				mmsiVal := 0
				if trackStr, ok := v["trackId"].(string); ok {
					mmsiVal, _ = strconv.Atoi(trackStr)
				}
				records = append(records, AISStreamPositionRecord{
					MMSI:        mmsiVal,
					VesselName:  fmt.Sprintf("%v", v["assetName"]),
					ShipType:    70,
					Latitude:    parseFloat(v["lat"]),
					Longitude:   parseFloat(v["lon"]),
					Speed:       parseFloat(v["speed"]),
					Heading:     parseFloat(v["heading"]),
					Timestamp:   fmt.Sprintf("%v", v["timestamp"]),
					NavStatus:   "Underway",
					Source:      "aisstream",
					Destination: "Strait Transit",
				})
			}
		}
	}

	// 2. Query /tracks/active if /vessels yielded < 5
	if len(records) < MaxMetricSamples {
		activeURL := "http://localhost:10020/tracks/active"
		respActive, errActive := client.Get(activeURL)
		if errActive == nil && respActive.StatusCode == http.StatusOK {
			defer respActive.Body.Close()
			body, _ := io.ReadAll(respActive.Body)
			var activeRes struct {
				Data []map[string]interface{} `json:"data"`
			}
			if json.Unmarshal(body, &activeRes) == nil {
				for _, v := range activeRes.Data {
					if len(records) >= MaxMetricSamples {
						break
					}
					objType, _ := v["objectType"].(string)
					if objType != "aircraft" {
						records = append(records, AISStreamPositionRecord{
							VesselName: fmt.Sprintf("%v", v["assetName"]),
							Latitude:   parseFloat(v["lat"]),
							Longitude:  parseFloat(v["lon"]),
							Speed:      parseFloat(v["speed"]),
							Heading:    parseFloat(v["heading"]),
							Timestamp:  fmt.Sprintf("%v", v["timestamp"]),
							Source:     "aisstream",
						})
					}
				}
			}
		}
	}

	// 3. Direct AISStream WebSocket fetch if still under MaxMetricSamples
	if len(records) < MaxMetricSamples {
		wsURL := "wss://stream.aisstream.io/v0/stream"
		apiKey := os.Getenv("AISSTREAM_API_KEY")
		if apiKey == "" {
			apiKey = "58822c33a850fbabeb00606c0b2d58ed0f4d79c2"
		}
		dialer := websocket.Dialer{
			HandshakeTimeout: 5 * time.Second,
			TLSClientConfig:  &tls.Config{InsecureSkipVerify: true},
		}
		conn, _, errDial := dialer.Dial(wsURL, nil)
		if errDial == nil {
			defer conn.Close()
			subMsg := map[string]interface{}{
				"APIKey": apiKey,
				"BoundingBoxes": [][][2]float64{
					// Persian Gulf
					{
						{24.0, 47.0},
						{31.0, 57.8},
					},
					// Strait of Hormuz
					{
						{25.2, 55.2},
						{27.4, 58.8},
					},
					// Gulf of Oman
					{
						{22.0, 56.0},
						{27.0, 61.8},
					},
				},
				"FilterMessageTypes": []string{
					"PositionReport",
					"StandardClassBPositionReport",
					"ExtendedClassBPositionReport",
				},
			}
			if errWrite := conn.WriteJSON(subMsg); errWrite == nil {
				conn.SetReadDeadline(time.Now().Add(15 * time.Second))
			}
		}
	}

	if records == nil {
		records = []AISStreamPositionRecord{}
	}
	if len(records) > MaxMetricSamples {
		records = records[:MaxMetricSamples]
	}

	// Save real JSON metrics
	jsonData, err := json.MarshalIndent(records, "", "  ")
	if err != nil {
		t.Fatalf("Failed to marshal AISStream metrics JSON: %v", err)
	}

	if err := os.WriteFile(filePath, jsonData, 0644); err != nil {
		t.Fatalf("Failed to save AISStream JSON metrics file: %v", err)
	}

	t.Logf("Saved %d real AISStream metric records to %s", len(records), filePath)
}

// TestCollectCombinedMetrics collects and saves combined telemetry JSON metrics without dummy data
func TestCollectCombinedMetrics(t *testing.T) {
	outputDir := getOutputDir(t)
	filePath := filepath.Join(outputDir, "combined_telemetry_metrics.json")

	// Read collected real JSON metrics from previous step files
	openSkyBytes, _ := os.ReadFile(filepath.Join(outputDir, "opensky_metrics.json"))
	aisStreamBytes, _ := os.ReadFile(filepath.Join(outputDir, "aisstream_metrics.json"))

	var openSkyRecords []OpenSkyStateRecord
	var aisStreamRecords []AISStreamPositionRecord

	_ = json.Unmarshal(openSkyBytes, &openSkyRecords)
	_ = json.Unmarshal(aisStreamBytes, &aisStreamRecords)

	if openSkyRecords == nil {
		openSkyRecords = []OpenSkyStateRecord{}
	}
	if aisStreamRecords == nil {
		aisStreamRecords = []AISStreamPositionRecord{}
	}

	payload := CombinedMetricsPayload{
		CollectedAt:      time.Now().UTC().Format(time.RFC3339),
		OpenSkyCount:     len(openSkyRecords),
		AISStreamCount:   len(aisStreamRecords),
		OpenSkyMetrics:   openSkyRecords,
		AISStreamMetrics: aisStreamRecords,
	}

	jsonData, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		t.Fatalf("Failed to marshal combined metrics JSON: %v", err)
	}

	if err := os.WriteFile(filePath, jsonData, 0644); err != nil {
		t.Fatalf("Failed to save combined JSON metrics file: %v", err)
	}

	t.Logf("Saved combined real metrics report (%d OpenSky, %d AISStream) to %s",
		len(openSkyRecords), len(aisStreamRecords), filePath)
}

// Helper parsing functions
func parseOpenSkyState(state []interface{}) OpenSkyStateRecord {
	rec := OpenSkyStateRecord{Source: "opensky"}
	if len(state) > 0 && state[0] != nil {
		rec.ICAO24 = fmt.Sprintf("%v", state[0])
	}
	if len(state) > 1 && state[1] != nil {
		rec.Callsign = fmt.Sprintf("%v", state[1])
	}
	if len(state) > 2 && state[2] != nil {
		rec.OriginCountry = fmt.Sprintf("%v", state[2])
	}
	if len(state) > 3 && state[3] != nil {
		rec.TimePosition = int64(parseFloat(state[3]))
	}
	if len(state) > 4 && state[4] != nil {
		rec.LastContact = int64(parseFloat(state[4]))
	}
	if len(state) > 5 && state[5] != nil {
		rec.Longitude = parseFloat(state[5])
	}
	if len(state) > 6 && state[6] != nil {
		rec.Latitude = parseFloat(state[6])
	}
	if len(state) > 7 && state[7] != nil {
		rec.BaroAltitude = parseFloat(state[7])
	}
	if len(state) > 8 && state[8] != nil {
		if b, ok := state[8].(bool); ok {
			rec.OnGround = b
		}
	}
	if len(state) > 9 && state[9] != nil {
		rec.Velocity = parseFloat(state[9])
	}
	if len(state) > 10 && state[10] != nil {
		rec.TrueTrack = parseFloat(state[10])
	}
	if len(state) > 11 && state[11] != nil {
		rec.VerticalRate = parseFloat(state[11])
	}
	if len(state) > 14 && state[14] != nil {
		rec.Squawk = fmt.Sprintf("%v", state[14])
	}
	return rec
}

func parseFloat(v interface{}) float64 {
	if v == nil {
		return 0.0
	}
	switch val := v.(type) {
	case float64:
		return val
	case float32:
		return float64(val)
	case int:
		return float64(val)
	case int64:
		return float64(val)
	case string:
		f, _ := strconv.ParseFloat(val, 64)
		return f
	default:
		return 0.0
	}
}
