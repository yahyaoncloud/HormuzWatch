#!/usr/bin/env bash
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.registry.yml"

action="${1:-status}"

case "$action" in
  start|up)
    echo "==> Starting HormuzWatch Private Docker & Model Registry..."
    docker compose -f "$COMPOSE_FILE" up -d
    echo "==> Waiting for services to become healthy..."
    docker compose -f "$COMPOSE_FILE" ps
    echo "Docker Registry: http://localhost:${REGISTRY_PORT:-5000}/v2/_catalog"
    echo "MinIO API:       http://localhost:${MINIO_PORT:-9000}"
    echo "MinIO Console:   http://localhost:${MINIO_CONSOLE_PORT:-9001}"
    ;;
  stop|down)
    echo "==> Stopping HormuzWatch Registries..."
    docker compose -f "$COMPOSE_FILE" down
    ;;
  status|ps)
    docker compose -f "$COMPOSE_FILE" ps
    ;;
  logs)
    docker compose -f "$COMPOSE_FILE" logs -f
    ;;
  *)
    echo "Usage: $0 {start|stop|status|logs}"
    exit 1
    ;;
esac
