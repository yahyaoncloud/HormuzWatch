package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"Geospatial-harmuz-watch/server/migrations"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	var (
		direction = flag.String("direction", "up", "Migration direction: up, down, or status")
		steps     = flag.Int("steps", 1, "Number of migration steps to rollback (used with down)")
		dbURL     = flag.String("url", "", "Database connection URL (defaults to DATABASE_URL env var)")
	)
	flag.Parse()

	targetURL := *dbURL
	if targetURL == "" {
		targetURL = os.Getenv("DATABASE_URL")
	}
	if targetURL == "" {
		log.Fatal("DATABASE_URL environment variable or -url flag is required")
	}

	if !strings.Contains(targetURL, "sslmode=") {
		sep := "?"
		if strings.Contains(targetURL, "?") {
			sep = "&"
		}
		targetURL += sep + "sslmode=disable"
	}

	db, err := sql.Open("pgx", targetURL)
	if err != nil {
		log.Fatalf("Failed to open database connection: %v", err)
	}
	defer db.Close()

	db.SetConnMaxLifetime(2 * time.Minute)
	db.SetMaxOpenConns(5)
	db.SetMaxIdleConns(2)

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	switch strings.ToLower(*direction) {
	case "up":
		log.Println("[migrate] Running pending UP migrations...")
		if err := migrations.Run(db); err != nil {
			log.Fatalf("[migrate] Migration UP failed: %v", err)
		}
		log.Println("[migrate] UP migrations completed successfully.")

	case "down", "rollback":
		log.Printf("[migrate] Rolling back %d migration step(s)...", *steps)
		if err := migrations.Rollback(db, *steps); err != nil {
			log.Fatalf("[migrate] Rollback failed: %v", err)
		}
		log.Println("[migrate] Rollback completed successfully.")

	case "status":
		statusList, err := migrations.Status(db)
		if err != nil {
			log.Fatalf("[migrate] Failed to query migration status: %v", err)
		}
		fmt.Println("---------------------------------------------------------------")
		fmt.Printf("%-30s | %-10s | %s\n", "VERSION", "STATUS", "APPLIED AT")
		fmt.Println("---------------------------------------------------------------")
		for _, s := range statusList {
			statusStr := "PENDING"
			appliedAtStr := "-"
			if s.Applied {
				statusStr = "APPLIED"
				if s.AppliedAt != nil {
					appliedAtStr = s.AppliedAt.Format("2006-01-02 15:04:05 MST")
				}
			}
			fmt.Printf("%-30s | %-10s | %s\n", s.Version, statusStr, appliedAtStr)
		}
		fmt.Println("---------------------------------------------------------------")

	default:
		log.Fatalf("Unknown direction: '%s'. Valid options are: up, down, status", *direction)
	}
}
