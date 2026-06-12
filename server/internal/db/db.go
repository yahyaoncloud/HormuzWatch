package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	"Geospatial-harmuz-watch/server/internal/config"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var DB *sql.DB

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
		last_updated TIMESTAMPTZ DEFAULT NOW()
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
	`
	if _, err := DB.Exec(schema); err != nil {
		return fmt.Errorf("create schema: %w", err)
	}

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

	log.Println("PostgreSQL database initialized successfully.")
	return nil
}
