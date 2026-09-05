#!/usr/bin/env bash
# ==============================================================================
# HormuzWatch: Automated Portability & Deployment Runner
# Orchestrates fresh provisioning, runtime installation, registry deployment,
# and stack startup on ANY target machine (bare-metal, VM, cloud, local).
# ==============================================================================
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Defaults
TARGET_HOST=""
TARGET_USER="$(whoami)"
TARGET_DIR=""
SSH_KEY=""
LOCAL_RUN=false
WITH_REGISTRIES=true
PLAYBOOK="$SCRIPT_DIR/playbooks/site.yml"
EXTRA_ARGS=()

show_help() {
  cat << 'HELP'
HormuzWatch Portability & Fresh Bootstrap CLI

Usage:
  ./ansible/deploy_portable.sh [OPTIONS]

Options:
  -t, --target <IP/HOST>       Target server IP address or hostname
  -u, --user <USER>            SSH user on target server (default: current user)
  -k, --key <KEY_PATH>         SSH private key path
  -d, --dir <DIR>              Project installation directory on target
  -l, --local                  Deploy locally on this workstation (localhost)
  -r, --with-registries        Deploy Private Docker & ML Model Registry (default: true)
  -p, --playbook <PATH>        Specific Ansible playbook to run
  -n, --dry-run                Perform trial run with no changes made (--check)
  -h, --help                   Show this help message

Examples:
  # 1. Bootstrap a fresh remote server (e.g. 192.168.1.51)
  ./ansible/deploy_portable.sh -t 192.168.1.51 -u yahya -k ~/.ssh/id_ed25519_tnkstn

  # 2. Deploy locally on current machine
  ./ansible/deploy_portable.sh --local

  # 3. Fast container stack up on existing host
  ./ansible/deploy_portable.sh -t 192.168.1.51 -u yahya -p ansible/playbooks/deploy_docker.yml
HELP
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -t|--target) TARGET_HOST="$2"; shift 2 ;;
    -u|--user) TARGET_USER="$2"; shift 2 ;;
    -k|--key) SSH_KEY="$2"; shift 2 ;;
    -d|--dir) TARGET_DIR="$2"; shift 2 ;;
    -l|--local) LOCAL_RUN=true; shift ;;
    -r|--with-registries) WITH_REGISTRIES=true; shift ;;
    --no-registries) WITH_REGISTRIES=false; shift ;;
    -p|--playbook) PLAYBOOK="$2"; shift 2 ;;
    -n|--dry-run) EXTRA_ARGS+=("--check"); shift ;;
    -h|--help) show_help ;;
    *) EXTRA_ARGS+=("$1"); shift ;;
  esac
done

echo "================================================================"
echo "    🌊 HormuzWatch — Universal Portability & Deployment Runner  "
echo "================================================================"

# Verify Ansible installed
if ! command -v ansible-playbook >/dev/null 2>&1; then
  echo "[-] ansible-playbook not found in PATH."
  echo "[*] Checking for python3-venv / pip..."
  if command -v pip3 >/dev/null 2>&1; then
    echo "[*] Installing ansible-core via pip..."
    pip3 install --user ansible-core
    export PATH="$HOME/.local/bin:$PATH"
  else
    echo "[!] Please install Ansible: sudo apt-get install -y ansible"
    exit 1
  fi
fi

if [[ "$LOCAL_RUN" == true ]]; then
  TARGET_HOST="localhost"
  TARGET_DIR="${TARGET_DIR:-$PROJECT_ROOT}"
  TARGET_USER="$(whoami)"
  INVENTORY_PARAM="localhost,"
  CONNECTION_ARG="-c local"
  echo "==> Mode: Local Workstation"
  echo "==> Target Directory: $TARGET_DIR"
else
  if [[ -z "$TARGET_HOST" ]]; then
    # Interactive prompt if target not supplied
    read -rp "Enter target host IP or hostname (or 'local'): " TARGET_HOST
    if [[ "$TARGET_HOST" == "local" || "$TARGET_HOST" == "localhost" ]]; then
      LOCAL_RUN=true
      TARGET_HOST="localhost"
      TARGET_DIR="${TARGET_DIR:-$PROJECT_ROOT}"
      TARGET_USER="$(whoami)"
      INVENTORY_PARAM="localhost,"
      CONNECTION_ARG="-c local"
    fi
  fi
fi

if [[ "$LOCAL_RUN" != true ]]; then
  TARGET_DIR="${TARGET_DIR:-/home/$TARGET_USER/SHARED/Projects/HormuzWatch}"
  INVENTORY_PARAM="$TARGET_HOST,"
  CONNECTION_ARG=""
  
  SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
  if [[ -n "$SSH_KEY" ]]; then
    SSH_OPTS="$SSH_OPTS -i $SSH_KEY"
    EXTRA_ARGS+=("--private-key" "$SSH_KEY")
  fi

  echo "==> Target Host:      $TARGET_HOST"
  echo "==> Target User:      $TARGET_USER"
  echo "==> Target Directory: $TARGET_DIR"
  echo "==> Testing SSH reachability..."
  if ! ssh -q $SSH_OPTS "$TARGET_USER@$TARGET_HOST" "echo OK" >/dev/null 2>&1; then
    echo "[!] Warning: Direct SSH test to $TARGET_USER@$TARGET_HOST did not respond instantly."
    echo "    Continuing with Ansible connection check..."
  else
    echo "[✓] SSH connectivity verified!"
  fi
fi

echo "==> Selected Playbook: $PLAYBOOK"
echo "==> Executing Ansible..."

ansible-playbook \
  -i "$INVENTORY_PARAM" \
  $CONNECTION_ARG \
  -u "$TARGET_USER" \
  -e "ansible_user=$TARGET_USER" \
  -e "target_project_dir=$TARGET_DIR" \
  "$PLAYBOOK" \
  "${EXTRA_ARGS[@]}"

echo ""
echo "================================================================"
echo " [✓] HormuzWatch deployment execution completed successfully!   "
echo "================================================================"
