package observability

import (
	"expvar"
	"net/http"
	"sync/atomic"
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

// MetricsHandler returns an HTTP handler for the /metrics endpoint.
// Uses expvar's built-in /debug/vars handler.
func MetricsHandler() http.Handler {
	return expvar.Handler()
}
