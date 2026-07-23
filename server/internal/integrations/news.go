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
		}
	}
	log.Println("[news] Completed fetching live intelligence feeds.")
}

func generateID(link string) string {
	hash := sha256.Sum256([]byte(link))
	return hex.EncodeToString(hash[:])
}
