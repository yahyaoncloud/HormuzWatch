package bootstrap

import (
	"net/http"
	"strings"
	"time"

	"Geospatial-harmuz-watch/server/internal/api"
	"Geospatial-harmuz-watch/server/internal/auth"
	"Geospatial-harmuz-watch/server/internal/datasets"
	"Geospatial-harmuz-watch/server/internal/observability"

	"github.com/gin-gonic/gin"
)

// SetupRouter initializes Gin, applies middleware, and configures all routes.
func SetupRouter(
	cfg Config,
	handlers *api.Handlers,
	datasetSvc *datasets.Service,
) *gin.Engine {
	router := gin.Default()

	// Global Middlewares
	router.Use(corsMiddleware(cfg.AllowedOrigins))
	router.Use(api.RateLimiterMiddleware())

	// Base & System Routes
	registerSystemRoutes(router, handlers)

	// Public Telemetry & Intelligence Routes
	registerPublicRoutes(router, handlers)

	// Authentication & Protected Routes
	registerAuthAndProtectedRoutes(router, handlers, cfg.IsAuthDisabled)

	// Dataset Pipeline Routes
	registerDatasetRoutes(router, datasetSvc)

	return router
}

func registerSystemRoutes(router *gin.Engine, handlers *api.Handlers) {
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

	// Health check endpoints (no auth)
	router.Any("/health", handlers.Health)
	router.GET("/health/live", handlers.LiveHealth)
	router.GET("/health/ready", handlers.ReadyHealth)

	// Observability metrics (Prometheus & expvar /debug/vars, no auth)
	router.GET("/metrics", observability.PrometheusHandler)
	router.Any("/debug/vars", gin.WrapH(observability.MetricsHandler()))

	// Authentication endpoints (always public)
	router.POST("/auth/register", auth.Register)
	router.POST("/auth/login", auth.Login)
}

func registerPublicRoutes(router *gin.Engine, handlers *api.Handlers) {
	cache30s := api.CacheMiddleware(30 * time.Second)
	cache2m := api.CacheMiddleware(2 * time.Minute)

	// Public streaming & metrics endpoints (no auth required)
	router.GET("/public/top-traces", api.GetTopTraces)
	router.GET("/public/stream", api.PublicTopTracesStream)
	router.GET("/public/metrics", api.GetPublicMetrics)
	router.GET("/public/briefing", api.GetBriefing)
	router.GET("/public/conflicts", api.GetConflictFeed)

	// Public detailed intelligence reports
	router.GET("/public/report", api.GetDetailedReport)
	router.GET("/public/report/pdf", api.GetDetailedReportPDF)

	// Public WebSocket telemetry stream
	router.GET("/ws/stream", handlers.WebSocketStream)

	// Public geospatial & situational awareness
	router.GET("/public/heatmap", cache30s, handlers.GetHeatmap)
	router.GET("/public/history/attacks", cache30s, api.GetHistoricalAttacks)
	router.GET("/public/zones/restricted", cache30s, api.GetRestrictedZones)

	// Public vessel/track endpoints
	router.GET("/public/vessels", cache2m, api.GetActiveVessels)
	router.GET("/public/vessels/:mmsi", api.GetAISVesselByMMSI)
	router.GET("/public/vessels/:mmsi/track", api.GetAISVesselTrack)
	router.GET("/public/aircraft", cache2m, api.GetActiveAircraft)
	router.GET("/public/tracks/active", cache2m, api.GetAllActiveTracks)

	// AIS service health & incident correlation
	router.GET("/public/ais/status", api.GetAISHealth)
	router.GET("/public/conflicts/:id/traffic", api.GetIncidentNearbyVessels)
	router.GET("/public/incidents/:id/nearby-vessels", api.GetIncidentNearbyVessels)

	// Public news feeds
	router.GET("/public/news", api.GetNews)
	router.GET("/public/news/latest", cache30s, api.GetLatestNews)
	router.GET("/public/news/trending", cache30s, api.GetTrendingNews)
	router.GET("/public/news/heatmap", cache30s, api.GetNewsHeatmap)
	router.GET("/public/news/pipeline/status", cache30s, api.GetPipelineStatus)

	// Public intelligence events & metadata
	router.GET("/public/timeline", cache30s, api.GetTimeline)
	router.GET("/public/threats", cache30s, api.GetThreats)
	router.GET("/public/events", cache30s, api.GetEvents)
	router.GET("/public/events/:id", cache30s, api.GetEventDetail)
	router.GET("/public/sources", cache30s, api.GetSources)
	router.GET("/public/countries", cache30s, api.GetCountries)
	router.GET("/public/categories", cache30s, api.GetCategories)

	// Public analytics endpoints
	router.GET("/public/analytics/transits", cache30s, api.GetTransits)
	router.GET("/public/analytics/transit-ships", cache30s, api.GetTransitShips)
	router.GET("/public/analytics/hourly", cache30s, api.GetHourlyTransits)
	router.GET("/public/analytics/states", cache30s, api.GetVesselStates)
	router.GET("/public/analytics/blockade", cache30s, api.GetBlockadeIndicators)
	router.GET("/public/analytics/flags", cache30s, api.GetFlagDistribution)
	router.GET("/public/analytics/destinations", cache30s, api.GetDestinationDistribution)
	router.GET("/public/analytics/gate", cache30s, api.GetGateInfo)
	router.GET("/public/analytics/data-quality", cache30s, api.GetDataQuality)
	router.GET("/public/analytics/summary", cache30s, api.GetDailySummary)
	router.GET("/public/analytics/stats", handlers.GetRealtimeStats)
	router.GET("/admin/stats/realtime", handlers.GetRealtimeStats)
	router.GET("/api/stats/realtime", handlers.GetRealtimeStats)
}

func registerAuthAndProtectedRoutes(router *gin.Engine, handlers *api.Handlers, isAuthDisabled bool) {
	cache30s := api.CacheMiddleware(30 * time.Second)

	if isAuthDisabled {
		// Session endpoints
		router.GET("/auth/session", auth.JWTMiddleware(), auth.GetSession)
		router.POST("/auth/logout", auth.JWTMiddleware(), auth.Logout)

		// User administration
		router.POST("/auth/approve/:username", auth.JWTMiddleware(), auth.AdminOnlyMiddleware(), auth.ApproveUser)
		router.GET("/auth/pending", auth.JWTMiddleware(), auth.AdminOnlyMiddleware(), auth.GetPendingUsers)
		router.GET("/auth/users", auth.JWTMiddleware(), auth.AdminOnlyMiddleware(), auth.GetAllUsers)
		router.PUT("/auth/users/:username", auth.JWTMiddleware(), auth.AdminOnlyMiddleware(), auth.UpdateUser)
		router.DELETE("/auth/users/:username", auth.JWTMiddleware(), auth.AdminOnlyMiddleware(), auth.DeleteUser)
		router.POST("/auth/blacklist/:username", auth.JWTMiddleware(), auth.AdminOnlyMiddleware(), auth.BlacklistUser)
		router.POST("/auth/unblacklist/:username", auth.JWTMiddleware(), auth.AdminOnlyMiddleware(), auth.UnblacklistUser)

		// Ingestion & intelligence
		router.POST("/telemetry", handlers.PostTelemetry)
		router.POST("/analyze", handlers.Analyze)
		router.GET("/integrations/identity-token-check", handlers.IdentityTokenCheck)
		router.GET("/stream/poll", handlers.StreamPoll)

		// Geospatial & alerts
		router.GET("/heatmap", cache30s, handlers.GetHeatmap)
		router.GET("/history/attacks", cache30s, api.GetHistoricalAttacks)
		router.GET("/zones/restricted", cache30s, api.GetRestrictedZones)

		// News endpoints
		router.GET("/news", api.GetNews)
		router.GET("/news/latest", api.GetLatestNews)
		router.GET("/news/search", api.SearchNews)
		router.GET("/news/trending", api.GetTrendingNews)
		router.GET("/news/heatmap", api.GetNewsHeatmap)
		router.GET("/news/pipeline/status", api.GetPipelineStatus)
		router.GET("/news/:id", api.GetNewsByID)

		// Entities & metadata
		router.GET("/countries", api.GetCountries)
		router.GET("/country/:code", api.GetCountryDetail)
		router.GET("/categories", api.GetCategories)
		router.GET("/sources", api.GetSources)

		// Events & timeline
		router.GET("/events", api.GetEvents)
		router.GET("/events/:id", api.GetEventDetail)
		router.GET("/timeline", api.GetTimeline)
		router.GET("/threats", api.GetThreats)

		// Settings & watchlist
		router.GET("/settings", api.GetSettings)
		router.POST("/settings", api.UpdateSettings)
		router.GET("/watchlist", api.GetWatchlist)
		router.POST("/watchlist/:id", api.AddToWatchlist)
		router.DELETE("/watchlist/:id", api.RemoveFromWatchlist)

		// Tracks
		router.GET("/tracks/:id/history", api.GetTrackHistory)
		router.GET("/tracks/active", api.GetAllActiveTracks)
		router.GET("/vessels", api.GetActiveVessels)
		router.GET("/aircraft", api.GetActiveAircraft)

		// Analytics
		router.GET("/analytics/transits", api.GetTransits)
		router.GET("/analytics/transit-ships", api.GetTransitShips)
		router.GET("/analytics/hourly", api.GetHourlyTransits)
		router.GET("/analytics/states", api.GetVesselStates)
		router.GET("/analytics/blockade", api.GetBlockadeIndicators)
		router.GET("/analytics/flags", api.GetFlagDistribution)
		router.GET("/analytics/destinations", api.GetDestinationDistribution)
		router.GET("/analytics/gate", api.GetGateInfo)
		router.GET("/analytics/data-quality", api.GetDataQuality)
		router.GET("/analytics/summary", api.GetDailySummary)

		// Dataset Admin
		router.POST("/api/admin/datasets/export", api.AdminExportDataset)
		router.GET("/api/admin/datasets/exports", api.AdminListExports)
		router.GET("/api/admin/datasets/download/:filename", api.AdminDownloadExport)
		router.DELETE("/api/admin/datasets/download/:filename", api.AdminDeleteExport)
	} else {
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

		router.GET("/heatmap", authMiddleware, cache30s, handlers.GetHeatmap)
		router.GET("/history/attacks", authMiddleware, cache30s, api.GetHistoricalAttacks)
		router.GET("/zones/restricted", authMiddleware, cache30s, api.GetRestrictedZones)

		router.GET("/news", authMiddleware, api.GetNews)
		router.GET("/news/latest", authMiddleware, api.GetLatestNews)
		router.GET("/news/search", authMiddleware, api.SearchNews)
		router.GET("/news/trending", authMiddleware, api.GetTrendingNews)
		router.GET("/news/:id", authMiddleware, api.GetNewsByID)

		router.GET("/countries", authMiddleware, api.GetCountries)
		router.GET("/country/:code", authMiddleware, api.GetCountryDetail)
		router.GET("/categories", authMiddleware, api.GetCategories)
		router.GET("/sources", authMiddleware, api.GetSources)

		router.GET("/events", authMiddleware, api.GetEvents)
		router.GET("/events/:id", authMiddleware, api.GetEventDetail)
		router.GET("/timeline", authMiddleware, api.GetTimeline)
		router.GET("/threats", authMiddleware, api.GetThreats)

		router.GET("/settings", authMiddleware, api.GetSettings)
		router.POST("/settings", authMiddleware, api.UpdateSettings)

		router.GET("/watchlist", authMiddleware, api.GetWatchlist)
		router.POST("/watchlist/:id", authMiddleware, api.AddToWatchlist)
		router.DELETE("/watchlist/:id", authMiddleware, api.RemoveFromWatchlist)

		router.GET("/tracks/:id/history", authMiddleware, api.GetTrackHistory)
		router.GET("/tracks/active", authMiddleware, api.GetAllActiveTracks)
		router.GET("/vessels", authMiddleware, api.GetActiveVessels)
		router.GET("/aircraft", authMiddleware, api.GetActiveAircraft)

		router.GET("/analytics/transits", authMiddleware, api.GetTransits)
		router.GET("/analytics/transit-ships", authMiddleware, api.GetTransitShips)
		router.GET("/analytics/hourly", authMiddleware, api.GetHourlyTransits)
		router.GET("/analytics/states", authMiddleware, api.GetVesselStates)
		router.GET("/analytics/blockade", authMiddleware, api.GetBlockadeIndicators)
		router.GET("/analytics/flags", authMiddleware, api.GetFlagDistribution)
		router.GET("/analytics/destinations", authMiddleware, api.GetDestinationDistribution)
		router.GET("/analytics/gate", authMiddleware, api.GetGateInfo)
		router.GET("/analytics/data-quality", authMiddleware, api.GetDataQuality)
		router.GET("/analytics/summary", authMiddleware, api.GetDailySummary)

		router.POST("/api/admin/datasets/export", authMiddleware, adminMiddleware, api.AdminExportDataset)
		router.GET("/api/admin/datasets/exports", authMiddleware, adminMiddleware, api.AdminListExports)
		router.GET("/api/admin/datasets/download/:filename", authMiddleware, adminMiddleware, api.AdminDownloadExport)
		router.DELETE("/api/admin/datasets/download/:filename", authMiddleware, adminMiddleware, api.AdminDeleteExport)
	}

	// Token refresh
	router.POST("/auth/refresh", auth.JWTMiddleware(), auth.Refresh)
}

func registerDatasetRoutes(router *gin.Engine, datasetSvc *datasets.Service) {
	if datasetSvc == nil {
		return
	}
	datasetHandlers := api.DatasetHandlers(datasetSvc)
	router.GET("/datasets", datasetHandlers.List)
	router.GET("/datasets/status", datasetHandlers.Status)
	router.POST("/datasets/snapshot", api.MetricsAuthMiddleware(), datasetHandlers.Snapshot)
	router.POST("/datasets/flush", api.MetricsAuthMiddleware(), datasetHandlers.Flush)
}

func corsMiddleware(allowedOrigins string) gin.HandlerFunc {
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
