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

// MigrationInfo describes the status of a single migration version.
type MigrationInfo struct {
	Version   string     `json:"version"`
	Applied   bool       `json:"applied"`
	AppliedAt *time.Time `json:"applied_at,omitempty"`
}

// Rollback rolls back up to 'steps' migrations in reverse order (most recent first).
func Rollback(db *sql.DB, steps int) error {
	if db == nil {
		return fmt.Errorf("cannot rollback migrations: database handle is nil")
	}
	if steps <= 0 {
		steps = 1
	}

	// 1. Ensure schema_migrations table exists
	var tableExists bool
	err := db.QueryRow("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schema_migrations')").Scan(&tableExists)
	if err != nil || !tableExists {
		log.Println("[db-migrate] schema_migrations table does not exist; nothing to rollback")
		return nil
	}

	// 2. Query applied migrations in descending order
	rows, err := db.Query("SELECT version FROM schema_migrations ORDER BY version DESC")
	if err != nil {
		return fmt.Errorf("failed to query applied migrations: %w", err)
	}
	defer rows.Close()

	var applied []string
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			return fmt.Errorf("failed to scan migration version: %w", err)
		}
		applied = append(applied, v)
	}

	toRollback := steps
	if toRollback > len(applied) {
		toRollback = len(applied)
	}

	for i := 0; i < toRollback; i++ {
		version := applied[i]
		filename := version + ".down.sql"
		log.Printf("[db-migrate] Rolling back migration: %s...", filename)

		content, err := Files.ReadFile(filename)
		if err != nil {
			return fmt.Errorf("failed to read down migration file %s: %w", filename, err)
		}

		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			cancel()
			return fmt.Errorf("failed to begin rollback transaction for %s: %w", filename, err)
		}

		if _, err := tx.ExecContext(ctx, string(content)); err != nil {
			_ = tx.Rollback()
			cancel()
			return fmt.Errorf("failed to execute down migration %s: %w", filename, err)
		}

		if _, err := tx.ExecContext(ctx, "DELETE FROM schema_migrations WHERE version = $1", version); err != nil {
			_ = tx.Rollback()
			cancel()
			return fmt.Errorf("failed to delete migration version %s from schema_migrations: %w", version, err)
		}

		if err := tx.Commit(); err != nil {
			cancel()
			return fmt.Errorf("failed to commit rollback for %s: %w", filename, err)
		}
		cancel()

		log.Printf("[db-migrate] Successfully rolled back migration: %s", filename)
	}

	return nil
}

// Status returns the current status of all discovered migration files.
func Status(db *sql.DB) ([]MigrationInfo, error) {
	if db == nil {
		return nil, fmt.Errorf("cannot query migration status: database handle is nil")
	}

	entries, err := Files.ReadDir(".")
	if err != nil {
		return nil, fmt.Errorf("failed to read embedded migration files: %w", err)
	}

	var upFiles []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".up.sql") {
			upFiles = append(upFiles, entry.Name())
		}
	}
	sort.Strings(upFiles)

	appliedMap := make(map[string]time.Time)
	rows, err := db.Query("SELECT version, applied_at FROM schema_migrations ORDER BY version ASC")
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var ver string
			var at time.Time
			if err := rows.Scan(&ver, &at); err == nil {
				appliedMap[ver] = at
			}
		}
	}

	var result []MigrationInfo
	for _, filename := range upFiles {
		version := strings.TrimSuffix(filename, ".up.sql")
		at, ok := appliedMap[version]
		info := MigrationInfo{
			Version: version,
			Applied: ok,
		}
		if ok {
			info.AppliedAt = &at
		}
		result = append(result, info)
	}

	return result, nil
}

