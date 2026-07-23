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

	// Middle East Bounding Box: 22°N to 30°N, 48°E to 60°E
	// Format: [[minLat, minLon], [maxLat, maxLon]]
	boundingBox := [][2]float64{
		{22.0, 48.0}, // Bottom left
		{30.0, 60.0}, // Top right
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
			APIKey:             apiKey,
			BoundingBoxes:      [][][2]float64{boundingBox},
			FilterMessageTypes: []string{"PositionReport"},
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

			// Decode using the official aisstream.io message models.
			var aisMsg aisStream.AisStreamMessage
			if err := json.Unmarshal(message, &aisMsg); err != nil {
				continue
			}

			if aisMsg.MessageType != aisStream.POSITION_REPORT || aisMsg.Message.PositionReport == nil {
				continue
			}
			pr := aisMsg.Message.PositionReport

			// Skip invalid / sentinel positions.
			if pr.Latitude < -90 || pr.Latitude > 90 || pr.Longitude < -180 || pr.Longitude > 180 {
				continue
			}

			mmsi := fmt.Sprintf("%d", pr.UserID)

			shipName := "Unknown Vessel"
			if v, ok := aisMsg.MetaData["ShipName"]; ok {
				if s, ok := v.(string); ok && s != "" {
					shipName = s
				}
			}

			timeUTC := ""
			if v, ok := aisMsg.MetaData["time_utc"]; ok {
				if s, ok := v.(string); ok {
					timeUTC = s
				}
			}

			speed := pr.Sog
			heading := pr.Cog

			payload := api.TelemetryPayload{
				TrackID:           mmsi,
				AssetName:         shipName,
				Timestamp:         timeUTC,
				Lat:               pr.Latitude,
				Lon:               pr.Longitude,
				Speed:             speed,
				Heading:           heading,
				AisAgeMinutes:     0, // Will be updated by TSM
				HotZoneDistanceNm: 0, // Will be handled by Features
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
