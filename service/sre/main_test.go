package main

import (
	"strings"
	"testing"
)

func TestColorizeLogLineJSON(t *testing.T) {
	raw := `server-1 | {"time":"2026-08-29T18:00:00Z","level":"info","msg":"serving request","status":200,"latency":"4.2ms","path":"/api/tracks"}`
	formatted, ok := colorizeLogLine(raw, 0, "")
	if !ok {
		t.Fatalf("expected log line to be processed successfully")
	}
	if !strings.Contains(formatted, "[SERVER]") {
		t.Errorf("expected [SERVER] badge in output, got: %s", formatted)
	}
	if !strings.Contains(formatted, "[INFO ]") {
		t.Errorf("expected [INFO ] in output, got: %s", formatted)
	}
	if !strings.Contains(formatted, "serving request") {
		t.Errorf("expected msg in output, got: %s", formatted)
	}
}

func TestColorizeLogLineText(t *testing.T) {
	raw := `ml-1 | 2026-08-29 18:00:00 [INFO] hormuzwatch.app: model loaded latency=12ms`
	formatted, ok := colorizeLogLine(raw, 0, "")
	if !ok {
		t.Fatalf("expected log line to be processed")
	}
	if !strings.Contains(formatted, "[ML-SVC]") {
		t.Errorf("expected [ML-SVC] badge, got: %s", formatted)
	}
}

func TestColorizeLogLineFilter(t *testing.T) {
	raw := `server-1 | {"level":"debug","msg":"debug trace"}`
	// minLevelRank 3 is warn
	_, ok := colorizeLogLine(raw, 3, "")
	if ok {
		t.Errorf("expected debug log to be filtered out when minLevel is warn")
	}

	// service filter
	_, ok = colorizeLogLine(raw, 0, "client")
	if ok {
		t.Errorf("expected server log to be filtered out when service filter is client")
	}
}
