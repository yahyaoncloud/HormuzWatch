package tests

import (
	"crypto/tls"
	"encoding/json"
	"os"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func TestAISStreamConnectionDiag(t *testing.T) {
	apiKey := os.Getenv("AISSTREAM_API_KEY")
	if apiKey == "" {
		apiKey = "58822c33a850fbabeb00606c0b2d58ed0f4d79c2"
	}

	url := "wss://stream.aisstream.io/v0/stream"
	dialer := websocket.Dialer{
		HandshakeTimeout: 10 * time.Second,
		TLSClientConfig:  &tls.Config{InsecureSkipVerify: true},
	}

	t.Logf("Connecting to %s with APIKey length %d...", url, len(apiKey))
	conn, resp, err := dialer.Dial(url, nil)
	if err != nil {
		if resp != nil {
			t.Fatalf("Dial failed with HTTP status %d: %v", resp.StatusCode, err)
		}
		t.Fatalf("Dial failed: %v", err)
	}
	defer conn.Close()

	// Subscribing to BoundingBox: Persian Gulf / Strait of Hormuz / Gulf Peninsula
	// Format: [latitude, longitude] (NOT [longitude, latitude])
	// Using full production bounding boxes to maximize vessel coverage
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
			// Arabian Sea
			{
				{8.0, 56.0},
				{25.0, 76.0},
			},
			// Gulf of Aden & Bab el-Mandeb
			{
				{10.5, 42.0},
				{16.8, 53.0},
			},
			// Red Sea & Suez
			{
				{12.0, 32.0},
				{31.8, 44.0},
			},
		},
		"FilterMessageTypes": []string{
			"PositionReport",
			"StandardClassBPositionReport",
			"ExtendedClassBPositionReport",
		},
	}

	subJSON, _ := json.Marshal(subMsg)
	t.Logf("Sending subscription payload: %s", string(subJSON))

	if err := conn.WriteJSON(subMsg); err != nil {
		t.Fatalf("Failed to write subscription JSON: %v", err)
	}

	t.Log("Subscription sent. Waiting for incoming WebSocket messages (20 sec timeout)...")

	conn.SetReadDeadline(time.Now().Add(20 * time.Second))
	messageCount := 0

	for messageCount < 5 {
		_, message, err := conn.ReadMessage()
		if err != nil {
			t.Logf("Read loop ended: %v (read %d messages total)", err, messageCount)
			break
		}
		messageCount++
		t.Logf("Received Message #%d (%d bytes): %s", messageCount, len(message), string(message))
	}

	t.Logf("AISStream Diagnostic completed. Total raw messages received: %d", messageCount)
}
