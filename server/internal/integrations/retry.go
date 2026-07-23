package integrations

import (
	"strconv"
	"time"
)

// retryBackoff provides bounded exponential delays for upstream providers.
// It is intentionally deterministic: provider APIs are easier to diagnose
// when the retry schedule can be reasoned about from logs.
type retryBackoff struct {
	initial time.Duration
	max     time.Duration
	next    time.Duration
}

func newRetryBackoff(initial, max time.Duration) *retryBackoff {
	return &retryBackoff{initial: initial, max: max, next: initial}
}

func (b *retryBackoff) Reset() {
	b.next = b.initial
}

// Next returns a server-directed delay when Retry-After is a valid number of
// seconds; otherwise it returns the next bounded exponential interval.
func (b *retryBackoff) Next(retryAfter string) time.Duration {
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
