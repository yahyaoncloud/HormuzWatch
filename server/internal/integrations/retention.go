package integrations

import (
	"log"
	"strconv"
	"time"

	"Geospatial-harmuz-watch/server/internal/db"
)

// StartRetentionWorker runs a background goroutine to clean up old records based on settings
func StartRetentionWorker() {
	go func() {
		for {
			runCleanup()
			// Run every hour
			time.Sleep(1 * time.Hour)
		}
	}()
}

func runCleanup() {
	var retentionDays string
	err := db.QueryRow("SELECT value FROM settings WHERE key = 'retention_days'").Scan(&retentionDays)
	if err != nil {
		retentionDays = "30"
	}
	days, err := strconv.Atoi(retentionDays)
	if err != nil || days <= 0 {
		days = 30
	}

	// Delete anomalies for old tracks that are not watchlisted
	deleteAnomaliesQuery := `
		DELETE FROM anomalies 
		WHERE track_id IN (
			SELECT track_id FROM tracks 
			WHERE last_updated < NOW() - (? * INTERVAL '1 day')
		)
		AND track_id NOT IN (SELECT track_id FROM watchlist)
	`
	res, err := db.Exec(deleteAnomaliesQuery, days)
	if err == nil {
		count, _ := res.RowsAffected()
		if count > 0 {
			log.Printf("[Retention] Purged %d old anomalies (older than %d days)", count, days)
		}
	} else {
		log.Printf("[Retention] Error purging anomalies: %v", err)
	}

	// Delete old tracks that are not watchlisted
	deleteTracksQuery := `
		DELETE FROM tracks 
		WHERE last_updated < NOW() - (? * INTERVAL '1 day')
		AND track_id NOT IN (SELECT track_id FROM watchlist)
	`
	res, err = db.Exec(deleteTracksQuery, days)
	if err == nil {
		count, _ := res.RowsAffected()
		if count > 0 {
			log.Printf("[Retention] Purged %d old tracks (older than %d days)", count, days)
		}
	} else {
		log.Printf("[Retention] Error purging tracks: %v", err)
	}
}
