// DEPRECATED: This legacy aggregator has been migrated into the unified
// intelligence pipeline (see internal/intelligence/source/gulf_sources.go
// and internal/intelligence/news/persist.go).
//
// All 5 feeds (Al Jazeera, USNI, DefenseNews, Maritime Executive, gCaptain)
// are now registered as pipeline sources and processed through the full
// 7-step ML pipeline with coordinate extraction and entity geocoding.
//
// This file is kept for reference only. Remove after verifying the unified
// pipeline produces equivalent or better results.
package integrations

import (
	"crypto/sha256"
	"encoding/hex"
	"log"
	"time"

	"Geospatial-harmuz-watch/server/internal/db"

	"github.com/mmcdole/gofeed"
)

// StartNewsAggregator starts a worker that fetches RSS feeds periodically
func StartNewsAggregator() {
	feeds := []struct {
		url  string
		name string
	}{
		{"https://www.aljazeera.com/xml/rss/all.xml", "Al Jazeera"},
		{"https://news.usni.org/feed", "USNI News"},
		{"https://www.defensenews.com/arc/outboundfeeds/rss/category/naval/", "DefenseNews"},
		{"https://www.maritime-executive.com/rss", "Maritime Executive"},
		{"https://gcaptain.com/feed/", "gCaptain Maritime"},
	}

	fp := gofeed.NewParser()
	ticker := time.NewTicker(15 * time.Minute)
	defer ticker.Stop()

	// Initial fetch
	fetchFeeds(fp, feeds)

	for {
		<-ticker.C
		fetchFeeds(fp, feeds)
	}
}

func fetchFeeds(fp *gofeed.Parser, feeds []struct{ url string; name string }) {
	log.Println("[news] Fetching live intelligence RSS feeds...")

	for _, f := range feeds {
		feed, err := fp.ParseURL(f.url)
		if err != nil {
			log.Printf("[news] Failed to parse RSS %s (%s): %v", f.name, f.url, err)
			continue
		}

		_ = db.UpsertSource(f.name, f.name, "rss", f.url, "Middle East", "en", 0.85)

		for _, item := range feed.Items {
			id := generateID(item.Link)
			pubDate := item.PublishedParsed
			if pubDate == nil {
				now := time.Now()
				pubDate = &now
			}

			summary := item.Description
			if len(summary) > 500 {
				summary = summary[:497] + "..."
			}

			// Insert into legacy news table
			_, _ = db.Exec(`
				INSERT INTO news (id, title, link, pub_date, source, summary)
				VALUES (?, ?, ?, ?, ?, ?)
				ON CONFLICT(id) DO NOTHING;
			`, id, item.Title, item.Link, *pubDate, f.name, summary)

			// Insert into enriched articles table
			_, _ = db.Exec(`
				INSERT INTO articles (id, source_id, title, url, summary, published_at, language, category, risk_score, country, lat, lon)
				VALUES (?, ?, ?, ?, ?, ?, 'en', 'Maritime Security', 65.0, 'Middle East', NULL, NULL)
				ON CONFLICT(id) DO NOTHING;
			`, id, f.name, item.Title, item.Link, summary, *pubDate)

			// Process and save directly to events table in database
			processAndSaveArticleToEvents(id, item.Title, summary, item.Link, *pubDate, f.name)
		}
	}
	log.Println("[news] Completed fetching live intelligence feeds.")
}

func processAndSaveArticleToEvents(id, title, summary, link string, pubDate time.Time, sourceName string) {
	text := strings.ToLower(title + " " + summary)

	lat, lon := 26.1, 55.9
	region := "Strait of Hormuz"
	if strings.Contains(text, "red sea") || strings.Contains(text, "houthi") || strings.Contains(text, "yemen") || strings.Contains(text, "bab") || strings.Contains(text, "hudaydah") {
		lat, lon = 14.5, 42.6
		region = "Red Sea"
	} else if strings.Contains(text, "oman") || strings.Contains(text, "muscat") || strings.Contains(text, "jask") || strings.Contains(text, "fujairah") {
		lat, lon = 24.5, 58.3
		region = "Gulf of Oman"
	} else if strings.Contains(text, "persian gulf") || strings.Contains(text, "aramco") || strings.Contains(text, "dammam") || strings.Contains(text, "kuwait") || strings.Contains(text, "qatar") || strings.Contains(text, "bahrain") {
		lat, lon = 27.2, 51.2
		region = "Persian Gulf"
	} else if strings.Contains(text, "aden") || strings.Contains(text, "arabian sea") || strings.Contains(text, "socotra") {
		lat, lon = 13.5, 50.5
		region = "Arabian Sea"
	}

	conflictType := "maritime"
	severity := "medium"
	if strings.Contains(text, "missile") || strings.Contains(text, "strike") || strings.Contains(text, "drone") || strings.Contains(text, "uav") || strings.Contains(text, "attack") || strings.Contains(text, "seized") || strings.Contains(text, "explosion") {
		severity = "critical"
		if strings.Contains(text, "drone") || strings.Contains(text, "uav") || strings.Contains(text, "air") {
			conflictType = "air"
		} else {
			conflictType = "naval"
		}
	} else if strings.Contains(text, "cyber") || strings.Contains(text, "jamming") || strings.Contains(text, "spoofing") || strings.Contains(text, "hack") {
		severity = "high"
		conflictType = "cyber"
	} else if strings.Contains(text, "pirate") || strings.Contains(text, "board") || strings.Contains(text, "skiff") {
		severity = "high"
		conflictType = "piracy"
	}

	_, _ = db.Exec(`
		INSERT INTO events (id, title, description, event_type, severity, lat, lon, country, start_time, source_article_ids)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (id) DO UPDATE SET
			title = EXCLUDED.title,
			description = EXCLUDED.description,
			severity = EXCLUDED.severity,
			lat = EXCLUDED.lat,
			lon = EXCLUDED.lon;
	`, id, title, summary, conflictType, severity, lat, lon, region, pubDate, "[\""+id+"\"]")
}

func generateID(link string) string {
	hash := sha256.Sum256([]byte(link))
	return hex.EncodeToString(hash[:])
}
