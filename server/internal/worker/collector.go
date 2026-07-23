package worker

import (
	"context"
	"log/slog"
	"time"

	"Geospatial-harmuz-watch/server/internal/intelligence/source"
)

// Collector runs a single source through a fetch→validate→return cycle.
// It is intended to be submitted as a Task to a Pool.
type Collector struct {
	pool *Pool
}

// NewCollector creates a collector backed by the given pool.
func NewCollector(pool *Pool) *Collector {
	return &Collector{pool: pool}
}

// CollectResult holds the output of a single collection run.
type CollectResult struct {
	SourceName  string
	Articles    []source.RawArticle
	Errors      []error
	Duration    time.Duration
	FetchedAt   time.Time
}

// Collect runs fetch + validate for the given source and returns the result.
// This is a synchronous operation; call it inside a pool Task for async execution.
func (c *Collector) Collect(ctx context.Context, src source.Source) CollectResult {
	start := time.Now()
	result := CollectResult{
		SourceName: src.Name(),
		FetchedAt:  start,
	}

	slog.Debug("collecting from source", "source", src.Name(), "type", string(src.Type()))

	articles, err := src.Fetch(ctx)
	if err != nil {
		result.Errors = append(result.Errors, err)
		result.Duration = time.Since(start)
		return result
	}

	// Validate each article; drop invalid ones
	for _, a := range articles {
		if err := src.Validate(a); err != nil {
			result.Errors = append(result.Errors, err)
			continue
		}
		result.Articles = append(result.Articles, a)
	}

	result.Duration = time.Since(start)
	slog.Info("collection complete",
		"source", src.Name(),
		"articles", len(result.Articles),
		"errors", len(result.Errors),
		"duration_ms", result.Duration.Milliseconds(),
	)
	return result
}
