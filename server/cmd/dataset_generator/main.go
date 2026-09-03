package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"sort"
	"strings"
	"syscall"
	"time"

	"Geospatial-harmuz-watch/server/internal/datasets"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func runDatasetCycle(ctx context.Context, gen *datasets.Generator, domains []string, startTime, endTime time.Time, lookbackHours float64, outDir string, retention int) {
	log.Printf("==================================================================")
	log.Printf(" HormuzWatch 24/7 Dataset Pipeline Cycle Starting")
	log.Printf(" Temporal Window:  %s to %s", startTime.Format(time.RFC3339), endTime.Format(time.RFC3339))
	log.Printf(" Domains:          %v", domains)
	log.Printf(" Lookback Warmup:  %.1f hours", lookbackHours)
	log.Printf(" Output Directory: %s", outDir)
	log.Printf("==================================================================")

	manifestIndex := make(map[string]any)
	manifestIndexPath := filepath.Join(outDir, "manifest.json")
	if data, err := os.ReadFile(manifestIndexPath); err == nil {
		_ = json.Unmarshal(data, &manifestIndex)
	}

	for _, d := range domains {
		d = strings.TrimSpace(d)
		if d == "" {
			continue
		}
		datasetID := fmt.Sprintf("dataset_%s_%s_%s",
			d,
			startTime.UTC().Format("20060102_1504"),
			endTime.UTC().Format("20060102_1504"),
		)

		log.Printf("\n[Cycle] Generating dataset for domain '%s' -> %s...", d, datasetID)
		meta, report, err := gen.GenerateDataset(ctx, datasets.GeneratorOptions{
			StartTime:        startTime,
			EndTime:          endTime,
			LookbackDuration: time.Duration(lookbackHours * float64(time.Hour)),
			Domain:           d,
			OutputDir:        outDir,
			DatasetID:        datasetID,
			TrainSplitPct:    0.70,
			ValSplitPct:      0.15,
		})
		if err != nil {
			log.Printf("❌ Failed to generate dataset for domain '%s': %v", d, err)
			continue
		}

		log.Printf("✓ Created: %s | Total: %d | Tracks: %d | Normal: %.2f%% | Anomaly: %.2f%%",
			meta.DatasetID, meta.TotalRows, meta.UniqueTracks, report.NormalPct, report.AnomalyPct)

		manifestIndex[meta.DatasetID] = map[string]any{
			"dataset_id":    meta.DatasetID,
			"domain":        d,
			"created_at":    time.Now().UTC().Format(time.RFC3339),
			"total_rows":    meta.TotalRows,
			"unique_tracks": meta.UniqueTracks,
			"normal_pct":    report.NormalPct,
			"anomaly_pct":   report.AnomalyPct,
			"path":          filepath.Join(outDir, meta.DatasetID),
		}

		// Enforce retention
		cleanRetention(outDir, d, retention)
	}

	if idxBytes, err := json.MarshalIndent(manifestIndex, "", "  "); err == nil {
		_ = os.WriteFile(manifestIndexPath, idxBytes, 0644)
	}
	log.Printf("\n✓ Dataset Cycle Completed. Updated %s\n", manifestIndexPath)
}

func cleanRetention(outDir, domain string, maxKeep int) {
	if maxKeep <= 0 {
		return
	}
	pattern := filepath.Join(outDir, fmt.Sprintf("dataset_%s_*", domain))
	dirs, err := filepath.Glob(pattern)
	if err != nil || len(dirs) <= maxKeep {
		return
	}
	sort.Strings(dirs) // oldest first
	toRemove := len(dirs) - maxKeep
	for i := 0; i < toRemove; i++ {
		log.Printf("[Retention] Purging obsolete dataset: %s", dirs[i])
		_ = os.RemoveAll(dirs[i])
	}
}

func main() {
	_ = godotenv.Load()

	startFlag := flag.String("start", "", "Start timestamp (RFC3339 format, e.g. 2026-09-01T00:00:00Z)")
	endFlag := flag.String("end", "", "End timestamp (RFC3339 format, e.g. 2026-09-03T23:59:59Z)")
	lookbackHours := flag.Float64("lookback-hours", 2.0, "Temporal lookback hours for kinematic feature calculation")
	domainFlag := flag.String("domain", "vessel", "Domain (vessel, aircraft, or comma-separated: 'vessel,aircraft')")
	outDir := flag.String("out", "./datasets", "Output root directory for dataset artifacts")
	idFlag := flag.String("id", "", "Custom dataset ID")
	presetFlag := flag.String("preset", "", "Quick preset: 'daily', 'short', '7days'")
	daemonFlag := flag.Bool("daemon", false, "Run as continuous 24/7 dataset generation daemon")
	intervalFlag := flag.Duration("interval", 6*time.Hour, "Interval between dataset snapshot cycles in daemon mode (e.g. 6h, 12h, 24h)")
	retentionFlag := flag.Int("retention", 14, "Number of recent datasets to retain per domain in daemon mode")
	flag.Parse()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	// For Supabase connection pooler, port 6543 operates in transaction mode
	// which supports simple protocol and eliminates (EMAXCONNSESSION) limits.
	if strings.Contains(dbURL, ":5432/") {
		log.Println("[Database] Switching connection from session pooler (:5432) to transaction pooler (:6543) for high-throughput zero-drop dataset extraction")
		dbURL = strings.Replace(dbURL, ":5432/", ":6543/", 1)
	}

	cfg, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatalf("Invalid DATABASE_URL config: %v", err)
	}
	cfg.MaxConns = 2
	cfg.MinConns = 1
	cfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		log.Println("\n[Daemon] Received shutdown signal. Gracefully exiting...")
		cancel()
	}()

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		log.Fatalf("Failed to connect to PostgreSQL: %v", err)
	}
	defer pool.Close()

	gen := datasets.NewGenerator(pool)

	domains := strings.Split(*domainFlag, ",")
	if *domainFlag == "all" {
		domains = []string{"vessel", "aircraft"}
	}

	if *daemonFlag {
		log.Printf("==================================================================")
		log.Printf(" HORMUZ WATCH — 24/7 AUTONOMOUS DATASET GENERATION DAEMON ONLINE")
		log.Printf(" Domains:          %v", domains)
		log.Printf(" Snapshot Interval: %v", *intervalFlag)
		log.Printf(" Window Duration:  24 hours (rolling)")
		log.Printf(" Feature Lookback: %.1f hours", *lookbackHours)
		log.Printf(" Retention Limit:  %d datasets / domain", *retentionFlag)
		log.Printf(" Output Directory: %s", *outDir)
		log.Printf("==================================================================")

		// Run immediate first cycle
		now := time.Now().UTC()
		runDatasetCycle(ctx, gen, domains, now.Add(-24*time.Hour), now, *lookbackHours, *outDir, *retentionFlag)

		ticker := time.NewTicker(*intervalFlag)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				log.Println("[Daemon] Shutdown complete. Goodbye.")
				return
			case t := <-ticker.C:
				endTime := t.UTC()
				startTime := endTime.Add(-24 * time.Hour)
				runDatasetCycle(ctx, gen, domains, startTime, endTime, *lookbackHours, *outDir, *retentionFlag)
			}
		}
	}

	// Single one-shot run
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

	if *idFlag != "" && len(domains) == 1 {
		meta, report, err := gen.GenerateDataset(ctx, datasets.GeneratorOptions{
			StartTime:        startTime,
			EndTime:          endTime,
			LookbackDuration: time.Duration(*lookbackHours * float64(time.Hour)),
			Domain:           domains[0],
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
		log.Printf("  • Normal Samples:  %d (%.2f%%)", report.NormalCount, report.NormalPct)
		log.Printf("  • Anomaly Samples: %d (%.2f%%)", report.AnomalyCount, report.AnomalyPct)
	} else {
		runDatasetCycle(ctx, gen, domains, startTime, endTime, *lookbackHours, *outDir, *retentionFlag)
	}
}
