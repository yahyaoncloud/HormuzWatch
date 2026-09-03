package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"Geospatial-harmuz-watch/server/internal/datasets"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	startFlag := flag.String("start", "", "Start timestamp (RFC3339 format, e.g. 2026-09-01T00:00:00Z)")
	endFlag := flag.String("end", "", "End timestamp (RFC3339 format, e.g. 2026-09-03T23:59:59Z)")
	lookbackHours := flag.Float64("lookback-hours", 2.0, "Temporal lookback hours for kinematic feature calculation")
	domainFlag := flag.String("domain", "vessel", "Domain (vessel, aircraft)")
	outDir := flag.String("out", "./datasets", "Output root directory for dataset artifacts")
	idFlag := flag.String("id", "", "Custom dataset ID")
	presetFlag := flag.String("preset", "", "Quick preset: 'daily', 'short', '7days'")
	flag.Parse()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	cfg, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatalf("Invalid DATABASE_URL config: %v", err)
	}
	cfg.MaxConns = 2
	cfg.MinConns = 1
	cfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	ctx := context.Background()
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		log.Fatalf("Failed to connect to PostgreSQL: %v", err)
	}
	defer pool.Close()

	var startTime, endTime time.Time

	now := time.Now().UTC()
	if *presetFlag != "" {
		switch *presetFlag {
		case "short":
			endTime = now
			startTime = now.Add(-6 * time.Hour)
		case "daily":
			endTime = now
			startTime = now.Add(-24 * time.Hour)
		case "7days":
			endTime = now
			startTime = now.Add(-7 * 24 * time.Hour)
		default:
			log.Fatalf("Unknown preset: %s (options: short, daily, 7days)", *presetFlag)
		}
	} else {
		if *startFlag == "" || *endFlag == "" {
			log.Fatal("Either --preset (short|daily|7days) or both --start and --end are required")
		}
		var err error
		startTime, err = time.Parse(time.RFC3339, *startFlag)
		if err != nil {
			log.Fatalf("Invalid --start timestamp: %v", err)
		}
		endTime, err = time.Parse(time.RFC3339, *endFlag)
		if err != nil {
			log.Fatalf("Invalid --end timestamp: %v", err)
		}
	}

	log.Printf("==================================================================")
	log.Printf(" HormuzWatch Historical ML Dataset Generator")
	log.Printf(" Domain:           %s", *domainFlag)
	log.Printf(" Temporal Window:  %s to %s", startTime.Format(time.RFC3339), endTime.Format(time.RFC3339))
	log.Printf(" Feature Lookback: %.1f hours", *lookbackHours)
	log.Printf(" Output Directory: %s", *outDir)
	log.Printf("==================================================================")

	gen := datasets.NewGenerator(pool)
	meta, report, err := gen.GenerateDataset(ctx, datasets.GeneratorOptions{
		StartTime:        startTime,
		EndTime:          endTime,
		LookbackDuration: time.Duration(*lookbackHours * float64(time.Hour)),
		Domain:           *domainFlag,
		OutputDir:        *outDir,
		DatasetID:        *idFlag,
		TrainSplitPct:    0.70,
		ValSplitPct:      0.15,
	})
	if err != nil {
		log.Fatalf("Dataset generation failed: %v", err)
	}

	log.Printf("\n✓ Dataset Successfully Created: %s", meta.DatasetID)
	log.Printf("  • Total Records:   %d observations", meta.TotalRows)
	log.Printf("  • Unique Tracks:   %d vessels", meta.UniqueTracks)
	log.Printf("  • Train Split:     %d rows (70%%)", meta.TrainRows)
	log.Printf("  • Val Split:       %d rows (15%%)", meta.ValRows)
	log.Printf("  • Test Split:      %d rows (15%%)", meta.TestRows)
	log.Printf("  • Normal Samples:  %d (%.2f%%)", report.NormalCount, report.NormalPct)
	log.Printf("  • Anomaly Samples: %d (%.2f%%)", report.AnomalyCount, report.AnomalyPct)
	log.Printf("  • Files Generated:")
	for _, f := range meta.Files {
		log.Printf("     - %s/%s/%s", *outDir, meta.DatasetID, f)
	}
	fmt.Printf("\nDataset manifest saved to: %s/%s/metadata.json\n", *outDir, meta.DatasetID)
}
