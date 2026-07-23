package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"

	"Geospatial-harmuz-watch/server/internal/api"
	"Geospatial-harmuz-watch/server/internal/auth"
	"Geospatial-harmuz-watch/server/internal/datasets"
	"Geospatial-harmuz-watch/server/internal/db"
	"Geospatial-harmuz-watch/server/internal/geo"
	"Geospatial-harmuz-watch/server/internal/heatmap"
	"Geospatial-harmuz-watch/server/internal/integrations"
	"Geospatial-harmuz-watch/server/internal/intelligence"
	"Geospatial-harmuz-watch/server/internal/intelligence/source"
	"Geospatial-harmuz-watch/server/internal/observability"
	"Geospatial-harmuz-watch/server/internal/scheduler"
	"Geospatial-harmuz-watch/server/internal/websocket"
	"Geospatial-harmuz-watch/server/internal/worker"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

// loadEnvFile loads .env from multiple possible locations
func loadEnvFile() {
	// Get the directory of this file (cmd/main.go)
	_, filename, _, _ := runtime.Caller(0)
	cmdDir := filepath.Dir(filename)
	serverDir := filepath.Dir(cmdDir)
	projectRoot := filepath.Dir(serverDir)

	// Try multiple locations in order of preference
	paths := []string{
		filepath.Join(projectRoot, ".env"), // Project root (where user expects it)
		filepath.Join(serverDir, ".env"),   // server/ directory
		filepath.Join(cmdDir, ".env"),      // cmd/ directory
		".env",                             // Current working directory
	}

	for _, path := range paths {
		if err := godotenv.Load(path); err == nil {
			log.Printf("Loaded environment from: %s", path)
			return
		}
	}
	log.Println("Warning: No .env file found in any standard location")
}

// atoiEnv reads an integer env var, returning fallback on missing/invalid.
func atoiEnv(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n := 0
	for _, r := range v {
		if r < '0' || r > '9' {
			return fallback
		}
		n = n*10 + int(r-'0')
	}
	if n <= 0 {
		return fallback
	}
	return n
}

// durationMinutesEnv reads a positive minute interval. A missing or zero
// value disables the corresponding scheduler.
func durationMinutesEnv(key string) time.Duration {
	value := os.Getenv(key)
	minutes, err := strconv.Atoi(value)
	if value == "" || err != nil || minutes <= 0 {
		return 0
	}
	return time.Duration(minutes) * time.Minute
}

func main() {
	// Attempt to load .env file from multiple locations
	loadEnvFile()

	// Initialize structured logging
	_ = observability.InitLogging()

	// Load environment variables
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	authDisabled := os.Getenv("AUTH_DISABLED")
	isAuthDisabled := authDisabled == "true"

	// Initialize PostgreSQL (Supabase)
	if err := db.InitDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Initialize WebSocket hub
	hub := websocket.NewHub()
	go hub.Run()

	// Load historical attack data
	if err := geo.LoadHistoricalAttacks("data/history-attacks.json"); err != nil {
		log.Printf("Warning: Failed to load historical attack data: %v", err)
	}

	// Initialize Intelligence Pipeline
	tsm := intelligence.NewTrackStateManager()
	mlClient := intelligence.NewMLClient()
	mlClient.Connect()

	// Initialize dataset pipeline (queue-based GDrive persistence)
	datasetSvc, err := datasets.New(datasets.Config{
		FolderID:     os.Getenv("GDRIVE_DATASET_FOLDER_ID"),
		Retention:    atoiEnv("DATASET_RETENTION", 3),
		QueueSize:    atoiEnv("DATASET_QUEUE_SIZE", 64),
		RowLimit:     atoiEnv("DATASET_ROW_LIMIT", datasets.DefaultRowLimit),
		SAJSONPath:   os.Getenv("GDRIVE_SERVICE_ACCOUNT_JSON"),
		SAJSONInline: os.Getenv("GDRIVE_SERVICE_ACCOUNT_JSON_INLINE"),
	}, db.PGX)
	if err != nil {
		log.Printf("Dataset service init warning: %v", err)
	}
	if datasetSvc != nil {
		if interval := durationMinutesEnv("DATASET_SNAPSHOT_INTERVAL_MINUTES"); interval > 0 {
			datasetSvc.StartSnapshotSchedule(context.Background(), interval)
			log.Printf("[datasets] scheduled snapshots enabled every %s", interval)
		}
	}
	datasetHandlers := api.DatasetHandlers(datasetSvc)

	// Start background data integration workers (AISStream, OpenSky, GDELT)
	integrations.StartWorkers(hub, tsm, mlClient)

	// Training requires a durable feature snapshot and a real offline trainer.
	// Keep it explicitly opt-in until the training job is wired to that pipeline.
	if strings.EqualFold(os.Getenv("ML_AUTO_TRAIN_ENABLED"), "true") {
		intelligence.StartAutomatedTraining(tsm, mlClient)
	} else {
		log.Println("[ML] Automated training disabled; use the offline training pipeline")
	}

	// Start heatmap cleanup routine
	heatmap.StartCleanupRoutine()

	// Start data retention cleanup routine
	integrations.StartRetentionWorker()

	// ── News Intelligence Pipeline ────────────────────────────────────
	// Seed countries table with Gulf-region defaults
	db.SeedCountries()

	// Register pre-configured Gulf intelligence sources
	sourceRegistry := source.NewRegistry()
	for _, src := range source.DefaultGulfSources() {
		sourceRegistry.Register(src)
		_ = db.UpsertSource(src.Name(), src.Name(), string(src.Type()),
			"", "", src.Name(), 0.5) // URL/language/reliability populated by source
	}
	log.Printf("[news] Registered %d Gulf intelligence sources", sourceRegistry.Count())

	// Start worker pool for collection tasks
	collectorPool := worker.NewPool(worker.Config{
		Workers:   4,
		QueueSize: 64,
		RateLimit: 2.0, // max 2 tasks/sec across all sources
		RateBurst: 4,
	})
	collectorPool.Start()
	defer collectorPool.Shutdown(15 * time.Second)

	// Wire collector with the pool
	newsCollector := worker.NewCollector(collectorPool)

	// Start scheduler for periodic RSS/API refresh
	newsScheduler := scheduler.New()
	for _, job := range scheduler.DefaultJobs(sourceRegistry, collectorPool, newsCollector) {
		newsScheduler.AddJob(job.Name, job.Interval, job.Fn)
	}
	newsScheduler.Start()
	defer newsScheduler.Stop()

	log.Println("[news] Intelligence news pipeline initialized")

	// Initialize Gin router
	router := gin.Default()

	// CORS middleware
	router.Use(corsMiddleware())

	// Rate Limiting middleware
	router.Use(api.RateLimiterMiddleware())

	// Initialize API handlers
	handlers := api.NewHandlers(hub)

	// Root showcase endpoint
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Geospatial HormuzWatch Server is running",
			"status":  "online",
			"endpoints": []string{
				"GET  /health              - API status",
				"GET  /ws                  - WebSocket telemetry stream",
				"POST /api/telemetry       - Ingest vessel data",
				"POST /api/analyze         - Threat intelligence scoring",
				"GET  /api/heatmap          - Geospatial anomaly density (?source=vessel|fire|geo|all)",
				"GET  /api/vessels          - Active maritime vessels",
				"GET  /api/aircraft         - Active aviation tracks",
				"GET  /api/tracks/active    - All active tracks",
				"GET  /api/history/attacks  - Historical incident overlays",
				"GET  /api/zones/restricted - Geofence restriction zones",
				"GET  /api/news             - Intelligence news feed",
				"GET  /public/top-traces    - Public top anomaly traces",
			},
			"active_integrations": []string{"AISStream", "OpenSky", "Kystverket", "GDELT", "NASA FIRMS", "Open-Meteo", "RSS"},
		})
	})

	// Health check endpoint (no auth)
	router.Any("/health", handlers.Health)

	// Observability metrics (expvar /debug/vars, no auth)
	router.Any("/debug/vars", gin.WrapH(observability.MetricsHandler()))

	// Authentication endpoints (always public)
	router.POST("/auth/register", auth.Register)
	router.POST("/auth/login", auth.Login)

	// Public streaming endpoints (no auth required)
	router.GET("/public/top-traces", api.GetTopTraces)
	router.GET("/public/stream", api.PublicTopTracesStream)

	// Public metrics endpoint (no auth required)
	router.GET("/public/metrics", api.GetPublicMetrics)
	router.GET("/public/briefing", api.GetBriefing)
	router.GET("/public/conflicts", api.GetConflictFeed)

	// Public detailed intelligence report endpoints (no auth required)
	router.GET("/public/report", api.GetDetailedReport)
	router.GET("/public/report/pdf", api.GetDetailedReportPDF)

	// Public WebSocket telemetry stream (no auth required)
	router.GET("/ws/stream", handlers.WebSocketStream)

	// Additional public endpoints that mirror authenticated ones for the landing page
	cache30s := api.CacheMiddleware(30 * time.Second)
	router.GET("/public/heatmap", cache30s, handlers.GetHeatmap)
	router.GET("/public/history/attacks", cache30s, api.GetHistoricalAttacks)
	router.GET("/public/zones/restricted", cache30s, api.GetRestrictedZones)
	router.GET("/public/news", api.GetNews)
	router.GET("/public/news/latest", cache30s, api.GetLatestNews)
	router.GET("/public/news/trending", cache30s, api.GetTrendingNews)
	router.GET("/public/news/heatmap", cache30s, api.GetNewsHeatmap)
	router.GET("/public/news/pipeline/status", cache30s, api.GetPipelineStatus)
	router.GET("/public/timeline", cache30s, api.GetTimeline)
	router.GET("/public/threats", cache30s, api.GetThreats)
	router.GET("/public/events", cache30s, api.GetEvents)
	router.GET("/public/events/:id", cache30s, api.GetEventDetail)
	router.GET("/public/sources", cache30s, api.GetSources)
	router.GET("/public/countries", cache30s, api.GetCountries)
	router.GET("/public/categories", cache30s, api.GetCategories)

	// Unauthenticated routes for testing (can be removed in production)
	if isAuthDisabled {
		// Auth session endpoints still needed for client-side auth flow
		router.GET("/auth/session", auth.JWTMiddleware(), auth.GetSession)
		router.POST("/auth/logout", auth.JWTMiddleware(), auth.Logout)

		// Admin user management endpoints (JWT middleware injects default admin)
		router.POST("/auth/approve/:username", auth.JWTMiddleware(), auth.AdminOnlyMiddleware(), auth.ApproveUser)
		router.GET("/auth/pending", auth.JWTMiddleware(), auth.AdminOnlyMiddleware(), auth.GetPendingUsers)
		router.GET("/auth/users", auth.JWTMiddleware(), auth.AdminOnlyMiddleware(), auth.GetAllUsers)
		router.PUT("/auth/users/:username", auth.JWTMiddleware(), auth.AdminOnlyMiddleware(), auth.UpdateUser)
		router.DELETE("/auth/users/:username", auth.JWTMiddleware(), auth.AdminOnlyMiddleware(), auth.DeleteUser)
		router.POST("/auth/blacklist/:username", auth.JWTMiddleware(), auth.AdminOnlyMiddleware(), auth.BlacklistUser)
		router.POST("/auth/unblacklist/:username", auth.JWTMiddleware(), auth.AdminOnlyMiddleware(), auth.UnblacklistUser)

		router.POST("/telemetry", handlers.PostTelemetry)
		router.POST("/analyze", handlers.Analyze)
		router.GET("/integrations/identity-token-check", handlers.IdentityTokenCheck)
		router.GET("/stream/poll", handlers.StreamPoll)

		// 30-second cache for heavy geospatial GET routes
		router.GET("/heatmap", cache30s, handlers.GetHeatmap)
		router.GET("/history/attacks", cache30s, api.GetHistoricalAttacks)
		router.GET("/zones/restricted", cache30s, api.GetRestrictedZones)

		// News endpoint
		router.GET("/news", api.GetNews)
		router.GET("/news/latest", api.GetLatestNews)
		router.GET("/news/search", api.SearchNews)
		router.GET("/news/trending", api.GetTrendingNews)
		router.GET("/news/heatmap", api.GetNewsHeatmap)
		router.GET("/news/pipeline/status", api.GetPipelineStatus)
		router.GET("/news/:id", api.GetNewsByID)

		// Entity & metadata endpoints
		router.GET("/countries", api.GetCountries)
		router.GET("/country/:code", api.GetCountryDetail)
		router.GET("/categories", api.GetCategories)
		router.GET("/sources", api.GetSources)

		// Intelligence event endpoints
		router.GET("/events", api.GetEvents)
		router.GET("/events/:id", api.GetEventDetail)
		router.GET("/timeline", api.GetTimeline)
		router.GET("/threats", api.GetThreats)

		// Settings endpoint (unauthenticated)
		router.GET("/settings", api.GetSettings)
		router.POST("/settings", api.UpdateSettings)

		// Watchlist endpoints
		router.GET("/watchlist", api.GetWatchlist)
		router.POST("/watchlist/:id", api.AddToWatchlist)
		router.DELETE("/watchlist/:id", api.RemoveFromWatchlist)

		// History endpoints
		router.GET("/tracks/:id/history", api.GetTrackHistory)

		// Active tracks endpoints (vessels & aircraft)
		router.GET("/tracks/active", api.GetAllActiveTracks)
		router.GET("/vessels", api.GetActiveVessels)
		router.GET("/aircraft", api.GetActiveAircraft)
	} else {
		// Authenticated routes using JWT middleware
		authMiddleware := auth.JWTMiddleware()
		adminMiddleware := auth.AdminOnlyMiddleware()
		router.GET("/auth/session", authMiddleware, auth.GetSession)
		router.POST("/auth/logout", authMiddleware, auth.Logout)
		router.POST("/auth/approve/:username", authMiddleware, adminMiddleware, auth.ApproveUser)
		router.GET("/auth/pending", authMiddleware, adminMiddleware, auth.GetPendingUsers)
		router.GET("/auth/users", authMiddleware, adminMiddleware, auth.GetAllUsers)
		router.PUT("/auth/users/:username", authMiddleware, adminMiddleware, auth.UpdateUser)
		router.DELETE("/auth/users/:username", authMiddleware, adminMiddleware, auth.DeleteUser)
		router.POST("/auth/blacklist/:username", authMiddleware, adminMiddleware, auth.BlacklistUser)
		router.POST("/auth/unblacklist/:username", authMiddleware, adminMiddleware, auth.UnblacklistUser)

		router.POST("/telemetry", authMiddleware, handlers.PostTelemetry)
		router.POST("/analyze", authMiddleware, handlers.Analyze)
		router.GET("/integrations/identity-token-check", authMiddleware, handlers.IdentityTokenCheck)
		router.GET("/stream/poll", authMiddleware, handlers.StreamPoll)

		// 30-second cache for heavy geospatial GET routes
		router.GET("/heatmap", authMiddleware, cache30s, handlers.GetHeatmap)
		router.GET("/history/attacks", authMiddleware, cache30s, api.GetHistoricalAttacks)
		router.GET("/zones/restricted", authMiddleware, cache30s, api.GetRestrictedZones)

		// News endpoint
		router.GET("/news", authMiddleware, api.GetNews)
		router.GET("/news/latest", authMiddleware, api.GetLatestNews)
		router.GET("/news/search", authMiddleware, api.SearchNews)
		router.GET("/news/trending", authMiddleware, api.GetTrendingNews)
		router.GET("/news/:id", authMiddleware, api.GetNewsByID)

		// Entity & metadata endpoints
		router.GET("/countries", authMiddleware, api.GetCountries)
		router.GET("/country/:code", authMiddleware, api.GetCountryDetail)
		router.GET("/categories", authMiddleware, api.GetCategories)
		router.GET("/sources", authMiddleware, api.GetSources)

		// Intelligence event endpoints
		router.GET("/events", authMiddleware, api.GetEvents)
		router.GET("/events/:id", authMiddleware, api.GetEventDetail)
		router.GET("/timeline", authMiddleware, api.GetTimeline)
		router.GET("/threats", authMiddleware, api.GetThreats)

		// Settings endpoint
		router.GET("/settings", authMiddleware, api.GetSettings)
		router.POST("/settings", authMiddleware, api.UpdateSettings)

		// Watchlist endpoints
		router.GET("/watchlist", authMiddleware, api.GetWatchlist)
		router.POST("/watchlist/:id", authMiddleware, api.AddToWatchlist)
		router.DELETE("/watchlist/:id", authMiddleware, api.RemoveFromWatchlist)

		// History endpoints
		router.GET("/tracks/:id/history", authMiddleware, api.GetTrackHistory)

		// Active tracks endpoints (vessels & aircraft)
		router.GET("/tracks/active", authMiddleware, api.GetAllActiveTracks)
		router.GET("/vessels", authMiddleware, api.GetActiveVessels)
		router.GET("/aircraft", authMiddleware, api.GetActiveAircraft)
	}

	// Token refresh — requires a valid existing token, re-issues a fresh one.
	router.POST("/auth/refresh", auth.JWTMiddleware(), auth.Refresh)

	// Dataset pipeline (queue-based GDrive persistence). GET is open; POST write
	// endpoints require the metrics API key (MetricsAuthMiddleware).
	router.GET("/datasets", datasetHandlers.List)
	router.GET("/datasets/status", datasetHandlers.Status)
	router.POST("/datasets/snapshot", api.MetricsAuthMiddleware(), datasetHandlers.Snapshot)
	router.POST("/datasets/flush", api.MetricsAuthMiddleware(), datasetHandlers.Flush)

	log.Printf("Geospatial HormuzWatch Server starting on port %s (Auth Disabled: %v)", port, isAuthDisabled)

	// Graceful shutdown: close the gRPC ML connection on termination.
	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
		<-sig
		log.Println("Shutdown signal received; closing ML gRPC client")
		if err := mlClient.Close(); err != nil {
			log.Printf("[ML] close error: %v", err)
		}
		if datasetSvc != nil {
			datasetSvc.Close()
		}
		db.Close()
		os.Exit(0)
	}()

	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func corsMiddleware() gin.HandlerFunc {
	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	origins := map[string]struct{}{}
	if allowedOrigins == "" || allowedOrigins == "*" {
		origins["*"] = struct{}{}
	} else {
		for _, origin := range strings.Split(allowedOrigins, ",") {
			origin = strings.TrimSpace(origin)
			if origin != "" {
				origins[origin] = struct{}{}
			}
		}
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if _, ok := origins["*"]; ok {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		} else if origin != "" {
			if _, ok := origins[origin]; ok {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			}
		}
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
