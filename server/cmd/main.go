package main

import (
	"log"
	"os"

	"Geospatial-harmuz-watch/server/internal/api"
	"Geospatial-harmuz-watch/server/internal/auth"
	"Geospatial-harmuz-watch/server/internal/integrations"
	"Geospatial-harmuz-watch/server/internal/websocket"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load environment variables
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	authDisabled := os.Getenv("AUTH_DISABLED")
	isAuthDisabled := authDisabled == "true"

	// Initialize WebSocket hub
	hub := websocket.NewHub()
	go hub.Run()

	// Start background data integration workers (AISStream, OpenSky, GDELT)
	integrations.StartWorkers(hub)

	// Initialize Gin router
	router := gin.Default()

	// CORS middleware
	router.Use(corsMiddleware())

	// Initialize API handlers
	handlers := api.NewHandlers(hub)

	// Health check endpoint (no auth)
	router.GET("/health", handlers.Health)

	// Unauthenticated routes for testing (can be removed in production)
	if isAuthDisabled {
		router.POST("/telemetry", handlers.PostTelemetry)
		router.POST("/analyze", handlers.Analyze)
		router.GET("/integrations/identity-token-check", handlers.IdentityTokenCheck)
		router.GET("/ws/stream", handlers.WebSocketStream)
		router.GET("/heatmap", handlers.GetHeatmap)
	} else {
		// Authenticated routes using JWT middleware
		authMiddleware := auth.JWTMiddleware()
		router.POST("/telemetry", authMiddleware, handlers.PostTelemetry)
		router.POST("/analyze", authMiddleware, handlers.Analyze)
		router.GET("/integrations/identity-token-check", authMiddleware, handlers.IdentityTokenCheck)
		router.GET("/ws/stream", authMiddleware, handlers.WebSocketStream)
		router.GET("/heatmap", authMiddleware, handlers.GetHeatmap)
	}

	log.Printf("Geospatial HormuzWatch Server starting on port %s (Auth Disabled: %v)", port, isAuthDisabled)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
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
