package db

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"Geospatial-harmuz-watch/server/internal/config"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
)

var DB *sql.DB

// PGX is the incremental migration path for new domain repositories. Legacy
// callers continue to use DB until their query families are moved safely.
var PGX *pgxpool.Pool

func InitDB() error {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required (Supabase Postgres connection string)")
	}

	if !strings.Contains(databaseURL, "sslmode=") {
		sep := "?"
		if strings.Contains(databaseURL, "?") {
			sep = "&"
		}
		databaseURL += sep + "sslmode=require"
	}

	// Disable prepared statements for PgBouncer transaction mode compatibility
	if !strings.Contains(databaseURL, "prefer_simple_protocol=") {
		sep := "?"
		if strings.Contains(databaseURL, "?") {
			sep = "&"
		}
		databaseURL += sep + "prefer_simple_protocol=true"
	}

	var err error
	DB, err = sql.Open("pgx", databaseURL)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}

	DB.SetMaxOpenConns(10)
	DB.SetMaxIdleConns(5)

	if err := DB.Ping(); err != nil {
		return fmt.Errorf("ping database: %w", err)
	}

	// database/sql's pgx driver accepts prefer_simple_protocol; pgxpool uses
	// the v5 default_query_exec_mode spelling for the same behavior.
	poolURL := strings.ReplaceAll(databaseURL, "prefer_simple_protocol=true", "default_query_exec_mode=simple_protocol")
	poolConfig, err := pgxpool.ParseConfig(poolURL)
	if err != nil {
		return fmt.Errorf("parse pgx pool config: %w", err)
	}
	poolConfig.MaxConns = 10
	poolConfig.MinConns = 1
	poolConfig.MaxConnLifetime = 30 * time.Minute
	// Supabase commonly uses PgBouncer transaction pooling. Simple protocol
	// avoids prepared-statement affinity problems during the migration.
	poolConfig.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
	PGX, err = pgxpool.NewWithConfig(context.Background(), poolConfig)
	if err != nil {
		return fmt.Errorf("create pgx pool: %w", err)
	}
	if err := PGX.Ping(context.Background()); err != nil {
		PGX.Close()
		return fmt.Errorf("ping pgx pool: %w", err)
	}

	schema := `
	CREATE TABLE IF NOT EXISTS news (
		id TEXT PRIMARY KEY,
		title TEXT,
		link TEXT,
		pub_date TIMESTAMPTZ,
		source TEXT,
		summary TEXT
	);

	CREATE TABLE IF NOT EXISTS tracks (
		track_id TEXT PRIMARY KEY,
		asset_name TEXT,
		timestamp TEXT,
		lat DOUBLE PRECISION,
		lon DOUBLE PRECISION,
		speed DOUBLE PRECISION,
		previous_speed DOUBLE PRECISION,
		heading DOUBLE PRECISION,
		course_delta DOUBLE PRECISION,
		ais_age_minutes INTEGER,
		hot_zone_distance_nm DOUBLE PRECISION,
		object_type TEXT NOT NULL DEFAULT 'vessel',
		source TEXT NOT NULL DEFAULT 'webapp',
		last_updated TIMESTAMPTZ DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS telemetry_observations (
		id BIGSERIAL PRIMARY KEY,
		track_id TEXT NOT NULL,
		asset_name TEXT NOT NULL,
		domain TEXT NOT NULL CHECK (domain IN ('vessel', 'aircraft')),
		source TEXT NOT NULL,
		observed_at TIMESTAMPTZ NOT NULL,
		lat DOUBLE PRECISION NOT NULL,
		lon DOUBLE PRECISION NOT NULL,
		speed DOUBLE PRECISION NOT NULL DEFAULT 0,
		previous_speed DOUBLE PRECISION NOT NULL DEFAULT 0,
		heading DOUBLE PRECISION NOT NULL DEFAULT 0,
		course_delta DOUBLE PRECISION NOT NULL DEFAULT 0,
		ais_age_minutes INTEGER NOT NULL DEFAULT 0,
		hot_zone_distance_nm DOUBLE PRECISION NOT NULL DEFAULT 0,
		altitude DOUBLE PRECISION NOT NULL DEFAULT 0,
		squawk TEXT NOT NULL DEFAULT '',
		on_ground BOOLEAN NOT NULL DEFAULT FALSE,
		recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);

	CREATE INDEX IF NOT EXISTS idx_telemetry_observations_domain_time
		ON telemetry_observations (domain, observed_at DESC);
	CREATE INDEX IF NOT EXISTS idx_telemetry_observations_track_time
		ON telemetry_observations (track_id, observed_at DESC);

	CREATE TABLE IF NOT EXISTS dataset_snapshots (
		snapshot_id TEXT PRIMARY KEY,
		domain TEXT NOT NULL,
		created_at TIMESTAMPTZ NOT NULL,
		row_count INTEGER NOT NULL,
		status TEXT NOT NULL,
		external_file_id TEXT,
		external_manifest_id TEXT,
		error_message TEXT
	);

	CREATE TABLE IF NOT EXISTS anomalies (
		track_id TEXT PRIMARY KEY,
		score DOUBLE PRECISION,
		severity TEXT,
		reasons TEXT,
		actions TEXT,
		last_updated TIMESTAMPTZ DEFAULT NOW(),
		FOREIGN KEY(track_id) REFERENCES tracks(track_id)
	);

	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT
	);

	CREATE TABLE IF NOT EXISTS watchlist (
		track_id TEXT PRIMARY KEY,
		notes TEXT,
		added_at TIMESTAMPTZ DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		username TEXT UNIQUE,
		email TEXT UNIQUE,
		password_hash TEXT,
		role TEXT DEFAULT 'user',
		status TEXT DEFAULT 'pending',
		supabase_uid TEXT,
		created_at TIMESTAMPTZ DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS sessions (
		id TEXT PRIMARY KEY,
		username TEXT NOT NULL,
		created_at TEXT NOT NULL,
		expires_at TEXT NOT NULL,
		last_seen_at TEXT,
		revoked_at TEXT,
		FOREIGN KEY(username) REFERENCES users(username)
	);

	-- ── Intelligence Platform tables ───────────────────────────────

	CREATE TABLE IF NOT EXISTS sources (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		type TEXT NOT NULL CHECK (type IN ('rss', 'api', 'scraper', 'websocket')),
		url TEXT NOT NULL,
		country TEXT,
		language TEXT,
		reliability REAL DEFAULT 0.7,
		enabled BOOLEAN DEFAULT TRUE,
		rate_limit_rps REAL,
		last_fetched_at TIMESTAMPTZ,
		last_error TEXT,
		created_at TIMESTAMPTZ DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS articles (
		id TEXT PRIMARY KEY,
		source_id TEXT REFERENCES sources(id),
		title TEXT NOT NULL,
		url TEXT NOT NULL,
		content TEXT,
		summary TEXT,
		published_at TIMESTAMPTZ,
		fetched_at TIMESTAMPTZ DEFAULT NOW(),
		language TEXT,
		translated_content TEXT,
		category TEXT,
		risk_score REAL,
		ml_score REAL,
		source_reliability REAL,
		country TEXT,
		lat DOUBLE PRECISION,
		lon DOUBLE PRECISION,
		metadata JSONB
	);
	CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source_id);
	CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
	CREATE INDEX IF NOT EXISTS idx_articles_language ON articles(language);
	CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
	CREATE INDEX IF NOT EXISTS idx_articles_risk ON articles(risk_score DESC);
	CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_url ON articles(url);

	CREATE TABLE IF NOT EXISTS entities (
		id BIGSERIAL PRIMARY KEY,
		article_id TEXT REFERENCES articles(id) ON DELETE CASCADE,
		entity_type TEXT NOT NULL CHECK (entity_type IN ('organization', 'person', 'ship', 'aircraft', 'port', 'airport', 'country', 'city', 'company')),
		entity_name TEXT NOT NULL,
		entity_value TEXT,
		confidence REAL,
		created_at TIMESTAMPTZ DEFAULT NOW()
	);
	CREATE INDEX IF NOT EXISTS idx_entities_article ON entities(article_id);
	CREATE INDEX IF NOT EXISTS idx_entities_type_name ON entities(entity_type, entity_name);

	CREATE TABLE IF NOT EXISTS countries (
		code TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		region TEXT,
		risk_level REAL DEFAULT 0.5,
		coordinates JSONB
	);

	CREATE TABLE IF NOT EXISTS content_hashes (
		hash TEXT PRIMARY KEY,
		article_id TEXT REFERENCES articles(id) ON DELETE CASCADE,
		hash_type TEXT NOT NULL DEFAULT 'sha256',
		created_at TIMESTAMPTZ DEFAULT NOW()
	);
	CREATE INDEX IF NOT EXISTS idx_content_hashes_article ON content_hashes(article_id);

	CREATE TABLE IF NOT EXISTS scrape_jobs (
		id BIGSERIAL PRIMARY KEY,
		source_id TEXT REFERENCES sources(id),
		started_at TIMESTAMPTZ DEFAULT NOW(),
		completed_at TIMESTAMPTZ,
		articles_fetched INT DEFAULT 0,
		articles_new INT DEFAULT 0,
		articles_duplicate INT DEFAULT 0,
		errors INT DEFAULT 0,
		error_detail TEXT,
		status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed'))
	);
	CREATE INDEX IF NOT EXISTS idx_scrape_jobs_source ON scrape_jobs(source_id);
	CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);

	CREATE TABLE IF NOT EXISTS events (
		id TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		description TEXT,
		event_type TEXT CHECK (event_type IN ('military', 'political', 'energy', 'maritime', 'aviation', 'weather', 'cyber', 'diplomacy', 'terrorism', 'technology', 'economic')),
		severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
		lat DOUBLE PRECISION,
		lon DOUBLE PRECISION,
		country TEXT,
		start_time TIMESTAMPTZ,
		end_time TIMESTAMPTZ,
		source_article_ids JSONB,
		metadata JSONB,
		created_at TIMESTAMPTZ DEFAULT NOW()
	);
	CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
	CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity);
	CREATE INDEX IF NOT EXISTS idx_events_country ON events(country);
	CREATE INDEX IF NOT EXISTS idx_events_time ON events(start_time DESC);
	`
	if _, err := DB.Exec(schema); err != nil {
		return fmt.Errorf("create schema: %w", err)
	}

	// Add supabase_uid column if it doesn't exist (migration for existing DBs)
	_, _ = DB.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_uid TEXT`)
	_, _ = DB.Exec(`ALTER TABLE tracks ADD COLUMN IF NOT EXISTS object_type TEXT NOT NULL DEFAULT 'vessel'`)
	_, _ = DB.Exec(`ALTER TABLE tracks ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'webapp'`)
	_, _ = DB.Exec(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION`)
	_, _ = DB.Exec(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION`)
	_, _ = DB.Exec(`ALTER TABLE telemetry_observations ADD COLUMN IF NOT EXISTS ship_type INTEGER`)
	_, _ = DB.Exec(`ALTER TABLE telemetry_observations ADD COLUMN IF NOT EXISTS flag TEXT`)
	_, _ = DB.Exec(`ALTER TABLE telemetry_observations ADD COLUMN IF NOT EXISTS destination TEXT`)
	_, _ = DB.Exec(`ALTER TABLE tracks ADD COLUMN IF NOT EXISTS flag TEXT`)
	_, _ = DB.Exec(`ALTER TABLE tracks ADD COLUMN IF NOT EXISTS destination TEXT`)
	_, _ = DB.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_supabase_uid ON users(supabase_uid) WHERE supabase_uid IS NOT NULL`)

	// ── Transit & Analytics tables ─────────────────────────────────
	_, _ = DB.Exec(`
		CREATE TABLE IF NOT EXISTS transit_events (
			id BIGSERIAL PRIMARY KEY,
			mmsi BIGINT NOT NULL,
			gate_name TEXT NOT NULL,
			direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
			crossed_at TIMESTAMPTZ NOT NULL,
			latitude DOUBLE PRECISION,
			longitude DOUBLE PRECISION,
			speed REAL,
			ship_name TEXT,
			ship_type INTEGER,
			flag TEXT,
			destination TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)
	`)
	_, _ = DB.Exec(`CREATE INDEX IF NOT EXISTS idx_transit_crossed_at ON transit_events(crossed_at)`)
	_, _ = DB.Exec(`CREATE INDEX IF NOT EXISTS idx_transit_mmsi ON transit_events(mmsi)`)
	_, _ = DB.Exec(`CREATE INDEX IF NOT EXISTS idx_transit_gate ON transit_events(gate_name)`)
	_, _ = DB.Exec(`CREATE INDEX IF NOT EXISTS idx_transit_dedup ON transit_events(mmsi, gate_name, crossed_at)`)

	_, _ = DB.Exec(`
		CREATE TABLE IF NOT EXISTS analytics_state (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL,
			updated_at TIMESTAMPTZ DEFAULT NOW()
		)
	`)

	defaultSettings := map[string]string{
		"retention_days":           "30",
		"opensky_enabled":          "true",
		"aisstream_enabled":        "true",
		"auto_watchlist_threshold": "75",
		"heatmap_enabled":          "true",
		"news_enabled":             "true",
	}
	for key, value := range defaultSettings {
		_, _ = Exec(
			"INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING",
			key, value,
		)
	}

	_, _ = Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL AND email <> ''`)

	adminHash := "$2a$10$ve2Py624OSITPiUByvPiLuvBuOr/UKcHYOFIZyr4/EUlgMKOKWgoq"
	_, _ = Exec("DELETE FROM users WHERE username = 'admin' AND lower(coalesce(email, '')) <> lower(?)", config.PrimaryAdminEmail)
	_, _ = Exec("UPDATE users SET role = 'user' WHERE lower(coalesce(email, '')) <> lower(?)", config.PrimaryAdminEmail)

	result, err := Exec("UPDATE users SET role = 'admin', status = 'approved' WHERE lower(email) = lower(?)", config.PrimaryAdminEmail)
	if err != nil {
		return fmt.Errorf("promote admin: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		_, _ = Exec(
			`INSERT INTO users (id, username, email, password_hash, role, status)
			 VALUES ('primary-admin-uuid-0000', ?, ?, ?, 'admin', 'approved')
			 ON CONFLICT (id) DO NOTHING`,
			config.PrimaryAdminUsername, config.PrimaryAdminEmail, adminHash,
		)
		_, _ = Exec(
			"UPDATE users SET email = ?, role = 'admin', status = 'approved' WHERE username = ?",
			config.PrimaryAdminEmail, config.PrimaryAdminUsername,
		)
	}

	seedInitialEventsIfEmpty()

	log.Println("PostgreSQL database initialized successfully.")
	return nil
}

func seedInitialEventsIfEmpty() {
	var count int
	_ = DB.QueryRow("SELECT COUNT(*) FROM events").Scan(&count)
	if count > 0 {
		return
	}

	log.Println("[db] Seeding initial OSINT intelligence events into PostgreSQL database...")
	initialEvents := []struct {
		id, title, desc, eventType, severity, country string
		lat, lon                                       float64
	}{
		{"evt-001", "Houthi Anti-Ship Missile Strike near Al Hudaydah", "Anti-ship ballistic missile reported impacting 500m off container ship beam.", "naval", "critical", "Red Sea", 14.2, 42.5},
		{"evt-002", "IRGC-N Fast Attack Craft Transit Shadowing", "Three IRGC fast boats shadowed commercial tanker in Strait TSS.", "naval", "high", "Strait of Hormuz", 26.5, 56.3},
		{"evt-003", "Shahed Reconnaissance UAV Swarm Sighting", "Flight pattern of 15+ UAVs detected near Qeshm Island airspace.", "air", "high", "Strait of Hormuz", 26.9, 56.1},
		{"evt-004", "FALCON Subsea Cable Tension Anomaly", "Seismic telemetry registered cable tension variation off Muscat landing.", "cyber", "medium", "Gulf of Oman", 23.6, 58.5},
		{"evt-005", "EU NAVFOR Pirate Skiff Interdiction", "Naval frigate intercepted armed skiff 80nm off Socotra Island.", "piracy", "medium", "Arabian Sea", 13.8, 53.2},
		{"evt-006", "King Abdulaziz Port Cargo Management Outage", "Cyber incident caused temporary container tracking delay at Dammam.", "cyber", "high", "Persian Gulf", 26.5, 50.1},
		{"evt-007", "IRGC Detention of Sanctioned Tanker", "Panama-flagged tanker detained near Abu Musa Island by IRGC-N.", "naval", "high", "Strait of Hormuz", 26.0, 55.3},
		{"evt-008", "Northern Persian Gulf AIS Spoofing Cluster", "12 tankers broadcasting duplicate MMSI tags during STS crude transfer.", "cyber", "medium", "Persian Gulf", 28.3, 50.8},
		{"evt-009", "US Navy & IRGC Radio Demarche in Strait", "USS Carney shadowed during northbound transit through Hormuz TSS.", "diplomacy", "medium", "Strait of Hormuz", 26.2, 56.8},
		{"evt-010", "Red Sea USV Explosive Detonation", "Explosive USV engaged by bulk carrier security team in Red Sea TSS.", "naval", "critical", "Red Sea", 15.5, 41.8},
	}

	for _, e := range initialEvents {
		_, _ = DB.Exec(`
			INSERT INTO events (id, title, description, event_type, severity, lat, lon, country, start_time)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - INTERVAL '6 hours')
			ON CONFLICT (id) DO NOTHING
		`, e.id, e.title, e.desc, e.eventType, e.severity, e.lat, e.lon, e.country)
	}
	log.Println("[db] Successfully seeded initial PostgreSQL intelligence events.")
}

// Close releases both database handles during graceful shutdown. Keeping the
// legacy sql.DB and the new pgx pool explicit makes the migration lifecycle
// predictable for operators and tests.
func Close() {
	if PGX != nil {
		PGX.Close()
		PGX = nil
	}
	if DB != nil {
		_ = DB.Close()
		DB = nil
	}
}

// Ping checks if the database connection is alive.
func Ping() error {
	if PGX == nil {
		return fmt.Errorf("database not initialized")
	}
	return PGX.Ping(context.Background())
}
