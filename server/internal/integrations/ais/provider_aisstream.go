package ais

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	aisStream "github.com/aisstream/ais-message-models/golang/aisStream"
	"github.com/gorilla/websocket"

	"Geospatial-harmuz-watch/server/internal/domain/telemetry"
)

// AISStreamProvider implements AISProvider for the AISStream.io WebSocket feed.
type AISStreamProvider struct {
	apiKey          string
	url             string
	boundingBoxes   [][][2]float64
	healthMu        sync.RWMutex
	health          ProviderHealth
	totalMessages   uint64
	droppedMessages uint64
	reconnectCount  uint32
	conn            *websocket.Conn
	connMu          sync.Mutex
	onObservation   func(*NormalizedAISObservation)
}

// NewAISStreamProvider instantiates the AISStream.io provider adapter.
func NewAISStreamProvider() *AISStreamProvider {
	apiKey := strings.TrimSpace(os.Getenv("AIS_STREAM_API_KEY"))
	if apiKey == "" {
		apiKey = strings.TrimSpace(os.Getenv("AISSTREAM_API_KEY"))
	}

	url := os.Getenv("AIS_STREAM_URL")
	if url == "" {
		url = "wss://stream.aisstream.io/v0/stream"
	}

	boxes := DefaultBoundingBoxes()
	if envBoxes := os.Getenv("AIS_BOUNDING_BOXES"); envBoxes != "" {
		var parsed [][][2]float64
		if err := json.Unmarshal([]byte(envBoxes), &parsed); err == nil && len(parsed) > 0 {
			boxes = parsed
		}
	}

	return &AISStreamProvider{
		apiKey:        apiKey,
		url:           url,
		boundingBoxes: boxes,
		health: ProviderHealth{
			Provider: "aisstream",
			Status:   "initialized",
		},
	}
}

func (p *AISStreamProvider) Name() string {
	return "aisstream"
}

func (p *AISStreamProvider) Start(ctx context.Context, onObservation func(*NormalizedAISObservation)) error {
	p.onObservation = onObservation
	go p.streamLoop(ctx)
	return nil
}

func (p *AISStreamProvider) Stop() error {
	p.connMu.Lock()
	defer p.connMu.Unlock()
	if p.conn != nil {
		p.conn.Close()
	}
	p.setHealthStatus("stopped", false, "")
	return nil
}

func (p *AISStreamProvider) Health() ProviderHealth {
	p.healthMu.RLock()
	defer p.healthMu.RUnlock()

	h := p.health
	h.TotalMessages = atomic.LoadUint64(&p.totalMessages)
	h.DroppedMessages = atomic.LoadUint64(&p.droppedMessages)
	h.ReconnectCount = atomic.LoadUint32(&p.reconnectCount)
	return h
}

func (p *AISStreamProvider) GetSnapshot(ctx context.Context) ([]*NormalizedAISObservation, error) {
	// AISStream.io does not offer a REST snapshot endpoint
	return nil, nil
}

func (p *AISStreamProvider) streamLoop(ctx context.Context) {
	backoff := 5 * time.Second
	const maxBackoff = 3 * time.Minute

	dialer := websocket.Dialer{
		HandshakeTimeout:  15 * time.Second,
		EnableCompression: true,
	}
	if os.Getenv("AISSTREAM_INSECURE_SKIP_VERIFY") == "true" {
		dialer.TLSClientConfig = &tls.Config{InsecureSkipVerify: true}
	}

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		p.setHealthStatus("connecting", false, "")
		log.Printf("[AISStream] Dialing %s...", p.url)

		conn, resp, err := dialer.DialContext(ctx, p.url, http.Header{
			"User-Agent": []string{"HormuzWatch-MaritimeIntelligence/2.0"},
		})
		if err != nil {
			atomic.AddUint32(&p.reconnectCount, 1)
			errMsg := fmt.Sprintf("Dial error: %v", err)
			if resp != nil {
				errMsg = fmt.Sprintf("Dial HTTP %d: %v", resp.StatusCode, err)
				resp.Body.Close()
			}
			p.setHealthStatus("reconnecting", false, errMsg)

			jitter := time.Duration(float64(backoff) * (0.8 + 0.4*rand.Float64()))
			log.Printf("[AISStream] %s. Retrying in %s...", errMsg, jitter)

			select {
			case <-ctx.Done():
				return
			case <-time.After(jitter):
			}
			backoff = time.Duration(math.Min(float64(backoff*2), float64(maxBackoff)))
			continue
		}

		p.connMu.Lock()
		p.conn = conn
		p.connMu.Unlock()

		backoff = 5 * time.Second

		// Send subscription payload
		sub := AISStreamSubscription{
			APIKey:        p.apiKey,
			BoundingBoxes: p.boundingBoxes,
			FilterMessageTypes: []string{
				"PositionReport",
				"ShipStaticData",
				"StaticDataReport",
				"StandardClassBPositionReport",
				"ExtendedClassBPositionReport",
				"LongRangeAisBroadcastMessage",
				"AidsToNavigationReport",
				"AddressedSafetyMessage",
				"SafetyBroadcastMessage",
				"StandardSearchAndRescueAircraftReport",
			},
		}

		if err := conn.WriteJSON(sub); err != nil {
			log.Printf("[AISStream] Subscription failed: %v", err)
			conn.Close()
			continue
		}

		p.setHealthStatus("connected", true, "")
		log.Printf("[AISStream] Connected and subscribed. Awaiting messages...")

		p.readStream(ctx, conn)

		p.connMu.Lock()
		if p.conn != nil {
			p.conn.Close()
			p.conn = nil
		}
		p.connMu.Unlock()

		p.setHealthStatus("disconnected", false, "Connection closed by remote")
	}
}

func (p *AISStreamProvider) readStream(ctx context.Context, conn *websocket.Conn) {
	conn.SetReadLimit(10 * 1024 * 1024)
	conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		msgType, msgBytes, err := conn.ReadMessage()
		if err != nil {
			log.Printf("[AISStream] Read error: %v", err)
			return
		}
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))

		if msgType == websocket.BinaryMessage {
			decompressed, decErr := decompressZlib(msgBytes)
			if decErr == nil {
				msgBytes = decompressed
			}
		}

		atomic.AddUint64(&p.totalMessages, 1)
		p.healthMu.Lock()
		p.health.LastEventAt = time.Now().UTC()
		p.healthMu.Unlock()

		var aisMsg aisStream.AisStreamMessage
		if err := json.Unmarshal(msgBytes, &aisMsg); err != nil {
			continue
		}

		obs := p.normalizeAISMessage(&aisMsg)
		if obs != nil && p.onObservation != nil {
			p.onObservation(obs)
		}
	}
}

func (p *AISStreamProvider) normalizeAISMessage(aisMsg *aisStream.AisStreamMessage) *NormalizedAISObservation {
	var shipName string
	if v, ok := aisMsg.MetaData["ShipName"]; ok {
		if s, ok := v.(string); ok {
			shipName = s
		}
	} else if v, ok := aisMsg.MetaData["ship_name"]; ok {
		if s, ok := v.(string); ok {
			shipName = s
		}
	}

	msgTime := time.Now().UTC()
	if v, ok := aisMsg.MetaData["time_utc"]; ok {
		if s, ok := v.(string); ok {
			if parsed, err := time.Parse(time.RFC3339, s); err == nil {
				msgTime = parsed
			}
		}
	}

	msg := aisMsg.Message

	// PositionReport
	if pr := msg.PositionReport; pr != nil {
		mmsi := CleanMMSI(int64(pr.UserID))
		return p.buildObs(mmsi, shipName, "", pr.Latitude, pr.Longitude, pr.Sog, pr.Cog, float64(pr.TrueHeading), int(pr.NavigationalStatus), float64(pr.RateOfTurn), "PositionReport", msgTime)
	}

	// StandardClassBPositionReport
	if pr := msg.StandardClassBPositionReport; pr != nil {
		mmsi := CleanMMSI(int64(pr.UserID))
		return p.buildObs(mmsi, shipName, "", pr.Latitude, pr.Longitude, pr.Sog, pr.Cog, float64(pr.TrueHeading), NavStatusUnderwayEngine, 0, "StandardClassBPositionReport", msgTime)
	}

	// ExtendedClassBPositionReport
	if pr := msg.ExtendedClassBPositionReport; pr != nil {
		mmsi := CleanMMSI(int64(pr.UserID))
		name := pr.Name
		if name == "" {
			name = shipName
		}
		return p.buildObs(mmsi, name, "", pr.Latitude, pr.Longitude, pr.Sog, pr.Cog, float64(pr.TrueHeading), NavStatusUnderwayEngine, 0, "ExtendedClassBPositionReport", msgTime)
	}

	// LongRangeAisBroadcastMessage
	if lr := msg.LongRangeAisBroadcastMessage; lr != nil {
		mmsi := CleanMMSI(int64(lr.UserID))
		return p.buildObs(mmsi, shipName, "", lr.Latitude, lr.Longitude, lr.Sog, lr.Cog, telemetry.HeadingUnavailable, int(lr.NavigationalStatus), 0, "LongRangeAisBroadcastMessage", msgTime)
	}

	// AidsToNavigationReport
	if aton := msg.AidsToNavigationReport; aton != nil {
		mmsi := CleanMMSI(int64(aton.UserID))
		name := aton.Name
		if name == "" {
			name = "AtoN Navigation Buoy"
		}
		return p.buildObs(mmsi, name, "", aton.Latitude, aton.Longitude, 0, 0, telemetry.HeadingUnavailable, NavStatusMoored, 0, "AidsToNavigationReport", msgTime)
	}

	// StandardSearchAndRescueAircraftReport
	if sar := msg.StandardSearchAndRescueAircraftReport; sar != nil {
		mmsi := CleanMMSI(int64(sar.UserID))
		return p.buildObs(mmsi, "SAR AIRCRAFT", "", sar.Latitude, sar.Longitude, sar.Sog, sar.Cog, telemetry.HeadingUnavailable, NavStatusUnderwayEngine, 0, "StandardSearchAndRescueAircraftReport", msgTime)
	}

	return nil
}

func (p *AISStreamProvider) buildObs(mmsi, name, callsign string, lat, lon, sog, cog, hdg float64, navStatus int, rot float64, msgType string, aisTime time.Time) *NormalizedAISObservation {
	if lat < 21.0 || lat > 32.5 || lon < 46.5 || lon > 62.5 {
		return nil
	}
	if hdg >= 360 {
		hdg = telemetry.HeadingUnavailable
	}

	group, typeName := ShipTypeToGroup(0)
	return &NormalizedAISObservation{
		MMSI:          mmsi,
		VesselName:    CleanVesselName(name),
		Callsign:      callsign,
		ShipTypeName:  typeName,
		ShipGroup:     group,
		Lat:           lat,
		Lon:           lon,
		SOG:           sog,
		COG:           cog,
		TrueHeading:   hdg,
		NavStatusID:   navStatus,
		NavStatusText: NavStatusToString(navStatus),
		RateOfTurn:    rot,
		AisTimestamp:  aisTime,
		LastSeen:      time.Now().UTC(),
		MessageType:   msgType,
		MonitoredZone: DetermineMonitoredZone(lat, lon),
		Provider:      "aisstream",
		Source:        "aisstream.io-cloud",
	}
}

func (p *AISStreamProvider) setHealthStatus(status string, connected bool, errStr string) {
	p.healthMu.Lock()
	defer p.healthMu.Unlock()
	p.health.Status = status
	p.health.IsConnected = connected
	p.health.LastError = errStr
}
