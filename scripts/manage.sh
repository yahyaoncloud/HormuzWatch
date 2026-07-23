#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# HormuzWatch — Linux Background Service Manager
# ──────────────────────────────────────────────────────────────
# Usage:
#   ./scripts/manage.sh start          Start all services
#   ./scripts/manage.sh stop           Stop all services
#   ./scripts/manage.sh restart        Restart all services
#   ./scripts/manage.sh status         Show health status
#   ./scripts/manage.sh logs           Tail logs (journalctl)
#   ./scripts/manage.sh build          Rebuild Go binary
#   ./scripts/manage.sh tunnel-setup   Cloudflare Tunnel setup
#   ./scripts/manage.sh install        Install systemd units for auto-start
#   ./scripts/manage.sh uninstall      Remove systemd units
# ──────────────────────────────────────────────────────────────

set -euo pipefail

# ── Paths ────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVER_DIR="${PROJECT_ROOT}/server"
BUILD_DIR="${PROJECT_ROOT}/build"
DEPLOY_DIR="${PROJECT_ROOT}/deploy"
ML_DIR="${PROJECT_ROOT}/ml-service"
LOG_DIR="${BUILD_DIR}/logs"
PID_DIR="${BUILD_DIR}/pids"

SERVER_PID_FILE="${PID_DIR}/server.pid"
ML_PID_FILE="${PID_DIR}/ml.pid"

# ── Ports ────────────────────────────────────────────────────
SERVER_PORT="${PORT:-10020}"
ML_PORT="${ML_PORT:-8090}"
GRPC_PORT="${GRPC_PORT:-8091}"

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

step()  { echo -e "${CYAN}>>> $*${NC}"; }
ok()    { echo -e "${GREEN}  ✓ $*${NC}"; }
warn()  { echo -e "${YELLOW}  ⚠ $*${NC}"; }
fail()  { echo -e "${RED}  ✗ $*${NC}"; }

# ── Ensure directories exist ─────────────────────────────────
mkdir -p "$BUILD_DIR" "$DEPLOY_DIR" "$LOG_DIR" "$PID_DIR"

# ── Helper functions ─────────────────────────────────────────

is_running() {
    local pid_file="$1"
    if [[ -f "$pid_file" ]]; then
        local pid
        pid=$(cat "$pid_file" 2>/dev/null || true)
        if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

health_check() {
    local port="$1"
    local label="$2"
    local retries="${3:-3}"
    for ((i=0; i<retries; i++)); do
        if curl -sf http://localhost:"${port}/health" >/dev/null 2>&1; then
            ok "${label} (port ${port})"
            return 0
        fi
        sleep 2
    done
    fail "${label} UNREACHABLE (port ${port})"
    return 1
}

ml_health_check() {
    local retries="${1:-3}"
    for ((i=0; i<retries; i++)); do
        if curl -sf http://localhost:"${ML_PORT}/health" >/dev/null 2>&1; then
            ok "Python ML (port ${ML_PORT})"
            return 0
        fi
        sleep 2
    done
    fail "Python ML UNREACHABLE (port ${ML_PORT})"
    return 1
}

stop_by_pid() {
    local pid_file="$1"
    local label="$2"
    if is_running "$pid_file"; then
        local pid
        pid=$(cat "$pid_file")
        kill "$pid" 2>/dev/null || true
        sleep 2
        # Force kill if still running
        if kill -0 "$pid" 2>/dev/null; then
            kill -9 "$pid" 2>/dev/null || true
            warn "${label} force-killed (PID ${pid})"
        else
            ok "${label} stopped (PID ${pid})"
        fi
    else
        warn "${label} not running"
    fi
    rm -f "$pid_file"
}

# ═══════════════════════════════════════════════════════════════
#  Commands
# ═══════════════════════════════════════════════════════════════

cmd_build() {
    step "Building Go backend..."
    cd "$SERVER_DIR"
    go build -o "${BUILD_DIR}/hormuz-server" ./cmd/...
    cp -f "${BUILD_DIR}/hormuz-server" "${DEPLOY_DIR}/hormuz-server"
    ok "Build complete: ${DEPLOY_DIR}/hormuz-server"
}

cmd_start() {
    step "Starting HormuzWatch services..."

    # ── 1. Python ML Service ─────────────────────────────────
    step "Python ML Service (gRPC on :${GRPC_PORT}, API on :${ML_PORT})..."
    if is_running "$ML_PID_FILE"; then
        warn "Python ML already running"
    else
        cd "$ML_DIR"
        python3 ml_cli.py serve --port "$ML_PORT" &
        local ml_pid=$!
        echo "$ml_pid" > "$ML_PID_FILE"
        ok "Python ML PID: ${ml_pid}"
        sleep 3
    fi

    # ── 2. Go Backend ─────────────────────────────────────────
    step "Go Backend (REST on :${SERVER_PORT})..."
    if is_running "$SERVER_PID_FILE"; then
        warn "Go backend already running"
    else
        cd "$DEPLOY_DIR"
        PORT="$SERVER_PORT" nohup ./hormuz-server >> "${LOG_DIR}/server.log" 2>&1 &
        local server_pid=$!
        echo "$server_pid" > "$SERVER_PID_FILE"
        ok "Go Backend PID: ${server_pid}"
        sleep 5
    fi

    # ── 3. Health checks ─────────────────────────────────────
    step "Health checks..."
    local go_ok=0 ml_ok=0
    health_check "$SERVER_PORT" "Go Backend" && go_ok=1 || true
    ml_health_check && ml_ok=1 || true

    echo ""
    if [[ $go_ok -eq 1 && $ml_ok -eq 1 ]]; then
        ok "ALL SERVICES HEALTHY"
    elif [[ $go_ok -eq 1 || $ml_ok -eq 1 ]]; then
        warn "DEGRADED — some services failed health check"
    else
        fail "DOWN — no services responding"
    fi
}

cmd_stop() {
    step "Stopping HormuzWatch services..."
    stop_by_pid "$SERVER_PID_FILE" "Go Backend"
    stop_by_pid "$ML_PID_FILE" "Python ML"
    ok "All services stopped"
}

cmd_restart() {
    "$0" stop
    sleep 2
    "$0" start
}

cmd_status() {
    echo ""
    echo -e "${CYAN}=== HormuzWatch Service Status ===${NC}"
    echo "  Go Backend  : http://localhost:${SERVER_PORT}"
    echo "  Python ML   : http://localhost:${ML_PORT}"
    echo "  gRPC        : localhost:${GRPC_PORT}"
    echo "  Logs        : ${LOG_DIR}"
    echo "  PIDs        : ${PID_DIR}"
    echo ""

    local go_ok=0 ml_ok=0
    health_check "$SERVER_PORT" "Go Backend" 1 && go_ok=1 || true
    ml_health_check 1 && ml_ok=1 || true

    echo ""
    if [[ $go_ok -eq 1 && $ml_ok -eq 1 ]]; then
        ok "OVERALL: HEALTHY"
    elif [[ $go_ok -eq 1 || $ml_ok -eq 1 ]]; then
        warn "OVERALL: DEGRADED"
    else
        fail "OVERALL: DOWN"
    fi
}

cmd_logs() {
    step "Recent logs (Ctrl+C to stop)..."
    if command -v journalctl &>/dev/null && systemctl is-active --quiet hormuzwatch-server 2>/dev/null; then
        journalctl -u hormuzwatch-server -u hormuzwatch-ml -f --since "10 min ago" 2>/dev/null || true
    fi
    echo "--- server.log ---"
    tail -50 "${LOG_DIR}/server.log" 2>/dev/null || warn "No server log yet"
    echo "--- ml-service.log ---"
    tail -20 "${LOG_DIR}/ml-service.log" 2>/dev/null || warn "No ML log yet"
}

cmd_tunnel_setup() {
    step "Cloudflare Tunnel Setup (Linux)"
    echo ""
    echo "  1. Install cloudflared:"
    echo "     curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared"
    echo "     chmod +x /usr/local/bin/cloudflared"
    echo ""
    echo "  2. Authenticate:"
    echo "     cloudflared tunnel login"
    echo ""
    echo "  3. Create tunnel:"
    echo "     cloudflared tunnel create hormuzwatch"
    echo ""
    echo "  4. Route DNS:"
    echo "     cloudflared tunnel route dns hormuzwatch api.hormuzwatch.app"
    echo ""
    echo "  5. Config file (/etc/cloudflared/config.yml):"
    echo "     tunnel: <tunnel-uuid>"
    echo "     credentials-file: /etc/cloudflared/<tunnel-uuid>.json"
    echo "     ingress:"
    echo "       - hostname: api.hormuzwatch.app"
    echo "         service: http://localhost:10020"
    echo "       - service: http_status:404"
    echo ""
    echo "  6. Run as systemd service:"
    echo "     cloudflared service install"
    echo "     systemctl start cloudflared"
    echo "     systemctl enable cloudflared"
}

cmd_install_systemd() {
    step "Installing systemd units..."

    # ── Go Backend unit ───────────────────────────────────────
    cat > /etc/systemd/system/hormuzwatch-server.service << UNIT
[Unit]
Description=HormuzWatch Go Backend
After=network.target postgresql.service
Wants=network.target

[Service]
Type=simple
User=${SUDO_USER:-root}
WorkingDirectory=${DEPLOY_DIR}
Environment="PORT=${SERVER_PORT}"
Environment="DATABASE_URL=${DATABASE_URL:-}"
ExecStart=${DEPLOY_DIR}/hormuz-server
ExecStop=/bin/kill -TERM \$MAINPID
Restart=on-failure
RestartSec=5
StandardOutput=append:${LOG_DIR}/server.log
StandardError=append:${LOG_DIR}/server.log

[Install]
WantedBy=multi-user.target
UNIT

    # ── Python ML unit ────────────────────────────────────────
    cat > /etc/systemd/system/hormuzwatch-ml.service << UNIT
[Unit]
Description=HormuzWatch Python ML Service
After=network.target
Wants=network.target

[Service]
Type=simple
User=${SUDO_USER:-root}
WorkingDirectory=${ML_DIR}
Environment="ML_PORT=${ML_PORT}"
Environment="GRPC_PORT=${GRPC_PORT}"
ExecStart=${ML_DIR}/venv/bin/python3 ml_cli.py serve --port ${ML_PORT}
ExecStop=/bin/kill -TERM \$MAINPID
Restart=on-failure
RestartSec=3
StandardOutput=append:${LOG_DIR}/ml-service.log
StandardError=append:${LOG_DIR}/ml-service.log

[Install]
WantedBy=multi-user.target
UNIT

    systemctl daemon-reload
    ok "systemd units installed"

    echo ""
    echo "  Enable auto-start on boot:"
    echo "    systemctl enable hormuzwatch-server"
    echo "    systemctl enable hormuzwatch-ml"
    echo ""
    echo "  Start now:"
    echo "    systemctl start hormuzwatch-server"
    echo "    systemctl start hormuzwatch-ml"
    echo ""
    echo "  Check status:"
    echo "    systemctl status hormuzwatch-server"
    echo "    systemctl status hormuzwatch-ml"
}

cmd_uninstall_systemd() {
    step "Removing systemd units..."
    systemctl stop hormuzwatch-server 2>/dev/null || true
    systemctl stop hormuzwatch-ml 2>/dev/null || true
    systemctl disable hormuzwatch-server 2>/dev/null || true
    systemctl disable hormuzwatch-ml 2>/dev/null || true
    rm -f /etc/systemd/system/hormuzwatch-server.service
    rm -f /etc/systemd/system/hormuzwatch-ml.service
    systemctl daemon-reload
    ok "systemd units removed"
}

cmd_setup_venv() {
    step "Setting up Python virtual environment..."
    cd "$ML_DIR"
    if [[ ! -d venv ]]; then
        python3 -m venv venv
        ok "Virtual environment created"
    fi
    source venv/bin/activate
    pip install -r requirements.txt --quiet
    ok "Dependencies installed"
}

# ═══════════════════════════════════════════════════════════════
#  Entry Point
# ═══════════════════════════════════════════════════════════════

usage() {
    echo "Usage: $0 {build|start|stop|restart|status|logs|tunnel-setup|install|uninstall|venv}"
    exit 1
}

COMMAND="${1:-status}"

case "$COMMAND" in
    build)          cmd_build ;;
    start)          cmd_start ;;
    stop)           cmd_stop ;;
    restart)        cmd_restart ;;
    status)         cmd_status ;;
    logs)           cmd_logs ;;
    tunnel-setup)   cmd_tunnel_setup ;;
    install)        cmd_install_systemd ;;
    uninstall)      cmd_uninstall_systemd ;;
    venv)           cmd_setup_venv ;;
    *)              usage ;;
esac
