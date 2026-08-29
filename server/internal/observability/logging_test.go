package observability

import (
	"bytes"
	"context"
	"log/slog"
	"os"
	"strings"
	"testing"
	"time"
)

func TestColorConsoleHandler(t *testing.T) {
	var buf bytes.Buffer
	handler := NewColorConsoleHandler(&buf, &slog.HandlerOptions{Level: slog.LevelDebug})
	logger := slog.New(handler)

	logger.Info("server booting up", "port", 10020, "host", "0.0.0.0", "tls", false)
	logger.Warn("slow database query", "duration", 250*time.Millisecond)
	logger.Error("connection dropped", "err", "timeout", "retries", 3)
	logger.Debug("tracing payload", "bytes", 1024)

	output := buf.String()
	if !strings.Contains(output, "[INFO ]") {
		t.Errorf("expected [INFO ] in output, got: %s", output)
	}
	if !strings.Contains(output, "[WARN ]") {
		t.Errorf("expected [WARN ] in output, got: %s", output)
	}
	if !strings.Contains(output, "[ERROR]") {
		t.Errorf("expected [ERROR] in output, got: %s", output)
	}
	if !strings.Contains(output, "[DEBUG]") {
		t.Errorf("expected [DEBUG] in output, got: %s", output)
	}
	if !strings.Contains(output, "port=") {
		t.Errorf("expected port= attribute in output, got: %s", output)
	}
}

func TestColorConsoleHandlerWithGroup(t *testing.T) {
	var buf bytes.Buffer
	handler := NewColorConsoleHandler(&buf, &slog.HandlerOptions{Level: slog.LevelInfo})
	logger := slog.New(handler).WithGroup("http")

	logger.Info("request completed", "status", 200, "path", "/api/v1/tracks")
	output := buf.String()
	if !strings.Contains(output, "http.status=") {
		t.Errorf("expected grouped attribute http.status=, got: %s", output)
	}
}

func TestInitLogging(t *testing.T) {
	os.Setenv("LOG_FORMAT", "color")
	os.Setenv("LOG_LEVEL", "debug")
	defer os.Unsetenv("LOG_FORMAT")
	defer os.Unsetenv("LOG_LEVEL")

	logger := InitLogging()
	if logger == nil {
		t.Fatal("expected InitLogging to return a valid logger")
	}
	if !logger.Enabled(context.Background(), slog.LevelDebug) {
		t.Errorf("expected debug level to be enabled")
	}
}
