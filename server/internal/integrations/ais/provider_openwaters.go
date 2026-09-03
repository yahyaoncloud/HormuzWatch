package ais

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
)

// OpenWatersProvider implements AISProvider for the Open Waters maritime telemetry API.
type OpenWatersProvider struct {
	token           string
	streamURL       string
	apiBaseURL      string
	boundingBoxes   [][][2]float64
	healthMu        sync.RWMutex
	health          ProviderHealth
	totalMessages   uint64
	droppedMessages uint64
	reconnectCount  uint32
	conn            *websocket.Conn
	connMu          sync.Mutex
	onObservation   func(*NormalizedAISObservation)
	httpClient      *http.Client
}

// NewOpenWatersProvider instantiates the Open Waters provider adapter.
func NewOpenWatersProvider() *OpenWatersProvider {
	token := strings.TrimSpace(os.Getenv("OPENWATERS_API_KEY"))
	if token == "" {
		token = strings.TrimSpace(os.Getenv("OPENWATERS_TOKEN"))
	}

	streamURL := os.Getenv("OPENWATERS_STREAM_URL")
	if streamURL == "" {
		streamURL = "wss://ais.openwaters.io/v1/stream"
	}

	apiBase := os.Getenv("OPENWATERS_API_BASE")
	if apiBase == "" {
		apiBase = "https://ais.openwaters.io"
	}

	boxes := DefaultBoundingBoxes()
	if envBoxes := os.Getenv("AIS_BOUNDING_BOXES"); envBoxes != "" {
		var parsed [][][2]float64
		if err := json.Unmarshal([]byte(envBoxes), &parsed); err == nil && len(parsed) > 0 {
			boxes = parsed
		}
	}

	return &OpenWatersProvider{
		token:         token,
		streamURL:     streamURL,
		apiBaseURL:    apiBase,
		boundingBoxes: boxes,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		health: ProviderHealth{
			Provider: "openwaters",
			Status:   "initialized",
		},
	}
}

func (p *OpenWatersProvider) Name() string {
	return "openwaters"
}

func (p *OpenWatersProvider) Start(ctx context.Context, onObservation func(*NormalizedAISObservation)) error {
	p.onObservation = onObservation

	// 1. Recurring snapshot sync for real-time live vessel positioning
	go func() {
		syncSnapshot := func() {
			snapCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
			defer cancel()
			snapshot, err := p.GetSnapshot(snapCtx)
			if err == nil && len(snapshot) > 0 {
				log.Printf("[OpenWaters] Synced %d Gulf vessels from Open Waters snapshot", len(snapshot))
				for _, obs := range snapshot {
					if p.onObservation != nil {
						p.onObservation(obs)
					}
				}
			} else if err != nil {
				log.Printf("[OpenWaters] Snapshot fetch error: %v", err)
			}
		}

		// Initial sync
		syncSnapshot()

		ticker := time.NewTicker(2 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				syncSnapshot()
			}
		}
	}()

	// 2. Launch resilient WebSocket streaming loop
	go p.streamLoop(ctx)
	return nil
}

func (p *OpenWatersProvider) Stop() error {
	p.connMu.Lock()
	defer p.connMu.Unlock()
	if p.conn != nil {
		p.conn.Close()
	}
	p.setHealthStatus("stopped", false, "")
	return nil
}

func (p *OpenWatersProvider) Health() ProviderHealth {
	p.healthMu.RLock()
	defer p.healthMu.RUnlock()

	h := p.health
	h.TotalMessages = atomic.LoadUint64(&p.totalMessages)
	h.DroppedMessages = atomic.LoadUint64(&p.droppedMessages)
	h.ReconnectCount = atomic.LoadUint32(&p.reconnectCount)
	return h
}

// GetSnapshot retrieves the current vessel snapshot from Open Waters GET /v1/vessels GeoJSON endpoint.
func (p *OpenWatersProvider) GetSnapshot(ctx context.Context) ([]*NormalizedAISObservation, error) {
	reqURL := fmt.Sprintf("%s/v1/vessels", strings.TrimRight(p.apiBaseURL, "/"))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "HormuzWatch-MaritimeIntelligence/2.0")
	if p.token != "" {
		req.Header.Set("Authorization", "Bearer "+p.token)
	}

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("snapshot HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	return p.parseGeoJSONPayload(body)
}

func (p *OpenWatersProvider) streamLoop(ctx context.Context) {
	backoff := 5 * time.Second
	const maxBackoff = 3 * time.Minute

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		p.setHealthStatus("connecting", false, "")

		// Build stream URL with compliant Strait of Hormuz bbox (16 sq deg < 100 limit) and optional token
		u, err := url.Parse(p.streamURL)
		if err != nil {
			log.Printf("[OpenWaters] Invalid stream URL: %v", err)
			return
		}
		q := u.Query()
		q.Set("bbox", "54.0,24.0,58.0,28.0")
		q.Set("snapshot", "true")
		if p.token != "" {
			q.Set("token", p.token)
		}
		u.RawQuery = q.Encode()

		dialer := websocket.Dialer{
			HandshakeTimeout:  15 * time.Second,
			EnableCompression: true,
			TLSClientConfig:   &tls.Config{InsecureSkipVerify: true},
		}

		log.Printf("[OpenWaters] Dialing %s...", p.streamURL)
		conn, resp, err := dialer.DialContext(ctx, u.String(), http.Header{
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
			log.Printf("[OpenWaters] %s. Retrying in %s...", errMsg, jitter)
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
		p.setHealthStatus("connected", true, "")
		log.Printf("[OpenWaters] Connected to native stream. Processing messages...")

		// Handle read loop
		p.readStream(ctx, conn)

		p.connMu.Lock()
		if p.conn != nil {
			p.conn.Close()
			p.conn = nil
		}
		p.connMu.Unlock()

		p.setHealthStatus("disconnected", false, "Stream closed by remote")
	}
}

func (p *OpenWatersProvider) readStream(ctx context.Context, conn *websocket.Conn) {
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
			log.Printf("[OpenWaters] Read error: %v", err)
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

		observations := p.normalizeRawFrame(msgBytes)
		for _, obs := range observations {
			if p.onObservation != nil {
				p.onObservation(obs)
			}
		}
	}
}

// normalizeRawFrame parses Open Waters GeoJSON features, feature collections, or JSON frames.
func (p *OpenWatersProvider) normalizeRawFrame(raw []byte) []*NormalizedAISObservation {
	// Try parsing as GeoJSON feature collection or single feature
	if observations, err := p.parseGeoJSONPayload(raw); err == nil && len(observations) > 0 {
		return observations
	}

	// Try parsing as generic Open Waters JSON object
	var obj map[string]interface{}
	if err := json.Unmarshal(raw, &obj); err != nil {
		return nil
	}

	obs := p.parseObjectMap(obj)
	if obs != nil {
		return []*NormalizedAISObservation{obs}
	}
	return nil
}

// parseGeoJSONPayload extracts normalized observations from GeoJSON FeatureCollection or Feature.
func (p *OpenWatersProvider) parseGeoJSONPayload(raw []byte) ([]*NormalizedAISObservation, error) {
	var root map[string]interface{}
	if err := json.Unmarshal(raw, &root); err != nil {
		return nil, err
	}

	var results []*NormalizedAISObservation
	t, _ := root["type"].(string)

	if t == "FeatureCollection" {
		if features, ok := root["features"].([]interface{}); ok {
			for _, f := range features {
				if featMap, ok := f.(map[string]interface{}); ok {
					if obs := p.parseGeoJSONFeature(featMap); obs != nil {
						results = append(results, obs)
					}
				}
			}
		}
	} else if t == "Feature" {
		if obs := p.parseGeoJSONFeature(root); obs != nil {
			results = append(results, obs)
		}
	}

	return results, nil
}

func (p *OpenWatersProvider) parseGeoJSONFeature(feat map[string]interface{}) *NormalizedAISObservation {
	geom, _ := feat["geometry"].(map[string]interface{})
	props, _ := feat["properties"].(map[string]interface{})
	if geom == nil || props == nil {
		return nil
	}

	coords, _ := geom["coordinates"].([]interface{})
	if len(coords) < 2 {
		return nil
	}

	lon := toFloat(coords[0])
	lat := toFloat(coords[1])

	// Bounding filter for Gulf operating area
	if lat < 21.0 || lat > 32.5 || lon < 46.5 || lon > 62.5 {
		return nil
	}

	mmsi := toString(props["mmsi"])
	if mmsi == "" {
		return nil
	}

	name := toString(props["name"])
	if name == "" {
		name = toString(props["vessel_name"])
	}

	sog := toFloat(props["sog"])
	cog := toFloat(props["cog"])
	heading := toFloat(props["heading"])
	navStatus := toInt(props["nav_status"])
	shipType := toInt(props["ship_type"])
	if shipType == 0 {
		shipType = toInt(props["type"])
	}
	station := toString(props["station"])
	source := toString(props["source"])
	if source == "" {
		source = "openwaters-native"
	}

	aisTime := time.Now().UTC()
	tsStr := toString(props["seen"])
	if tsStr == "" {
		tsStr = toString(props["timestamp"])
	}
	if tsStr != "" {
		if parsed, err := time.Parse(time.RFC3339, tsStr); err == nil {
			aisTime = parsed
		}
	}

	group, typeName := ShipTypeToGroup(shipType)

	return &NormalizedAISObservation{
		MMSI:          mmsi,
		VesselName:    CleanVesselName(name),
		ShipTypeID:    shipType,
		ShipTypeName:  typeName,
		ShipGroup:     group,
		Lat:           lat,
		Lon:           lon,
		SOG:           sog,
		COG:           cog,
		TrueHeading:   heading,
		NavStatusID:   navStatus,
		NavStatusText: NavStatusToString(navStatus),
		AisTimestamp:  aisTime,
		LastSeen:      time.Now().UTC(),
		MessageType:   "OpenWatersFeature",
		MonitoredZone: DetermineMonitoredZone(lat, lon),
		Provider:      "openwaters",
		Source:        source,
		Station:       station,
	}
}

func (p *OpenWatersProvider) parseObjectMap(obj map[string]interface{}) *NormalizedAISObservation {
	mmsi := toString(obj["mmsi"])
	if mmsi == "" {
		return nil
	}
	lat := toFloat(obj["lat"])
	if lat == 0 {
		lat = toFloat(obj["latitude"])
	}
	lon := toFloat(obj["lon"])
	if lon == 0 {
		lon = toFloat(obj["longitude"])
	}

	if lat < 21.0 || lat > 32.5 || lon < 46.5 || lon > 62.5 {
		return nil
	}

	sog := toFloat(obj["sog"])
	cog := toFloat(obj["cog"])
	heading := toFloat(obj["heading"])
	name := toString(obj["name"])
	if name == "" {
		name = toString(obj["vessel_name"])
	}
	shipType := toInt(obj["ship_type"])
	group, typeName := ShipTypeToGroup(shipType)
	station := toString(obj["station"])
	source := toString(obj["source"])

	return &NormalizedAISObservation{
		MMSI:          mmsi,
		VesselName:    CleanVesselName(name),
		ShipTypeID:    shipType,
		ShipTypeName:  typeName,
		ShipGroup:     group,
		Lat:           lat,
		Lon:           lon,
		SOG:           sog,
		COG:           cog,
		TrueHeading:   heading,
		NavStatusID:   toInt(obj["nav_status"]),
		NavStatusText: NavStatusToString(toInt(obj["nav_status"])),
		AisTimestamp:  time.Now().UTC(),
		LastSeen:      time.Now().UTC(),
		MessageType:   "OpenWatersDirect",
		MonitoredZone: DetermineMonitoredZone(lat, lon),
		Provider:      "openwaters",
		Source:        source,
		Station:       station,
	}
}

func (p *OpenWatersProvider) setHealthStatus(status string, connected bool, errStr string) {
	p.healthMu.Lock()
	defer p.healthMu.Unlock()
	p.health.Status = status
	p.health.IsConnected = connected
	p.health.LastError = errStr
}

func toString(v interface{}) string {
	if v == nil {
		return ""
	}
	switch val := v.(type) {
	case string:
		return val
	case float64:
		return strconv.FormatInt(int64(val), 10)
	case int64:
		return strconv.FormatInt(val, 10)
	case int:
		return strconv.Itoa(val)
	}
	return fmt.Sprintf("%v", v)
}

func toFloat(v interface{}) float64 {
	if v == nil {
		return 0
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
	}
	return 0
}

func toInt(v interface{}) int {
	if v == nil {
		return 0
	}
	switch val := v.(type) {
	case int:
		return val
	case float64:
		return int(val)
	case int64:
		return int(val)
	case string:
		i, _ := strconv.Atoi(val)
		return i
	}
	return 0
}
