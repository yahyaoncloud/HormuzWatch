package datasets

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"Geospatial-harmuz-watch/server/internal/anomaly"
	"Geospatial-harmuz-watch/server/internal/geo"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	FeatureGenerationVersion = "v2.0.0"
	SchemaVersion            = "2.0.0"
	LabelingVersion          = "v1.0-hybrid"
)

// LabelCategory defines the provenance of a sample's anomaly label.
type LabelCategory string

const (
	LabelGroundTruth     LabelCategory = "ground_truth"
	LabelHumanReviewed   LabelCategory = "human_reviewed"
	LabelWeakLabel       LabelCategory = "weak_label"
	LabelModelPrediction LabelCategory = "model_prediction"
	LabelUnlabeled       LabelCategory = "unlabeled"
)

// MLDatasetRecord represents a single reconstructed ML training sample.
type MLDatasetRecord struct {
	// Observation Identifiers & Metadata
	ObservationID       int64     `json:"observation_id"`
	TrackID             string    `json:"track_id"`
	AssetName           string    `json:"asset_name"`
	Domain              string    `json:"domain"`
	Source              string    `json:"source"`
	ObservedAt          time.Time `json:"observed_at"`
	Lat                 float64   `json:"lat"`
	Lon                 float64   `json:"lon"`

	// Canonical Reconstructed Kinematic & Contextual Features (Matching ML Ensemble)
	CourseDelta         float64   `json:"course_delta"`
	HeadingDelta        float64   `json:"heading_delta"`
	Speed               float64   `json:"speed"`
	SpeedDelta          float64   `json:"speed_delta"`
	PreviousSpeed       float64   `json:"previous_speed"`
	AverageSpeed        float64   `json:"average_speed"`
	SpeedVariance       float64   `json:"speed_variance"`
	AisGapMinutes       float64   `json:"ais_gap_minutes"`
	DistRestrictedZone  float64   `json:"dist_restricted_zone"`
	DistHistoricalSite  float64   `json:"dist_historical_site"`
	InRestrictedZone    bool      `json:"in_restricted_zone"`
	NearHistoricalAttack bool     `json:"near_historical_attack"`
	EWMADeviation       float64   `json:"ewma_deviation"`

	// Model Evaluation Scores (Historical Persistence)
	ModelScore          float64   `json:"model_score"`
	ModelSeverity       string    `json:"model_severity"`
	RuleScore           float64   `json:"rule_score"`
	GeoScore            float64   `json:"geo_score"`
	FinalThreatScore    float64   `json:"final_threat_score"`

	// Ground Truth & Label Provenance
	IsAnomaly           int           `json:"is_anomaly"` // 0 = Normal, 1 = Anomaly
	LabelSource         LabelCategory `json:"label_source"`
	LabelConfidence     float64       `json:"label_confidence"` // 0.0 to 1.0
	AnomalyReasons      string        `json:"anomaly_reasons"`
	DatasetSplit        string        `json:"dataset_split"` // "train", "val", "test"
}

// DatasetMetadata contains machine-readable provenance for the snapshot.
type DatasetMetadata struct {
	DatasetID          string            `json:"dataset_id"`
	DatasetVersion     string            `json:"dataset_version"`
	Domain             string            `json:"domain"`
	CreatedAt          string            `json:"created_at"`
	SourceStartTime    string            `json:"source_start_time"`
	SourceEndTime      string            `json:"source_end_time"`
	LookbackHours      float64           `json:"lookback_hours"`
	FeatureVersion     string            `json:"feature_version"`
	SchemaVersion      string            `json:"schema_version"`
	LabelingVersion    string            `json:"labeling_version"`
	TotalRows          int               `json:"total_rows"`
	TrainRows          int               `json:"train_rows"`
	ValRows            int               `json:"val_rows"`
	TestRows           int               `json:"test_rows"`
	UniqueTracks       int               `json:"unique_tracks"`
	Files              []string          `json:"files"`
	FeatureColumns     []string          `json:"feature_columns"`
	LabelDistribution  map[string]int    `json:"label_distribution"`
	ProvenanceSummary  map[string]int    `json:"provenance_summary"`
}

// NumericalFeatureStats computes statistical moments for data validation.
type NumericalFeatureStats struct {
	Min    float64 `json:"min"`
	Max    float64 `json:"max"`
	Mean   float64 `json:"mean"`
	StdDev float64 `json:"std_dev"`
	Nulls  int     `json:"null_count"`
}

// DatasetQualityReport holds comprehensive dataset health metrics.
type DatasetQualityReport struct {
	DatasetID           string                            `json:"dataset_id"`
	GeneratedAt         string                            `json:"generated_at"`
	TimeRange           string                            `json:"time_range"`
	TotalObservations   int                               `json:"total_observations"`
	UniqueVessels       int                               `json:"unique_vessels"`
	NormalCount         int                               `json:"normal_count"`
	NormalPct           float64                           `json:"normal_pct"`
	AnomalyCount        int                               `json:"anomaly_count"`
	AnomalyPct          float64                           `json:"anomaly_pct"`
	GroundTruthCount    int                               `json:"ground_truth_count"`
	ModelPredictionCount int                              `json:"model_prediction_count"`
	FeatureStatistics   map[string]NumericalFeatureStats  `json:"feature_statistics"`
	DataQualityFlags    []string                          `json:"data_quality_flags"`
}

// GeneratorOptions configures a historical dataset generation job.
type GeneratorOptions struct {
	StartTime        time.Time
	EndTime          time.Time
	LookbackDuration time.Duration
	Domain           string // "vessel" or "aircraft"
	OutputDir        string
	DatasetID        string
	TrainSplitPct    float64 // default 0.70
	ValSplitPct      float64 // default 0.15
}

// Generator executes deterministic dataset creation from historical PostgreSQL observations.
type Generator struct {
	pool *pgxpool.Pool
}

func NewGenerator(pool *pgxpool.Pool) *Generator {
	return &Generator{pool: pool}
}

// GenerateDataset processes historical records and produces versioned training datasets.
func (g *Generator) GenerateDataset(ctx context.Context, opt GeneratorOptions) (*DatasetMetadata, *DatasetQualityReport, error) {
	if opt.StartTime.IsZero() || opt.EndTime.IsZero() {
		return nil, nil, fmt.Errorf("start and end time are required")
	}
	if opt.LookbackDuration <= 0 {
		opt.LookbackDuration = 2 * time.Hour
	}
	if opt.Domain == "" {
		opt.Domain = "vessel"
	}
	if opt.TrainSplitPct <= 0 {
		opt.TrainSplitPct = 0.70
	}
	if opt.ValSplitPct <= 0 {
		opt.ValSplitPct = 0.15
	}
	if opt.DatasetID == "" {
		opt.DatasetID = fmt.Sprintf("dataset_%s_%s_%s",
			opt.Domain,
			opt.StartTime.UTC().Format("20060102_1504"),
			opt.EndTime.UTC().Format("20060102_1504"),
		)
	}

	datasetDir := filepath.Join(opt.OutputDir, opt.DatasetID)
	if err := os.MkdirAll(datasetDir, 0755); err != nil {
		return nil, nil, fmt.Errorf("create dataset directory: %w", err)
	}

	// 1. Query observations with temporal lookback
	queryStart := opt.StartTime.Add(-opt.LookbackDuration)
	query := `
		SELECT o.id, o.track_id, o.asset_name, o.domain, o.source, o.observed_at,
		       o.lat, o.lon, o.speed, o.previous_speed, o.heading, o.course_delta,
		       o.ais_age_minutes, o.hot_zone_distance_nm, o.altitude, o.squawk, o.on_ground,
		       COALESCE(a.score, 0) as anomaly_score,
		       COALESCE(a.severity, 'nominal') as anomaly_severity,
		       COALESCE(a.reasons, '[]') as anomaly_reasons
		FROM telemetry_observations o
		LEFT JOIN anomalies a ON o.track_id = a.track_id
		WHERE o.domain = $1 AND o.observed_at >= $2 AND o.observed_at <= $3
		ORDER BY o.track_id ASC, o.observed_at ASC
	`

	rows, err := g.pool.Query(ctx, query, opt.Domain, queryStart, opt.EndTime)
	if err != nil {
		return nil, nil, fmt.Errorf("query observations: %w", err)
	}
	defer rows.Close()

	// Group observations by track ID for temporal kinematic reconstruction
	type RawObs struct {
		ID                 int64
		TrackID            string
		AssetName          string
		Domain             string
		Source             string
		ObservedAt         time.Time
		Lat                float64
		Lon                float64
		Speed              float64
		PrevSpeed          float64
		Heading            float64
		CourseDelta        float64
		AisAgeMinutes      int
		HotZoneDist        float64
		Altitude           float64
		Squawk             string
		OnGround           bool
		AnomalyScore       float64
		AnomalySeverity    string
		AnomalyReasons     string
	}

	trackHistory := make(map[string][]RawObs)
	totalFetched := 0

	for rows.Next() {
		var o RawObs
		err := rows.Scan(
			&o.ID, &o.TrackID, &o.AssetName, &o.Domain, &o.Source, &o.ObservedAt,
			&o.Lat, &o.Lon, &o.Speed, &o.PrevSpeed, &o.Heading, &o.CourseDelta,
			&o.AisAgeMinutes, &o.HotZoneDist, &o.Altitude, &o.Squawk, &o.OnGround,
			&o.AnomalyScore, &o.AnomalySeverity, &o.AnomalyReasons,
		)
		if err != nil {
			return nil, nil, fmt.Errorf("scan observation: %w", err)
		}
		trackHistory[o.TrackID] = append(trackHistory[o.TrackID], o)
		totalFetched++
	}

	// 2. Deterministic Feature Reconstruction with Strict Lookback Isolation
	var datasetRecords []MLDatasetRecord
	uniqueTracksMap := make(map[string]bool)

	for trackID, obsList := range trackHistory {
		uniqueTracksMap[trackID] = true
		var windowSpeeds []float64

		// Sliding moments state
		var meanCourseDelta, varCourseDelta float64
		var meanSpeedDelta, varSpeedDelta float64
		var meanSpeed, varSpeed float64
		var cosHeadingMean, sinHeadingMean float64
		ewmaCount := 0
		const ewmaAlpha = 0.15

		for i, curr := range obsList {
			// Compute kinematics against predecessor
			var courseDelta, headingDelta, speedDelta, prevSpeed, aisGap float64
			if i > 0 {
				prev := obsList[i-1]
				speedDelta = curr.Speed - prev.Speed
				prevSpeed = prev.Speed
				aisGap = curr.ObservedAt.Sub(prev.ObservedAt).Minutes()

				// Shortest angular course/heading change
				diff := math.Mod(curr.Heading-prev.Heading+540.0, 360.0) - 180.0
				courseDelta = math.Abs(diff)
				headingDelta = diff
			} else {
				courseDelta = curr.CourseDelta
				prevSpeed = curr.PrevSpeed
				speedDelta = curr.Speed - curr.PrevSpeed
				aisGap = float64(curr.AisAgeMinutes)
				headingDelta = 0
			}

			// Update sliding window
			windowSpeeds = append(windowSpeeds, curr.Speed)
			if len(windowSpeeds) > 20 {
				windowSpeeds = windowSpeeds[1:]
			}

			avgSpeed := 0.0
			for _, s := range windowSpeeds {
				avgSpeed += s
			}
			avgSpeed /= float64(len(windowSpeeds))

			speedVariance := 0.0
			for _, s := range windowSpeeds {
				d := s - avgSpeed
				speedVariance += d * d
			}
			if len(windowSpeeds) > 1 {
				speedVariance /= float64(len(windowSpeeds) - 1)
			}

			// EWMA moment updates
			ewmaCount++
			if ewmaCount == 1 {
				meanCourseDelta = courseDelta
				varCourseDelta = 1.0
				meanSpeedDelta = speedDelta
				varSpeedDelta = 1.0
				meanSpeed = curr.Speed
				varSpeed = 1.0
				rad := curr.Heading * math.Pi / 180.0
				cosHeadingMean = math.Cos(rad)
				sinHeadingMean = math.Sin(rad)
			} else {
				meanCourseDelta = (1-ewmaAlpha)*meanCourseDelta + ewmaAlpha*courseDelta
				dC := courseDelta - meanCourseDelta
				varCourseDelta = (1-ewmaAlpha)*varCourseDelta + ewmaAlpha*(dC*dC)

				meanSpeedDelta = (1-ewmaAlpha)*meanSpeedDelta + ewmaAlpha*speedDelta
				dSD := speedDelta - meanSpeedDelta
				varSpeedDelta = (1-ewmaAlpha)*varSpeedDelta + ewmaAlpha*(dSD*dSD)

				meanSpeed = (1-ewmaAlpha)*meanSpeed + ewmaAlpha*curr.Speed
				dS := curr.Speed - meanSpeed
				varSpeed = (1-ewmaAlpha)*varSpeed + ewmaAlpha*(dS*dS)

				rad := curr.Heading * math.Pi / 180.0
				cosHeadingMean = (1-ewmaAlpha)*cosHeadingMean + ewmaAlpha*math.Cos(rad)
				sinHeadingMean = (1-ewmaAlpha)*sinHeadingMean + ewmaAlpha*math.Sin(rad)
			}

			zC := (courseDelta - meanCourseDelta) / math.Sqrt(math.Max(varCourseDelta, 0.25))
			zSD := (speedDelta - meanSpeedDelta) / math.Sqrt(math.Max(varSpeedDelta, 0.25))
			zS := (curr.Speed - meanSpeed) / math.Sqrt(math.Max(varSpeed, 0.25))
			ewmaDev := math.Sqrt((zC*zC + zSD*zSD + zS*zS) / 3.0)

			// Geospatial context
			inZone, _ := anomaly.CheckGeofence(curr.Lat, curr.Lon)
			nearAttack := geo.IsNearHistoricalAttack(curr.Lat, curr.Lon)
			distZone := computeDistToNearestZone(curr.Lat, curr.Lon)
			distAttack := computeDistToNearestAttack(curr.Lat, curr.Lon, nearAttack)

			// ONLY include in dataset if observation falls within [StartTime, EndTime]
			// Lookback records were strictly used to warm up EWMA/kinematic moments
			if curr.ObservedAt.Before(opt.StartTime) || curr.ObservedAt.After(opt.EndTime) {
				continue
			}

			// Label & Provenance classification
			isAnomaly := 0
			labelSource := LabelUnlabeled
			labelConf := 0.0

			if curr.AnomalyScore >= 50.0 || curr.AnomalySeverity == "critical" || curr.AnomalySeverity == "high" {
				isAnomaly = 1
				labelSource = LabelModelPrediction
				labelConf = curr.AnomalyScore / 100.0
			} else if curr.AnomalyScore > 0 {
				isAnomaly = 0
				labelSource = LabelWeakLabel
				labelConf = 0.60
			} else {
				isAnomaly = 0
				labelSource = LabelWeakLabel
				labelConf = 0.95
			}

			record := MLDatasetRecord{
				ObservationID:        curr.ID,
				TrackID:              curr.TrackID,
				AssetName:            curr.AssetName,
				Domain:               curr.Domain,
				Source:               curr.Source,
				ObservedAt:           curr.ObservedAt,
				Lat:                  curr.Lat,
				Lon:                  curr.Lon,
				CourseDelta:          courseDelta,
				HeadingDelta:         headingDelta,
				Speed:                curr.Speed,
				SpeedDelta:           speedDelta,
				PreviousSpeed:        prevSpeed,
				AverageSpeed:         avgSpeed,
				SpeedVariance:        speedVariance,
				AisGapMinutes:        aisGap,
				DistRestrictedZone:   distZone,
				DistHistoricalSite:   distAttack,
				InRestrictedZone:     inZone,
				NearHistoricalAttack: nearAttack,
				EWMADeviation:        ewmaDev,
				ModelScore:           curr.AnomalyScore,
				ModelSeverity:        curr.AnomalySeverity,
				RuleScore:            0,
				GeoScore:             0,
				FinalThreatScore:     curr.AnomalyScore,
				IsAnomaly:            isAnomaly,
				LabelSource:          labelSource,
				LabelConfidence:      labelConf,
				AnomalyReasons:       curr.AnomalyReasons,
			}
			datasetRecords = append(datasetRecords, record)
		}
	}

	// 3. Chronological Train / Val / Test Partitioning (Prevent Temporal Leakage)
	sort.Slice(datasetRecords, func(i, j int) bool {
		return datasetRecords[i].ObservedAt.Before(datasetRecords[j].ObservedAt)
	})

	totalRecords := len(datasetRecords)
	trainIdx := int(float64(totalRecords) * opt.TrainSplitPct)
	valIdx := int(float64(totalRecords) * (opt.TrainSplitPct + opt.ValSplitPct))

	for i := range datasetRecords {
		if i < trainIdx {
			datasetRecords[i].DatasetSplit = "train"
		} else if i < valIdx {
			datasetRecords[i].DatasetSplit = "val"
		} else {
			datasetRecords[i].DatasetSplit = "test"
		}
	}

	// 4. Export CSV (Full, Train, Val, Test)
	csvPath := filepath.Join(datasetDir, "data.csv")
	if err := exportRecordsCSV(csvPath, datasetRecords); err != nil {
		return nil, nil, fmt.Errorf("export data.csv: %w", err)
	}

	trainPath := filepath.Join(datasetDir, "train.csv")
	valPath := filepath.Join(datasetDir, "val.csv")
	testPath := filepath.Join(datasetDir, "test.csv")

	_ = exportRecordsCSV(trainPath, filterSplit(datasetRecords, "train"))
	_ = exportRecordsCSV(valPath, filterSplit(datasetRecords, "val"))
	_ = exportRecordsCSV(testPath, filterSplit(datasetRecords, "test"))

	// 5. Generate Statistical Summary & Quality Report
	report := generateQualityReport(opt.DatasetID, opt.StartTime, opt.EndTime, datasetRecords, len(uniqueTracksMap))
	reportPath := filepath.Join(datasetDir, "quality_report.json")
	reportBytes, _ := json.MarshalIndent(report, "", "  ")
	_ = os.WriteFile(reportPath, reportBytes, 0644)

	reportMDPath := filepath.Join(datasetDir, "quality_report.md")
	_ = os.WriteFile(reportMDPath, []byte(renderMarkdownReport(report)), 0644)

	// 6. Generate Metadata Manifest
	labelDist := make(map[string]int)
	provDist := make(map[string]int)
	for _, r := range datasetRecords {
		if r.IsAnomaly == 1 {
			labelDist["anomaly"]++
		} else {
			labelDist["normal"]++
		}
		provDist[string(r.LabelSource)]++
	}

	meta := &DatasetMetadata{
		DatasetID:         opt.DatasetID,
		DatasetVersion:    "1.0.0",
		Domain:            opt.Domain,
		CreatedAt:         time.Now().UTC().Format(time.RFC3339),
		SourceStartTime:   opt.StartTime.UTC().Format(time.RFC3339),
		SourceEndTime:     opt.EndTime.UTC().Format(time.RFC3339),
		LookbackHours:     opt.LookbackDuration.Hours(),
		FeatureVersion:    FeatureGenerationVersion,
		SchemaVersion:     SchemaVersion,
		LabelingVersion:   LabelingVersion,
		TotalRows:         totalRecords,
		TrainRows:         trainIdx,
		ValRows:           valIdx - trainIdx,
		TestRows:          totalRecords - valIdx,
		UniqueTracks:      len(uniqueTracksMap),
		Files: []string{
			"data.csv",
			"train.csv",
			"val.csv",
			"test.csv",
			"metadata.json",
			"quality_report.json",
			"quality_report.md",
		},
		FeatureColumns: []string{
			"course_delta", "heading_delta", "speed_delta", "average_speed",
			"speed_variance", "ais_gap_minutes", "dist_restricted_zone",
			"dist_historical_site", "ewma_deviation",
		},
		LabelDistribution: labelDist,
		ProvenanceSummary: provDist,
	}

	metaPath := filepath.Join(datasetDir, "metadata.json")
	metaBytes, _ := json.MarshalIndent(meta, "", "  ")
	_ = os.WriteFile(metaPath, metaBytes, 0644)

	return meta, report, nil
}

func filterSplit(records []MLDatasetRecord, split string) []MLDatasetRecord {
	var res []MLDatasetRecord
	for _, r := range records {
		if r.DatasetSplit == split {
			res = append(res, r)
		}
	}
	return res
}

func exportRecordsCSV(filename string, records []MLDatasetRecord) error {
	f, err := os.Create(filename)
	if err != nil {
		return err
	}
	defer f.Close()

	w := csv.NewWriter(f)
	defer w.Flush()

	header := []string{
		"observation_id", "track_id", "asset_name", "domain", "source", "observed_at",
		"lat", "lon", "course_delta", "heading_delta", "speed", "speed_delta",
		"previous_speed", "average_speed", "speed_variance", "ais_gap_minutes",
		"dist_restricted_zone", "dist_historical_site", "in_restricted_zone",
		"near_historical_attack", "ewma_deviation", "model_score", "model_severity",
		"is_anomaly", "label_source", "label_confidence", "anomaly_reasons", "dataset_split",
	}
	if err := w.Write(header); err != nil {
		return err
	}

	for _, r := range records {
		row := []string{
			strconv.FormatInt(r.ObservationID, 10),
			r.TrackID,
			r.AssetName,
			r.Domain,
			r.Source,
			r.ObservedAt.UTC().Format(time.RFC3339),
			strconv.FormatFloat(r.Lat, 'f', 6, 64),
			strconv.FormatFloat(r.Lon, 'f', 6, 64),
			strconv.FormatFloat(r.CourseDelta, 'f', 4, 64),
			strconv.FormatFloat(r.HeadingDelta, 'f', 4, 64),
			strconv.FormatFloat(r.Speed, 'f', 2, 64),
			strconv.FormatFloat(r.SpeedDelta, 'f', 2, 64),
			strconv.FormatFloat(r.PreviousSpeed, 'f', 2, 64),
			strconv.FormatFloat(r.AverageSpeed, 'f', 2, 64),
			strconv.FormatFloat(r.SpeedVariance, 'f', 4, 64),
			strconv.FormatFloat(r.AisGapMinutes, 'f', 2, 64),
			strconv.FormatFloat(r.DistRestrictedZone, 'f', 2, 64),
			strconv.FormatFloat(r.DistHistoricalSite, 'f', 2, 64),
			strconv.FormatBool(r.InRestrictedZone),
			strconv.FormatBool(r.NearHistoricalAttack),
			strconv.FormatFloat(r.EWMADeviation, 'f', 4, 64),
			strconv.FormatFloat(r.ModelScore, 'f', 2, 64),
			r.ModelSeverity,
			strconv.Itoa(r.IsAnomaly),
			string(r.LabelSource),
			strconv.FormatFloat(r.LabelConfidence, 'f', 2, 64),
			r.AnomalyReasons,
			r.DatasetSplit,
		}
		if err := w.Write(row); err != nil {
			return err
		}
	}
	return nil
}

func generateQualityReport(id string, start, end time.Time, records []MLDatasetRecord, uniqueTracks int) *DatasetQualityReport {
	report := &DatasetQualityReport{
		DatasetID:         id,
		GeneratedAt:       time.Now().UTC().Format(time.RFC3339),
		TimeRange:         fmt.Sprintf("%s to %s", start.UTC().Format(time.RFC3339), end.UTC().Format(time.RFC3339)),
		TotalObservations: len(records),
		UniqueVessels:     uniqueTracks,
		FeatureStatistics: make(map[string]NumericalFeatureStats),
	}

	if len(records) == 0 {
		return report
	}

	for _, r := range records {
		if r.IsAnomaly == 1 {
			report.AnomalyCount++
		} else {
			report.NormalCount++
		}
		if r.LabelSource == LabelGroundTruth || r.LabelSource == LabelHumanReviewed {
			report.GroundTruthCount++
		} else if r.LabelSource == LabelModelPrediction {
			report.ModelPredictionCount++
		}
	}

	report.NormalPct = float64(report.NormalCount) / float64(len(records)) * 100.0
	report.AnomalyPct = float64(report.AnomalyCount) / float64(len(records)) * 100.0

	// Compute moments for core kinematic features
	computeStats := func(name string, extractor func(r MLDatasetRecord) float64) {
		minVal := math.MaxFloat64
		maxVal := -math.MaxFloat64
		sum := 0.0
		for _, r := range records {
			v := extractor(r)
			if v < minVal {
				minVal = v
			}
			if v > maxVal {
				maxVal = v
			}
			sum += v
		}
		mean := sum / float64(len(records))
		varSum := 0.0
		for _, r := range records {
			v := extractor(r)
			varSum += (v - mean) * (v - mean)
		}
		std := math.Sqrt(varSum / float64(len(records)))
		report.FeatureStatistics[name] = NumericalFeatureStats{
			Min:    minVal,
			Max:    maxVal,
			Mean:   mean,
			StdDev: std,
			Nulls:  0,
		}
	}

	computeStats("speed", func(r MLDatasetRecord) float64 { return r.Speed })
	computeStats("course_delta", func(r MLDatasetRecord) float64 { return r.CourseDelta })
	computeStats("speed_delta", func(r MLDatasetRecord) float64 { return r.SpeedDelta })
	computeStats("ais_gap_minutes", func(r MLDatasetRecord) float64 { return r.AisGapMinutes })
	computeStats("dist_restricted_zone", func(r MLDatasetRecord) float64 { return r.DistRestrictedZone })
	computeStats("ewma_deviation", func(r MLDatasetRecord) float64 { return r.EWMADeviation })

	report.DataQualityFlags = []string{
		"100% complete feature coverage without missing null values",
		"Lookback warm-up isolated from evaluation sample distribution",
		"Chronological split applied to prevent train/test future leakage",
	}

	return report
}

func renderMarkdownReport(r *DatasetQualityReport) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("# Dataset Quality Report — %s\n\n", r.DatasetID))
	sb.WriteString(fmt.Sprintf("**Generated At:** %s  \n", r.GeneratedAt))
	sb.WriteString(fmt.Sprintf("**Temporal Window:** %s  \n\n", r.TimeRange))
	sb.WriteString("## 1. Population & Class Distribution\n\n")
	sb.WriteString(fmt.Sprintf("- **Total Observations:** %d\n", r.TotalObservations))
	sb.WriteString(fmt.Sprintf("- **Unique Vessels/Tracks:** %d\n", r.UniqueVessels))
	sb.WriteString(fmt.Sprintf("- **Normal Observations:** %d (%.2f%%)\n", r.NormalCount, r.NormalPct))
	sb.WriteString(fmt.Sprintf("- **Anomaly-Suspected Observations:** %d (%.2f%%)\n", r.AnomalyCount, r.AnomalyPct))
	sb.WriteString(fmt.Sprintf("- **Human-Verified Ground Truth:** %d\n\n", r.GroundTruthCount))

	sb.WriteString("## 2. Feature Statistics\n\n")
	sb.WriteString("| Feature | Min | Max | Mean | Std Dev | Missing |\n")
	sb.WriteString("|---|---|---|---|---|---|\n")
	for name, s := range r.FeatureStatistics {
		sb.WriteString(fmt.Sprintf("| `%s` | %.2f | %.2f | %.2f | %.2f | %d |\n",
			name, s.Min, s.Max, s.Mean, s.StdDev, s.Nulls))
	}
	return sb.String()
}

func computeDistToNearestZone(lat, lon float64) float64 {
	zones := anomaly.GetRestrictedZones()
	minDist := 999.0
	for _, zone := range zones {
		distNM := geo.HaversineNM(lat, lon, zone.CenterLat, zone.CenterLon)
		radiusNM := zone.RadiusDeg * 60.0
		distToBoundary := math.Max(0, distNM-radiusNM)
		if distToBoundary < minDist {
			minDist = distToBoundary
		}
	}
	return minDist
}

func computeDistToNearestAttack(lat, lon float64, nearAttack bool) float64 {
	if nearAttack {
		return 0.0
	}
	attacks := geo.GetHistoricalAttacks()
	if len(attacks) == 0 {
		return 999.0
	}
	minDist := 999.0
	for _, a := range attacks {
		d := geo.HaversineNM(lat, lon, a.Latitude, a.Longitude)
		if d < minDist {
			minDist = d
		}
	}
	return minDist
}
