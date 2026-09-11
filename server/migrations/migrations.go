package migrations

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"log"
	"sort"
	"strings"
	"time"
)

//go:embed *.sql
var Files embed.FS

// Run discovers and applies all pending SQL migrations sequentially.
func Run(db *sql.DB) error {
	if db == nil {
		return fmt.Errorf("cannot run migrations: database handle is nil")
	}

	// 1. Ensure schema_migrations table exists
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS schema_migrations (
		version VARCHAR(255) PRIMARY KEY,
		applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);`
	if _, err := db.Exec(createTableSQL); err != nil {
		return fmt.Errorf("failed to create schema_migrations table: %w", err)
	}

	// 2. Read embedded migration files
	entries, err := Files.ReadDir(".")
	if err != nil {
		return fmt.Errorf("failed to read embedded migration files: %w", err)
	}

	var upFiles []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".up.sql") {
			upFiles = append(upFiles, entry.Name())
		}
	}
	sort.Strings(upFiles)

	// 3. Apply pending migrations sequentially
	for _, filename := range upFiles {
		version := strings.TrimSuffix(filename, ".up.sql")

		var count int
		err := db.QueryRow("SELECT COUNT(*) FROM schema_migrations WHERE version = $1", version).Scan(&count)
		if err != nil {
			return fmt.Errorf("failed to check migration version %s: %w", version, err)
		}

		if count > 0 {
			continue // Already applied
		}

		log.Printf("[db-migrate] Applying migration: %s...", filename)
		content, err := Files.ReadFile(filename)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", filename, err)
		}

		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			cancel()
			return fmt.Errorf("failed to begin transaction for %s: %w", filename, err)
		}

		if _, err := tx.ExecContext(ctx, string(content)); err != nil {
			_ = tx.Rollback()
			cancel()
			return fmt.Errorf("failed to execute migration %s: %w", filename, err)
		}

		if _, err := tx.ExecContext(ctx, "INSERT INTO schema_migrations (version) VALUES ($1)", version); err != nil {
			_ = tx.Rollback()
			cancel()
			return fmt.Errorf("failed to record migration version %s: %w", version, err)
		}

		if err := tx.Commit(); err != nil {
			cancel()
			return fmt.Errorf("failed to commit migration %s: %w", filename, err)
		}
		cancel()

		log.Printf("[db-migrate] Successfully applied migration: %s", filename)
	}

	return nil
}
