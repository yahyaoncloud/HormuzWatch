package source

import (
	"context"
	"time"
)

// Type identifies the connection method for a source.
type Type string

const (
	TypeRSS     Type = "rss"
	TypeAPI     Type = "api"
	TypeScraper Type = "scraper"
)

// RawArticle is the canonical pre-processing article produced by any source.
type RawArticle struct {
	URL         string
	Title       string
	Content     string    // raw HTML or plain text, depending on source
	PublishedAt time.Time
	SourceName  string
	SourceType  Type
	Language    string         // hint, may be empty
	Country     string         // ISO 3166-1 alpha-2
	Metadata    map[string]any // source-specific extras
}

// Source is the interface every news collector must implement.
type Source interface {
	// Name returns the human-readable source identifier (e.g. "WAM").
	Name() string
	// Type returns the connection method.
	Type() Type
	// Fetch retrieves articles since the last successful fetch.
	// The context carries a deadline; implementations must honour it.
	Fetch(ctx context.Context) ([]RawArticle, error)
	// Validate checks that a fetched article has the required fields.
	Validate(article RawArticle) error
}
