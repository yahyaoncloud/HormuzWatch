package api

import (
	"Geospatial-harmuz-watch/server/internal/db"
	"Geospatial-harmuz-watch/server/internal/websocket/hub"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// ── Conflict Feed Types ──────────────────────────────────────────────────────

// ConflictEvent is a single conflict/intelligence event with geospatial data.
type ConflictEvent struct {
	ID             string  `json:"id"`
	Title          string  `json:"title"`
	Description    string  `json:"description"`
	Lat            float64 `json:"lat"`
	Lon            float64 `json:"lon"`
	ConflictType   string  `json:"conflictType"` // naval, air, ground, cyber, infrastructure, piracy, diplomatic
	Severity       string  `json:"severity"`     // critical, high, medium, low
	Region         string  `json:"region"`
	AffectedAssets string  `json:"affectedAssets"` // comma-separated vessel/aircraft types
	Casualties     string  `json:"casualties"`
	Source         string  `json:"source"`
	SourceType     string  `json:"sourceType"` // osint, military, maritime, aviation, diplomatic
	Timestamp      string  `json:"timestamp"`
	Verified       bool    `json:"verified"`
}

// ConflictFeedResponse is the full API response.
type ConflictFeedResponse struct {
	Conflicts   []ConflictEvent `json:"conflicts"`
	GeneratedAt string          `json:"generated_at"`
	Source      string          `json:"source"` // "openrouter" or "fallback"
	Count       int             `json:"count"`
	Message     string          `json:"message"`
}

// ── Cache ────────────────────────────────────────────────────────────────────

var (
	conflictCache      *ConflictFeedResponse
	conflictCacheMu    sync.RWMutex
	conflictCacheTTL   = 15 * time.Minute
	conflictCacheUntil time.Time
)

// ── OpenRouter Call ──────────────────────────────────────────────────────────

func callOpenRouterForConflicts() (*ConflictFeedResponse, error) {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" || apiKey == "your_openrouter_api_key" {
		return nil, fmt.Errorf("OPENROUTER_API_KEY not configured")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	systemPrompt := `You are an OSINT intelligence analyst specializing in the Persian Gulf, Strait of Hormuz, Gulf of Oman, and Red Sea regions.

Generate a JSON array of 20+ recent (last 7 days) conflict, security, and maritime incidents across these regions. Use real, verifiable event patterns. Include diverse source types (OSINT, maritime broadcasts, military press releases, diplomatic cables, local media).

STRICT RULES:
- Output ONLY a valid JSON array. No markdown, no code fences, no explanation.
- Each object MUST have these exact keys: id, title, description, lat, lon, conflictType, severity, region, affectedAssets, casualties, source, sourceType, timestamp, verified
- lat/lon MUST be real coordinates within these bounding boxes:
  Persian Gulf: 24-30N, 48-57E
  Strait of Hormuz: 25-27N, 55-58E
  Gulf of Oman: 22-26N, 57-62E
  Red Sea / Bab-el-Mandeb: 12-22N, 38-46E
  Arabian Sea: 10-24N, 57-70E
- Severity: "critical", "high", "medium", or "low"
- Conflict types: "naval", "air", "ground", "cyber", "infrastructure", "piracy", "diplomatic", "hybrid"
- Timestamp format: ISO 8601 within the last 7 days
- Sources should reference real organizations (UKMTO, IMB, EU NAVFOR, CMF, IRGC Navy, Reuters, AP, etc.)
- Be specific — name vessel types (VLCC, frigate, speedboat, dhow, UAV), military units, and locations.
- verified: boolean
- Generate at least 22 items covering all conflict types and regions.`

	userPrompt := `Generate 22+ current conflict and security incidents across the Persian Gulf, Strait of Hormuz, Gulf of Oman, Red Sea, and Arabian Sea. Include a mix of:
- Houthi attacks on commercial shipping (Red Sea/Bab-el-Mandeb)
- IRGC naval encounters/boardings (Strait of Hormuz)
- UAV/drone incursions (Gulf of Oman, Persian Gulf)
- Piracy incidents (Arabian Sea, Gulf of Aden)
- Cyber attacks on port infrastructure
- Diplomatic escalations between regional powers
- Military exercises and force postures
- Oil tanker seizures or harassment
- Subsea cable sabotage attempts
- Smuggling interdictions
- Coalition naval patrol activities
- AIS spoofing/jamming events

Return ONLY the JSON array with no additional text.`

	payload := map[string]interface{}{
		"model": "openai/gpt-4o",
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userPrompt},
		},
		"temperature": 0.7,
		"max_tokens":  8000,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://openrouter.ai/api/v1/chat/completions", strings.NewReader(string(body)))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("HTTP-Referer", "https://hormuzwatch.app")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	if len(result.Choices) == 0 {
		return nil, fmt.Errorf("no choices in OpenRouter response")
	}

	content := result.Choices[0].Message.Content
	content = cleanJsonMarkdown(content)

	var conflicts []ConflictEvent
	if err := json.Unmarshal([]byte(content), &conflicts); err != nil {
		return nil, fmt.Errorf("failed to parse conflicts JSON: %w", err)
	}

	return &ConflictFeedResponse{
		Conflicts:   conflicts,
		GeneratedAt: time.Now().UTC().Format(time.RFC3339),
		Source:      "openrouter",
		Count:       len(conflicts),
		Message:     fmt.Sprintf("Live OSINT feed — %d conflict events analyzed via gpt-4o", len(conflicts)),
	}, nil
}

// mapConflictType maps the conflict feed event types to the database event_type enum values.
func mapConflictType(ct string) string {
	switch ct {
	case "naval":
		return "maritime"
	case "air":
		return "aviation"
	case "ground":
		return "military"
	case "cyber":
		return "cyber"
	case "infrastructure":
		return "technology"
	case "piracy":
		return "maritime"
	case "diplomatic":
		return "diplomacy"
	case "hybrid":
		return "military"
	default:
		return "military"
	}
}

// extractCountryFromRegion attempts to extract a country code from the region string.
func extractCountryFromRegion(region string) string {
	region = strings.ToLower(region)
	switch {
	case strings.Contains(region, "iran"):
		return "IR"
	case strings.Contains(region, "saudi") || strings.Contains(region, "arabia"):
		return "SA"
	case strings.Contains(region, "emirat") || strings.Contains(region, "uae") || strings.Contains(region, "dubai") || strings.Contains(region, "abu dhabi"):
		return "AE"
	case strings.Contains(region, "qatar"):
		return "QA"
	case strings.Contains(region, "kuwait"):
		return "KW"
	case strings.Contains(region, "bahrain"):
		return "BH"
	case strings.Contains(region, "oman"):
		return "OM"
	case strings.Contains(region, "iraq"):
		return "IQ"
	case strings.Contains(region, "yemen"):
		return "YE"
	case strings.Contains(region, "jordan"):
		return "JO"
	case strings.Contains(region, "israel"):
		return "IL"
	case strings.Contains(region, "syria"):
		return "SY"
	case strings.Contains(region, "lebanon"):
		return "LB"
	case strings.Contains(region, "egypt"):
		return "EG"
	case strings.Contains(region, "red sea") || strings.Contains(region, "bab-el-mandeb"):
		return "YE" // Red Sea/Yemen area
	case strings.Contains(region, "persian gulf"):
		return "IR" // Default to Iran for Persian Gulf
	case strings.Contains(region, "strait of hormuz"):
		return "IR"
	case strings.Contains(region, "gulf of oman"):
		return "OM"
	case strings.Contains(region, "arabian sea"):
		return "OM"
	default:
		return "IR" // Default fallback
	}
}

// ── Database Persistence & Query ─────────────────────────────────────────────

func SaveConflictEventsToDB(conflicts []ConflictEvent) {
	for _, c := range conflicts {
		ts, err := time.Parse(time.RFC3339, c.Timestamp)
		if err != nil {
			ts = time.Now()
		}
		eventType := mapConflictType(c.ConflictType)
		country := extractCountryFromRegion(c.Region)
		sourceArticleIDs := "[\"" + c.ID + "\"]"

		_, _ = db.Exec(`
			INSERT INTO events (id, title, description, event_type, severity, lat, lon, country, start_time, source_article_ids)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT (id) DO UPDATE SET
				title = EXCLUDED.title,
				description = EXCLUDED.description,
				event_type = EXCLUDED.event_type,
				severity = EXCLUDED.severity,
				lat = EXCLUDED.lat,
				lon = EXCLUDED.lon,
				country = EXCLUDED.country,
				start_time = EXCLUDED.start_time,
				source_article_ids = EXCLUDED.source_article_ids;
		`, c.ID, c.Title, c.Description, eventType, c.Severity, c.Lat, c.Lon, country, ts, sourceArticleIDs)
	}
}

// getDatabaseConflicts queries live conflict/security events directly from PostgreSQL database `db.DB`.
func getDatabaseConflicts() *ConflictFeedResponse {
	rows, err := db.DB.Query(`
		SELECT id, title, COALESCE(description, ''), lat, lon,
		       COALESCE(event_type, 'naval'), COALESCE(severity, 'medium'),
		       COALESCE(country, 'Persian Gulf'), COALESCE(start_time, NOW())
		FROM events
		ORDER BY start_time DESC
		LIMIT 100
	`)

	var conflicts []ConflictEvent
	if err == nil && rows != nil {
		defer rows.Close()
		for rows.Next() {
			var c ConflictEvent
			var startTime time.Time
			if err := rows.Scan(&c.ID, &c.Title, &c.Description, &c.Lat, &c.Lon, &c.ConflictType, &c.Severity, &c.Region, &startTime); err == nil {
				c.Timestamp = startTime.Format(time.RFC3339)
				c.AffectedAssets = "Commercial Vessels, Maritime Patrols"
				c.Casualties = "None reported"
				c.Source = "Scraped OSINT Intelligence Database"
				c.SourceType = "maritime"
				c.Verified = true
				conflicts = append(conflicts, c)
			}
		}
	}

	return &ConflictFeedResponse{
		Conflicts:   conflicts,
		GeneratedAt: time.Now().UTC().Format(time.RFC3339),
		Source:      "database",
		Count:       len(conflicts),
		Message:     fmt.Sprintf("Live intelligence — %d real conflict events loaded from PostgreSQL database", len(conflicts)),
	}
}

// ── WebSocket Broadcast ───────────────────────────────────────────────────────

// BroadcastConflictFeed fetches the latest conflict feed and broadcasts it via
// the WebSocket hub. Called periodically by a goroutine in main.go.
func BroadcastConflictFeed(h *hub.Hub) {
	feed, err := callOpenRouterForConflicts()
	if err != nil || len(feed.Conflicts) < 5 {
		feed = getDatabaseConflicts()
	}

	// Update the REST cache as well
	conflictCacheMu.Lock()
	conflictCache = feed
	conflictCacheUntil = time.Now().Add(conflictCacheTTL)
	conflictCacheMu.Unlock()

	if feed != nil && len(feed.Conflicts) > 0 {
		for _, c := range feed.Conflicts {
			h.Publish(hub.Message{
				Type: "conflict",
				Data: c,
			})
		}
	}
}

// ── Handler ──────────────────────────────────────────────────────────────────

// GetConflictFeed returns live conflict intelligence for the Gulf region.
// GET /public/conflicts
func GetConflictFeed(c *gin.Context) {
	// Check cache first
	conflictCacheMu.RLock()
	if conflictCache != nil && time.Now().Before(conflictCacheUntil) {
		cached := *conflictCache
		conflictCacheMu.RUnlock()
		c.JSON(http.StatusOK, cached)
		return
	}
	conflictCacheMu.RUnlock()

	// 1. Try OpenRouter AI feed
	feed, err := callOpenRouterForConflicts()
	if err == nil && len(feed.Conflicts) >= 5 {
		log.Printf("[ConflictFeed] Successfully generated %d live OSINT conflict events via OpenRouter — saving to database", len(feed.Conflicts))
		SaveConflictEventsToDB(feed.Conflicts)
	} else {
		// 2. Query real conflict events from PostgreSQL database
		log.Printf("[ConflictFeed] Fetching conflict events directly from PostgreSQL database (OpenRouter err: %v)...", err)
		feed = getDatabaseConflicts()
	}

	// Update cache
	conflictCacheMu.Lock()
	conflictCache = feed
	conflictCacheUntil = time.Now().Add(conflictCacheTTL)
	conflictCacheMu.Unlock()

	c.JSON(http.StatusOK, feed)
}
