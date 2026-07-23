package worker

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// Task represents a unit of work submitted to the pool.
type Task struct {
	ID   string
	Fn   func(ctx context.Context) error
	Desc string // human-readable label for logging
}

// Pool manages a bounded set of goroutines executing tasks with rate limiting.
type Pool struct {
	workers   int
	queueSize int
	taskQueue chan Task
	rateLimit *rate.Limiter
	sem       chan struct{} // concurrency limiter

	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup
}

// Config controls pool sizing and rate limiting.
type Config struct {
	Workers   int           // number of worker goroutines (default 4)
	QueueSize int           // buffered channel capacity (default 64)
	RateLimit float64       // max tasks per second (0 = unlimited)
	RateBurst int           // burst size for rate limiter
}

// NewPool creates a worker pool with the given config.
func NewPool(cfg Config) *Pool {
	if cfg.Workers <= 0 {
		cfg.Workers = 4
	}
	if cfg.QueueSize <= 0 {
		cfg.QueueSize = 64
	}
	if cfg.RateBurst <= 0 {
		cfg.RateBurst = cfg.Workers
	}

	ctx, cancel := context.WithCancel(context.Background())

	p := &Pool{
		workers:   cfg.Workers,
		queueSize: cfg.QueueSize,
		taskQueue: make(chan Task, cfg.QueueSize),
		sem:       make(chan struct{}, cfg.Workers),
		ctx:       ctx,
		cancel:    cancel,
	}

	if cfg.RateLimit > 0 {
		p.rateLimit = rate.NewLimiter(rate.Limit(cfg.RateLimit), cfg.RateBurst)
	}

	return p
}

// Start launches the worker goroutines. Call once.
func (p *Pool) Start() {
	for i := 0; i < p.workers; i++ {
		p.wg.Add(1)
		go p.worker(i)
	}
	slog.Info("worker pool started", "workers", p.workers, "queue_size", p.queueSize)
}

// Submit enqueues a task. Returns false if the pool is shut down or the queue
// is full (non-blocking).
func (p *Pool) Submit(task Task) bool {
	select {
	case <-p.ctx.Done():
		return false
	case p.taskQueue <- task:
		return true
	default:
		slog.Warn("worker pool queue full", "task", task.ID)
		return false
	}
}

// Shutdown stops accepting new tasks and waits for running tasks to finish.
func (p *Pool) Shutdown(timeout time.Duration) error {
	p.cancel()

	done := make(chan struct{})
	go func() {
		p.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		return nil
	case <-time.After(timeout):
		slog.Warn("worker pool shutdown timed out")
		return context.DeadlineExceeded
	}
}

// Metrics returns current pool stats.
func (p *Pool) Metrics() (queueDepth, activeWorkers int) {
	return len(p.taskQueue), len(p.sem)
}

func (p *Pool) worker(id int) {
	defer p.wg.Done()

	for {
		select {
		case <-p.ctx.Done():
			return
		case task, ok := <-p.taskQueue:
			if !ok {
				return
			}
			p.execute(id, task)
		}
	}
}

func (p *Pool) execute(workerID int, task Task) {
	// Acquire semaphore slot
	select {
	case p.sem <- struct{}{}:
	case <-p.ctx.Done():
		return
	}
	defer func() { <-p.sem }()

	// Rate limit if configured
	if p.rateLimit != nil {
		if err := p.rateLimit.Wait(p.ctx); err != nil {
			return
		}
	}

	// Create a task-scoped context with deadline
	ctx, cancel := context.WithTimeout(p.ctx, 30*time.Second)
	defer cancel()

	start := time.Now()
	if err := task.Fn(ctx); err != nil {
		slog.Error("task failed",
			"task", task.ID,
			"desc", task.Desc,
			"duration_ms", time.Since(start).Milliseconds(),
			"error", err,
		)
		return
	}

	slog.Debug("task completed",
		"task", task.ID,
		"desc", task.Desc,
		"duration_ms", time.Since(start).Milliseconds(),
	)
}
