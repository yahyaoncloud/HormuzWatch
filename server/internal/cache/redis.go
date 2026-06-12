package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	TrackTTL      = 60 * time.Second
	TrackKeyPrefix = "track:"
	AllTracksKey  = "tracks:all"
)

var Client *redis.Client
var enabled bool

// InitRedis initialises the Redis client from REDIS_URL env var.
// If REDIS_URL is unset or connection fails, cache is disabled gracefully.
func InitRedis() {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		log.Println("[cache] REDIS_URL not set — running without Redis cache")
		return
	}

	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Printf("[cache] Invalid REDIS_URL: %v — running without cache", err)
		return
	}

	Client = redis.NewClient(opt)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := Client.Ping(ctx).Err(); err != nil {
		log.Printf("[cache] Redis ping failed: %v — running without cache", err)
		Client = nil
		return
	}

	enabled = true
	log.Println("[cache] Redis connected successfully")
}

// IsEnabled returns whether Redis is available.
func IsEnabled() bool { return enabled && Client != nil }

// SetTrack stores a single track payload with TTL.
// Key: track:<trackID>
func SetTrack(trackID string, payload interface{}) {
	if !IsEnabled() {
		return
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	pipe := Client.Pipeline()
	key := fmt.Sprintf("%s%s", TrackKeyPrefix, trackID)
	pipe.Set(ctx, key, data, TrackTTL)
	pipe.SAdd(ctx, AllTracksKey, trackID)
	pipe.Expire(ctx, AllTracksKey, TrackTTL*2)
	if _, err := pipe.Exec(ctx); err != nil {
		log.Printf("[cache] SetTrack error: %v", err)
	}
}

// GetAllTracks returns all cached track payloads as raw JSON messages.
// Used to seed new WebSocket clients with current live state.
func GetAllTracks() []json.RawMessage {
	if !IsEnabled() {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	ids, err := Client.SMembers(ctx, AllTracksKey).Result()
	if err != nil || len(ids) == 0 {
		return nil
	}

	var keys []string
	for _, id := range ids {
		keys = append(keys, fmt.Sprintf("%s%s", TrackKeyPrefix, id))
	}

	vals, err := Client.MGet(ctx, keys...).Result()
	if err != nil {
		return nil
	}

	var results []json.RawMessage
	for _, v := range vals {
		if v == nil {
			continue
		}
		if s, ok := v.(string); ok && s != "" {
			results = append(results, json.RawMessage(s))
		}
	}
	return results
}

// DeleteTrack removes a track from cache (called on expiry/cleanup).
func DeleteTrack(trackID string) {
	if !IsEnabled() {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	pipe := Client.Pipeline()
	pipe.Del(ctx, fmt.Sprintf("%s%s", TrackKeyPrefix, trackID))
	pipe.SRem(ctx, AllTracksKey, trackID)
	_, _ = pipe.Exec(ctx)
}

// FlushTracks removes all cached tracks (used on server restart if needed).
func FlushTracks() {
	if !IsEnabled() {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	ids, err := Client.SMembers(ctx, AllTracksKey).Result()
	if err != nil {
		return
	}
	keys := []string{AllTracksKey}
	for _, id := range ids {
		keys = append(keys, fmt.Sprintf("%s%s", TrackKeyPrefix, id))
	}
	Client.Del(ctx, keys...)
}
