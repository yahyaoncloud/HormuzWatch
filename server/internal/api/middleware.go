package api

import (
	"bytes"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

var (
	visitors = make(map[string]*visitor)
	mu       sync.Mutex
)

func init() {
	// Background cleanup ticker to purge inactive visitors every 5 minutes
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			mu.Lock()
			for ip, v := range visitors {
				if time.Since(v.lastSeen) > 10*time.Minute {
					delete(visitors, ip)
				}
			}
			mu.Unlock()
		}
	}()
}

// getVisitorLimiter retrieves or creates a rate limiter for an IP and updates lastSeen
func getVisitorLimiter(ip string) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock()

	v, exists := visitors[ip]
	if !exists {
		// 20 requests per second, burst of 40
		limiter := rate.NewLimiter(rate.Limit(20), 40)
		visitors[ip] = &visitor{limiter: limiter, lastSeen: time.Now()}
		return limiter
	}

	v.lastSeen = time.Now()
	return v.limiter
}

// RateLimiterMiddleware applies IP-based rate limiting
func RateLimiterMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		limiter := getVisitorLimiter(ip)

		if !limiter.Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "too many requests",
			})
			return
		}

		c.Next()
	}
}

// --- Caching ---

type cacheEntry struct {
	data        []byte
	expiresAt   time.Time
	contentType string
}

var (
	cacheMap = make(map[string]*cacheEntry)
	cacheMu  sync.RWMutex
)

// responseWriter wraps gin.ResponseWriter to capture the body
type responseWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w responseWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

// CacheMiddleware caches GET responses for a specified duration
func CacheMiddleware(duration time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method != http.MethodGet {
			c.Next()
			return
		}

		cacheKey := c.Request.URL.Path + "?" + c.Request.URL.RawQuery

		// Check cache
		cacheMu.RLock()
		entry, exists := cacheMap[cacheKey]
		cacheMu.RUnlock()

		if exists && time.Now().Before(entry.expiresAt) {
			c.Writer.Header().Set("X-Cache", "HIT")
			c.Data(http.StatusOK, entry.contentType, entry.data)
			c.Abort()
			return
		}

		// Cache miss - capture response
		w := &responseWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
		c.Writer = w

		c.Next()

		// Store in cache only if success
		if c.Writer.Status() == http.StatusOK {
			cacheMu.Lock()
			cacheMap[cacheKey] = &cacheEntry{
				data:        w.body.Bytes(),
				expiresAt:   time.Now().Add(duration),
				contentType: c.Writer.Header().Get("Content-Type"),
			}
			cacheMu.Unlock()
			c.Writer.Header().Set("X-Cache", "MISS")
		}
	}
}

// --- API Key Auth ---

// MetricsAuthMiddleware checks for a static API key in the Authorization header.
func MetricsAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		expectedKey := os.Getenv("METRICS_API_KEY")
		if expectedKey == "" {
			// If no key is configured, block access to be safe
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Metrics endpoint is disabled (no API key configured)",
			})
			return
		}

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header must be Bearer token"})
			return
		}

		if parts[1] != expectedKey {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid API Key"})
			return
		}

		c.Next()
	}
}
