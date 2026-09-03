package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/websocket"
)

func main() {
	fmt.Println("==================================================")
	fmt.Println("   HORMUZ WATCH — LIVE AIS PROVIDER DIAGNOSTIC")
	fmt.Println("==================================================")
	fmt.Println()

	// 1. Diagnose Open Waters REST snapshot
	diagnoseOpenWatersREST()

	// 2. Diagnose Open Waters WebSocket
	diagnoseOpenWatersWS()

	// 3. Diagnose AISStream.io WebSocket
	diagnoseAISStreamWS()
}

func diagnoseOpenWatersREST() {
	fmt.Println("──────────────────────────────────────────────────")
	fmt.Println("1. DIAGNOSING OPEN WATERS REST API (GET /v1/vessels)")
	fmt.Println("──────────────────────────────────────────────────")

	url := "https://ais.openwaters.io/v1/vessels"
	resp, err := http.Get(url)
	if err != nil {
		fmt.Printf("❌ Failed to connect to Open Waters REST: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("❌ Failed to read body: %v\n", err)
		return
	}

	var fc struct {
		Type     string `json:"type"`
		Features []struct {
			Geometry struct {
				Coordinates []float64 `json:"coordinates"`
			} `json:"geometry"`
			Properties struct {
				MMSI    any    `json:"mmsi"`
				Name    string `json:"name"`
				SOG     any    `json:"sog"`
				COG     any    `json:"cog"`
				Station string `json:"station"`
				Source  string `json:"source"`
				Seen    string `json:"seen"`
			} `json:"properties"`
		} `json:"features"`
	}

	if err := json.Unmarshal(body, &fc); err != nil {
		fmt.Printf("❌ Failed to parse GeoJSON: %v\n", err)
		return
	}

	fmt.Printf("✅ Open Waters REST returned %d total global vessels.\n", len(fc.Features))

	// Check how many are in the Gulf (Lat: 21.0..32.5, Lon: 46.5..62.5)
	gulfCount := 0
	otherRegions := make(map[string]int)

	for _, f := range fc.Features {
		if len(f.Geometry.Coordinates) >= 2 {
			lon := f.Geometry.Coordinates[0]
			lat := f.Geometry.Coordinates[1]

			if lat >= 21.0 && lat <= 32.5 && lon >= 46.5 && lon <= 62.5 {
				gulfCount++
				fmt.Printf("   🚢 GULF VESSEL FOUND: MMSI=%v Name=%q Lat=%.4f Lon=%.4f Station=%s Source=%s\n",
					f.Properties.MMSI, f.Properties.Name, lat, lon, f.Properties.Station, f.Properties.Source)
			} else {
				// Record region clusters
				if lat > 50 && lon > 0 && lon < 40 {
					otherRegions["Baltic / North Europe"]++
				} else if lat > 30 && lat < 45 && lon > -10 && lon < 40 {
					otherRegions["Mediterranean"]++
				} else if lon < -50 {
					otherRegions["Americas"]++
				} else {
					otherRegions["Other Global"]++
				}
			}
		}
	}

	fmt.Printf("📊 Coverage Breakdown in Open Waters snapshot:\n")
	fmt.Printf("   • Persian Gulf / Strait of Hormuz: %d vessels\n", gulfCount)
	for region, count := range otherRegions {
		fmt.Printf("   • %s: %d vessels\n", region, count)
	}
	fmt.Println()
}

func diagnoseOpenWatersWS() {
	fmt.Println("──────────────────────────────────────────────────")
	fmt.Println("2. DIAGNOSING OPEN WATERS WEBSOCKET (v1/stream)")
	fmt.Println("──────────────────────────────────────────────────")

	url := "wss://ais.openwaters.io/v1/stream?bbox=54.0,24.0,58.0,28.0"
	fmt.Printf("Connecting to %s ...\n", url)

	dialer := websocket.Dialer{
		HandshakeTimeout: 10 * time.Second,
		TLSClientConfig:  &tls.Config{InsecureSkipVerify: true},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	conn, resp, err := dialer.DialContext(ctx, url, nil)
	if err != nil {
		fmt.Printf("❌ Dial error: %v\n", err)
		if resp != nil {
			fmt.Printf("   HTTP Status: %d\n", resp.StatusCode)
		}
		return
	}
	defer conn.Close()

	fmt.Println("✅ WebSocket connected! Listening for 6 seconds...")

	// Read frames
	deadline := time.Now().Add(6 * time.Second)
	conn.SetReadDeadline(deadline)

	framesReceived := 0
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}
		framesReceived++
		fmt.Printf("   📩 Frame %d: %s\n", framesReceived, string(msg)[:min(len(msg), 200)])
	}

	if framesReceived == 1 {
		fmt.Println("ℹ️ Only welcome frame received (no live feeder stations currently active in Hormuz bbox on Open Waters).")
	}
	fmt.Println()
}

func diagnoseAISStreamWS() {
	fmt.Println("──────────────────────────────────────────────────")
	fmt.Println("3. DIAGNOSING AISSTREAM.IO WEBSOCKET")
	fmt.Println("──────────────────────────────────────────────────")

	apiKey := os.Getenv("AIS_STREAM_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("AISSTREAM_API_KEY")
	}

	fmt.Printf("API Key Present: %v\n", apiKey != "" && apiKey != "your_aisstream_api_key")
	if apiKey == "" || apiKey == "your_aisstream_api_key" {
		fmt.Println("⚠️ AIS_STREAM_API_KEY is not configured in environment.")
		fmt.Println("   AISStream.io requires a free API key from https://aisstream.io")
		return
	}

	url := "wss://stream.aisstream.io/v0/stream"
	fmt.Printf("Connecting to %s ...\n", url)

	dialer := websocket.Dialer{HandshakeTimeout: 10 * time.Second}
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	conn, _, err := dialer.DialContext(ctx, url, nil)
	if err != nil {
		fmt.Printf("❌ Dial error: %v\n", err)
		return
	}
	defer conn.Close()

	// Send subscription
	sub := map[string]interface{}{
		"APIKey": apiKey,
		"BoundingBoxes": [][][2]float64{
			{{23.5, 47.0}, {31.5, 56.5}},
			{{25.0, 55.0}, {27.5, 57.5}},
			{{22.0, 56.0}, {26.5, 62.0}},
		},
		"FilterMessageTypes": []string{"PositionReport", "StandardClassBPositionReport", "ExtendedClassBPositionReport"},
	}

	if err := conn.WriteJSON(sub); err != nil {
		fmt.Printf("❌ Failed to send subscription: %v\n", err)
		return
	}

	fmt.Println("✅ Subscribed! Listening for 6 seconds...")
	conn.SetReadDeadline(time.Now().Add(6 * time.Second))

	count := 0
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}
		count++
		fmt.Printf("   📩 AISStream Packet %d: %s\n", count, string(msg)[:min(len(msg), 180)])
		if count >= 5 {
			break
		}
	}
	fmt.Println()
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
