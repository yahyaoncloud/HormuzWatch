#!/usr/bin/env bash
# HormuzWatch — Automated K3s Worker Node Join Script for tp24 (Dev Worker)
# Usage: sudo bash join_tp24_worker.sh
set -euo pipefail

CONTROL_PLANE_IP="${CONTROL_PLANE_IP:-192.168.1.46}"
CONTROL_PLANE_PORT="${CONTROL_PLANE_PORT:-6443}"
NODE_IP="${NODE_IP:-192.168.1.35}"
K3S_TOKEN="${K3S_TOKEN:-}"

if [[ -z "${K3S_TOKEN}" ]]; then
    echo "[!] Error: K3S_TOKEN environment variable must be set."
    echo "Usage: K3S_TOKEN=<token> sudo -E bash join_tp24_worker.sh"
    exit 1
fi

echo "[*] Step 1: Preventing system sleep/suspend on tp24..."
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target

echo "[*] Step 2: Testing connectivity to Control Plane (${CONTROL_PLANE_IP}:${CONTROL_PLANE_PORT})..."
curl -sk "https://${CONTROL_PLANE_IP}:${CONTROL_PLANE_PORT}/ping" >/dev/null && echo "[✓] Control plane reachable" || {
    echo "[!] Cannot reach Control Plane at https://${CONTROL_PLANE_IP}:${CONTROL_PLANE_PORT}!"
    exit 1
}

echo "[*] Step 3: Installing K3s Agent with node labels (environment=dev, tier=build-runner)..."
curl -sfL https://get.k3s.io | \
    K3S_URL="https://${CONTROL_PLANE_IP}:${CONTROL_PLANE_PORT}" \
    K3S_TOKEN="${K3S_TOKEN}" \
    INSTALL_K3S_EXEC="agent --node-ip ${NODE_IP} --node-label environment=dev --node-label tier=build-runner" \
    sh -

echo "[*] Step 4: Verifying k3s-agent service status..."
sudo systemctl status k3s-agent --no-pager | head -n 15

echo "[✓] tp24 joined successfully as Kubernetes Dev Worker node!"
echo "Run on Control Plane (tunkstun): kubectl label node tp24 node-role.kubernetes.io/worker=true node-role.kubernetes.io/dev=true"
