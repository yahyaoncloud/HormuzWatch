package scheduler

import (
	"context"
	"log/slog"
	"sync"
	"time"
)

// Job is a function executed on a schedule.
type Job struct {
	Name     string
	Interval time.Duration
	Fn       func(ctx context.Context) error
}

// Scheduler runs named jobs at fixed intervals.
type Scheduler struct {
	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup
	jobs   []Job
}

// New creates a scheduler with a background context.
func New() *Scheduler {
	ctx, cancel := context.WithCancel(context.Background())
	return &Scheduler{ctx: ctx, cancel: cancel}
}

// AddJob registers a periodic job. Must be called before Start.
func (s *Scheduler) AddJob(name string, interval time.Duration, fn func(ctx context.Context) error) {
	s.jobs = append(s.jobs, Job{Name: name, Interval: interval, Fn: fn})
}

// Start begins executing all registered jobs. Each runs once immediately,
// then repeats at its configured interval.
func (s *Scheduler) Start() {
	for _, job := range s.jobs {
		s.wg.Add(1)
		go s.runJob(job)
	}
	slog.Info("scheduler started", "jobs", len(s.jobs))
}

// Stop cancels all running jobs and waits for them to finish.
func (s *Scheduler) Stop() {
	s.cancel()
	s.wg.Wait()
	slog.Info("scheduler stopped")
}

func (s *Scheduler) runJob(job Job) {
	defer s.wg.Done()

	// Run once immediately
	if err := job.Fn(s.ctx); err != nil {
		slog.Error("scheduler job error", "job", job.Name, "error", err)
	}

	ticker := time.NewTicker(job.Interval)
	defer ticker.Stop()

	for {
		select {
		case <-s.ctx.Done():
			return
		case <-ticker.C:
			if err := job.Fn(s.ctx); err != nil {
				slog.Error("scheduler job error", "job", job.Name, "error", err)
			}
		}
	}
}
