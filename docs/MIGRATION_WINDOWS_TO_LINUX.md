# Windows → Linux Migration Guide

## Quick Reference: Command Equivalents

| Windows (PowerShell) | Linux (bash) |
|---------------------|--------------|
| `.\scripts\manage.ps1 start` | `./scripts/manage.sh start` |
| `.\scripts\manage.ps1 stop` | `./scripts/manage.sh stop` |
| `.\scripts\manage.ps1 status` | `./scripts/manage.sh status` |
| `.\scripts\manage.ps1 logs` | `./scripts/manage.sh logs` |
| `.\scripts\manage.ps1 build` | `./scripts/manage.sh build` |
| `.\scripts\manage.ps1 restart` | `./scripts/manage.sh restart` |
| `.\scripts\manage.ps1 tunnel-setup` | `./scripts/manage.sh tunnel-setup` |

## New Linux-Only Commands

```bash
# Install as systemd services (auto-start on boot)
./scripts/manage.sh install

# Remove systemd services
./scripts/manage.sh uninstall

# Create Python virtual environment + install deps
./scripts/manage.sh venv
```

---

## 1. Machine Setup (Ubuntu/Debian)

```bash
# ── System packages ────────────────────────────────
sudo apt update && sudo apt install -y golang-1.23 python3 python3-pip \
    python3-venv curl git build-essential

# ── Clone ──────────────────────────────────────────
git clone https://github.com/your-org/HormuzWatch.git
cd HormuzWatch

# ── Environment ────────────────────────────────────
cp .env.example .env
# Edit .env with your Supabase credentials
vim .env

# ── Build everything ───────────────────────────────
chmod +x scripts/manage.sh
./scripts/manage.sh venv      # Python venv + deps
./scripts/manage.sh build     # Go binary

# ── Install as services ────────────────────────────
sudo ./scripts/manage.sh install
sudo systemctl start hormuzwatch-server
sudo systemctl start hormuzwatch-ml
sudo systemctl enable hormuzwatch-server hormuzwatch-ml

# ── Verify ─────────────────────────────────────────
./scripts/manage.sh status
```

---

## 2. File System Differences

| Path Component | Windows | Linux |
|---------------|---------|-------|
| Binary | `deploy/hormuz-server.exe` | `deploy/hormuz-server` |
| PID files | `build/pids/server.pid` | `build/pids/server.pid` |
| Logs | `build/logs/server.log` | `build/logs/server.log` (or `journalctl`) |
| Cloudflared config | `%USERPROFILE%\.cloudflared\` | `/etc/cloudflared/` |
| Service manager | Task Scheduler | systemd |
| .env location | `deploy/.env` | `deploy/.env` (same) |

---

## 3. systemd Service Units

After running `./scripts/manage.sh install`, two service units are created:

**Go Backend:**
```
/etc/systemd/system/hormuzwatch-server.service
```
- Runs as `Type=simple`
- Restart on failure after 5 seconds
- Logs to `build/logs/server.log`
- Port: `${PORT:-10020}`

**Python ML:**
```
/etc/systemd/system/hormuzwatch-ml.service
```
- Runs as `Type=simple`
- Restart on failure after 3 seconds
- Logs to `build/logs/ml-service.log`
- Port: `${ML_PORT:-8090}` (API), `${GRPC_PORT:-8091}` (gRPC)

**Management:**
```bash
systemctl status hormuzwatch-server
systemctl status hormuzwatch-ml

systemctl restart hormuzwatch-server
systemctl stop hormuzwatch-ml
journalctl -u hormuzwatch-server -f   # tail logs
```

---

## 4. Cloudflare Tunnel (Linux)

```bash
# Install
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
    -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create hormuzwatch

# Route DNS
cloudflared tunnel route dns hormuzwatch api.hormuzwatch.app

# Config
sudo mkdir -p /etc/cloudflared
sudo vim /etc/cloudflared/config.yml
```

```yaml
# /etc/cloudflared/config.yml
tunnel: <tunnel-uuid>
credentials-file: /etc/cloudflared/<tunnel-uuid>.json

ingress:
  - hostname: api.hormuzwatch.app
    service: http://localhost:10020
  - service: http_status:404
```

```bash
# Install as systemd service
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

---

## 5. CI/CD

Two workflows exist:

| Workflow | Runs On | Shell | When to Use |
|----------|---------|-------|-------------|
| `backend-ci.yml` | `self-hosted` (Windows) | PowerShell | Current setup — deploys locally |
| `backend-ci-linux.yml` | `ubuntu-latest` | bash | Linux build verification + artifact upload |

The Linux workflow builds and uploads artifacts (no deploy) — use it for PR validation. After migration, switch the self-hosted runner to your Linux machine.

---

## 6. Python ML Service

The Python CLI (`ml_cli.py`) is cross-platform — same commands work on both OS:

```bash
# Linux
python3 ml_cli.py serve --port 8090
python3 ml_cli.py status
python3 ml_cli.py stop

# Windows (same commands)
python ml_cli.py serve --port 8090
python ml_cli.py status
python ml_cli.py stop
```

---

## 7. Environment Variables

Same across both platforms:

| Variable | Default | Notes |
|----------|---------|-------|
| `PORT` | `10020` | Go REST API port |
| `ML_PORT` | `8090` | Python FastAPI port |
| `GRPC_PORT` | `8091` | Python gRPC port |
| `DATABASE_URL` | (from .env) | Supabase PostgreSQL connection |
| `SUPABASE_URL` | (from .env) | For frontend auth |
| `SUPABASE_ANON_KEY` | (from .env) | For frontend auth |

---

## 8. Health Check Endpoints

Identical responses on both platforms:

| Endpoint | Platform |
|----------|----------|
| `GET http://localhost:10020/health` | Go Backend |
| `GET http://localhost:8090/health` | Python ML |
| `GET http://localhost:10020/public/news/pipeline/status` | Pipeline metrics |

---

## 9. Migration Checklist

- [ ] Clone repo on Linux machine
- [ ] Copy `.env` from Windows machine (or create fresh)
- [ ] `./scripts/manage.sh venv` — Python venv
- [ ] `./scripts/manage.sh build` — Go binary
- [ ] Test: `./scripts/manage.sh start` → `./scripts/manage.sh status`
- [ ] Verify: `curl localhost:10020/health`
- [ ] `sudo ./scripts/manage.sh install` — systemd units
- [ ] `sudo systemctl enable hormuzwatch-server hormuzwatch-ml`
- [ ] Reboot test — services auto-start
- [ ] Cloudflare tunnel setup
- [ ] Switch DNS to new server
- [ ] Verify: `curl https://api.hormuzwatch.app/health`
- [ ] Shut down Windows services
