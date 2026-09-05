# HormuzWatch — On-Premise Jenkins CI/CD & MLOps Deployment Runbook

This runbook provides complete, reproducible instructions for running and operating **Jenkins** directly on the remote host `tunkstun` (`tp24@192.168.1.51`).

---

## 1. Architecture Overview

Instead of relying on external GitHub Cloud runners that cannot reach private LAN IP `192.168.1.51`, Jenkins runs locally on `tunkstun` alongside Docker Engine:

```
                                  INTERNET / GITHUB
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼ (Push Event)                                  ▼ (Manual trigger)
         GitHub Webhook                                     Developer Browser
    (https://jenkins.aburcloud.com)                     (http://192.168.1.51:8085)
                  │                                               │
                  └───────────────────────┬───────────────────────┘
                                          │
                                          ▼
                      ┌──────────────────────────────────────┐
                      │    hormuzwatch-jenkins (Port 8085)   │
                      │  - Runs on tunkstun bare-metal       │
                      │  - Mounts /var/run/docker.sock       │
                      └───────────────────┬──────────────────┘
                                          │ Docker API
                                          ▼
                      ┌──────────────────────────────────────┐
                      │        Docker Compose Engine         │
                      │  - Builds server, ml, and client     │
                      │  - Evaluates Model Gatekeeper        │
                      │  - Zero-downtime hot-reloads         │
                      └──────────────────────────────────────┘
```

---

## 2. Prerequisites & Port Map

* **Host**: `tunkstun` (`Linux Mint 22.2 / Ubuntu 24.04`, Docker Engine `29.7.2`)
* **Jenkins Web UI**: `http://192.168.1.51:8085` (internally port `8080`)
* **Jenkins Agent Port**: `50000`
* **Docker Socket**: `/var/run/docker.sock` with GID `983` (`docker` group on host)

---

## 3. Step-by-Step Deployment Instructions

### Step 1: Connect to `tunkstun`
```bash
ssh tunkstun
# or: ssh tp24@192.168.1.51
```

### Step 2: Navigate to the Jenkins Service Directory
```bash
cd /run/media/tp24/SHARED1/Projects/HormuzWatch/service/jenkins
```

### Step 3: Build and Launch the Jenkins Container
```bash
docker compose up -d --build
```

### Step 4: Verify Container Status & Retrieve Initial Password
```bash
# Verify container is running
docker compose ps

# Retrieve the unlock password
docker compose logs | grep -A 3 "Please use the following password to proceed to installation"
# Or directly view the password file:
docker exec -it hormuzwatch-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

### Step 5: Web UI Setup
1. Open your browser to: `http://192.168.1.51:8085`
2. Paste the initial administrator password.
3. Select **"Install Suggested Plugins"** (installs Git, Pipeline, AnsiColor, Credentials, etc.).
4. Create an Admin User (e.g., `admin`).

---

## 4. Pipeline Jobs Configuration

### Pipeline Job 1: `HormuzWatch-DevOps-Deploy`
This pipeline handles continuous integration, automated testing, container rebuilds, and rollback on `tunkstun`.

1. In Jenkins dashboard, click **"New Item"** $\to$ Name: `HormuzWatch-DevOps-Deploy` $\to$ Select **"Pipeline"** $\to$ Click **OK**.
2. Under **Build Triggers**:
   * Check **"GitHub hook trigger for GITScm polling"** (for automated webhook push triggers).
3. Under **Pipeline definition**:
   * Select: **"Pipeline script from SCM"**
   * SCM: **Git**
   * Repository URL: `/run/media/tp24/SHARED1/Projects/HormuzWatch/.git` (or your remote GitHub URL)
   * Branch Specifier: `*/production-ready` (or `*/main`)
   * Script Path: `Jenkinsfile`
4. Click **Save**.

### Pipeline Job 2: `HormuzWatch-MLOps-Continuous-Training`
This pipeline handles weekly continuous training, Bayesian HPO, model quality gatekeeping, and zero-downtime hot-reloading.

1. Click **"New Item"** $\to$ Name: `HormuzWatch-MLOps-Continuous-Training` $\to$ Select **"Pipeline"** $\to$ Click **OK**.
2. Under **Pipeline definition**:
   * SCM: **Git**
   * Script Path: `Jenkinsfile.mlops`
3. Click **Save**.

---

## 5. Setting Up GitHub Push Webhooks (Optional Ingress)

If you want GitHub pushes to automatically trigger Jenkins:

### Option A: Via Cloudflare Tunnel (Recommended)
Add this route to `service/cloudflared/config.yml`:
```yaml
- hostname: jenkins.aburcloud.com
  service: http://localhost:8085
```
Then in GitHub:
* Go to Repository $\to$ **Settings** $\to$ **Webhooks** $\to$ **Add Webhook**.
* Payload URL: `https://jenkins.aburcloud.com/github-webhook/`
* Content type: `application/json`
* Events: **Pushes**.

### Option B: Local Network Trigger
If triggering builds from local workstations, simply call:
```bash
curl -X POST http://192.168.1.51:8085/job/HormuzWatch-DevOps-Deploy/build
```

---

## 6. Verification & CLI Health Check

Verify that Jenkins can execute Docker commands directly on the host:
```bash
docker exec -it hormuzwatch-jenkins docker ps
docker exec -it hormuzwatch-jenkins docker compose version
```

Both commands should output without permission errors, confirming that the Jenkins container can build and manage the host's `HormuzWatch` containers.
