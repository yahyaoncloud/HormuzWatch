package observability

import (
	"expvar"
	"fmt"
	"net/http"
	"strings"
	"sync/atomic"

	"github.com/gin-gonic/gin"
)

// Runtime metrics exposed via expvar and Prometheus text-format handler.
var (
	// Collection metrics
	CollectionsTotal  atomic.Int64
	CollectionsErrors atomic.Int64

	// Pipeline metrics
	ObservationsProcessed atomic.Int64
	AnomaliesDetected     atomic.Int64

	// Queue & backpressure metrics
	QueueEnqueuedTotal  atomic.Int64
	QueueDroppedTotal   atomic.Int64
	QueueProcessedTotal atomic.Int64
	QueueDepth          atomic.Int64
	QueueCapacity       atomic.Int64
	QueueWaitTotalMs    atomic.Int64

	// ML metrics & circuit breaker
	MLPredictionsTotal     atomic.Int64
	MLPredictionsFallback  atomic.Int64
	CircuitBreakerTrips    atomic.Int64

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
	expvar.Publish("queue_enqueued_total", expvar.Func(func() any { return QueueEnqueuedTotal.Load() }))
	expvar.Publish("queue_dropped_total", expvar.Func(func() any { return QueueDroppedTotal.Load() }))
	expvar.Publish("queue_processed_total", expvar.Func(func() any { return QueueProcessedTotal.Load() }))
	expvar.Publish("queue_depth", expvar.Func(func() any { return QueueDepth.Load() }))
	expvar.Publish("queue_capacity", expvar.Func(func() any { return QueueCapacity.Load() }))
	expvar.Publish("ml_predictions_total", expvar.Func(func() any { return MLPredictionsTotal.Load() }))
	expvar.Publish("ml_predictions_fallback", expvar.Func(func() any { return MLPredictionsFallback.Load() }))
	expvar.Publish("circuit_breaker_trips", expvar.Func(func() any { return CircuitBreakerTrips.Load() }))
	expvar.Publish("ws_clients_active", expvar.Func(func() any { return WebSocketClientsActive.Load() }))
	expvar.Publish("db_writes_total", expvar.Func(func() any { return DBWritesTotal.Load() }))
	expvar.Publish("db_write_errors", expvar.Func(func() any { return DBWriteErrors.Load() }))
}

// MetricsHandler returns an HTTP handler for the /debug/vars endpoint.
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

	b.WriteString("# HELP hormuzwatch_queue_enqueued_total Total messages enqueued into worker channel\n")
	b.WriteString("# TYPE hormuzwatch_queue_enqueued_total counter\n")
	b.WriteString(fmt.Sprintf("hormuzwatch_queue_enqueued_total %d\n", QueueEnqueuedTotal.Load()))

	b.WriteString("# HELP hormuzwatch_queue_dropped_total Total messages dropped due to buffer saturation (backpressure)\n")
	b.WriteString("# TYPE hormuzwatch_queue_dropped_total counter\n")
	b.WriteString(fmt.Sprintf("hormuzwatch_queue_dropped_total %d\n", QueueDroppedTotal.Load()))

	b.WriteString("# HELP hormuzwatch_queue_processed_total Total messages dequeued and processed by worker pool\n")
	b.WriteString("# TYPE hormuzwatch_queue_processed_total counter\n")
	b.WriteString(fmt.Sprintf("hormuzwatch_queue_processed_total %d\n", QueueProcessedTotal.Load()))

	b.WriteString("# HELP hormuzwatch_queue_depth Current number of messages waiting in buffer channel\n")
	b.WriteString("# TYPE hormuzwatch_queue_depth gauge\n")
	b.WriteString(fmt.Sprintf("hormuzwatch_queue_depth %d\n", QueueDepth.Load()))

	b.WriteString("# HELP hormuzwatch_queue_capacity Buffer capacity of the worker queue\n")
	b.WriteString("# TYPE hormuzwatch_queue_capacity gauge\n")
	b.WriteString(fmt.Sprintf("hormuzwatch_queue_capacity %d\n", QueueCapacity.Load()))

	b.WriteString("# HELP hormuzwatch_ml_predictions_total Total ML inference requests\n")
	b.WriteString("# TYPE hormuzwatch_ml_predictions_total counter\n")
	b.WriteString(fmt.Sprintf("hormuzwatch_ml_predictions_total %d\n", MLPredictionsTotal.Load()))

	b.WriteString("# HELP hormuzwatch_ml_predictions_fallback_total Total ML fallback predictions\n")
	b.WriteString("# TYPE hormuzwatch_ml_predictions_fallback_total counter\n")
	b.WriteString(fmt.Sprintf("hormuzwatch_ml_predictions_fallback_total %d\n", MLPredictionsFallback.Load()))

	b.WriteString("# HELP hormuzwatch_circuit_breaker_trips_total Total times ML circuit breaker tripped to OPEN\n")
	b.WriteString("# TYPE hormuzwatch_circuit_breaker_trips_total counter\n")
	b.WriteString(fmt.Sprintf("hormuzwatch_circuit_breaker_trips_total %d\n", CircuitBreakerTrips.Load()))

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
