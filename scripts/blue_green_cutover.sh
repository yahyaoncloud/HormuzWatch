#!/usr/bin/env bash
# =============================================================================
# 🌊 HormuzWatch — Blue/Green Zero-Downtime Deployment & Cutover Engine
# Switches traffic between Blue (:10020/:8090/:3000) and Green (:10022/:8092/:3002)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

NGINX_CONF="/etc/nginx/conf.d/upstreams.conf"
SLOT_STATE_FILE="${ROOT_DIR}/.active_slot"

# -----------------------------------------------------------------------------
# Slot Configuration
# -----------------------------------------------------------------------------
BLUE_SERVER_PORT=10020
BLUE_ML_PORT=8090
BLUE_CLIENT_PORT=3000

GREEN_SERVER_PORT=10022
GREEN_ML_PORT=8092
GREEN_CLIENT_PORT=3002

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
log() {
    echo -e "\033[1;34m[BLUE/GREEN]\033[0m $(date +'%Y-%m-%d %H:%M:%S') $1"
}

warn() {
    echo -e "\033[1;33m[WARN]\033[0m $(date +'%Y-%m-%d %H:%M:%S') $1"
}

err() {
    echo -e "\033[1;31m[ERROR]\033[0m $(date +'%Y-%m-%d %H:%M:%S') $1" >&2
}

get_active_slot() {
    if [[ -f "${SLOT_STATE_FILE}" ]]; then
        cat "${SLOT_STATE_FILE}" | tr -d '[:space:]'
    elif [[ -f "${NGINX_CONF}" ]] && grep -q "127.0.0.1:10022" "${NGINX_CONF}"; then
        echo "green"
    else
        echo "blue"
    fi
}

get_target_slot() {
    local current="$1"
    if [[ "${current}" == "blue" ]]; then
        echo "green"
    else
        echo "blue"
    fi
}

get_ports() {
    local slot="$1"
    if [[ "${slot}" == "blue" ]]; then
        echo "${BLUE_SERVER_PORT} ${BLUE_ML_PORT} ${BLUE_CLIENT_PORT}"
    else
        echo "${GREEN_SERVER_PORT} ${GREEN_ML_PORT} ${GREEN_CLIENT_PORT}"
    fi
}

# -----------------------------------------------------------------------------
# Health Probe
# -----------------------------------------------------------------------------
probe_health() {
    local slot="$1"
    read -r server_port ml_port client_port <<< "$(get_ports "${slot}")"

    log "Probing health for slot '${slot}' (Server: :${server_port}, ML: :${ml_port}, Client: :${client_port})..."

    local max_attempts=30
    local attempt=1
    local healthy=0

    while [[ ${attempt} -le ${max_attempts} ]]; do
        local s_ok=0
        local m_ok=0
        local c_ok=0

        if curl -sf --connect-timeout 2 "http://127.0.0.1:${server_port}/health/live" >/dev/null 2>&1; then
            s_ok=1
        fi
        if curl -sf --connect-timeout 2 "http://127.0.0.1:${ml_port}/health" >/dev/null 2>&1; then
            m_ok=1
        fi
        if curl -sf -I --connect-timeout 2 "http://127.0.0.1:${client_port}" >/dev/null 2>&1; then
            c_ok=1
        fi

        if [[ ${s_ok} -eq 1 && ${m_ok} -eq 1 && ${c_ok} -eq 1 ]]; then
            log "--> Slot '${slot}' is fully warmed and healthy! (Attempt ${attempt}/${max_attempts})"
            healthy=1
            break
        fi

        log "--> Warming up '${slot}'... [Server:${s_ok} ML:${m_ok} Client:${c_ok}] (Attempt ${attempt}/${max_attempts})"
        sleep 2
        attempt=$((attempt + 1))
    done

    if [[ ${healthy} -eq 0 ]]; then
        err "Health check FAILED for slot '${slot}' after ${max_attempts} attempts!"
        return 1
    fi
    return 0
}

# -----------------------------------------------------------------------------
# Nginx Upstream Cutover
# -----------------------------------------------------------------------------
switch_nginx() {
    local target_slot="$1"
    read -r server_port ml_port client_port <<< "$(get_ports "${target_slot}")"

    log "Updating Nginx upstream targets to slot '${target_slot}' (: ${client_port} / : ${server_port})..."

    if [[ -f "${NGINX_CONF}" ]]; then
        # Backup configuration
        sudo cp "${NGINX_CONF}" "${NGINX_CONF}.bak"

        if [[ "${target_slot}" == "green" ]]; then
            sudo sed -i 's/127\.0\.0\.1:3000/127.0.0.1:3002/g' "${NGINX_CONF}"
            sudo sed -i 's/127\.0\.0\.1:10020/127.0.0.1:10022/g' "${NGINX_CONF}"
        else
            sudo sed -i 's/127\.0\.0\.1:3002/127.0.0.1:3000/g' "${NGINX_CONF}"
            sudo sed -i 's/127\.0\.0\.1:10022/127.0.0.1:10020/g' "${NGINX_CONF}"
        fi

        if sudo nginx -t; then
            sudo nginx -s reload
            log "Nginx reloaded successfully. Zero-downtime cutover complete!"
            echo "${target_slot}" > "${SLOT_STATE_FILE}"
        else
            err "Nginx configuration test failed! Restoring backup..."
            sudo mv "${NGINX_CONF}.bak" "${NGINX_CONF}"
            sudo nginx -s reload
            return 1
        fi
    else
        warn "Nginx config '${NGINX_CONF}' not found (running outside edge host?). Recording slot '${target_slot}'."
        echo "${target_slot}" > "${SLOT_STATE_FILE}"
    fi
}

# -----------------------------------------------------------------------------
# Operations
# -----------------------------------------------------------------------------
cmd_status() {
    local active
    active=$(get_active_slot)
    log "Active Slot: ${active^^}"
    read -r s_port m_port c_port <<< "$(get_ports "${active}")"
    echo "  Server: http://127.0.0.1:${s_port}"
    echo "  ML:     http://127.0.0.1:${m_port}"
    echo "  Client: http://127.0.0.1:${c_port}"
}

cmd_deploy() {
    local requested_target="${1:-auto}"
    local active
    active=$(get_active_slot)
    local target
    if [[ "${requested_target}" == "auto" ]]; then
        target=$(get_target_slot "${active}")
    else
        target="${requested_target}"
    fi

    log "Current Active Slot: ${active^^} | Target Deployment Slot: ${target^^}"

    # 1. Run database migrations
    log "Running pending database schema migrations..."
    if command -v go >/dev/null 2>&1; then
        go run ./server/cmd/migrate -direction=up || warn "Migration check completed with warning"
    fi

    # 2. Deploy target slot containers
    log "Launching target slot '${target}' containers..."
    docker compose -p hormuzwatch -f docker-compose.yml -f "docker-compose.${target}.yml" up -d --build --no-recreate server ml client

    # 3. Health Probe & Warmup Gate
    if ! probe_health "${target}"; then
        err "Deployment to '${target}' failed health gate! Aborting cutover."
        log "Leaving active slot '${active}' in service. Stopping unhealthy '${target}' containers..."
        docker compose -p hormuzwatch -f docker-compose.yml -f "docker-compose.${target}.yml" stop server ml client || true
        exit 1
    fi

    # 4. Atomic Cutover via Nginx
    switch_nginx "${target}"

    # 5. Graceful draining & termination of old slot
    if [[ "${active}" != "${target}" ]]; then
        log "Draining and stopping previous slot '${active}'..."
        sleep 5
        docker compose -p hormuzwatch -f docker-compose.yml -f "docker-compose.${active}.yml" stop server ml client || true
        log "Previous slot '${active}' stopped cleanly."
    fi

    log "SUCCESS: Deployment & Blue/Green cutover to slot '${target^^}' completed with zero downtime!"
}

cmd_rollback() {
    local active
    active=$(get_active_slot)
    local fallback
    fallback=$(get_target_slot "${active}")

    warn "Initiating emergency rollback from '${active^^}' to '${fallback^^}'..."

    # Start fallback slot
    docker compose -p hormuzwatch -f docker-compose.yml -f "docker-compose.${fallback}.yml" up -d --no-recreate server ml client
    if probe_health "${fallback}"; then
        switch_nginx "${fallback}"
        docker compose -p hormuzwatch -f docker-compose.yml -f "docker-compose.${active}.yml" stop server ml client || true
        log "Rollback to '${fallback^^}' completed successfully."
    else
        err "CRITICAL: Fallback slot '${fallback}' also failed health probe!"
        exit 1
    fi
}

# -----------------------------------------------------------------------------
# Main Entrypoint
# -----------------------------------------------------------------------------
ACTION="${1:-deploy}"
case "${ACTION}" in
    deploy)
        TARGET="${2:-auto}"
        cmd_deploy "${TARGET}"
        ;;
    status)
        cmd_status
        ;;
    rollback)
        cmd_rollback
        ;;
    cutover)
        TARGET="${2:-auto}"
        switch_nginx "${TARGET}"
        ;;
    probe)
        TARGET="${2:-$(get_active_slot)}"
        probe_health "${TARGET}"
        ;;
    *)
        echo "Usage: $0 {deploy [auto|blue|green]|status|rollback|cutover <slot>|probe <slot>}"
        exit 1
        ;;
esac
