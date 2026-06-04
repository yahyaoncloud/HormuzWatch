package intelligence

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

// MLClient communicates with the Python ML inference service.
type MLClient struct {
	baseURL    string
	httpClient *http.Client
}

// NewMLClient creates a client pointing at the ML service.
func NewMLClient() *MLClient {
	url := os.Getenv("ML_SERVICE_URL")
	if url == "" {
		url = "http://localhost:8090"
	}
	return &MLClient{
		baseURL: url,
		httpClient: &http.Client{
			Timeout: 500 * time.Millisecond, // Hard timeout: scoring must not block
		},
	}
}

// MLPredictRequest is the JSON body sent to POST /predict.
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

// MLPredictResponse is the JSON body returned from POST /predict.
type MLPredictResponse struct {
	TrackID         string         `json:"track_id"`
	AnomalyScore    float64        `json:"anomaly_score"`
	IsAnomaly       bool           `json:"is_anomaly"`
	Confidence      float64        `json:"confidence"`
	ModelVersion    string         `json:"model_version"`
	InferenceTimeMs float64        `json:"inference_time_ms"`
	Explanation     *MLExplanation `json:"explanation,omitempty"`
}

// Predict sends a feature vector to the ML service and returns the anomaly score.
// Returns 0.0 on error (graceful degradation — rule engine still operates).
// Predict sends a feature vector to the ML service and returns the anomaly score and explanation.
func (c *MLClient) Predict(features FeatureVector) (float64, *MLExplanation) {
	reqBody := MLPredictRequest{
		TrackID: features.TrackID,
		Features: MLFeaturePayload{
			CourseDelta:        features.CourseDelta,
			HeadingDelta:       features.HeadingDelta,
			SpeedDelta:         features.SpeedDelta,
			AverageSpeed:       features.AverageSpeed,
			SpeedVariance:      features.SpeedVariance,
			AISGapMinutes:      features.AISGapMinutes,
			DistRestrictedZone: features.DistToRestrictedZone,
			DistHistoricalSite: features.DistToHistoricalSite,
		},
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		log.Printf("[ML] Marshal error: %v", err)
		return 0.0, nil
	}

	resp, err := c.httpClient.Post(
		fmt.Sprintf("%s/predict", c.baseURL),
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		// ML service unavailable — graceful degradation
		return 0.0, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[ML] Non-200 response: %d", resp.StatusCode)
		return 0.0, nil
	}

	var result MLPredictResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		log.Printf("[ML] Decode error: %v", err)
		return 0.0, nil
	}

	return result.AnomalyScore, result.Explanation
}

// MLTrainRequest is the JSON body sent to POST /train.
type MLTrainRequest struct {
	Data          []MLFeaturePayload `json:"data"`
	Contamination float64            `json:"contamination"`
}

// MLTrainResponse is the JSON body returned from POST /train.
type MLTrainResponse struct {
	Status        string  `json:"status"`
	ModelVersion  string  `json:"model_version"`
	NSamples      int     `json:"n_samples"`
	Contamination float64 `json:"contamination"`
}

// Train sends historical features to the ML service to fit a new Isolation Forest model.
func (c *MLClient) Train(data []MLFeaturePayload) (string, error) {
	if len(data) < 50 {
		return "", fmt.Errorf("insufficient data for training: %d samples", len(data))
	}

	reqBody := MLTrainRequest{
		Data:          data,
		Contamination: 0.05,
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("marshal error: %w", err)
	}

	// For training, we need a longer timeout
	trainClient := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := trainClient.Post(
		fmt.Sprintf("%s/train", c.baseURL),
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		return "", fmt.Errorf("train request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("train request returned status %d", resp.StatusCode)
	}

	var result MLTrainResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("decode error: %w", err)
	}

	return result.ModelVersion, nil
}
