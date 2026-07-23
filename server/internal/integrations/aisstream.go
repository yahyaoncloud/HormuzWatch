package integrations

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	aisStream "github.com/aisstream/ais-message-models/golang/aisStream"

	"Geospatial-harmuz-watch/server/internal/api"
	"Geospatial-harmuz-watch/server/internal/domain/telemetry"
	"Geospatial-harmuz-watch/server/internal/intelligence"

	"github.com/gorilla/websocket"
)

type AISStreamSubscription struct {
	APIKey             string         `json:"APIKey"`
	BoundingBoxes      [][][2]float64 `json:"BoundingBoxes"`
	FiltersShipMMSI    []string       `json:"FiltersShipMMSI,omitempty"`
	FilterMessageTypes []string       `json:"FilterMessageTypes,omitempty"`
}

func StartAISStream(p *intelligence.Pipeline) {
	apiKey := os.Getenv("AISSTREAM_API_KEY")
	if apiKey == "" || apiKey == "your_aisstream_api_key" {
		log.Println("AISSTREAM_API_KEY not configured. Skipping AISStream integration.")
		return
	}

	url := "wss://stream.aisstream.io/v0/stream"

	// Bounding Box for AISStream Subscription: Regional Middle East / Arabian Peninsula / Gulf
	// Latitude: 10.0°N to 35.0°N, Longitude: 32.0°E to 75.0°E
	boundingBoxes := [][][2]float64{
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
}

	// Optional TLS bypass for development when stream.aisstream.io presents a
	// certificate that fails system validation (e.g. clock skew / expired cert
	// -> "x509: certificate has expired or is not yet valid"). OFF by default —
	// never enable in production.
	insecure := os.Getenv("AISSTREAM_INSECURE_SKIP_VERIFY") == "true"
	dialer := *websocket.DefaultDialer
	dialer.HandshakeTimeout = 20 * time.Second
	if insecure {
		dialer.TLSClientConfig = &tls.Config{InsecureSkipVerify: true}
	}

	backoff := newRetryBackoff(10*time.Second, 5*time.Minute)
	for {
		log.Println("[AISStream] Connecting to", url, "...")
		conn, resp, err := dialer.Dial(url, nil)
		if err != nil {
			retryAfter := ""
			if resp != nil {
				retryAfter = resp.Header.Get("Retry-After")
				log.Printf("[AISStream] Dial error: %v (HTTP %d)", err, resp.StatusCode)
				resp.Body.Close()
			} else {
				log.Printf("[AISStream] Dial error: %v (no HTTP response)", err)
			}
			delay := backoff.Next(retryAfter)
			log.Printf("[AISStream] Retry in %s", delay)
			time.Sleep(delay)
			continue
		}
		backoff.Reset()

		subMsg := AISStreamSubscription{
	    APIKey: apiKey,
    	BoundingBoxes: boundingBoxes,
    	FilterMessageTypes: []string{
        "PositionReport",
        "StandardClassBPositionReport",
        "ExtendedClassBPositionReport",
    },
}

		subJSON, _ := json.Marshal(subMsg)
		log.Printf("[AISStream] Sending subscription: %s", string(subJSON))

		if err := conn.WriteJSON(subMsg); err != nil {
			log.Printf("[AISStream] Subscription write error: %v", err)
			conn.Close()
			delay := backoff.Next("")
			log.Printf("[AISStream] Retry in %s", delay)
			time.Sleep(delay)
			continue
		}

		log.Println("[AISStream] Connected and subscribed. Awaiting messages...")

		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				log.Printf("[AISStream] Read error: %v", err)
				break
			}

			// Decode using official aisstream.io message models
			var aisMsg aisStream.AisStreamMessage
			if err := json.Unmarshal(message, &aisMsg); err != nil {
				continue
			}

			var lat, lon, speed, heading float64
			var userID int64

			if aisMsg.Message.PositionReport != nil {
				pr := aisMsg.Message.PositionReport
				lat = pr.Latitude
				lon = pr.Longitude
				speed = pr.Sog
				heading = pr.Cog
				userID = int64(pr.UserID)
			} else if aisMsg.Message.StandardClassBPositionReport != nil {
				pr := aisMsg.Message.StandardClassBPositionReport
				lat = pr.Latitude
				lon = pr.Longitude
				speed = pr.Sog
				heading = pr.Cog
				userID = int64(pr.UserID)
			} else if aisMsg.Message.ExtendedClassBPositionReport != nil {
				pr := aisMsg.Message.ExtendedClassBPositionReport
				lat = pr.Latitude
				lon = pr.Longitude
				speed = pr.Sog
				heading = pr.Cog
				userID = int64(pr.UserID)
			} else {
				continue
			}

			// Filter positions strictly to expanded Middle East / Arabian Peninsula / Gulf / Red Sea sector (8.0°N to 32.0°N, 32.0°E to 76.0°E)
			if lat < 8.0 || lat > 32.0 || lon < 32.0 || lon > 76.0 {
				continue
			}

			mmsi := fmt.Sprintf("%d", userID)

			shipName := "Unknown Vessel"
			if v, ok := aisMsg.MetaData["ShipName"]; ok {
				if s, ok := v.(string); ok && s != "" {
					shipName = s
				}
			} else if v, ok := aisMsg.MetaData["ship_name"]; ok {
				if s, ok := v.(string); ok && s != "" {
					shipName = s
				}
			}

			timeUTC := time.Now().UTC().Format(time.RFC3339)
			if v, ok := aisMsg.MetaData["time_utc"]; ok {
				if s, ok := v.(string); ok && s != "" {
					timeUTC = s
				}
			}

			payload := api.TelemetryPayload{
				TrackID:           mmsi,
				AssetName:         shipName,
				Timestamp:         timeUTC,
				Lat:               lat,
				Lon:               lon,
				Speed:             speed,
				Heading:           heading,
				AisAgeMinutes:     0,
				HotZoneDistanceNm: 0,
				ObjectType:        telemetry.DomainVessel,
				Source:            telemetry.SourceAISStream,
			}

			// ── Intelligence Pipeline ──────────────────────────
			p.ProcessObservation(context.Background(), &payload)
		}

		conn.Close()
		delay := backoff.Next("")
		log.Printf("[AISStream] Disconnected. Reconnecting in %s...", delay)
		time.Sleep(delay)
	}
}
