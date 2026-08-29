#!/usr/bin/env bash
# HormuzWatch — SRE Management & Chaos Testing Script
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Colors
C_RESET="\033[0m"
C_BOLD="\033[1m"
C_RED="\033[31m"
C_GREEN="\033[32m"
C_YELLOW="\033[33m"
C_BLUE="\033[34m"
C_CYAN="\033[36m"

command="${1:-help}"

case "$command" in
  health)
    echo -e "${C_BOLD}${C_CYAN}==> HormuzWatch SRE Health Check...${C_RESET}"
    cd "$SCRIPT_DIR"
    go run main.go health "$@"
    ;;
  tolerance|bench)
    echo -e "${C_BOLD}${C_CYAN}==> Running Fault-Tolerance & Load Benchmark...${C_RESET}"
    cd "$SCRIPT_DIR"
    go run main.go tolerance "${@:2}"
    ;;
  logs)
    echo -e "${C_BOLD}${C_CYAN}==> Streaming Multi-Container Color Logs...${C_RESET}"
    cd "$ROOT_DIR"
    docker compose logs -f --tail=50 server ml client
    ;;
  monitor|top)
    echo -e "${C_BOLD}${C_CYAN}==> Launching Real-time SRE Monitor...${C_RESET}"
    cd "$SCRIPT_DIR"
    go run main.go monitor "${@:2}"
    ;;
  obs-up|stack-up)
    echo -e "${C_BOLD}${C_CYAN}==> Starting Prometheus & Grafana Observability Layer...${C_RESET}"
    cd "$ROOT_DIR"
    docker compose -f service/observability/docker-compose.observability.yml up -d
    echo -e "${C_GREEN}✔ Prometheus : http://localhost:9090${C_RESET}"
    echo -e "${C_GREEN}✔ Grafana    : http://localhost:3001 (admin/admin)${C_RESET}"
    ;;
  obs-down|stack-down)
    echo -e "${C_BOLD}${C_YELLOW}==> Stopping Observability Layer...${C_RESET}"
    cd "$ROOT_DIR"
    docker compose -f service/observability/docker-compose.observability.yml down
    ;;
  deploy)
    echo -e "${C_BOLD}${C_CYAN}==> Launching Automated Build & Deployment Pipeline...${C_RESET}"
    bash "$SCRIPT_DIR/deploy.sh" "${@:2}"
    ;;
  *)
    echo -e "${C_BOLD}HormuzWatch SRE & Observability Tool${C_RESET}"
    echo "Usage: $0 {deploy|health|tolerance|logs|monitor|obs-up|obs-down}"
    echo ""
    echo "Commands:"
    echo "  deploy     - Interactive build & deploy pipeline for MVP (with confirmation)"
    echo "  health     - Deep health check of Go API, ML Service, Client, and Cloudflare Tunnel"
    echo "  tolerance  - Run fault-tolerance & resilience benchmark tests"
    echo "  logs       - Stream multiplexed color logs from all Docker containers"
    echo "  monitor    - Live interactive terminal TUI dashboard"
    echo "  obs-up     - Start Prometheus and Grafana SRE dashboards"
    echo "  obs-down   - Stop Prometheus and Grafana stack"
    exit 0
    ;;
esac
