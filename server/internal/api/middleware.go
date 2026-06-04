package api

import (
	"bytes"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// --- Rate Limiting ---

var (
	limiters = make(map[string]*rate.Limiter)
	mu       sync.Mutex
)

// getVisitorLimiter retrieves or creates a rate limiter for an IP
func getVisitorLimiter(ip string) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock()

	limiter, exists := limiters[ip]
	if !exists {
		// 20 requests per second, burst of 40
		limiter = rate.NewLimiter(rate.Limit(20), 40)
		limiters[ip] = limiter
	}

	return limiter
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
