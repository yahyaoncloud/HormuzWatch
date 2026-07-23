package scheduler

import (
	"context"
	"time"

	"Geospatial-harmuz-watch/server/internal/db"
	"Geospatial-harmuz-watch/server/internal/intelligence/news"
	"Geospatial-harmuz-watch/server/internal/intelligence/source"
	"Geospatial-harmuz-watch/server/internal/worker"
)

// DefaultJobs returns the standard collection and maintenance jobs.
func DefaultJobs(reg *source.Registry, pool *worker.Pool, collector *worker.Collector) []struct {
	Name     string
	Interval time.Duration
	Fn       func(context.Context) error
} {
	return []struct {
		Name     string
		Interval time.Duration
		Fn       func(context.Context) error
	}{
		{
			Name:     "rss-refresh",
			Interval: 15 * time.Minute,
			Fn: func(ctx context.Context) error {
				return collectAllByType(ctx, reg, pool, collector, source.TypeRSS)
			},
		},
		{
			Name:     "api-refresh",
			Interval: 30 * time.Minute,
			Fn: func(ctx context.Context) error {
				return collectAllByType(ctx, reg, pool, collector, source.TypeAPI)
			},
		},
	}
}

func collectAllByType(ctx context.Context, reg *source.Registry, pool *worker.Pool, collector *worker.Collector, st source.Type) error {
	for _, src := range reg.All() {
		if src.Type() != st {
			continue
		}
		src := src // capture
		ok := pool.Submit(worker.Task{
			ID:   "collect-" + src.Name(),
			Desc: "Collect from " + src.Name(),
			Fn: func(taskCtx context.Context) error {
				// ── Source state: IDLE → FETCHING ────────────
				tracker := news.Track()
				tracker.TransitionSource(src.Name(), news.SourceFetching)

				result := collector.Collect(taskCtx, src)
				worker.CollectionsRun.Add(1)
				worker.ArticlesFetched.Add(int64(len(result.Articles)))
				worker.ArticlesDropped.Add(int64(len(result.Errors)))

				if len(result.Errors) > 0 {
					tracker.TransitionSource(src.Name(), news.SourceError)
					db.MarkSourceError(src.Name(), result.Errors[0].Error())
				} else {
					tracker.TransitionSource(src.Name(), news.SourceFetched)
					db.MarkSourceFetched(src.Name())
				}

				// ── Source state: FETCHED → PROCESSING ───────
				tracker.TransitionSource(src.Name(), news.SourceProcessing)

				// ── Process and store each article ──────────
				srcID := src.Name()
				for _, article := range result.Articles {
					news.ProcessAndStore(taskCtx, article, srcID)
				}

				// ── Source state: PROCESSING → DONE ─────────
				tracker.TransitionSource(src.Name(), news.SourceDone)

				return nil
			},
		})
		if !ok {
			worker.TasksFailed.Add(1)
		}
	}
	return nil
}
