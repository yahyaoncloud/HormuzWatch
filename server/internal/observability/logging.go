package observability

import (
	"bytes"
	"context"
	"io"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

// ANSI color escape codes
const (
	ansiReset    = "\033[0m"
	ansiDim      = "\033[2m"
	ansiBold     = "\033[1m"
	ansiRed      = "\033[31m"
	ansiGreen    = "\033[32m"
	ansiYellow   = "\033[33m"
	ansiBlue     = "\033[34m"
	ansiMagenta  = "\033[35m"
	ansiCyan     = "\033[36m"
	ansiWhite    = "\033[37m"
	ansiBoldRed  = "\033[1;31m"
	ansiFatalRed = "\033[1;41;37m"
)

// InitLogging configures the structured logger for the application.
//   - LOG_FORMAT=json: emits JSON logs for aggregators (Grafana, Vector, Datadog)
//   - LOG_FORMAT=text: emits monochrome key=value pairs
//   - LOG_FORMAT=color (or unset in development): emits refined color-coded console logs
func InitLogging() *slog.Logger {
	level := slogLevel(os.Getenv("LOG_LEVEL"))
	opts := &slog.HandlerOptions{Level: level}

	format := strings.ToLower(strings.TrimSpace(os.Getenv("LOG_FORMAT")))
	env := strings.ToLower(strings.TrimSpace(os.Getenv("ENV")))

	var handler slog.Handler
	if format == "json" || (format == "" && env == "production") {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else if format == "text" {
		handler = slog.NewTextHandler(os.Stdout, opts)
	} else {
		// Default to rich color console handler
		handler = NewColorConsoleHandler(os.Stdout, opts)
	}

	logger := slog.New(handler)
	slog.SetDefault(logger)
	return logger
}

func slogLevel(s string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// ColorConsoleHandler is a slog.Handler that formats log records with ANSI colors.
type ColorConsoleHandler struct {
	opts     slog.HandlerOptions
	writer   io.Writer
	mu       *sync.Mutex
	attrs    []slog.Attr
	groups   []string
	useColor bool
}

// NewColorConsoleHandler creates a new color-coded console handler.
func NewColorConsoleHandler(w io.Writer, opts *slog.HandlerOptions) *ColorConsoleHandler {
	if opts == nil {
		opts = &slog.HandlerOptions{Level: slog.LevelInfo}
	}
	useColor := isColorSupported()

	return &ColorConsoleHandler{
		opts:     *opts,
		writer:   w,
		mu:       &sync.Mutex{},
		useColor: useColor,
	}
}

func isColorSupported() bool {
	if os.Getenv("NO_COLOR") != "" {
		return false
	}
	if os.Getenv("FORCE_COLOR") != "" {
		return true
	}
	return true
}

func (h *ColorConsoleHandler) Enabled(_ context.Context, level slog.Level) bool {
	minLevel := slog.LevelInfo
	if h.opts.Level != nil {
		minLevel = h.opts.Level.Level()
	}
	return level >= minLevel
}

func (h *ColorConsoleHandler) Handle(_ context.Context, r slog.Record) error {
	var buf bytes.Buffer

	// 1. Timestamp (dim)
	timestamp := r.Time
	if timestamp.IsZero() {
		timestamp = time.Now()
	}
	timeStr := timestamp.Format("15:04:05.000")
	if h.useColor {
		buf.WriteString(ansiDim + timeStr + ansiReset)
	} else {
		buf.WriteString(timeStr)
	}
	buf.WriteByte(' ')

	// 2. Level Badge
	buf.WriteString(h.formatLevel(r.Level))
	buf.WriteByte(' ')

	// 3. Message (bold)
	if h.useColor {
		buf.WriteString(ansiBold + r.Message + ansiReset)
	} else {
		buf.WriteString(r.Message)
	}

	// 4. Pre-configured and record attributes
	allAttrs := make([]slog.Attr, 0, len(h.attrs)+r.NumAttrs())
	allAttrs = append(allAttrs, h.attrs...)
	r.Attrs(func(a slog.Attr) bool {
		allAttrs = append(allAttrs, a)
		return true
	})

	if len(allAttrs) > 0 {
		groupPrefix := ""
		if len(h.groups) > 0 {
			groupPrefix = strings.Join(h.groups, ".") + "."
		}
		for _, a := range allAttrs {
			buf.WriteByte(' ')
			h.formatAttr(&buf, groupPrefix, a)
		}
	}

	buf.WriteByte('\n')

	h.mu.Lock()
	defer h.mu.Unlock()
	_, err := h.writer.Write(buf.Bytes())
	return err
}

func (h *ColorConsoleHandler) formatLevel(level slog.Level) string {
	if !h.useColor {
		switch {
		case level < slog.LevelInfo:
			return "[DEBUG]"
		case level < slog.LevelWarn:
			return "[INFO ]"
		case level < slog.LevelError:
			return "[WARN ]"
		case level < slog.LevelError+4:
			return "[ERROR]"
		default:
			return "[FATAL]"
		}
	}

	switch {
	case level < slog.LevelInfo:
		return ansiCyan + "[DEBUG]" + ansiReset
	case level < slog.LevelWarn:
		return ansiGreen + "[INFO ]" + ansiReset
	case level < slog.LevelError:
		return ansiYellow + "[WARN ]" + ansiReset
	case level < slog.LevelError+4:
		return ansiRed + "[ERROR]" + ansiReset
	default:
		return ansiFatalRed + "[FATAL]" + ansiReset
	}
}

func (h *ColorConsoleHandler) formatAttr(buf *bytes.Buffer, groupPrefix string, a slog.Attr) {
	if a.Equal(slog.Attr{}) {
		return
	}

	key := groupPrefix + a.Key
	val := a.Value.Resolve()

	if val.Kind() == slog.KindGroup {
		groupAttrs := val.Group()
		if len(groupAttrs) == 0 {
			return
		}
		for i, ga := range groupAttrs {
			if i > 0 {
				buf.WriteByte(' ')
			}
			h.formatAttr(buf, key+".", ga)
		}
		return
	}

	// Format key in dim/cyan
	if h.useColor {
		buf.WriteString(ansiDim + ansiCyan + key + "=" + ansiReset)
	} else {
		buf.WriteString(key + "=")
	}

	// Format value with semantic color coding
	h.formatValue(buf, key, val)
}

func (h *ColorConsoleHandler) formatValue(buf *bytes.Buffer, key string, val slog.Value) {
	valStr := val.String()

	if !h.useColor {
		if val.Kind() == slog.KindString {
			buf.WriteString(strconv.Quote(valStr))
		} else {
			buf.WriteString(valStr)
		}
		return
	}

	isErrKey := strings.Contains(strings.ToLower(key), "err") || strings.Contains(strings.ToLower(key), "fail")

	switch val.Kind() {
	case slog.KindString:
		if isErrKey {
			buf.WriteString(ansiRed + strconv.Quote(valStr) + ansiReset)
		} else if strings.HasPrefix(valStr, "http") || strings.HasPrefix(valStr, "/") {
			buf.WriteString(ansiCyan + valStr + ansiReset)
		} else {
			buf.WriteString(ansiGreen + strconv.Quote(valStr) + ansiReset)
		}
	case slog.KindInt64, slog.KindUint64, slog.KindFloat64:
		buf.WriteString(ansiYellow + valStr + ansiReset)
	case slog.KindBool:
		if val.Bool() {
			buf.WriteString(ansiGreen + "true" + ansiReset)
		} else {
			buf.WriteString(ansiRed + "false" + ansiReset)
		}
	case slog.KindDuration:
		buf.WriteString(ansiYellow + valStr + ansiReset)
	case slog.KindTime:
		buf.WriteString(ansiDim + val.Time().Format(time.RFC3339) + ansiReset)
	default:
		if isErrKey {
			buf.WriteString(ansiRed + valStr + ansiReset)
		} else {
			buf.WriteString(ansiWhite + valStr + ansiReset)
		}
	}
}

func (h *ColorConsoleHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	newAttrs := make([]slog.Attr, len(h.attrs)+len(attrs))
	copy(newAttrs, h.attrs)
	copy(newAttrs[len(h.attrs):], attrs)

	return &ColorConsoleHandler{
		opts:     h.opts,
		writer:   h.writer,
		mu:       h.mu,
		attrs:    newAttrs,
		groups:   h.groups,
		useColor: h.useColor,
	}
}

func (h *ColorConsoleHandler) WithGroup(name string) slog.Handler {
	if name == "" {
		return h
	}
	newGroups := make([]string, len(h.groups)+1)
	copy(newGroups, h.groups)
	newGroups[len(h.groups)] = name

	return &ColorConsoleHandler{
		opts:     h.opts,
		writer:   h.writer,
		mu:       h.mu,
		attrs:    h.attrs,
		groups:   newGroups,
		useColor: h.useColor,
	}
}

