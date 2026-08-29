package observability

import (
	"expvar"
	"fmt"
	"net/http"
	"strings"
	"sync/atomic"

	"github.com/gin-gonic/gin"
)

// Runtime metrics exposed via expvar (standard library, no external dependency).
// These are consumed by the /debug/vars endpoint and can be scraped by Prometheus
// when a conversion adapter is added.

var (
	// Collection metrics
	CollectionsTotal   atomic.Int64
	CollectionsErrors  atomic.Int64

	// Pipeline metrics
	ObservationsProcessed atomic.Int64
	AnomaliesDetected     atomic.Int64

	// ML metrics
	MLPredictionsTotal atomic.Int64
	MLPredictionsFallback atomic.Int64

	// Hub metrics
	WebSocketClientsActive atomic.Int64

	// DB metrics
	DBWritesTotal atomic.Int64
	DBWriteErrors atomic.Int64
)

func init() {
	expvar.Publish("collections_total", expvar.Func(func() any { return CollectionsTotal.Load() }))
	expvar.Publish("collections_errors", expvar.Func(func() any { return CollectionsErrors.Load() }))
	expvar.Publish("observations_processed", expvar.Func(func() any { return ObservationsProcessed.Load() }))
	expvar.Publish("anomalies_detected", expvar.Func(func() any { return AnomaliesDetected.Load() }))
	expvar.Publish("ml_predictions_total", expvar.Func(func() any { return MLPredictionsTotal.Load() }))
	expvar.Publish("ml_predictions_fallback", expvar.Func(func() any { return MLPredictionsFallback.Load() }))
	expvar.Publish("ws_clients_active", expvar.Func(func() any { return WebSocketClientsActive.Load() }))
	expvar.Publish("db_writes_total", expvar.Func(func() any { return DBWritesTotal.Load() }))
	expvar.Publish("db_write_errors", expvar.Func(func() any { return DBWriteErrors.Load() }))
}

// MetricsHandler returns an HTTP handler for the /debug/vars endpoint.
// Uses expvar's built-in /debug/vars handler.
func MetricsHandler() http.Handler {
	return expvar.Handler()
}

// PrometheusHandler writes Prometheus text-format metrics.
func PrometheusHandler(c *gin.Context) {
	var b strings.Builder

	b.WriteString("# HELP hormuzwatch_collections_total Total telemetry collection cycles\n")
	b.WriteString("# TYPE hormuzwatch_collections_total counter\n")
	b.WriteString(fmt.Sprintf("hormuzwatch_collections_total %d\n", CollectionsTotal.Load()))

	b.WriteString("# HELP hormuzwatch_collections_errors Total telemetry collection errors\n")
	b.WriteString("# TYPE hormuzwatch_collections_errors counter\n")
	b.WriteString(fmt.Sprintf("hormuzwatch_collections_errors %d\n", CollectionsErrors.Load()))

	b.WriteString("# HELP hormuzwatch_observations_processed_total Total observations processed\n")
	b.WriteString("# TYPE hormuzwatch_observations_processed_total counter\n")
	b.WriteString(fmt.Sprintf("hormuzwatch_observations_processed_total %d\n", ObservationsProcessed.Load()))

	b.WriteString("# HELP hormuzwatch_anomalies_detected_total Total anomalies detected\n")
	b.WriteString("# TYPE hormuzwatch_anomalies_detected_total counter\n")
	b.WriteString(fmt.Sprintf("hormuzwatch_anomalies_detected_total %d\n", AnomaliesDetected.Load()))

	b.WriteString("# HELP hormuzwatch_ml_predictions_total Total ML inference requests\n")
	b.WriteString("# TYPE hormuzwatch_ml_predictions_total counter\n")
	b.WriteString(fmt.Sprintf("hormuzwatch_ml_predictions_total %d\n", MLPredictionsTotal.Load()))

	b.WriteString("# HELP hormuzwatch_ml_predictions_fallback_total Total ML fallback predictions\n")
	b.WriteString("# TYPE hormuzwatch_ml_predictions_fallback_total counter\n")
	b.WriteString(fmt.Sprintf("hormuzwatch_ml_predictions_fallback_total %d\n", MLPredictionsFallback.Load()))

	b.WriteString("# HELP hormuzwatch_ws_clients_active Currently connected WebSocket clients\n")
	b.WriteString("# TYPE hormuzwatch_ws_clients_active gauge\n")
	b.WriteString(fmt.Sprintf("hormuzwatch_ws_clients_active %d\n", WebSocketClientsActive.Load()))

	b.WriteString("# HELP hormuzwatch_db_writes_total Total database writes\n")
	b.WriteString("# TYPE hormuzwatch_db_writes_total counter\n")
	b.WriteString(fmt.Sprintf("hormuzwatch_db_writes_total %d\n", DBWritesTotal.Load()))

	b.WriteString("# HELP hormuzwatch_db_write_errors_total Total database write errors\n")
	b.WriteString("# TYPE hormuzwatch_db_write_errors_total counter\n")
	b.WriteString(fmt.Sprintf("hormuzwatch_db_write_errors_total %d\n", DBWriteErrors.Load()))

	c.Data(http.StatusOK, "text/plain; version=0.0.4; charset=utf-8", []byte(b.String()))
}
