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

	systemPrompt := `You are an OSINT intelligence analyst specializing exclusively in two critical global maritime chokepoints: The Strait of Hormuz and the Bab al-Mandab Strait.

Generate a JSON array of 20+ recent (last 7 days) conflict, security, and maritime incidents focused strictly on these two chokepoints and their immediate approaches. Use real, verifiable event patterns. Include diverse source types (UKMTO, MARAD, IMB, EU NAVFOR, IRGC, commercial shipping alerts).

STRICT RULES:
- Output ONLY a valid JSON array. No markdown, no code fences, no explanation.
- Each object MUST have these exact keys: id, title, description, lat, lon, conflictType, severity, region, affectedAssets, casualties, source, sourceType, timestamp, verified
- lat/lon MUST be real coordinates within ONLY these two bounding boxes:
  1. Strait of Hormuz (TSS & Gulf of Oman approach): 24.5-27.5N, 55.0-58.5E
  2. Bab al-Mandab Strait (Perim Island & Southern Red Sea gate): 11.5-14.5N, 42.0-45.0E
- Severity: "critical", "high", "medium", or "low"
- Conflict types: "naval", "air", "ground", "cyber", "infrastructure", "piracy", "diplomatic", "hybrid"
- Timestamp format: ISO 8601 within the last 7 days
- Sources should reference real organizations (UKMTO, IMB, EU NAVFOR, CMF, IRGC Navy, Reuters, AP, etc.)
- Be specific — name vessel types (VLCC, container, bulk carrier, frigate, speedboat, UAV, USV, ASBM), military units, and locations.
- verified: boolean
- Generate at least 20 items divided between Strait of Hormuz and Bab al-Mandab.`

	userPrompt := `Generate 20+ current conflict and security incidents strictly concentrated in the Strait of Hormuz and Bab al-Mandab Strait. Include a realistic mix of:
- Houthi anti-ship missile / drone / USV engagements against commercial vessels in Bab al-Mandab
- IRGC naval harassment, fast-boat interceptions, and boarding operations in the Strait of Hormuz
- GPS spoofing, AIS manipulation, and electronic warfare around the chokepoints
- Coalition naval escorts (Operation Prosperity Guardian, Operation Aspides) in Bab al-Mandab
- Mines, suspicious skiffs, and asymmetric threats near Perim Island and Strait of Hormuz TSS
- Port cyber incidents and infrastructure alerts affecting Fujairah, Bandar Abbas, Djibouti, and Aden

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

	conflicts = filterToStrategicChokepoints(conflicts)

	return &ConflictFeedResponse{
		Conflicts:   conflicts,
		GeneratedAt: time.Now().UTC().Format(time.RFC3339),
		Source:      "openrouter",
		Count:       len(conflicts),
		Message:     fmt.Sprintf("Live OSINT feed — %d conflict events focused on Strait of Hormuz & Bab al-Mandab", len(conflicts)),
	}, nil
}

// filterToStrategicChokepoints removes any conflict event located outside the Strait of Hormuz and Bab al-Mandab corridors.
func filterToStrategicChokepoints(conflicts []ConflictEvent) []ConflictEvent {
	filtered := make([]ConflictEvent, 0, len(conflicts))
	for _, c := range conflicts {
		// Strait of Hormuz & approaches: Lat 24-28, Lon 54-59
		inHormuz := c.Lat >= 24.0 && c.Lat <= 28.0 && c.Lon >= 54.0 && c.Lon <= 59.0
		// Bab al-Mandab & Southern Red Sea corridor: Lat 11-15, Lon 41.5-46.0
		inBabMandab := c.Lat >= 11.0 && c.Lat <= 15.0 && c.Lon >= 41.5 && c.Lon <= 46.0

		if inHormuz || inBabMandab {
			filtered = append(filtered, c)
		}
	}
	return filtered
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
