package worker

import (
	"fmt"
	"strconv"
	"time"
)

// Backoff provides bounded exponential delays for upstream providers.
type Backoff struct {
	initial time.Duration
	max     time.Duration
	next    time.Duration
}

// NewBackoff creates a retry backoff with the given bounds.
func NewBackoff(initial, max time.Duration) *Backoff {
	return &Backoff{initial: initial, max: max, next: initial}
}

// Reset puts the backoff state back to the initial delay.
func (b *Backoff) Reset() {
	b.next = b.initial
}

// Next returns the next delay. If retryAfter is a valid number of seconds
// (from a Retry-After response header), that value is used (capped at max).
// Otherwise the exponential backoff is applied.
func (b *Backoff) Next(retryAfter string) time.Duration {
	if seconds, err := strconv.Atoi(retryAfter); err == nil && seconds > 0 {
		delay := time.Duration(seconds) * time.Second
		if delay > b.max {
			delay = b.max
		}
		return delay
	}

	delay := b.next
	b.next *= 2
	if b.next > b.max {
		b.next = b.max
	}
	return delay
}

// String returns a human-readable description.
func (b *Backoff) String() string {
	return fmt.Sprintf("backoff(initial=%s, max=%s, next=%s)", b.initial, b.max, b.next)
}
