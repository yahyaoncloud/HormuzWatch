package source

import (
	"context"
	"fmt"
	"time"

	"github.com/mmcdole/gofeed"
)

// RSSSource fetches articles from an RSS/Atom feed.
type RSSSource struct {
	sourceName string
	feedURL    string
	language   string
	country    string
}

// NewRSSSource creates a named RSS source.
func NewRSSSource(name, url, language, country string) *RSSSource {
	return &RSSSource{
		sourceName: name,
		feedURL:    url,
		language:   language,
		country:    country,
	}
}

func (s *RSSSource) Name() string { return s.sourceName }
func (s *RSSSource) Type() Type   { return TypeRSS }

func (s *RSSSource) Fetch(ctx context.Context) ([]RawArticle, error) {
	fp := gofeed.NewParser()
	feed, err := fp.ParseURLWithContext(s.feedURL, ctx)
	if err != nil {
		return nil, fmt.Errorf("rss fetch %s: %w", s.sourceName, err)
	}

	articles := make([]RawArticle, 0, len(feed.Items))
	for _, item := range feed.Items {
		pubDate := time.Now()
		if item.PublishedParsed != nil {
			pubDate = *item.PublishedParsed
		}

		content := item.Description
		if item.Content != "" {
			content = item.Content
		}

		articles = append(articles, RawArticle{
			URL:         item.Link,
			Title:       item.Title,
			Content:     content,
			PublishedAt: pubDate,
			SourceName:  s.sourceName,
			SourceType:  TypeRSS,
			Language:    s.language,
			Country:     s.country,
			Metadata: map[string]any{
				"feed_url":      s.feedURL,
				"categories":    item.Categories,
				"guid":          item.GUID,
				"author":        item.Author,
			},
		})
	}
	return articles, nil
}

func (s *RSSSource) Validate(a RawArticle) error {
	if a.URL == "" {
		return fmt.Errorf("rss: url is empty for %s", s.sourceName)
	}
	return nil
}
