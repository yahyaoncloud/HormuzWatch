# Observability & Request Tracing Architecture

## Telemetry & Correlation
Every outgoing HTTP request and WebSocket handshake includes standardized tracing headers:
- `X-Correlation-ID`: Unique UUID per user session transaction.
- `X-Trace-ID`: Unique trace identifier per individual request lifecycle.

## Navigation & Loader Metrics
React Router v8 loader and action execution durations are measured via the browser `performance.mark` and `performance.measure` APIs:

```ts
export async function loader({ request }: Route.LoaderArgs) {
  performance.mark('loader-start');
  const data = await fetchMetrics();
  performance.mark('loader-end');
  performance.measure('loader-duration', 'loader-start', 'loader-end');
  return { data };
}
```
