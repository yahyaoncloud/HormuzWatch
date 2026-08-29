package intelligence

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"Geospatial-harmuz-watch/server/internal/mlgrpc"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
)

// mlResultCache stores a prediction result with its expiry.
type mlResultCache struct {
	score       float64
	explanation *MLExplanation
	expiresAt   time.Time
}

// MLClient communicates with the Python ML inference service over gRPC.
//
// Transport:
//   - Production: TLS to ML_SERVICE_ADDR (e.g. ml.aburcloud.com:443). Server
//     certificate is verified against ML_SERVICE_CA_CERT (or system roots when
//     unset). Optional mTLS via ML_SERVICE_TLS_CERT / ML_SERVICE_TLS_KEY.
//   - Dev fallback: when ML_SERVICE_ADDR points at localhost and ML_SERVICE_TLS
//     is "off" (or unset), an insecure channel is used.
//
type CircuitState int

const (
	StateClosed CircuitState = iota
	StateHalfOpen
	StateOpen
)

func (s CircuitState) String() string {
	switch s {
	case StateClosed:
		return "CLOSED"
	case StateHalfOpen:
		return "HALF-OPEN"
	case StateOpen:
		return "OPEN"
	default:
		return "UNKNOWN"
	}
}

type circuitBreaker struct {
	mu               sync.Mutex
	state            CircuitState
	consecutiveFails int
	threshold        int
	resetTimeout     time.Duration
	lastFailureTime  time.Time
}

func newCircuitBreaker(threshold int, resetTimeout time.Duration) *circuitBreaker {
	return &circuitBreaker{
		state:        StateClosed,
		threshold:    threshold,
		resetTimeout: resetTimeout,
	}
}

func (cb *circuitBreaker) Allow() bool {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	if cb.state == StateClosed {
		return true
	}
	if cb.state == StateOpen {
		if time.Since(cb.lastFailureTime) > cb.resetTimeout {
			cb.state = StateHalfOpen
			log.Println("[CircuitBreaker] Transitioning to HALF-OPEN, attempting canary probe")
			return true
		}
		return false
	}
	// StateHalfOpen: allow 1 test call
	return true
}

func (cb *circuitBreaker) ReportSuccess() {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	if cb.state != StateClosed {
		log.Printf("[CircuitBreaker] Service recovered, resetting from %s to CLOSED", cb.state)
	}
	cb.state = StateClosed
	cb.consecutiveFails = 0
}

func (cb *circuitBreaker) ReportFailure() {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	cb.consecutiveFails++
	cb.lastFailureTime = time.Now()
	if cb.state == StateHalfOpen || cb.consecutiveFails >= cb.threshold {
		if cb.state != StateOpen {
			log.Printf("[CircuitBreaker] Threshold reached (%d failures), tripping to OPEN. Fallback activated.", cb.consecutiveFails)
		}
		cb.state = StateOpen
	}
}

func (cb *circuitBreaker) State() string {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	return cb.state.String()
}

type MLClient struct {
	addr     string
	useTLS   bool
	dialOpts []grpc.DialOption

	grpcConn *grpc.ClientConn
	connMu   sync.Mutex
	client   mlgrpc.MLInferenceServiceClient

	breaker *circuitBreaker

	// In-memory result cache to reduce duplicate calls (keyed by track ID hash).
	cache   map[string]mlResultCache
	cacheMu sync.RWMutex
}

// NewMLClient creates a client pointing at the ML service.
func NewMLClient() *MLClient {
	addr := os.Getenv("ML_SERVICE_ADDR")
	if addr == "" {
		// Compatibility with pre-gRPC deployments. ML_SERVICE_URL may be a
		// full HTTP URL, while gRPC needs only host:port.
		addr = strings.TrimPrefix(strings.TrimPrefix(os.Getenv("ML_SERVICE_URL"), "http://"), "https://")
	}
	if addr == "" {
		addr = "localhost:8090"
	}
	useTLS := strings.EqualFold(os.Getenv("ML_SERVICE_TLS"), "on")

	dialOpts := buildDialOptions(addr, useTLS)

	return &MLClient{
		addr:     addr,
		useTLS:   useTLS,
		dialOpts: dialOpts,
		breaker:  newCircuitBreaker(5, 10*time.Second),
		cache:    make(map[string]mlResultCache),
	}
}

// buildDialOptions constructs gRPC dial options for the configured transport.
func buildDialOptions(addr string, useTLS bool) []grpc.DialOption {
	// TLS is opt-in so an internal Docker service can use plaintext without
	// accidentally attempting a TLS handshake against its gRPC port.
	if !useTLS {
		return []grpc.DialOption{
			grpc.WithTransportCredentials(insecure.NewCredentials()),
			grpc.WithBlock(),
		}
	}

	tlsCfg := &tls.Config{MinVersion: tls.VersionTLS12}

	if caPath := os.Getenv("ML_SERVICE_CA_CERT"); caPath != "" {
		pool := x509.NewCertPool()
		pem, err := os.ReadFile(caPath)
		if err != nil {
			log.Printf("[ML] read CA cert %s: %v; falling back to system roots", caPath, err)
		} else if !pool.AppendCertsFromPEM(pem) {
			log.Printf("[ML] no certs parsed from %s; falling back to system roots", caPath)
		} else {
			tlsCfg.RootCAs = pool
		}
	}

	// Optional mTLS client certificate.
	if certPath := os.Getenv("ML_SERVICE_TLS_CERT"); certPath != "" {
		if keyPath := os.Getenv("ML_SERVICE_TLS_KEY"); keyPath != "" {
			if cert, err := tls.LoadX509KeyPair(certPath, keyPath); err == nil {
				tlsCfg.Certificates = []tls.Certificate{cert}
			} else {
				log.Printf("[ML] load client cert %s: %v", certPath, err)
			}
		}
	}

	creds := credentials.NewTLS(tlsCfg)

	return []grpc.DialOption{
		grpc.WithTransportCredentials(creds),
		grpc.WithBlock(),
	}
}

// getClient returns a lazily-initialised, cached gRPC client.
func (c *MLClient) getClient() (mlgrpc.MLInferenceServiceClient, error) {
	c.connMu.Lock()
	defer c.connMu.Unlock()
	if c.client != nil {
		return c.client, nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cc, err := grpc.DialContext(ctx, c.addr, c.dialOpts...)
	if err != nil {
		return nil, err
	}
	c.grpcConn = cc
	c.client = mlgrpc.NewMLInferenceServiceClient(cc)
	tlsState := "TLS on"
	if !c.useTLS {
		tlsState = "TLS off"
	}
	log.Printf("[ML] gRPC connected to %s (%s)", c.addr, tlsState)
	return c.client, nil
}

// Connect performs an eager, blocking connection to the ML service at startup
// so operators get immediate visibility into whether the Python gRPC backend
// is reachable. Failure is non-fatal: the backend degrades gracefully to the
// local heuristic, so we only log a warning rather than aborting startup.
func (c *MLClient) Connect() {
	if _, err := c.getClient(); err != nil {
		log.Printf("[ML] gRPC not reachable at %s: %v — predictions will use local heuristic until reachable", c.addr, err)
		return
	}
}

// MLPredictRequest is retained for backward compatibility with internal callers.
type MLPredictRequest struct {
	TrackID  string           `json:"track_id"`
	Features MLFeaturePayload `json:"features"`
}

type MLFeaturePayload struct {
	CourseDelta        float64 `json:"course_delta"`
	HeadingDelta       float64 `json:"heading_delta"`
	SpeedDelta         float64 `json:"speed_delta"`
	AverageSpeed       float64 `json:"average_speed"`
	SpeedVariance      float64 `json:"speed_variance"`
	AISGapMinutes      float64 `json:"ais_gap_minutes"`
	DistRestrictedZone float64 `json:"dist_restricted_zone"`
	DistHistoricalSite float64 `json:"dist_historical_site"`
	EWMADeviation      float64 `json:"ewma_deviation"`
}

type MLFeatureExplanation struct {
	Feature   string  `json:"feature"`
	SHAPValue float64 `json:"shap_value"`
	Direction string  `json:"direction"`
}

type MLExplanation struct {
	TopFeatures    []MLFeatureExplanation `json:"top_features"`
	IsolationDepth float64                `json:"isolation_depth"`
}

// MLPredictResponse is retained for backward compatibility with internal callers.
type MLPredictResponse struct {
	TrackID         string         `json:"track_id"`
	AnomalyScore    float64        `json:"anomaly_score"`
	IsAnomaly       bool           `json:"is_anomaly"`
	Confidence      float64        `json:"confidence"`
	ModelVersion    string         `json:"model_version"`
	InferenceTimeMs float64        `json:"inference_time_ms"`
	Explanation     *MLExplanation `json:"explanation,omitempty"`
}

// Predict sends a feature vector to the ML service and returns the anomaly score and explanation.
// Returns 0.0 on error (graceful degradation — rule engine still operates).
// Implements result caching (30s TTL) to avoid hammering the ML service with duplicate requests.
// Falls back to a local heuristic when the ML service is unreachable.
func (c *MLClient) Predict(features FeatureVector) (float64, *MLExplanation) {
	// Check cache first (30-second TTL)
	cacheKey := featureCacheKey(features)
	c.cacheMu.RLock()
	if entry, ok := c.cache[cacheKey]; ok && time.Now().Before(entry.expiresAt) {
		c.cacheMu.RUnlock()
		return entry.score, entry.explanation
	}
	c.cacheMu.RUnlock()

	domain := "vessel"
	req := &mlgrpc.PredictRequest{
		Domain:  domain,
		TrackId: features.TrackID,
		Explain: false,
		Features: &mlgrpc.FeatureVector{
			TrackId:              features.TrackID,
			CourseDelta:          features.CourseDelta,
			HeadingDelta:         features.HeadingDelta,
			SpeedDelta:           features.SpeedDelta,
			AverageSpeed:         features.AverageSpeed,
			SpeedVariance:        features.SpeedVariance,
			AisGapMinutes:        features.AISGapMinutes,
			DistRestrictedZone:   features.DistToRestrictedZone,
			DistHistoricalSite:   features.DistToHistoricalSite,
			EwmaDeviation:        features.EWMADeviation,
			InRestrictedZone:     features.InRestrictedZone,
			NearHistoricalAttack: features.NearHistoricalAttack,
			Domain:               domain,
		},
	}

	score, explanation := c.grpcPredict(req)
	c.storeCache(cacheKey, score, explanation)
	return score, explanation
}

// featureCacheKey avoids returning a prior score merely because a track ID is
// the same. Telemetry updates are frequent; only an identical feature vector
// may reuse a short-lived prediction result.
func featureCacheKey(features FeatureVector) string {
	return fmt.Sprintf(
		"%s|%.6f|%.6f|%.6f|%.6f|%.6f|%.6f|%.6f|%.6f|%t|%t|%.6f",
		features.TrackID,
		features.CourseDelta,
		features.HeadingDelta,
		features.SpeedDelta,
		features.AverageSpeed,
		features.SpeedVariance,
		features.AISGapMinutes,
		features.DistToRestrictedZone,
		features.DistToHistoricalSite,
		features.InRestrictedZone,
		features.NearHistoricalAttack,
		features.EWMADeviation,
	)
}

// grpcPredict performs the unary gRPC Predict call with graceful degradation and circuit breaking.
func (c *MLClient) grpcPredict(req *mlgrpc.PredictRequest) (float64, *MLExplanation) {
	if !c.breaker.Allow() {
		return c.localFallback(req), nil
	}

	client, err := c.getClient()
	if err != nil {
		c.breaker.ReportFailure()
		log.Printf("[ML] gRPC connect failed: %v (circuit: %s) — using local heuristic", err, c.breaker.State())
		return c.localFallback(req), nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	resp, err := client.Predict(ctx, req)
	if err != nil {
		c.breaker.ReportFailure()
		log.Printf("[ML] Predict RPC error: %v (circuit: %s) — using local heuristic", err, c.breaker.State())
		return c.localFallback(req), nil
	}

	c.breaker.ReportSuccess()
	expl := mlExplanationFromProto(resp)
	return resp.GetAnomalyScore(), expl
}

// IsHealthy returns true if the ML gRPC client circuit is not tripped (OPEN).
func (c *MLClient) IsHealthy() bool {
	return c.breaker.State() != "OPEN"
}

// CircuitState returns the current state of the ML circuit breaker (CLOSED, OPEN, HALF-OPEN).
func (c *MLClient) CircuitState() string {
	return c.breaker.State()
}

// localFallback maps a gRPC request back to a FeatureVector for the heuristic.
func (c *MLClient) localFallback(req *mlgrpc.PredictRequest) float64 {
	f := FeatureVector{}
	if req.GetFeatures() != nil {
		fv := req.GetFeatures()
		f.CourseDelta = fv.GetCourseDelta()
		f.AISGapMinutes = fv.GetAisGapMinutes()
		f.SpeedDelta = fv.GetSpeedDelta()
		f.InRestrictedZone = fv.GetInRestrictedZone()
		f.DistToRestrictedZone = fv.GetDistRestrictedZone()
		f.NearHistoricalAttack = fv.GetNearHistoricalAttack()
		f.SpeedVariance = fv.GetSpeedVariance()
	}
	return localHeuristicScore(f)
}

// mlExplanationFromProto converts gRPC SHAP contributions into the internal
// MLExplanation structure (top features only).
func mlExplanationFromProto(resp *mlgrpc.PredictResponse) *MLExplanation {
	if resp == nil || len(resp.GetShapContributions()) == 0 {
		return nil
	}
	top := make([]MLFeatureExplanation, 0, len(resp.GetShapContributions()))
	for _, sc := range resp.GetShapContributions() {
		top = append(top, MLFeatureExplanation{
			Feature:   sc.GetFeature(),
			SHAPValue: sc.GetContribution(),
			Direction: sc.GetDirection(),
		})
	}
	return &MLExplanation{TopFeatures: top, IsolationDepth: resp.GetRawIforestScore()}
}

// storeCache saves a prediction result in the local cache.
func (c *MLClient) storeCache(key string, score float64, explanation *MLExplanation) {
	c.cacheMu.Lock()
	c.cache[key] = mlResultCache{
		score:       score,
		explanation: explanation,
		expiresAt:   time.Now().Add(30 * time.Second),
	}
	c.cacheMu.Unlock()

	// Periodically purge expired entries (every 100th write)
	if len(c.cache) > 500 {
		go c.purgeCache()
	}
}

// purgeCache removes expired cache entries.
func (c *MLClient) purgeCache() {
	now := time.Now()
	c.cacheMu.Lock()
	defer c.cacheMu.Unlock()
	for k, v := range c.cache {
		if now.After(v.expiresAt) {
			delete(c.cache, k)
		}
	}
}

// Close releases the underlying gRPC connection.
func (c *MLClient) Close() error {
	c.connMu.Lock()
	defer c.connMu.Unlock()
	if c.grpcConn != nil {
		err := c.grpcConn.Close()
		c.grpcConn = nil
		c.client = nil
		return err
	}
	return nil
}

// localHeuristicScore provides a fast local fallback when ML service is unreachable.
// Uses feature magnitudes to produce a 0-100 score without any API calls.
func localHeuristicScore(f FeatureVector) float64 {
	score := 0.0
	// Course deviation
	if f.CourseDelta > 10 {
		score += (f.CourseDelta - 10) / 80 * 30
	}
	// AIS gap
	if f.AISGapMinutes > 5 {
		score += (f.AISGapMinutes - 5) / 25 * 25
	}
	// Speed change
	if f.SpeedDelta > 0 {
		score += f.SpeedDelta / 15 * 20
	}
	// Proximity to restricted zone
	if f.InRestrictedZone {
		score += 30
	} else if f.DistToRestrictedZone < 1.0 {
		score += (1.0 - f.DistToRestrictedZone) * 15
	}
	// Historical attack proximity
	if f.NearHistoricalAttack {
		score += 15
	}
	// Speed variance
	if f.SpeedVariance > 10 {
		score += 10
	}
	if score > 100 {
		score = 100
	}
	return score
}

// MLTrainRequest is the JSON body sent to POST /train (retained for compatibility).
type MLTrainRequest struct {
	Data          []MLFeaturePayload `json:"data"`
	Contamination float64            `json:"contamination"`
}

// MLTrainResponse is the JSON body returned from POST /train (retained for compatibility).
type MLTrainResponse struct {
	Status        string  `json:"status"`
	ModelVersion  string  `json:"model_version"`
	NSamples      int     `json:"n_samples"`
	Contamination float64 `json:"contamination"`
}

// Train sends historical features to the ML service to fit a new model.
func (c *MLClient) Train(data []MLFeaturePayload) (string, error) {
	if len(data) < 50 {
		return "", fmt.Errorf("insufficient data for training: %d samples", len(data))
	}

	client, err := c.getClient()
	if err != nil {
		return "", fmt.Errorf("ml gRPC connect failed: %w", err)
	}

	rows := make([]*mlgrpc.FeatureVector, 0, len(data))
	for _, d := range data {
		rows = append(rows, &mlgrpc.FeatureVector{
			CourseDelta:        d.CourseDelta,
			HeadingDelta:       d.HeadingDelta,
			SpeedDelta:         d.SpeedDelta,
			AverageSpeed:       d.AverageSpeed,
			SpeedVariance:      d.SpeedVariance,
			AisGapMinutes:      d.AISGapMinutes,
			DistRestrictedZone: d.DistRestrictedZone,
			DistHistoricalSite: d.DistHistoricalSite,
			EwmaDeviation:      d.EWMADeviation,
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	resp, err := client.Train(ctx, &mlgrpc.TrainRequest{
		Domain:        "vessel",
		Contamination: 0.05,
		FeatureRows:   rows,
	})
	if err != nil {
		return "", fmt.Errorf("train rpc failed: %w", err)
	}
	if resp.GetStatus() != "trained" || resp.GetModelVersion() == "" {
		return "", fmt.Errorf(
			"ml service did not train a model (status=%q): %s",
			resp.GetStatus(), resp.GetMessage(),
		)
	}
	return resp.GetModelVersion(), nil
}

// ensure json import retained for any future payload use
var _ = json.Marshal

// ── News Domain Prediction ────────────────────────────────────────────────

// PredictNews computes a threat score for a news article feature vector.
//
// Architecture: The gRPC FeatureVector proto was designed for the kinematic
// (vessel/aircraft) domains and does not carry the 18-dim news feature set.
// For news scoring we use the Go-side heuristic, which mirrors news.ComputeNewsScore
// and produces identical 0-100 scores.
//
// When a trained news_ensemble.joblib artifact exists in the Python ML service:
//   - The Go backend will call POST /api/predict (REST) with domain="news"
//   - The Go heuristic serves as the fallback if the REST call fails
//   - gRPC is not used for news — it's reserved for kinematic domains
//
// TODO: add REST client for MLServiceURL/api/predict with domain="news"
func (c *MLClient) PredictNews(features newsFeaturePayload) (float64, *MLExplanation) {
	// Use the Go-side heuristic — produces identical results to news.ComputeNewsScore
	score := localNewsHeuristic(features)
	return score, nil
}

// newsFeaturePayload mirrors NewsFeatureVector without creating a circular
// dependency between the intelligence and news packages.
type newsFeaturePayload struct {
	KeywordCount      int
	EntityCount       int
	ArticleLength     int
	PublicationAge    float64
	MilitaryTermCount int
	EnergyTermCount   int
	ShippingTermCount int
	CyberTermCount    int
	CountryRiskScore  float64
	SourceReliability float64
	SentimentScore    float64
	OrganizationCount int
	CompanyCount      int
	PortMentions      int
	AirportMentions   int
	ShipMentions      int
	AircraftMentions  int
	PublisherWeight   float64
}

// localNewsHeuristic is the Go-side fallback for news threat scoring.
// Mirrors news.ComputeNewsScore without importing the news package.
func localNewsHeuristic(f newsFeaturePayload) float64 {
	score := 0.0

	// Keyword density (0-15)
	if f.ArticleLength > 0 {
		density := float64(f.KeywordCount) / float64(f.ArticleLength) * 1000
		if density*2 > 15 {
			score += 15
		} else {
			score += density * 2
		}
	}

	// Entity density (0-10)
	if f.ArticleLength > 0 {
		density := float64(f.EntityCount) / float64(f.ArticleLength) * 1000
		if density*3 > 10 {
			score += 10
		} else {
			score += density * 3
		}
	}

	// Source reliability (0-25)
	score += f.SourceReliability * 25

	// Country risk (0-15)
	score += f.CountryRiskScore * 15

	// Military terms bonus (0-15)
	mb := float64(f.MilitaryTermCount) * 2.0
	if mb > 15 {
		mb = 15
	}
	score += mb

	// Recency (0-10)
	if f.PublicationAge < 1 {
		score += 10
	} else if f.PublicationAge < 6 {
		score += 7
	} else if f.PublicationAge < 24 {
		score += 4
	}

	// Publisher weight bonus (0-10)
	score += f.PublisherWeight * 10

	if score > 100 {
		score = 100
	}
	return score
}
