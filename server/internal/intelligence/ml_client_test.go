package intelligence

import (
	"testing"
	"time"
)

func TestCircuitBreaker_StateMachine(t *testing.T) {
	cb := newCircuitBreaker(3, 50*time.Millisecond)

	if cb.State() != "CLOSED" {
		t.Fatalf("Initial state should be CLOSED, got %s", cb.State())
	}
	if !cb.Allow() {
		t.Errorf("CLOSED circuit should allow calls")
	}

	// Report 2 failures (below threshold 3)
	cb.ReportFailure()
	cb.ReportFailure()
	if cb.State() != "CLOSED" {
		t.Errorf("Circuit should remain CLOSED after 2 failures, got %s", cb.State())
	}

	// 3rd failure -> trips to OPEN
	cb.ReportFailure()
	if cb.State() != "OPEN" {
		t.Fatalf("Circuit should trip to OPEN after 3 failures, got %s", cb.State())
	}

	// While OPEN and before reset timeout, Allow() should return false
	if cb.Allow() {
		t.Errorf("OPEN circuit should not allow calls immediately")
	}

	// Wait for reset timeout
	time.Sleep(80 * time.Millisecond)

	// Next Allow() should transition to HALF-OPEN
	if !cb.Allow() {
		t.Errorf("After timeout, circuit should allow canary probe")
	}
	if cb.State() != "HALF-OPEN" {
		t.Errorf("Circuit state should be HALF-OPEN during canary probe, got %s", cb.State())
	}

	// Successful canary probe resets circuit to CLOSED
	cb.ReportSuccess()
	if cb.State() != "CLOSED" {
		t.Errorf("Circuit should reset to CLOSED after successful canary probe, got %s", cb.State())
	}
}
