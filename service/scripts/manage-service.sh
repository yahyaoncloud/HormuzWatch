#!/usr/bin/env bash
# HormuzWatch — Service & Cloudflared Tunnel Management Script
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="${SERVICE_DIR}/cloudflared/config.yml"

action="${1:-status}"

case "$action" in
  install)
    echo "==> Installing Cloudflared systemd service..."
    sudo cp "$CONFIG_FILE" /etc/cloudflared/config.yml
    sudo systemctl daemon-reload
    sudo systemctl enable --now cloudflared
    echo "==> Cloudflared service installed and active."
    ;;
  restart|reload)
    echo "==> Updating /etc/cloudflared/config.yml..."
    sudo cp "$CONFIG_FILE" /etc/cloudflared/config.yml
    sudo systemctl restart cloudflared
    echo "==> Cloudflared service restarted."
    ;;
  status)
    echo "==> Checking Cloudflared service status..."
    sudo systemctl status cloudflared --no-pager || true
    ;;
  verify)
    echo "==> Verifying Public Endpoints..."
    echo -n "Checking https://hormuzwatch.aburcloud.com ... "
    curl -skI https://hormuzwatch.aburcloud.com | head -n 1 || echo "Unreachable"
    echo -n "Checking https://api.hormuzwatch.aburcloud.com/health ... "
    curl -sk https://api.hormuzwatch.aburcloud.com/health || echo "Unreachable"
    echo ""
    ;;
  *)
    echo "Usage: $0 {install|restart|status|verify}"
    exit 1
    ;;
esac
