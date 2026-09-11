#!/usr/bin/env bash
# ==============================================================================
# HormuzWatch — Workstation Workloads & MLOps Runner for tp24
# Hardware Target: AMD Ryzen 3 3200G (4 cores, AVX2), 32GB RAM, RX 6500 XT
# ==============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

ACTION="${1:-status}"

echo "=== HormuzWatch tp24 Workload Orchestrator ==="
echo "Node: $(hostname) | Cores: $(nproc) | RAM: $(free -h | awk '/^Mem:/ {print $2}')"

case "$ACTION" in
  start-stack)
    echo "→ Launching full production stack with tp24 high-capacity profile..."
    docker compose -f docker-compose.yml -f docker-compose.tp24.yml up --build -d
    echo "✔ Containers running."
    ;;
  stop-stack)
    echo "→ Stopping stack..."
    docker compose -f docker-compose.yml -f docker-compose.tp24.yml down
    echo "✔ Containers stopped."
    ;;
  status)
    echo "→ Checking container statuses and resource consumption..."
    docker compose -f docker-compose.yml -f docker-compose.tp24.yml ps
    ;;
  ml-intelligence)
    echo "→ Executing NVIDIA API intelligence generation and SITREP synthesis..."
    python3 exp/scripts/generate_intelligence_reports.py
    ;;
  ml-eval)
    echo "→ Running comprehensive ML ensemble audit across 9 models..."
    python3 exp/tests/test_model_refinements.py
    ;;
  ml-train-ct)
    echo "→ Launching MLOps continuous training daemon..."
    python3 mlops/pipeline/orchestrator.py --daemon
    ;;
  *)
    echo "Usage: $0 {start-stack|stop-stack|status|ml-intelligence|ml-eval|ml-train-ct}"
    exit 1
    ;;
esac
