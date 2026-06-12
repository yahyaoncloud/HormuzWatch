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

func fetchFeeds(fp *gofeed.Parser, feeds []struct{url string; name string}) {
	log.Println("Fetching intelligence news feeds...")
	
	for _, f := range feeds {
		feed, err := fp.ParseURL(f.url)
		if err != nil {
			log.Printf("Failed to parse RSS %s: %v", f.name, err)
			continue
		}

		for _, item := range feed.Items {
			id := generateID(item.Link)
			pubDate := item.PublishedParsed
			if pubDate == nil {
				now := time.Now()
				pubDate = &now
			}

			// Insert or ignore into PostgreSQL
			query := `
			INSERT INTO news (id, title, link, pub_date, source, summary)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT(id) DO NOTHING;
			`
			
			summary := item.Description
			// Basic cleanup if description is too long or contains HTML, but we keep it simple for now
			if len(summary) > 500 {
				summary = summary[:497] + "..."
			}

			_, err := db.Exec(query, id, item.Title, item.Link, *pubDate, f.name, summary)
			if err != nil {
				log.Printf("Failed to insert news item: %v", err)
			}
		}
	}
	log.Println("Completed fetching news feeds.")
}

func generateID(link string) string {
	hash := sha256.Sum256([]byte(link))
	return hex.EncodeToString(hash[:])
}
