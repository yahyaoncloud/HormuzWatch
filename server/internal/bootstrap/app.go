package bootstrap

import (
	"context"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"Geospatial-harmuz-watch/server/internal/api"
	"Geospatial-harmuz-watch/server/internal/config"
	"Geospatial-harmuz-watch/server/internal/datasets"
	"Geospatial-harmuz-watch/server/internal/db"
	"Geospatial-harmuz-watch/server/internal/geo"
	"Geospatial-harmuz-watch/server/internal/heatmap"
	"Geospatial-harmuz-watch/server/internal/integrations"
	"Geospatial-harmuz-watch/server/internal/intelligence"
	"Geospatial-harmuz-watch/server/internal/intelligence/source"
	"Geospatial-harmuz-watch/server/internal/observability"
	"Geospatial-harmuz-watch/server/internal/scheduler"
	"Geospatial-harmuz-watch/server/internal/version"
	"Geospatial-harmuz-watch/server/internal/websocket"
	"Geospatial-harmuz-watch/server/internal/worker"

	"github.com/gin-gonic/gin"
)

// App encapsulates the server's dependencies and runtime lifecycle.
type App struct {
	Config Config

	Hub           *websocket.Hub
	TSM           *intelligence.TrackStateManager
	MLClient      *intelligence.MLClient
	DatasetSvc    *datasets.Service
	Pipeline      *intelligence.Pipeline
	CollectorPool *worker.Pool
	NewsScheduler *scheduler.Scheduler
	Router        *gin.Engine

	transitCancel context.CancelFunc
	workerCancel  context.CancelFunc
}

// New creates and bootstraps all application subsystems.
func New(ver, buildTime, gitCommit string) (*App, error) {
	// Initialize version metadata
	version.Init(ver, buildTime, gitCommit)
	log.Printf("[init] HormuzWatch server v%s (built %s, commit %s)", ver, buildTime, gitCommit)

	// Load environment variables
	LoadEnv()
	config.InitAdminConfig()
	cfg := LoadConfig()

	// Initialize structured logging
	_ = observability.InitLogging()

	// Initialize PostgreSQL (Supabase)
	if err := db.InitDB(); err != nil {
		return nil, err
	}

	// Initialize WebSocket hub
	hub := websocket.NewHub()
	go hub.Run()

	// Load historical attack data
	if err := geo.LoadHistoricalAttacks("data/history-attacks.json"); err != nil {
		log.Printf("Warning: Failed to load historical attack data: %v", err)
	}

	// Initialize geospatial land mask filter
	geo.InitLandMask("")

	// Initialize Intelligence Pipeline state and ML client
	tsm := intelligence.NewTrackStateManager()
	mlClient := intelligence.NewMLClient()
	mlClient.Connect()

	// Initialize dataset pipeline (GDrive persistence)
	datasetSvc, err := datasets.New(datasets.Config{
		FolderID:     os.Getenv("GDRIVE_DATASET_FOLDER_ID"),
		Retention:    AtoiEnv("DATASET_RETENTION", 3),
		QueueSize:    AtoiEnv("DATASET_QUEUE_SIZE", 64),
		RowLimit:     AtoiEnv("DATASET_ROW_LIMIT", datasets.DefaultRowLimit),
		SAJSONPath:   os.Getenv("GDRIVE_SERVICE_ACCOUNT_JSON"),
		SAJSONInline: os.Getenv("GDRIVE_SERVICE_ACCOUNT_JSON_INLINE"),
	}, db.PGX)
	if err != nil {
		log.Printf("Dataset service init warning: %v", err)
	}

	// Context for background workers
	workerCtx, workerCancel := context.WithCancel(context.Background())

	// Start background data integration workers (AISStream, OpenSky, GDELT)
	pipeline := integrations.StartWorkers(workerCtx, hub, tsm, mlClient)

	// Seed countries table with Gulf-region defaults
	db.SeedCountries()

	// Register pre-configured Gulf intelligence sources
	sourceRegistry := source.NewRegistry()
	for _, src := range source.DefaultGulfSources() {
		sourceRegistry.Register(src)
		_ = db.UpsertSource(src.Name(), src.Name(), string(src.Type()),
			"", "", src.Name(), 0.5)
	}
	log.Printf("[news] Registered %d Gulf intelligence sources", sourceRegistry.Count())

	// Start worker pool for collection tasks
	collectorPool := worker.NewPool(worker.Config{
		Workers:   4,
		QueueSize: 64,
		RateLimit: 2.0,
		RateBurst: 4,
	})
	collectorPool.Start()

	// Wire news collector and scheduler
	newsCollector := worker.NewCollector(collectorPool)
	newsScheduler := scheduler.New()
	for _, job := range scheduler.DefaultJobs(sourceRegistry, collectorPool, newsCollector) {
		newsScheduler.AddJob(job.Name, job.Interval, job.Fn)
	}
	newsScheduler.Start()
	log.Println("[news] Intelligence news pipeline initialized")

	// Setup Router and Handlers
	handlers := api.NewHandlers(hub, tsm, mlClient)
	router := SetupRouter(cfg, handlers, datasetSvc)

	return &App{
		Config:        cfg,
		Hub:           hub,
		TSM:           tsm,
		MLClient:      mlClient,
		DatasetSvc:    datasetSvc,
		Pipeline:      pipeline,
		CollectorPool: collectorPool,
		NewsScheduler: newsScheduler,
		Router:        router,
		workerCancel:  workerCancel,
	}, nil
}

// StartBackgroundJobs launches periodic tickers, transit detection, and auto-training.
func (a *App) StartBackgroundJobs() {
	// Dataset snapshots
	if a.DatasetSvc != nil {
		if interval := DurationMinutesEnv("DATASET_SNAPSHOT_INTERVAL_MINUTES"); interval > 0 {
			a.DatasetSvc.StartSnapshotSchedule(context.Background(), interval)
			log.Printf("[datasets] scheduled snapshots enabled every %s", interval)
		}
	}

	// Periodic real-time pipeline stats broadcast via WebSocket (every 1s)
	go func() {
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			stats := a.TSM.GetStats()
			qm := intelligence.QueueMetrics()
			a.Hub.Publish(websocket.Message{
				Type: "stats",
				Data: map[string]interface{}{
					"totalTracks":      stats.TotalTracks,
					"maritimeCount":    stats.MaritimeCount,
					"aviationCount":    stats.AviationCount,
					"anchoredCount":    stats.AnchoredCount,
					"slowCount":        stats.SlowCount,
					"maneuveringCount": stats.ManeuveringCount,
					"transitingCount":  stats.TransitingCount,
					"avgSpeed":         stats.AvgSpeed,
					"highAnomalyCount": stats.HighAnomalyCount,
					"totalAnomalies":   stats.TotalAnomalies,
					"avgEWMA":          stats.AvgEWMA,
					"updatedAt":        stats.UpdatedAt,
					"queueEnqueued":    qm["enqueued"],
					"queueDropped":     qm["dropped"],
					"queueProcessed":   qm["processed"],
					"queueDepth":       qm["depth"],
				},
			})
		}
	}()

	// Periodic conflict feed broadcast via WebSocket (every 5 min)
	go func() {
		time.Sleep(30 * time.Second)
		api.BroadcastConflictFeed(a.Hub)
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			api.BroadcastConflictFeed(a.Hub)
		}
	}()

	// Automated training if enabled
	if strings.EqualFold(os.Getenv("ML_AUTO_TRAIN_ENABLED"), "true") {
		intelligence.StartAutomatedTraining(a.TSM, a.MLClient)
	} else {
		log.Println("[ML] Automated training disabled; use the offline training pipeline")
	}

	// Heatmap cleanup & data retention routines
	heatmap.StartCleanupRoutine()
	integrations.StartRetentionWorker()

	// Transit detection loop
	ctx, cancel := context.WithCancel(context.Background())
	a.transitCancel = cancel
	intelligence.StartTransitDetectionLoop(ctx, 300)
}

// Run starts the HTTP server and manages graceful shutdown.
func (a *App) Run() error {
	a.StartBackgroundJobs()

	// Register graceful shutdown listener
	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
		<-sig
		log.Println("Shutdown signal received; gracefully terminating services...")

		if a.transitCancel != nil {
			a.transitCancel()
		}
		if a.workerCancel != nil {
			a.workerCancel()
		}
		if a.NewsScheduler != nil {
			a.NewsScheduler.Stop()
		}
		if a.CollectorPool != nil {
			a.CollectorPool.Shutdown(10 * time.Second)
		}
		if a.Pipeline != nil {
			a.Pipeline.Shutdown(10 * time.Second)
		}
		if a.MLClient != nil {
			if err := a.MLClient.Close(); err != nil {
				log.Printf("[ML] close error: %v", err)
			}
		}
		if a.DatasetSvc != nil {
			a.DatasetSvc.Close()
		}
		db.Close()
		os.Exit(0)
	}()

	log.Printf("Geospatial HormuzWatch Server starting on port %s (Auth Disabled: %v)", a.Config.Port, a.Config.IsAuthDisabled)
	return a.Router.Run(":" + a.Config.Port)
}
