package worker

import "sync/atomic"

// PoolMetrics tracks aggregate worker pool statistics.
var (
	TasksSubmitted  atomic.Int64
	TasksCompleted  atomic.Int64
	TasksFailed     atomic.Int64
	CollectionsRun  atomic.Int64
	ArticlesFetched atomic.Int64
	ArticlesDropped atomic.Int64
)
