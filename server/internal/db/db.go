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
	"Geospatial-harmuz-watch/server/migrations"

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

	// Disable prepared statements only for PgBouncer transaction mode compatibility
	if strings.Contains(databaseURL, "supabase.com") || strings.Contains(databaseURL, "pgbouncer") {
		if !strings.Contains(databaseURL, "prefer_simple_protocol=") {
			sep := "?"
			if strings.Contains(databaseURL, "?") {
				sep = "&"
			}
			databaseURL += sep + "prefer_simple_protocol=true"
		}
	}

	var err error
	DB, err = sql.Open("pgx", databaseURL)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}

	DB.SetMaxOpenConns(10)
	DB.SetMaxIdleConns(5)

	if err := DB.Ping(); err != nil {
		_ = DB.Close()
		DB = nil
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
		PGX = nil
		return fmt.Errorf("ping pgx pool: %w", err)
	}

	// Run versioned schema migrations
	if err := migrations.Run(DB); err != nil {
		return fmt.Errorf("run schema migrations: %w", err)
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
		{"evt-001", "Houthi Anti-Ship Missile Strike near Al Hudaydah", "Anti-ship ballistic missile reported impacting 500m off container ship beam.", "maritime", "critical", "Red Sea", 14.2, 42.5},
		{"evt-002", "IRGC-N Fast Attack Craft Transit Shadowing", "Three IRGC fast boats shadowed commercial tanker in Strait TSS.", "maritime", "high", "Strait of Hormuz", 26.5, 56.3},
		{"evt-003", "Shahed Reconnaissance UAV Swarm Sighting", "Flight pattern of 15+ UAVs detected near Qeshm Island airspace.", "aviation", "high", "Strait of Hormuz", 26.9, 56.1},
		{"evt-004", "FALCON Subsea Cable Tension Anomaly", "Seismic telemetry registered cable tension variation off Muscat landing.", "cyber", "medium", "Gulf of Oman", 23.6, 58.5},
		{"evt-005", "EU NAVFOR Pirate Skiff Interdiction", "Naval frigate intercepted armed skiff 80nm off Socotra Island.", "maritime", "medium", "Arabian Sea", 13.8, 53.2},
		{"evt-006", "King Abdulaziz Port Cargo Management Outage", "Cyber incident caused temporary container tracking delay at Dammam.", "cyber", "high", "Persian Gulf", 26.5, 50.1},
		{"evt-007", "IRGC Detention of Sanctioned Tanker", "Panama-flagged tanker detained near Abu Musa Island by IRGC-N.", "maritime", "high", "Strait of Hormuz", 26.0, 55.3},
		{"evt-008", "Northern Persian Gulf AIS Spoofing Cluster", "12 tankers broadcasting duplicate MMSI tags during STS crude transfer.", "cyber", "medium", "Persian Gulf", 28.3, 50.8},
		{"evt-009", "US Navy & IRGC Radio Demarche in Strait", "USS Carney shadowed during northbound transit through Hormuz TSS.", "diplomacy", "medium", "Strait of Hormuz", 26.2, 56.8},
		{"evt-010", "Red Sea USV Explosive Detonation", "Explosive USV engaged by bulk carrier security team in Red Sea TSS.", "maritime", "critical", "Red Sea", 15.5, 41.8},
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
