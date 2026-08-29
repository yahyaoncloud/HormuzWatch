package news

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"

	"Geospatial-harmuz-watch/server/internal/db"
	"Geospatial-harmuz-watch/server/internal/intelligence/source"
)

// ProcessAndStore runs the full news pipeline on a raw article and persists
// the result to the database. Returns true if the article was new (not a dupe).
func ProcessAndStore(ctx context.Context, raw source.RawArticle, sourceID string) bool {
	articleID := GenerateArticleID(raw.URL)
	tracker := Track()

	// ── Fast-path check: if tracker already completed this article ──
	if rec, exists := tracker.GetArticleRecord(articleID); exists && rec.State.IsTerminal() {
		return rec.State != StateDuplicate && rec.State != StateSkipped
	}

	// ── Fast-path dedup check: skip if content hash already exists ────
	cleaned := Clean(raw.Content)
	dedup := CheckDuplicate(DedupArticle{
		URL:        raw.URL,
		Title:      raw.Title,
		Content:    cleaned,
		SourceName: raw.SourceName,
	})
	if exists, _ := db.HashExists(dedup.ContentHash); exists {
		_ = tracker.TransitionArticle(articleID, sourceID, StateDuplicate, "content hash match")
		return false
	}

	// ── State: QUEUED → PROCESSING ──────────────────────────
	_ = tracker.TransitionArticle(articleID, sourceID, StateProcessing, "pipeline started")

	// ── Run the 7-step ML pipeline ──────────────────────────
	features, assessment := ProcessArticle(raw)

	// ── State: PROCESSING → SCORED ──────────────────────────
	_ = tracker.TransitionArticle(articleID, sourceID, StateScored,
		fmt.Sprintf("risk=%.1f cat=%s", assessment.RiskScore, assessment.Category))

	// ── Extract coordinates ─────────────────────────────────
	entities := ExtractEntities(cleaned)
	coords := ExtractCoordinates(cleaned, entities, raw.Country)
	lat, lon := coords.BestLatLon()

	// ── State: SCORED → GEOCODED ────────────────────────────
	if lat != 0 || lon != 0 {
		tracker.TransitionArticle(articleID, sourceID, StateGeocoded,
			fmt.Sprintf("%s conf=%.2f lat=%.4f lon=%.4f", coords.Source, coords.Confidence, lat, lon))
	} else {
		tracker.TransitionArticle(articleID, sourceID, StateGeocoded, "no coordinates resolved")
	}

	// ── Persist to database ─────────────────────────────────
	err := db.InsertArticle(
		articleID,
		sourceID,
		raw.Title,
		raw.URL,
		raw.Content,
		truncate(raw.Content, 500),
		raw.PublishedAt,
		assessment.Language,
		assessment.Category,
		raw.Country,
		assessment.RiskScore,
		features.SourceReliability,
		lat,
		lon,
	)

	if err != nil {
		slog.Warn("failed to insert article", "url", raw.URL, "error", err)
		tracker.TransitionArticle(articleID, sourceID, StateProcessFailed, err.Error())
		return false
	}

	// ── State: GEOCODED → STORED ────────────────────────────
	tracker.TransitionArticle(articleID, sourceID, StateStored, "persisted to database")

	// ── Store content hash for future dedup ─────────────────
	_ = db.InsertContentHash(dedup.ContentHash, articleID, "sha256")

	// ── Persist extracted entities ───────────────────────────
	persistEntities(ctx, articleID, entities, coords)

	// ── LLM augmentation (if enabled) ────────────────────────
	if assessment.NeedsTranslate {
		translator := NewTranslator()
		if translated, err := translator.Translate(ctx, raw.Content, assessment.Language, "en"); err == nil && translated != "" {
			slog.Debug("article translated", "article", articleID, "from", assessment.Language, "to", "en")
		}
	}

	// ── Text-to-JSON extraction fallback (always, not just LLM) ─
	// Produces a structured JSON payload from raw text using regex.
	// This runs regardless of LLM availability so every article has
	// a minimum JSON payload with country/city/vessel extraction.
	extractedJSON := ExtractTextToJSON(raw.Content + " " + raw.Title)
	if extractedJSON != "" {
		_ = db.StoreArticleMetadata(articleID, "regex_extraction", extractedJSON)
	}

	// ── State: STORED → DONE ─────────────────────────────────
	tracker.TransitionArticle(articleID, sourceID, StateDone,
		fmt.Sprintf("entities=%d risk=%.1f geo=%s", CountEntities(entities), assessment.RiskScore, coords.Source))

	// ── Log geo info ─────────────────────────────────────────
	if lat != 0 || lon != 0 {
		slog.Debug("article geo-tagged",
			"title", raw.Title,
			"lat", lat,
			"lon", lon,
			"source", coords.Source,
			"confidence", coords.Confidence,
		)
	}

	return true
}

// persistEntities converts extracted entities to DB rows and stores them
// using a batch INSERT for efficiency.
func persistEntities(ctx context.Context, articleID string, entities EntityResult, coords CoordResult) {
	var rows []db.EntityRow

	add := func(typ, name string) {
		rows = append(rows, db.EntityRow{
			Type:       typ,
			Name:       name,
			Value:      name,
			Confidence: 0.8,
		})
	}

	for _, org := range entities.Organizations {
		add("organization", org)
	}
	for _, ship := range entities.Ships {
		add("ship", ship)
	}
	for _, ac := range entities.Aircraft {
		add("aircraft", ac)
	}
	for _, port := range entities.Ports {
		add("port", port)
	}
	for _, ap := range entities.Airports {
		add("airport", ap)
	}
	for _, country := range entities.Countries {
		add("country", country)
	}
	for _, city := range entities.Cities {
		add("city", city)
	}
	for _, company := range entities.Companies {
		add("company", company)
	}

	if len(rows) > 0 {
		if err := db.InsertEntities(ctx, articleID, rows); err != nil {
			slog.Warn("failed to persist entities", "article", articleID, "count", len(rows), "error", err)
		}
	}
}

// GenerateArticleID creates a deterministic ID from a URL.
func GenerateArticleID(url string) string {
	h := sha256.Sum256([]byte(url))
	return hex.EncodeToString(h[:16]) // 32-char hex
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

// ── Geo-JSON helpers for map display ──────────────────────────────────

// NewsGeoFeature represents a single article location for map display.
type NewsGeoFeature struct {
	ID        string  `json:"id"`
	Title     string  `json:"title"`
	Lat       float64 `json:"lat"`
	Lon       float64 `json:"lon"`
	RiskScore float64 `json:"risk_score"`
	Category  string  `json:"category"`
	Country   string  `json:"country"`
	Source    string  `json:"source"`
	Published string  `json:"published_at"`
	URL       string  `json:"url"`
}

// NewsHeatmapResponse is the API response for the news heatmap endpoint.
type NewsHeatmapResponse struct {
	Features   []NewsGeoFeature `json:"features"`
	TotalCount int              `json:"total_count"`
	Bounds     GeoBounds        `json:"bounds"`
}

// GeoBounds represents a bounding box.
type GeoBounds struct {
	North float64 `json:"north"`
	South float64 `json:"south"`
	East  float64 `json:"east"`
	West  float64 `json:"west"`
}

// NewsMetrics holds aggregated map-ready metrics from the news pipeline.
type NewsMetrics struct {
	Hotspots      []GeoPoint         `json:"hotspots"`          // high-risk article clusters
	RiskByRegion  map[string]float64 `json:"risk_by_region"`    // country/region → avg risk
	TotalWithGeo  int                `json:"total_with_geo"`    // articles with coordinates
	TotalArticles int                `json:"total_articles"`    // all articles in window
	GeoJSON       json.RawMessage    `json:"geojson,omitempty"` // optional full GeoJSON
}
