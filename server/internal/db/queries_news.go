package db

import (
	"context"
	"database/sql"
	"time"
)

// ── Source queries ─────────────────────────────────────────────────

// UpsertSource inserts or updates a source record.
func UpsertSource(id, name, stype, url, country, language string, reliability float64) error {
	query := `
		INSERT INTO sources (id, name, type, url, country, language, reliability)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			name=excluded.name, type=excluded.type, url=excluded.url,
			country=excluded.country, language=excluded.language,
			reliability=excluded.reliability, last_fetched_at=NOW()
	`
	_, err := Exec(query, id, name, stype, url, country, language, reliability)
	return err
}

// MarkSourceFetched updates a source's last_fetched_at timestamp.
func MarkSourceFetched(id string) error {
	_, err := Exec("UPDATE sources SET last_fetched_at = NOW() WHERE id = ?", id)
	return err
}

// MarkSourceError records a fetch error on a source.
func MarkSourceError(id, errMsg string) error {
	_, err := Exec("UPDATE sources SET last_error = ? WHERE id = ?", errMsg, id)
	return err
}

// GetEnabledSources returns all sources with enabled = TRUE.
func GetEnabledSources() (*sql.Rows, error) {
	return Query("SELECT id, name, type, url, country, language, reliability FROM sources WHERE enabled = TRUE")
}

// ── Article queries ────────────────────────────────────────────────

// InsertArticle inserts a new article. Returns false when the URL already
// exists (unique constraint hit).
func InsertArticle(id, sourceID, title, url, content, summary string, publishedAt time.Time, language, category, country string, riskScore, sourceReliability, lat, lon float64) error {
	query := `
		INSERT INTO articles (id, source_id, title, url, content, summary, published_at, language, category, country, risk_score, source_reliability, lat, lon)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(url) DO NOTHING
	`
	_, err := Exec(query, id, sourceID, title, url, content, summary, publishedAt, language, category, country, riskScore, sourceReliability, lat, lon)
	return err
}

// ArticleExists checks if an article URL already exists.
func ArticleExists(url string) (bool, error) {
	var count int
	err := QueryRow("SELECT COUNT(*) FROM articles WHERE url = ?", url).Scan(&count)
	return count > 0, err
}

// GetArticleByID retrieves a single article.
func GetArticleByID(id string) (*sql.Row, error) {
	return QueryRow("SELECT id, source_id, title, url, content, summary, published_at, fetched_at, language, category, risk_score, ml_score, source_reliability, country, lat, lon, metadata FROM articles WHERE id = ?", id), nil
}

// GetLatestArticles returns the most recent articles with optional filtering.
func GetLatestArticles(limit, offset int, category, language, country string) (*sql.Rows, error) {
	query := "SELECT id, source_id, title, url, summary, published_at, language, category, risk_score, country, lat, lon FROM articles WHERE 1=1"
	var args []interface{}

	if category != "" {
		query += " AND category = ?"
		args = append(args, category)
	}
	if language != "" {
		query += " AND language = ?"
		args = append(args, language)
	}
	if country != "" {
		query += " AND country = ?"
		args = append(args, country)
	}
	query += " ORDER BY published_at DESC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)
	return Query(query, args...)
}

// GetTrendingArticles returns high-risk articles from the last 6 hours.
func GetTrendingArticles(minScore float64, limit int) (*sql.Rows, error) {
	return Query(
		"SELECT id, source_id, title, url, summary, published_at, language, category, risk_score, country, lat, lon FROM articles WHERE risk_score >= ? AND published_at >= NOW() - INTERVAL '6 hours' ORDER BY risk_score DESC LIMIT ?",
		minScore, limit,
	)
}

// SearchArticles performs a full-text search on article titles and content.
func SearchArticles(keyword string, limit int) (*sql.Rows, error) {
	return Query(
		"SELECT id, source_id, title, url, summary, published_at, language, category, risk_score, country, lat, lon FROM articles WHERE title ILIKE ? OR content ILIKE ? ORDER BY published_at DESC LIMIT ?",
		"%"+keyword+"%", "%"+keyword+"%", limit,
	)
}

// UpdateArticleScore sets the ML score and risk score on an existing article.
func UpdateArticleScore(id string, riskScore, mlScore float64) error {
	_, err := Exec("UPDATE articles SET risk_score = ?, ml_score = ? WHERE id = ?", riskScore, mlScore, id)
	return err
}

// ── Entity queries ─────────────────────────────────────────────────

// InsertEntities bulk-inserts extracted entities for an article.
func InsertEntities(ctx context.Context, articleID string, entities []EntityRow) error {
	if len(entities) == 0 {
		return nil
	}
	tx, err := PGX.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, e := range entities {
		_, err := tx.Exec(ctx,
			`INSERT INTO entities (article_id, entity_type, entity_name, entity_value, confidence)
			 VALUES ($1, $2, $3, $4, $5)`,
			articleID, e.Type, e.Name, e.Value, e.Confidence,
		)
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// EntityRow is a single entity to persist.
type EntityRow struct {
	Type       string
	Name       string
	Value      string
	Confidence float64
}

// GetEntitiesByArticle returns all entities for an article.
func GetEntitiesByArticle(articleID string) (*sql.Rows, error) {
	return Query("SELECT id, entity_type, entity_name, entity_value, confidence FROM entities WHERE article_id = ? ORDER BY entity_type", articleID)
}

// ── Content hash queries ───────────────────────────────────────────

// InsertContentHash records a content hash for dedup tracking.
func InsertContentHash(hash, articleID, hashType string) error {
	_, err := Exec(
		`INSERT INTO content_hashes (hash, article_id, hash_type) VALUES (?, ?, ?) ON CONFLICT(hash) DO NOTHING`,
		hash, articleID, hashType,
	)
	return err
}

// HashExists checks if a content hash already exists.
func HashExists(hash string) (bool, error) {
	var count int
	err := QueryRow("SELECT COUNT(*) FROM content_hashes WHERE hash = ?", hash).Scan(&count)
	return count > 0, err
}

// ── Scrape job queries ─────────────────────────────────────────────

// StartScrapeJob creates a new scrape job and returns its ID.
func StartScrapeJob(sourceID string) (int64, error) {
	var id int64
	err := QueryRow(
		"INSERT INTO scrape_jobs (source_id, status) VALUES (?, 'running') RETURNING id",
		sourceID,
	).Scan(&id)
	return id, err
}

// CompleteScrapeJob marks a scrape job as completed.
func CompleteScrapeJob(jobID int64, fetched, new_, dups, errs int, errDetail string) error {
	_, execErr := Exec(
		`UPDATE scrape_jobs SET completed_at = NOW(), articles_fetched = ?, articles_new = ?, articles_duplicate = ?, errors = ?, error_detail = ?, status = 'completed' WHERE id = ?`,
		fetched, new_, dups, errs, errDetail, jobID,
	)
	return execErr
}

// FailScrapeJob marks a scrape job as failed.
func FailScrapeJob(jobID int64, errs int, errDetail string) error {
	_, execErr := Exec(
		"UPDATE scrape_jobs SET completed_at = NOW(), errors = ?, error_detail = ?, status = 'failed' WHERE id = ?",
		errs, errDetail, jobID,
	)
	return execErr
}

// ── Event queries ──────────────────────────────────────────────────

// UpsertEvent inserts or updates an aggregated intelligence event.
func UpsertEvent(id, title, description, eventType, severity, country string, lat, lon float64, startTime, endTime time.Time, sourceArticleIDs string) error {
	_, err := Exec(
		`INSERT INTO events (id, title, description, event_type, severity, lat, lon, country, start_time, end_time, source_article_ids)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET
			title=excluded.title, description=excluded.description,
			event_type=excluded.event_type, severity=excluded.severity,
			lat=excluded.lat, lon=excluded.lon, country=excluded.country,
			start_time=excluded.start_time, end_time=excluded.end_time,
			source_article_ids=excluded.source_article_ids`,
		id, title, description, eventType, severity, lat, lon, country, startTime, endTime, sourceArticleIDs,
	)
	return err
}

// GetEvents returns events with optional filtering.
func GetEvents(eventType, severity, country string, limit, offset int) (*sql.Rows, error) {
	query := "SELECT id, title, description, event_type, severity, lat, lon, country, start_time, end_time, source_article_ids, created_at FROM events WHERE 1=1"
	var args []interface{}

	if eventType != "" {
		query += " AND event_type = ?"
		args = append(args, eventType)
	}
	if severity != "" {
		query += " AND severity = ?"
		args = append(args, severity)
	}
	if country != "" {
		query += " AND country = ?"
		args = append(args, country)
	}
	query += " ORDER BY start_time DESC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)
	return Query(query, args...)
}

// GetTimeline returns a chronological feed of articles and events.
func GetTimeline(limit int) (*sql.Rows, error) {
	return Query(
		`SELECT id, title, summary, url, published_at, 'article' AS item_type, risk_score, category, country
		 FROM articles
		 UNION ALL
		 SELECT id, title, description, '' AS url, start_time, 'event' AS item_type, 0, event_type, country
		 FROM events
		 ORDER BY published_at DESC LIMIT ?`,
		limit,
	)
}

// GetGeoArticles returns articles with coordinates within a bounding box
// and optional risk threshold for map display.
func GetGeoArticles(north, south, east, west float64, minRiskScore float64, limit int) (*sql.Rows, error) {
	query := `SELECT id, source_id, title, url, summary, published_at, language, category, risk_score, country, lat, lon
		FROM articles
		WHERE lat IS NOT NULL AND lon IS NOT NULL
		AND lat BETWEEN ? AND ?
		AND lon BETWEEN ? AND ?
		AND risk_score >= ?
		ORDER BY risk_score DESC LIMIT ?`
	return Query(query, south, north, west, east, minRiskScore, limit)
}

// GetArticlesWithCoords returns all articles that have lat/lon within a
// time window, for heatmap/aggregation use.
func GetArticlesWithCoords(hoursBack int, minRiskScore float64) (*sql.Rows, error) {
	return Query(
		`SELECT id, source_id, title, url, summary, published_at, language, category, risk_score, country, lat, lon
		 FROM articles
		 WHERE lat IS NOT NULL AND lon IS NOT NULL
		 AND published_at >= NOW() - INTERVAL '1 hour' * ?
		 AND risk_score >= ?
		 ORDER BY risk_score DESC`,
		hoursBack, minRiskScore,
	)
}

// ── Country queries ────────────────────────────────────────────────

// SeedCountries populates the countries table with Gulf-region defaults.
func SeedCountries() {
	gulfCountries := []struct {
		code, name, region string
		risk               float64
	}{
		{"SA", "Saudi Arabia", "Gulf", 0.40},
		{"AE", "United Arab Emirates", "Gulf", 0.25},
		{"QA", "Qatar", "Gulf", 0.30},
		{"KW", "Kuwait", "Gulf", 0.35},
		{"BH", "Bahrain", "Gulf", 0.35},
		{"OM", "Oman", "Gulf", 0.20},
		{"IR", "Iran", "Gulf", 0.85},
		{"IQ", "Iraq", "Gulf", 0.75},
		{"YE", "Yemen", "Gulf", 0.80},
		{"JO", "Jordan", "Levant", 0.45},
		{"IL", "Israel", "Levant", 0.55},
		{"SY", "Syria", "Levant", 0.80},
		{"LB", "Lebanon", "Levant", 0.65},
		{"PS", "Palestine", "Levant", 0.70},
		{"EG", "Egypt", "North Africa", 0.50},
		{"TR", "Turkey", "Anatolia", 0.45},
		{"US", "United States", "Global", 0.15},
		{"GB", "United Kingdom", "Global", 0.15},
		{"FR", "France", "Global", 0.20},
		{"RU", "Russia", "Global", 0.60},
		{"CN", "China", "Global", 0.40},
		{"IN", "India", "Global", 0.35},
	}

	for _, c := range gulfCountries {
		_, _ = Exec(
			"INSERT INTO countries (code, name, region, risk_level) VALUES (?, ?, ?, ?) ON CONFLICT(code) DO UPDATE SET risk_level = ?",
			c.code, c.name, c.region, c.risk, c.risk,
		)
	}
}
