# Runbooks

## Restart Function App

1. Confirm no active deployment is running.
2. Check Application Insights for current errors.
3. Restart Function App from Azure Portal or CLI.
4. Validate `GET /api/health`.
5. Confirm Stream Analytics output succeeds.

## Event Hub Lag

1. Check incoming request count.
2. Check outgoing messages and consumer group lag.
3. Scale throughput units if throttled.
4. Restart Stream Analytics job if checkpointing is stuck.

## AI Endpoint Rate Limit

1. Confirm rate-limit status code and request volume.
2. Enable queue-based retry with exponential backoff.
3. Temporarily use rules-only scoring.
4. Request quota increase if sustained demand is valid.
