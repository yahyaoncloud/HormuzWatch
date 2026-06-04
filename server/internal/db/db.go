package db

import (
	"database/sql"
	"log"

	"Geospatial-harmuz-watch/server/internal/config"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

func InitDB() error {
	var err error
	DB, err = sql.Open("sqlite", "./hormuzwatch.db?_busy_timeout=5000&_journal_mode=WAL")
	if err != nil {
		return err
	}

	// Limit connections to 1 writer to prevent SQLITE_BUSY
	DB.SetMaxOpenConns(1)

	// Enable WAL mode for better concurrent read/write performance
	if _, err := DB.Exec("PRAGMA journal_mode=WAL;"); err != nil {
		log.Printf("Warning: Failed to set WAL mode: %v", err)
	}
	if _, err := DB.Exec("PRAGMA busy_timeout=5000;"); err != nil {
		log.Printf("Warning: Failed to set busy_timeout: %v", err)
	}

	// Create tables
	query := `
	CREATE TABLE IF NOT EXISTS news (
		id TEXT PRIMARY KEY,
		title TEXT,
		link TEXT,
		pub_date DATETIME,
		source TEXT,
		summary TEXT
	);

	CREATE TABLE IF NOT EXISTS tracks (
		track_id TEXT PRIMARY KEY,
		asset_name TEXT,
		timestamp TEXT,
		lat REAL,
		lon REAL,
		speed REAL,
		previous_speed REAL,
		heading REAL,
		course_delta REAL,
		ais_age_minutes INTEGER,
		hot_zone_distance_nm REAL,
		last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS anomalies (
		track_id TEXT PRIMARY KEY,
		score REAL,
		severity TEXT,
		reasons TEXT, -- JSON string
		actions TEXT, -- JSON string
		last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(track_id) REFERENCES tracks(track_id)
	);

	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT
	);

	CREATE TABLE IF NOT EXISTS watchlist (
		track_id TEXT PRIMARY KEY,
		notes TEXT,
		added_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		username TEXT UNIQUE,
		email TEXT UNIQUE,
		password_hash TEXT,
		role TEXT DEFAULT 'user',
		status TEXT DEFAULT 'pending',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
	_, err = DB.Exec(query)
	if err != nil {
		return err
	}

	// Insert default settings
	_, _ = DB.Exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('retention_days', '30');")
	_, _ = DB.Exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('opensky_enabled', 'true');")
	_, _ = DB.Exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('aisstream_enabled', 'true');")
	_, _ = DB.Exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_watchlist_threshold', '75');")
	_, _ = DB.Exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('heatmap_enabled', 'true');")
	_, _ = DB.Exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('news_enabled', 'true');")

	// Fallback migrations for existing databases
	_, _ = DB.Exec("ALTER TABLE users ADD COLUMN email TEXT;")
	_, _ = DB.Exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'pending';")

	// Existing databases may have been created before email had a unique index.
	_, _ = DB.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL AND email <> '';")

	// Keep a single administrator account, owned by the configured admin email.
	adminHash := "$2a$10$ve2Py624OSITPiUByvPiLuvBuOr/UKcHYOFIZyr4/EUlgMKOKWgoq"
	_, _ = DB.Exec("DELETE FROM users WHERE username = 'admin' AND lower(coalesce(email, '')) <> lower(?);", config.PrimaryAdminEmail)
	_, _ = DB.Exec("UPDATE users SET role = 'user' WHERE lower(coalesce(email, '')) <> lower(?);", config.PrimaryAdminEmail)

	result, err := DB.Exec("UPDATE users SET role = 'admin', status = 'approved' WHERE lower(email) = lower(?);", config.PrimaryAdminEmail)
	if err != nil {
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		_, _ = DB.Exec(`INSERT OR IGNORE INTO users (id, username, email, password_hash, role, status)
					VALUES ('primary-admin-uuid-0000', ?, ?, ?, 'admin', 'approved');`, config.PrimaryAdminUsername, config.PrimaryAdminEmail, adminHash)
		_, _ = DB.Exec("UPDATE users SET email = ?, role = 'admin', status = 'approved' WHERE username = ?;", config.PrimaryAdminEmail, config.PrimaryAdminUsername)
	}

	log.Println("SQLite database initialized successfully (WAL mode).")
	return nil
}
