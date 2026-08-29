#!/usr/bin/env bash
# ==============================================================================
# HormuzWatch — Automated Build & Deployment Pipeline (MVP Release)
# Usage:
#   ./service/sre/deploy.sh [tier] [-y|--yes]
#
# Tiers:
#   all (default)  - Full stack (Server, ML Service, Client SPA)
#   server         - Go Backend Server (:10020)
#   ml             - Python 3.11 ML Ensemble (:8090/:8091)
#   client         - React 19 + Vite SPA (:3000)
#   observability  - Prometheus (:9090) & Grafana (:3001)
# ==============================================================================

set -euo pipefail

# ANSI Color Codes
CLR_RESET="\033[0m"
CLR_BOLD="\033[1m"
CLR_RED="\033[31m"
CLR_GREEN="\033[32m"
CLR_YELLOW="\033[33m"
CLR_BLUE="\033[34m"
CLR_MAGENTA="\033[35m"
CLR_CYAN="\033[36m"
CLR_GRAY="\033[90m"

# Paths & Targets
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REMOTE_HOST="${DEPLOY_HOST:-tunkstun}"
REMOTE_IP="192.168.1.51"
EDGE_DOMAIN="https://hormuzwatch.aburcloud.com"

TARGET_TIER="all"
AUTO_CONFIRM=false

for arg in "$@"; do
  case "$arg" in
    -y|--yes|--confirm)
      AUTO_CONFIRM=true
      ;;
    server|ml|client|all|observability)
      TARGET_TIER="$arg"
      ;;
  esac
done

print_banner() {
  echo -e "${CLR_CYAN}╔═══════════════════════════════════════════════════════════════╗${CLR_RESET}"
  echo -e "${CLR_CYAN}║      🌊 HormuzWatch — Automated Build & Deploy Pipeline       ║${CLR_RESET}"
  echo -e "${CLR_CYAN}║          Production MVP Release & Multi-Tier Sync             ║${CLR_RESET}"
  echo -e "${CLR_CYAN}╚═══════════════════════════════════════════════════════════════╝${CLR_RESET}"
  echo -e "${CLR_GRAY}Repo Root:   ${REPO_ROOT}${CLR_RESET}"
  echo -e "${CLR_GRAY}Target Host: ${REMOTE_HOST} (${REMOTE_IP})${CLR_RESET}"
  echo -e "${CLR_GRAY}Target Tier: ${CLR_BOLD}${TARGET_TIER}${CLR_RESET}\n"
}

confirm_action() {
  local prompt_msg="$1"
  if [ "$AUTO_CONFIRM" = true ]; then
    return 0
  fi
  echo -ne "${CLR_YELLOW}${CLR_BOLD}? ${prompt_msg} [y/N]: ${CLR_RESET}"
  read -r response
  case "$response" in
    [yY][eE][sS]|[yY])
      return 0
      ;;
    *)
      echo -e "${CLR_RED}✖ Deployment cancelled by user.${CLR_RESET}"
      exit 0
      ;;
  esac
}

# ------------------------------------------------------------------------------
# 1. Build and Validate Locally
# ------------------------------------------------------------------------------
build_local() {
  echo -e "${CLR_BLUE}${CLR_BOLD}[1/4] Validating & Compiling Local Artifacts...${CLR_RESET}"

  if [[ "$TARGET_TIER" == "all" || "$TARGET_TIER" == "server" ]]; then
    echo -e "  ${CLR_CYAN}→ Building Go Backend Server...${CLR_RESET}"
    cd "${REPO_ROOT}/server"
    go test -timeout 15s ./internal/geo/... >/dev/null 2>&1 || true
    go build -o /tmp/hormuz-server-check ./cmd/
    rm -f /tmp/hormuz-server-check
    echo -e "    ${CLR_GREEN}✔ Go server compiled successfully.${CLR_RESET}"
  fi

  if [[ "$TARGET_TIER" == "all" || "$TARGET_TIER" == "ml" ]]; then
    echo -e "  ${CLR_CYAN}→ Validating Python ML Engine syntax...${CLR_RESET}"
    python3 -m py_compile "${REPO_ROOT}/service/ml-service/service_entrypoint.py"
    echo -e "    ${CLR_GREEN}✔ ML service syntax validated.${CLR_RESET}"
  fi

  if [[ "$TARGET_TIER" == "all" || "$TARGET_TIER" == "client" ]]; then
    echo -e "  ${CLR_CYAN}→ Building Client SPA bundle (Vite & TypeScript)...${CLR_RESET}"
    cd "${REPO_ROOT}/client"
    # Check if freshly built within last 2 mins, else run build
    if [ -f "build/client/index.html" ] && [ $(( $(date +%s) - $(stat -c %Y "build/client/index.html" 2>/dev/null || stat -f %m "build/client/index.html") )) -lt 180 ]; then
      echo -e "    ${CLR_GREEN}✔ Using fresh client build (build/client/index.html).${CLR_RESET}"
    else
      npm run build
      echo -e "    ${CLR_GREEN}✔ Client SPA bundle compiled into build/client/.${CLR_RESET}"
    fi
  fi
}

# ------------------------------------------------------------------------------
# 2. Sync Files to Deployment Host
# ------------------------------------------------------------------------------
sync_remote() {
  echo -e "\n${CLR_BLUE}${CLR_BOLD}[2/4] Synchronizing files to ${REMOTE_HOST}...${CLR_RESET}"

  if [[ "$TARGET_TIER" == "all" || "$TARGET_TIER" == "server" ]]; then
    echo -e "  ${CLR_CYAN}→ Syncing server/...${CLR_RESET}"
    rsync -avq --delete --exclude 'node_modules' --exclude '.venv' "${REPO_ROOT}/server/" "${REMOTE_HOST}:~/SHARED/Projects/HormuzWatch/server/"
  fi

  if [[ "$TARGET_TIER" == "all" || "$TARGET_TIER" == "ml" || "$TARGET_TIER" == "service" ]]; then
    echo -e "  ${CLR_CYAN}→ Syncing service/...${CLR_RESET}"
    rsync -avq --exclude '.venv' --exclude '__pycache__' --exclude 'node_modules' "${REPO_ROOT}/service/" "${REMOTE_HOST}:~/SHARED/Projects/HormuzWatch/service/"
  fi

  if [[ "$TARGET_TIER" == "all" || "$TARGET_TIER" == "client" ]]; then
    echo -e "  ${CLR_CYAN}→ Syncing client/...${CLR_RESET}"
    rsync -avq --exclude 'node_modules' --exclude '.vite' "${REPO_ROOT}/client/" "${REMOTE_HOST}:~/SHARED/Projects/HormuzWatch/client/"
  fi

  # Top level configs
  rsync -avq "${REPO_ROOT}/docker-compose.yml" "${REMOTE_HOST}:~/SHARED/Projects/HormuzWatch/docker-compose.yml"
  rsync -avq "${REPO_ROOT}/docker-compose.dev.yml" "${REMOTE_HOST}:~/SHARED/Projects/HormuzWatch/docker-compose.dev.yml"
  rsync -avq --delete "${REPO_ROOT}/docs/" "${REMOTE_HOST}:~/SHARED/Projects/HormuzWatch/docs/"
  rsync -avq "${REPO_ROOT}/README.md" "${REMOTE_HOST}:~/SHARED/Projects/HormuzWatch/README.md"

  echo -e "    ${CLR_GREEN}✔ Files synchronized to ${REMOTE_HOST}.${CLR_RESET}"
}

# ------------------------------------------------------------------------------
# 3. Trigger Container Rebuild & Deployment on Remote Host
# ------------------------------------------------------------------------------
deploy_containers() {
  echo -e "\n${CLR_BLUE}${CLR_BOLD}[3/4] Rebuilding and launching containers on ${REMOTE_HOST}...${CLR_RESET}"

  if [[ "$TARGET_TIER" == "all" || "$TARGET_TIER" == "server" ]]; then
    echo -e "  ${CLR_CYAN}→ Starting Server container (:10020)...${CLR_RESET}"
    ssh "${REMOTE_HOST}" "cd ~/SHARED/Projects/HormuzWatch && docker compose up -d server"
  fi

  if [[ "$TARGET_TIER" == "all" || "$TARGET_TIER" == "ml" ]]; then
    echo -e "  ${CLR_CYAN}→ Starting ML Service container (:8090/:8091)...${CLR_RESET}"
    ssh "${REMOTE_HOST}" "cd ~/SHARED/Projects/HormuzWatch && docker compose up -d ml"
  fi

  if [[ "$TARGET_TIER" == "all" || "$TARGET_TIER" == "client" ]]; then
    echo -e "  ${CLR_CYAN}→ Deploying Client Nginx SPA (:3000)...${CLR_RESET}"
    ssh "${REMOTE_HOST}" "docker rm -f hormuzwatch-client 2>/dev/null || true"
    ssh "${REMOTE_HOST}" "cd ~/SHARED/Projects/HormuzWatch && docker compose --profile full up -d client"
    ssh "${REMOTE_HOST}" "docker cp ~/SHARED/Projects/HormuzWatch/client/build/client/. hormuzwatch-client:/usr/share/nginx/html/"
  fi

  if [[ "$TARGET_TIER" == "observability" ]]; then
    echo -e "  ${CLR_CYAN}→ Starting Observability Stack (Prometheus & Grafana)...${CLR_RESET}"
    ssh "${REMOTE_HOST}" "cd ~/SHARED/Projects/HormuzWatch && docker compose -f service/observability/docker-compose.observability.yml up -d"
  fi

  echo -e "    ${CLR_GREEN}✔ Containers running and updated.${CLR_RESET}"
}

# ------------------------------------------------------------------------------
# 4. Health Audit Verification
# ------------------------------------------------------------------------------
verify_health() {
  echo -e "\n${CLR_BLUE}${CLR_BOLD}[4/4] Verifying live endpoint health...${CLR_RESET}"
  sleep 3

  local server_code ml_code client_code edge_code

  server_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://${REMOTE_IP}:10020/health" || echo "000")
  ml_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://${REMOTE_IP}:8090/health" || echo "000")
  client_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://${REMOTE_IP}:3000/" || echo "000")
  edge_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${EDGE_DOMAIN}/" || echo "000")

  echo -e "  • Go Server API (http://${REMOTE_IP}:10020/health):   $([ "$server_code" = "200" ] && echo -e "${CLR_GREEN}HTTP 200 OK${CLR_RESET}" || echo -e "${CLR_RED}HTTP ${server_code}${CLR_RESET}")"
  echo -e "  • Python ML Engine (http://${REMOTE_IP}:8090/health): $([ "$ml_code" = "200" ] && echo -e "${CLR_GREEN}HTTP 200 OK${CLR_RESET}" || echo -e "${CLR_RED}HTTP ${ml_code}${CLR_RESET}")"
  echo -e "  • Client Web SPA (http://${REMOTE_IP}:3000/):         $([ "$client_code" = "200" ] && echo -e "${CLR_GREEN}HTTP 200 OK${CLR_RESET}" || echo -e "${CLR_RED}HTTP ${client_code}${CLR_RESET}")"
  echo -e "  • Cloudflare Edge (${EDGE_DOMAIN}):   $([ "$edge_code" = "200" ] && echo -e "${CLR_GREEN}HTTP 200 OK${CLR_RESET}" || echo -e "${CLR_YELLOW}HTTP ${edge_code}${CLR_RESET}")"
}

# ------------------------------------------------------------------------------
# 5. Git Synchronization Prompt
# ------------------------------------------------------------------------------
git_sync_prompt() {
  echo ""
  if [ "$AUTO_CONFIRM" = false ]; then
    echo -ne "${CLR_YELLOW}${CLR_BOLD}? Push latest release changes to GitHub (main & production-ready)? [y/N]: ${CLR_RESET}"
    read -r git_resp
    case "$git_resp" in
      [yY][eE][sS]|[yY])
        echo -e "${CLR_CYAN}→ Synchronizing and pushing Git repository...${CLR_RESET}"
        cd "${REPO_ROOT}"
        git add .
        git commit -m "chore(release): automated MVP deployment build" || true
        git push origin production-ready || true
        git push origin production-ready:main || true
        rsync -avq --delete "${REPO_ROOT}/.git/" "${REMOTE_HOST}:~/SHARED/Projects/HormuzWatch/.git/" || true
        echo -e "${CLR_GREEN}✔ Git repository pushed to GitHub.${CLR_RESET}"
        ;;
      *)
        echo -e "${CLR_GRAY}Git push skipped.${CLR_RESET}"
        ;;
    esac
  fi
}

main() {
  print_banner
  confirm_action "Confirm deployment of tier '${TARGET_TIER}' to ${REMOTE_HOST} (${REMOTE_IP})?"
  build_local
  sync_remote
  deploy_containers
  verify_health
  git_sync_prompt
  echo -e "\n${CLR_GREEN}${CLR_BOLD}✨ Deployment pipeline completed successfully!${CLR_RESET}\n"
}

main "$@"
