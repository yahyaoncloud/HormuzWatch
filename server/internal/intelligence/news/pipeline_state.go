package news

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"
)

// ── Article pipeline state ──────────────────────────────────────────

// ArticleState represents the lifecycle stage of an article in the pipeline.
type ArticleState string

const (
	StateQueued        ArticleState = "QUEUED"
	StateFetching      ArticleState = "FETCHING"
	StateFetched       ArticleState = "FETCHED"
	StateProcessing    ArticleState = "PROCESSING"
	StateScored        ArticleState = "SCORED"
	StateGeocoded      ArticleState = "GEOCODED"
	StateStored        ArticleState = "STORED"
	StateDone          ArticleState = "DONE"
	StateFetchFailed   ArticleState = "FETCH_FAILED"
	StateProcessFailed ArticleState = "PROCESS_FAILED"
	StateDuplicate     ArticleState = "DUPLICATE"
	StateSkipped       ArticleState = "SKIPPED"
)

// ValidTransitions maps each state to the allowed next states.
var ValidTransitions = map[ArticleState][]ArticleState{
	StateQueued:        {StateFetching, StateProcessing, StateSkipped},
	StateFetching:      {StateFetched, StateFetchFailed},
	StateFetched:       {StateProcessing, StateDuplicate, StateSkipped},
	StateProcessing:    {StateScored, StateProcessFailed},
	StateScored:        {StateGeocoded},
	StateGeocoded:      {StateStored, StateProcessFailed},
	StateStored:        {StateDone},
	StateDone:          {},                        // terminal
	StateFetchFailed:   {StateQueued},             // retry
	StateProcessFailed: {StateQueued, StateProcessing}, // retry
	StateDuplicate:     {},                        // terminal
	StateSkipped:       {},                        // terminal
}

// TerminalStates are states from which no further progress is expected.
var TerminalStates = map[ArticleState]bool{
	StateDone:      true,
	StateDuplicate: true,
	StateSkipped:   true,
}

// ── Source pipeline state ───────────────────────────────────────────

// SourceState represents the lifecycle of a source-level fetch operation.
type SourceState string

const (
	SourceIdle       SourceState = "IDLE"
	SourceFetching   SourceState = "FETCHING"
	SourceFetched    SourceState = "FETCHED"
	SourceProcessing SourceState = "PROCESSING"
	SourceDone       SourceState = "DONE"
	SourceError      SourceState = "ERROR"
)

// ── State tracker ───────────────────────────────────────────────────

// Tracker holds the current state of each article and source in the pipeline.
// All methods are safe for concurrent use.
type Tracker struct {
	mu sync.RWMutex

	// Per-article tracking (keyed by article ID).
	articles map[string]*ArticleRecord

	// Per-source tracking (keyed by source name).
	sources map[string]*SourceRecord

	// Atomic counters for quick dashboard metrics.
	articlesTotal     atomic.Int64
	articlesDone      atomic.Int64
	articlesFailed    atomic.Int64
	articlesDuplicate atomic.Int64
	sourcesActive     atomic.Int64
	sourcesErrored    atomic.Int64
}

// ArticleRecord holds the full state history of a single article.
type ArticleRecord struct {
	ID         string
	SourceName string
	State      ArticleState
	EnteredAt  time.Time
	History    []StateTransition
}

// SourceRecord holds the state of a single source.
type SourceRecord struct {
	Name    string
	State   SourceState
	LastRun time.Time
	Errors  int
}

// StateTransition records a single state change for auditability.
type StateTransition struct {
	From      ArticleState `json:"from"`
	To        ArticleState `json:"to"`
	At        time.Time    `json:"at"`
	Detail    string       `json:"detail,omitempty"`
	LatencyMs int64        `json:"latency_ms,omitempty"`
}

// NewTracker creates a new pipeline state tracker.
func NewTracker() *Tracker {
	return &Tracker{
		articles: make(map[string]*ArticleRecord),
		sources:  make(map[string]*SourceRecord),
	}
}

// ── Article state transitions ────────────────────────────────────────

// TransitionArticle moves an article from its current state to the target state.
// Returns an error if the transition is invalid.
func (t *Tracker) TransitionArticle(articleID, sourceName string, to ArticleState, detail string) error {
	t.mu.Lock()
	defer t.mu.Unlock()

	rec, exists := t.articles[articleID]
	if !exists {
		rec = &ArticleRecord{
			ID:         articleID,
			SourceName: sourceName,
			State:      StateQueued,
			EnteredAt:  time.Now(),
		}
		t.articles[articleID] = rec
		t.articlesTotal.Add(1)
	}

	// Validate transition
	from := rec.State
	allowed := ValidTransitions[from]
	valid := false
	for _, s := range allowed {
		if s == to {
			valid = true
			break
		}
	}
	if !valid && from != to {
		slog.Warn("invalid state transition",
			"article", articleID,
			"from", from,
			"to", to,
		)
		// Don't block the pipeline on state validation — just log.
	}

	latency := time.Since(rec.EnteredAt).Milliseconds()

	transition := StateTransition{
		From:      from,
		To:        to,
		At:        time.Now(),
		Detail:    detail,
		LatencyMs: latency,
	}

	rec.State = to
	rec.EnteredAt = transition.At
	rec.History = append(rec.History, transition)

	// Update terminal counters
	switch to {
	case StateDone:
		t.articlesDone.Add(1)
	case StateFetchFailed, StateProcessFailed:
		t.articlesFailed.Add(1)
	case StateDuplicate:
		t.articlesDuplicate.Add(1)
	}

	slog.Debug("article state transition",
		"article", articleID,
		"source", sourceName,
		"from", from,
		"to", to,
		"latency_ms", latency,
	)

	return nil
}

// GetArticleRecord returns the state record for an article.
func (t *Tracker) GetArticleRecord(id string) (*ArticleRecord, bool) {
	t.mu.RLock()
	defer t.mu.RUnlock()
	rec, ok := t.articles[id]
	return rec, ok
}

// ── Source state transitions ─────────────────────────────────────────

// TransitionSource moves a source to a new state.
func (t *Tracker) TransitionSource(name string, to SourceState) {
	t.mu.Lock()
	defer t.mu.Unlock()

	rec, exists := t.sources[name]
	if !exists {
		rec = &SourceRecord{Name: name, State: SourceIdle}
		t.sources[name] = rec
	}

	rec.State = to
	rec.LastRun = time.Now()

	switch to {
	case SourceFetching:
		t.sourcesActive.Add(1)
	case SourceDone, SourceIdle:
		t.sourcesActive.Add(-1)
	case SourceError:
		t.sourcesErrored.Add(1)
		rec.Errors++
	}

	slog.Debug("source state transition",
		"source", name,
		"to", to,
		"errors", rec.Errors,
	)
}

// GetSourceRecord returns the state record for a source.
func (t *Tracker) GetSourceRecord(name string) (*SourceRecord, bool) {
	t.mu.RLock()
	defer t.mu.RUnlock()
	rec, ok := t.sources[name]
	return rec, ok
}

// ── Metrics / health ─────────────────────────────────────────────────

// PipelineMetrics returns a snapshot of current pipeline health.
type PipelineMetrics struct {
	ArticlesTotal     int64                  `json:"articles_total"`
	ArticlesDone      int64                  `json:"articles_done"`
	ArticlesFailed    int64                  `json:"articles_failed"`
	ArticlesDuplicate int64                  `json:"articles_duplicate"`
	ArticlesInFlight  int64                  `json:"articles_in_flight"`
	SourcesTotal      int                    `json:"sources_total"`
	SourcesActive     int64                  `json:"sources_active"`
	SourcesErrored    int64                  `json:"sources_errored"`
	SourceStates      map[string]string      `json:"source_states"`
	StateCounts       map[ArticleState]int64 `json:"state_counts"`
	Uptime            string                 `json:"uptime"`
}

// Metrics returns a health snapshot of the pipeline.
func (t *Tracker) Metrics() PipelineMetrics {
	t.mu.RLock()
	defer t.mu.RUnlock()

	m := PipelineMetrics{
		ArticlesTotal:     t.articlesTotal.Load(),
		ArticlesDone:      t.articlesDone.Load(),
		ArticlesFailed:    t.articlesFailed.Load(),
		ArticlesDuplicate: t.articlesDuplicate.Load(),
		SourcesTotal:      len(t.sources),
		SourcesActive:     t.sourcesActive.Load(),
		SourcesErrored:    t.sourcesErrored.Load(),
		SourceStates:      make(map[string]string),
		StateCounts:       make(map[ArticleState]int64),
	}

	// Count articles per state
	for _, rec := range t.articles {
		m.StateCounts[rec.State]++
	}

	// Capture source states
	for name, rec := range t.sources {
		m.SourceStates[name] = string(rec.State)
	}

	m.ArticlesInFlight = m.ArticlesTotal - m.ArticlesDone - m.ArticlesFailed - m.ArticlesDuplicate

	return m
}

// ── Global singleton ─────────────────────────────────────────────────

var globalTracker = NewTracker()

// Track returns the global pipeline tracker.
func Track() *Tracker {
	return globalTracker
}

// ── Convenience helpers ──────────────────────────────────────────────

// ArticleStateName returns a human-readable label for a state.
func (s ArticleState) String() string { return string(s) }

// IsTerminal returns true when the state represents completion or permanent stop.
func (s ArticleState) IsTerminal() bool { return TerminalStates[s] }

// SourceStateName returns a human-readable label for a source state.
func (s SourceState) String() string { return string(s) }

// FormatTransition formats a state transition for logging.
func FormatTransition(articleID, sourceName string, from, to ArticleState, detail string) string {
	if detail != "" {
		return fmt.Sprintf("[%s] %s → %s (%s)", articleID, from, to, detail)
	}
	return fmt.Sprintf("[%s] %s → %s", articleID, from, to)
}

// ── Eviction ─────────────────────────────────────────────────────────

// EvictOldArticles removes article records older than the given duration.
// Only terminal-state articles are evicted. Returns count of removed records.
func (t *Tracker) EvictOldArticles(maxAge time.Duration) int {
	t.mu.Lock()
	defer t.mu.Unlock()

	cutoff := time.Now().Add(-maxAge)
	removed := 0
	for id, rec := range t.articles {
		if rec.State.IsTerminal() && rec.EnteredAt.Before(cutoff) {
			delete(t.articles, id)
			removed++
		}
	}
	if removed > 0 {
		slog.Debug("tracker evicted old articles", "removed", removed, "remaining", len(t.articles))
	}
	return removed
}

// StartEvictionLoop runs periodic eviction of terminal-state articles.
// Call as a goroutine. Stops when ctx is cancelled.
func (t *Tracker) StartEvictionLoop(ctx context.Context, interval, maxAge time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			t.EvictOldArticles(maxAge)
		}
	}
}
