# ❄️ HormuzWatch Disaster Recovery & Cold Start Runbook

> **Target SLA**: Recover and run the complete HormuzWatch platform on a blank, freshly installed Ubuntu 22.04/24.04 or Debian 12 machine in **under 5 minutes**.

---

## 🧭 Pre-Flight Checklist

Before initiating the cold start, ensure you have:
1. An SSH-accessible server with root/sudo access.
2. Network egress to pull base OS packages and Git repositories (or access to local LAN mirror).
3. The server IP address and SSH credentials.

---

## 🚀 Execution Options

You can perform the cold start via **Automated Ansible Runner** (Recommended) or **Manual Cold Start Commands**.

---

## Option 1: Automated Cold Start via Ansible (Recommended)

From the control machine (or workstation), run a single command:

```bash
cd /home/tp24/SHARED/Projects/HormuzWatch

./ansible/deploy_portable.sh \
  --target <SERVER_IP> \
  --user <SSH_USER> \
  --key <PATH_TO_SSH_KEY>
```

### What this executes autonomously:
1. **OS Prep**: Installs `curl`, `git`, `htop`, `jq`, `rsync`, `python3-pip`, `build-essential`.
2. **Kernel Tuning**: Tunes `fs.file-max` and `vm.max_map_count` for high throughput streaming.
3. **Docker Engine**: Installs official Docker CE, Buildx, Compose v2, and sets log rotation limits.
4. **Registries**: Starts Private Docker Registry (:5000) and MinIO Model Registry (:9000).
5. **Core Stack**: Brings up `postgres`, `server`, `ml`, and `client` via Docker Compose.
6. **Health Gates**: Verifies HTTP 200 on all endpoints before declaring success.

---

## Option 2: Manual Cold Start SOP (Step-by-Step)

If Ansible is unavailable, execute these steps directly on the target server.

### Step 1: Clone Repository
```bash
git clone -b production-ready https://github.com/Yahya-al-Hajji/HormuzWatch.git /opt/hormuzwatch
cd /opt/hormuzwatch
```

### Step 2: Install Docker CE & Compose
```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

### Step 3: Configure Environment Variables
```bash
cp .env.example .env
# Verify DATABASE_URL, OPENROUTER_API_KEY, and secrets
cat .env
```

### Step 4: Verify Model Artifacts & Dataset Integrity
```bash
python3 scripts/model_registry.py verify
python3 scripts/dataset_registry.py list
```

### Step 5: Start the Container Stack
```bash
docker compose -f docker-compose.dev.yml up -d --build
```

### Step 6: Verify Service Health
```bash
# SRE automated health audit
./service/sre/sre.sh health

# Inspect logs
./service/sre/sre.sh logs --level=error
```

---

## 🔍 Post-Deployment Verification Matrix

| Endpoint | Expected Result | Command |
| :--- | :--- | :--- |
| **Go Backend Live** | `HTTP 200 OK` | `curl -i http://localhost:10020/health/live` |
| **ML Inference Engine** | `HTTP 200 OK` (6/6 models) | `curl -i http://localhost:8090/health` |
| **Client Web SPA** | `HTTP 200 OK` | `curl -i http://localhost:3000` |
| **PostgreSQL Database** | Port `5433` open & accepting queries | `docker exec -it hormuzwatch-postgres-dev pg_isready -U postgres` |
| **Public Stream Metrics** | JSON telemetry counter | `curl -s http://localhost:10020/public/metrics` |

---

## 🛑 Disaster Troubleshooting

### Port 10020 or 5433 already in use:
```bash
# Check rogue processes on host
sudo ss -tulpn | grep -E '10020|5433|8090|3000'
# If a legacy systemd service is occupying the port:
systemctl --user stop hormuzwatch-ingestion.service || true
```

### Database authentication failure:
Ensure `DATABASE_URL` inside `.env` uses URL-encoded credentials if passwords contain special characters:
`postgresql://postgres:Yahya%40123@postgres:5432/hormuzwatch?sslmode=disable`
