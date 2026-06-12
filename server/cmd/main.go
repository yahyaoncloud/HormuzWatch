package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"Geospatial-harmuz-watch/server/internal/api"
	"Geospatial-harmuz-watch/server/internal/auth"
	"Geospatial-harmuz-watch/server/internal/cache"
	"Geospatial-harmuz-watch/server/internal/db"
	"Geospatial-harmuz-watch/server/internal/heatmap"
	"Geospatial-harmuz-watch/server/internal/integrations"
	"Geospatial-harmuz-watch/server/internal/intelligence"
	"Geospatial-harmuz-watch/server/internal/websocket"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
	// Attempt to load .env file
	_ = godotenv.Load()

	// Load environment variables
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	authDisabled := os.Getenv("AUTH_DISABLED")
	isAuthDisabled := authDisabled == "true"

	// Initialize PostgreSQL
	if err := db.InitDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Initialize Redis cache (graceful fallback if unavailable)
	cache.InitRedis()

	// Initialize WebSocket hub
	hub := websocket.NewHub()
	go hub.Run()

	// Load historical attack data
	if err := api.LoadHistoricalData("data/history-attacks.json"); err != nil {
		log.Printf("Warning: Failed to load historical attack data: %v", err)
	}

	// Initialize Intelligence Pipeline
	tsm := intelligence.NewTrackStateManager()
	mlClient := intelligence.NewMLClient()

	// Start background data integration workers (AISStream, OpenSky, GDELT)
	integrations.StartWorkers(hub, tsm, mlClient)

	// Start automated ML training loop
	intelligence.StartAutomatedTraining(tsm, mlClient)

	// Start intelligence news aggregator
	go integrations.StartNewsAggregator()

	// Start heatmap cleanup routine
	heatmap.StartCleanupRoutine()

	// Start data retention cleanup routine
	integrations.StartRetentionWorker()

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
				"GET /health - API status",
				"GET /ws - WebSocket telemetry stream",
				"POST /api/telemetry - Ingest vessel data",
				"POST /api/analyze - Threat intelligence scoring",
				"GET /api/heatmap - Geospatial anomaly density",
				"GET /api/history/attacks - Historical incident overlays",
				"GET /api/zones/restricted - Geofence restriction zones",
				"GET /api/news - Intelligence news feed",
			},
			"active_integrations": []string{"AISStream", "OpenSky", "GDELT", "NASA FIRMS", "Open-Meteo", "RSS"},
		})
	})

	// Health check endpoint (no auth)
	router.GET("/health", handlers.Health)

	// Prometheus metrics endpoint (no auth)
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// Authentication endpoints (always public)
	// router.POST("/auth/register", auth.Register)
	// router.POST("/auth/login", auth.Login)

	// Public streaming endpoints (no auth required)
	router.GET("/public/top-traces", api.GetTopTraces)
	router.GET("/public/stream", api.PublicTopTracesStream)

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
		router.GET("/ws/stream", handlers.WebSocketStream)
		router.GET("/stream/poll", handlers.StreamPoll)

		// 30-second cache for heavy geospatial GET routes
		cache30s := api.CacheMiddleware(30 * time.Second)
		router.GET("/heatmap", cache30s, handlers.GetHeatmap)
		router.GET("/history/attacks", cache30s, api.GetHistoricalAttacks)
		router.GET("/zones/restricted", cache30s, api.GetRestrictedZones)

		// News endpoint
		router.GET("/news", api.GetNews)

		// Settings endpoint
		router.GET("/settings", api.GetSettings)
		router.POST("/settings", api.UpdateSettings)

		// Watchlist endpoints
		router.GET("/watchlist", api.GetWatchlist)
		router.POST("/watchlist/:id", api.AddToWatchlist)
		router.DELETE("/watchlist/:id", api.RemoveFromWatchlist)

		// History endpoints
		router.GET("/tracks/:id/history", api.GetTrackHistory)
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
		router.GET("/ws/stream", authMiddleware, handlers.WebSocketStream)
		router.GET("/stream/poll", authMiddleware, handlers.StreamPoll)

		// 30-second cache for heavy geospatial GET routes
		cache30s := api.CacheMiddleware(30 * time.Second)
		router.GET("/heatmap", authMiddleware, cache30s, handlers.GetHeatmap)
		router.GET("/history/attacks", authMiddleware, cache30s, api.GetHistoricalAttacks)
		router.GET("/zones/restricted", authMiddleware, cache30s, api.GetRestrictedZones)

		// News endpoint
		router.GET("/news", authMiddleware, api.GetNews)

		// Settings endpoint
		router.GET("/settings", authMiddleware, api.GetSettings)
		router.POST("/settings", authMiddleware, api.UpdateSettings)

		// Watchlist endpoints
		router.GET("/watchlist", authMiddleware, api.GetWatchlist)
		router.POST("/watchlist/:id", authMiddleware, api.AddToWatchlist)
		router.DELETE("/watchlist/:id", authMiddleware, api.RemoveFromWatchlist)

		// History endpoints
		router.GET("/tracks/:id/history", authMiddleware, api.GetTrackHistory)
	}

	log.Printf("Geospatial HormuzWatch Server starting on port %s (Auth Disabled: %v)", port, isAuthDisabled)
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
