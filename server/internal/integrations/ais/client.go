package ais

import (
	"bytes"
	"compress/zlib"
	"context"
	"io"
	"log"
	"math"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"Geospatial-harmuz-watch/server/internal/domain/telemetry"
	"Geospatial-harmuz-watch/server/internal/geo"
	"Geospatial-harmuz-watch/server/internal/intelligence"
)

// AISClient manages the active interchangeable AIS provider and routes telemetry.
type AISClient struct {
	providerType    string
	provider        AISProvider
	pipeline        *intelligence.Pipeline
	cache           *VesselCache
	detector        *AnomalyDetector
	healthMu        sync.RWMutex
	health          ServiceHealthStatus
	reconnectCount  uint32
	totalMessages   uint64
	droppedMessages uint64
	startTime       time.Time
	msgRateTracker  *msgRateCalculator
}

type msgRateCalculator struct {
	mu             sync.Mutex
	lastCount      uint64
	lastCalculated time.Time
	rate           float64
}

// GlobalAISClient is the application-wide singleton AIS integration instance.
var GlobalAISClient *AISClient

// NewAISClient initializes the unified AIS telemetry manager with the chosen provider.
func NewAISClient(p *intelligence.Pipeline, cache *VesselCache) *AISClient {
	if cache == nil {
		cache = GlobalVesselCache
	}

	providerType := strings.ToLower(strings.TrimSpace(os.Getenv("AIS_PROVIDER")))
	if providerType == "" {
		// Default to multi provider so OpenWaters (REST snapshot of 1,200+ Gulf vessels) and
		// AISStream.io (live WebSocket stream) run concurrently and complement each other.
		providerType = "multi"
	}

	var activeProvider AISProvider
	switch providerType {
	case "openwaters":
		activeProvider = NewOpenWatersProvider()
	case "aisstream":
		activeProvider = NewAISStreamProvider()
	case "multi":
		activeProvider = NewMultiProvider(NewOpenWatersProvider(), NewAISStreamProvider())
	default:
		activeProvider = NewMultiProvider(NewOpenWatersProvider(), NewAISStreamProvider())
	}

	client := &AISClient{
		providerType: providerType,
		provider:     activeProvider,
		pipeline:     p,
		cache:        cache,
		detector:     GlobalAnomalyDetector,
		startTime:    time.Now().UTC(),
		msgRateTracker: &msgRateCalculator{
			lastCalculated: time.Now().UTC(),
		},
		health: ServiceHealthStatus{
			Status:         "initializing",
			IsConnected:    false,
			MonitoredZones: []string{"AREA-HORMUZ", "AREA-PGULF", "AREA-GOMAN", "AREA-FUJAIRAH"},
		},
	}

	GlobalAISClient = client
	return client
}

// Start launches the chosen AIS provider and processing pipelines.
func (c *AISClient) Start(ctx context.Context) {
	mockEnabled := os.Getenv("AIS_MOCK_ENABLED") == "true"
	// Only run built-in simulation if explicitly requested via AIS_MOCK_ENABLED=true
	if mockEnabled {
		c.healthMu.Lock()
		c.health.Status = "mock_active"
		c.health.IsMock = true
		c.health.IsConnected = true
		c.healthMu.Unlock()

		log.Printf("[AISManager] Running built-in Gulf AIS simulation engine (AIS_MOCK_ENABLED=true)...")
		go StartMockAISStream(ctx, c.cache, func(v *NormalizedVesselState) {
			atomic.AddUint64(&c.totalMessages, 1)
			c.healthMu.Lock()
			c.health.LastMessageAt = time.Now().UTC()
			c.healthMu.Unlock()
			c.dispatchToPipeline(v)
		})
		return
	}

	log.Printf("[AISManager] Launching production maritime telemetry provider: %s", c.providerType)

	// Periodic health & rate calculation routine
	go c.healthMonitor(ctx)

	// Launch active provider adapter
	err := c.provider.Start(ctx, func(obs *NormalizedAISObservation) {
		c.IngestObservation(obs)
	})
	if err != nil {
		log.Printf("[AISManager] Error starting provider %s: %v", c.providerType, err)
	}
}

// IngestObservation normalizes, filters, caches, detects anomalies, and routes a single AIS telemetry event.
func (c *AISClient) IngestObservation(obs *NormalizedAISObservation) {
	if obs == nil {
		return
	}

	// 1. Geographic bounds check
	if obs.Lat < 21.0 || obs.Lat > 32.5 || obs.Lon < 46.5 || obs.Lon > 62.5 {
		return
	}

	// 2. Reject sensor noise / unrealistic vessel speeds (> 45 kn)
	if obs.SOG >= 45.0 {
		return
	}

	// 3. Reject positions erroneously on land
	if geo.IsOnLand(obs.Lat, obs.Lon) {
		return
	}

	atomic.AddUint64(&c.totalMessages, 1)
	c.healthMu.Lock()
	c.health.LastMessageAt = time.Now().UTC()
	c.healthMu.Unlock()

	// 4. Retrieve previous state for anomaly evaluation
	prevVessel, hasPrev := c.cache.GetVessel(obs.MMSI)
	var prevSOG, prevCOG, prevHeading float64
	var prevTime time.Time
	if hasPrev {
		prevSOG = prevVessel.SOG
		prevCOG = prevVessel.COG
		prevHeading = prevVessel.TrueHeading
		prevTime = prevVessel.AisTimestamp
	}

	// 5. Update cache with state & provenance
	vState := c.cache.UpdatePosition(
		obs.MMSI, obs.VesselName, obs.Callsign,
		obs.Lat, obs.Lon, obs.SOG, obs.COG, obs.TrueHeading,
		obs.NavStatusID, obs.RateOfTurn, obs.MessageType, obs.AisTimestamp,
	)
	if vState == nil {
		return
	}

	vState.Provider = obs.Provider
	vState.Source = obs.Source
	vState.Station = obs.Station

	if obs.ShipTypeID > 0 && vState.ShipTypeID == 0 {
		c.cache.UpdateStaticData(
			obs.MMSI, obs.VesselName, obs.Callsign,
			obs.IMO, obs.ShipTypeID,
			obs.DimensionA, obs.DimensionB, obs.DimensionC, obs.DimensionD,
			obs.DraughtMeters, obs.Destination, obs.ETA, obs.MessageType,
		)
	}

	// 6. Run anomaly evaluation
	if hasPrev {
		anomalies := c.detector.Evaluate(vState, prevSOG, prevCOG, prevHeading, prevTime)
		if len(anomalies) > 0 {
			vState.ActiveAnomalies = make([]string, 0, len(anomalies))
			for _, a := range anomalies {
				vState.ActiveAnomalies = append(vState.ActiveAnomalies, a.Title)
			}
		}
	}

	// 7. Dispatch to threat assessment pipeline
	c.dispatchToPipeline(vState)
}

// dispatchToPipeline formats and sends observation into existing intelligence pipeline.
func (c *AISClient) dispatchToPipeline(v *NormalizedVesselState) {
	if c.pipeline == nil {
		return
	}

	obs := telemetry.Observation{
		TrackID:       v.MMSI,
		AssetName:     v.VesselName,
		Lat:           v.Lat,
		Lon:           v.Lon,
		Speed:         v.SOG,
		COG:           v.COG,
		Heading:       v.TrueHeading,
		AisAgeMinutes: 0,
		ObjectType:    telemetry.DomainVessel,
		Source:        telemetry.SourceAISStream,
		Timestamp:     v.AisTimestamp.Format(time.RFC3339),
	}

	c.pipeline.EnqueueObservation(&obs)
}

// GetHealth returns a complete snapshot of AIS service health and telemetry performance.
func (c *AISClient) GetHealth() ServiceHealthStatus {
	c.healthMu.RLock()
	defer c.healthMu.RUnlock()

	provHealth := c.provider.Health()

	h := c.health
	h.Status = provHealth.Status
	h.IsConnected = provHealth.IsConnected
	h.TotalMessages = atomic.LoadUint64(&c.totalMessages)
	h.ReconnectCount = provHealth.ReconnectCount
	h.DroppedMessages = provHealth.DroppedMessages
	h.ActiveVesselsCount = c.cache.Count()
	h.UptimeSeconds = int64(time.Since(c.startTime).Seconds())
	h.LastError = provHealth.LastError

	c.msgRateTracker.mu.Lock()
	h.MessagesPerSecond = c.msgRateTracker.rate
	c.msgRateTracker.mu.Unlock()

	return h
}

// healthMonitor periodically calculates message throughput and prunes stale vessels.
func (c *AISClient) healthMonitor(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	pruneTicker := time.NewTicker(2 * time.Minute)
	defer ticker.Stop()
	defer pruneTicker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case t := <-ticker.C:
			c.msgRateTracker.mu.Lock()
			currTotal := atomic.LoadUint64(&c.totalMessages)
			dt := t.Sub(c.msgRateTracker.lastCalculated).Seconds()
			if dt > 0 {
				c.msgRateTracker.rate = math.Round(float64(currTotal-c.msgRateTracker.lastCount)/dt*10) / 10
				c.msgRateTracker.lastCount = currTotal
				c.msgRateTracker.lastCalculated = t
			}
			c.msgRateTracker.mu.Unlock()
		case <-pruneTicker.C:
			c.cache.PruneStale()
		}
	}
}

// decompressZlib decompresses zlib/deflate encoded bytes.
func decompressZlib(data []byte) ([]byte, error) {
	r, err := zlib.NewReader(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	defer r.Close()
	return io.ReadAll(r)
}
