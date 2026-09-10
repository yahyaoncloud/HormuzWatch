# 🛡️ HormuzWatch DevOps Pipeline — Critical Issue Analysis & Architectural Audit Report

**Document ID:** `HW-DEVOPS-AUDIT-2026-001`  
**Classification:** Engineering & SRE Deep-Dive  
**Target Systems:** Jenkins CI Controller (`tunkstun` - `100.126.193.36`), Deployment Edge Node (`E5530` - `100.66.64.31`), Nginx Ingress (`hormuzwatch.aburcloud.com`), GitHub Webhooks  
**Repository Branch:** `production-ready`  
**Date:** September 11, 2026  

---

## 1. Executive Summary

A comprehensive architectural, security, and operational audit of the HormuzWatch Continuous Integration & Continuous Deployment (CI/CD) pipeline was conducted. The pipeline integrates GitHub webhooks, multi-stage declarative Jenkins pipelines, static code analysis (GolangCI-Lint, Bandit, Flake8, ESLint), vulnerability scanning (Aqua Trivy, Gitleaks), Docker container builds, automated remote rollout over Tailscale, and SRE health probing.

While the pipeline establishes automated end-to-end flow and successfully deployed Build #10 on Java 21 LTS, the audit identified **3 Critical (P0)**, **3 High (P1)**, and **2 Medium (P2)** design flaws and vulnerabilities. These range from disconnected artifact delivery ("ghost builds") and masked quality gates (`|| true`), to flawed rollback mechanics, root-equivalent Docker daemon exposure, and unauthenticated public API ingress.

```mermaid
pie title Issue Severity Breakdown
    "P0 - Critical Blocker" : 3
    "P1 - High Security / Ops" : 3
    "P2 - Medium Tactical" : 2
```

---

## 2. Risk & Severity Matrix

| Issue ID | Severity | Category | Flaw / Anti-Pattern | Operational / Security Impact |
| :--- | :--- | :--- | :--- | :--- |
| **AUDIT-01** | **P0 - Critical** | CI/CD Architecture | **Disconnected Artifact Delivery ("Ghost Builds")** | CI builds & scans images on `tunkstun`, but never pushes to a registry. Target `E5530` runs unverified local builds or stale images. |
| **AUDIT-02** | **P0 - Critical** | DevSecOps / Quality | **Masked Quality Gates (`\|\| true` Blindness)** | All SAST, linters, CVE scanners, and tests swallow exit codes. Broken code and critical CVEs still yield a green build. |
| **AUDIT-03** | **P0 - Critical** | SRE / Resilience | **Flawed Automated Rollback Logic** | `PREV_COMMIT` is captured *after* checking out new commit. On failure, rollback checks out the same broken commit. |
| **AUDIT-04** | **P1 - High** | Security / Least Privilege | **Docker Daemon Socket Mounting (`/var/run/docker.sock`)** | Mounting host Docker socket into Jenkins master grants complete root escape on host `tunkstun`. |
| **AUDIT-05** | **P1 - High** | Production Security | **Insecure Dev Defaults on Public Edge Node** | `docker-compose.dev.yml` deployed on public edge with `AUTH_DISABLED=true` and hardcoded Postgres credentials `Yahya@123`. |
| **AUDIT-06** | **P1 - High** | Zero-Downtime SRE | **In-Place Recreate Causes Traffic Downtime** | `docker compose up -d` tears down old containers before new ones bind ports; triggers HTTP 502 errors during model loading. |
| **AUDIT-07** | **P2 - Medium** | Ingress Architecture | **Circular Ingress Mesh & Tailscale SPOF** | Ingress webhook bounces from E5530 -> tunkstun -> E5530. If Tailscale or E5530 falters, CI triggers freeze entirely. |
| **AUDIT-08** | **P2 - Medium** | Database Lifecycle | **Missing Automated Database Schema Migrations** | Pipeline does not version or migrate PostgreSQL tables; schema mismatches crash the backend after git deployments. |

---

## 3. In-Depth Technical Issue Analysis

```mermaid
flowchart TD
    subgraph Host1["CI Master: tunkstun (100.126.193.36)"]
        J[Jenkins Pipeline]
        S[Builds Images Locally]
        T[Trivy Scans Images]
        G[Gitleaks / SAST with || true]
        SOCK["/var/run/docker.sock (Root Escape)"]
    end

    subgraph Registry["Container Registry (GHCR / Harbor)"]
        MISSING[("❌ MISSING REGISTRY\nImages never pushed!")]
    end

    subgraph Host2["Edge Node: E5530 (100.66.64.31)"]
        GIT[Git Pull Production-Ready]
        COMP[docker compose up -d]
        STALE["Runs Stale / Disconnected Images!"]
        DEV["AUTH_DISABLED=true\nHardcoded DB Password"]
    end

    J -->|Stage: Build| S
    S -->|Scan| T
    J -.->|Never Pushes| MISSING
    J -->|SSH git pull| GIT
    GIT --> COMP
    COMP --> STALE
    COMP --> DEV

    classDef danger fill:#fee,stroke:#e11,stroke-width:2px;
    class MISSING,STALE,DEV,SOCK danger;
```

---

### Issue AUDIT-01: Disconnected Artifact Delivery & The "Ghost Build" Anti-Pattern (Severity: P0)

#### Root Cause Analysis
In `Jenkinsfile`, lines 191–198:
```groovy
stage('Build Container Images') {
    steps {
        script {
            def buildFlags = params.FORCE_REBUILD ? '--no-cache' : ''
            sh "docker compose -p ${env.COMPOSE_PROJECT_NAME} -f ${env.COMPOSE_FILE} build ${buildFlags} server ml client"
        }
    }
}
```
And lines 224–231:
```groovy
stage('Zero-Downtime Rollout') {
    steps {
        sh '''
            ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} "cd ${DEPLOY_DIR} && git pull origin ${BRANCH_NAME} && docker compose -p ${COMPOSE_PROJECT_NAME} -f ${COMPOSE_FILE} up -d --remove-orphans"
        '''
    }
}
```

#### The Defect
1. Jenkins uses CPU and RAM on `tunkstun` to build Docker images (`hormuzwatch-server:dev`, `hormuzwatch-ml:dev`, `hormuzwatch-client:dev`).
2. Aqua Trivy then scans these local images on `tunkstun`.
3. **The built and scanned images are NEVER pushed to any OCI registry** (such as GitHub Container Registry `ghcr.io` or a local registry).
4. Jenkins then connects via SSH to `E5530` and executes `git pull` followed by `docker compose up -d`.
5. **Critique:** On `E5530`, `docker compose up -d` looks for local images. If an image with that tag exists, **it does NOT rebuild it** (unless `--build` is passed). If it does rebuild, it builds on `E5530` without being scanned by Trivy!
6. **Result:** The artifacts running on `E5530` are completely decoupled from the artifacts built and audited on `tunkstun`. This violates the cardinal rule of DevOps: *"Build once, test, sign, and promote the exact same immutable artifact."*

---

### Issue AUDIT-02: Masked Quality Gates & Security Scanners (`|| true` Blindness) (Severity: P0)

#### Root Cause Analysis
Throughout `Jenkinsfile`, every single automated gate appends `|| true` or suppresses non-zero exit codes:
- **Gitleaks (Line 70):** `gitleaks detect ... || true`
- **GolangCI-Lint (Line 90):** `golangci-lint run ./... || true`
- **Go Vet (Line 92):** `go vet ./... || true`
- **Bandit SAST (Line 104):** `bandit -r service/ml-service mlops -ll -ii || true`
- **Flake8 (Line 107):** `flake8 ... || true`
- **ESLint (Line 120):** `npm run lint 2>/dev/null || ... || echo "..."`
- **ML Model Registry (Line 135):** `python3 scripts/model_registry.py verify || true`
- **Go Unit Tests (Line 169):** `go test -v ./... || true`
- **Trivy Vulnerability Scan (Line 213, 215):** `trivy image ... || true`

#### The Defect
- The CI pipeline provides a **false sense of security**. If an engineer commits code with:
  1. Leaked private AWS / Supabase keys,
  2. Severe SQL injection or remote code execution (RCE) flaws detected by Bandit/Go Vet,
  3. A broken unit test in the Go server, or
  4. A container base image with active Critical CVEs,
- The pipeline prints the error in stdout, ignores the return code, logs `SUCCESS`, and pushes the vulnerable code directly to the production node `E5530`.

---

### Issue AUDIT-03: Flawed Automated Rollback Logic (Severity: P0)

#### Root Cause Analysis
In `Jenkinsfile`, lines 54–57:
```groovy
stage('Initialize & Baseline Rollback') {
    steps {
        script {
            env.PREV_COMMIT = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
            echo "==> Rollback baseline captured: ${env.PREV_COMMIT}"
        }
    }
}
```
In lines 274–285:
```groovy
post {
    failure {
        sh """
            if [ -n "${env.PREV_COMMIT}" ] && [ "${env.PREV_COMMIT}" != "null" ]; then
                ssh -o StrictHostKeyChecking=no ${env.DEPLOY_USER}@${env.DEPLOY_HOST} "cd ${env.DEPLOY_DIR} && git checkout ${env.PREV_COMMIT} && docker compose -p ${env.COMPOSE_PROJECT_NAME} -f ${env.COMPOSE_FILE} up -d"
            fi
        """
    }
}
```

#### The Defect
1. **Wrong Baseline Captured:** Jenkins checks out the repository *before* running pipeline stages. Therefore, `git rev-parse HEAD` on line 54 captures the **incoming commit** that was just triggered, NOT the commit currently running stably on `E5530`.
2. **Identical Rollback Target:** If the SRE Health Gate fails on line 253, Jenkins runs `git checkout ${env.PREV_COMMIT}` on `E5530`. It checks out the exact same bad commit that just caused the failure!
3. **No Container Rebuild on Rollback:** `docker compose up -d` without `--build` or explicit image digest pinning will continue running the newly created faulty container.
4. **Stateful Schema Inconsistency:** If a database schema change was partially applied during the bad rollout, code rollback leaves the PostgreSQL database in an inconsistent state.

---

### Issue AUDIT-04: Docker Daemon Socket Mounting (`/var/run/docker.sock`) (Severity: P1)

#### Root Cause Analysis
In `service/jenkins/docker-compose.yml`, line 19:
```yaml
volumes:
  - jenkins_data:/var/jenkins_home
  - /var/run/docker.sock:/var/run/docker.sock
  - /home/yahya/SHARED/Projects/HormuzWatch:/home/yahya/SHARED/Projects/HormuzWatch
```

#### The Defect
- Mounting `/var/run/docker.sock` from `tunkstun` into the container provides root-equivalent authority over the host operating system.
- Any Jenkins user, compromised plugin, or script execution step in a Jenkinsfile can execute:
  ```bash
  docker run -v /:/host-root alpine chroot /host-root useradd -m backdoor
  ```
- Additionally, mounting the host path `/home/yahya/SHARED/Projects/HormuzWatch` breaks container isolation and enables race conditions between local developer edits on `tunkstun` and background Jenkins workspace builds.

---

### Issue AUDIT-05: Insecure Dev Defaults on Public Edge Node (Severity: P1)

#### Root Cause Analysis
In `Jenkinsfile`, lines 35 & 228, the pipeline mandates:
```groovy
COMPOSE_FILE = 'docker-compose.dev.yml'
```
Examining `docker-compose.dev.yml`:
```yaml
server:
  environment:
    - GIN_MODE=debug
    - AUTH_DISABLED=true
    - DATABASE_URL=postgresql://postgres:Yahya%40123@postgres:5432/hormuzwatch?sslmode=disable
```

#### The Defect
- The target machine `E5530` is connected to the public internet via Cloudflare and Nginx (`hormuzwatch.aburcloud.com`).
- By deploying `docker-compose.dev.yml` instead of a production profile:
  1. `AUTH_DISABLED=true` exposes all private radar and telemetry mutation endpoints without JWT or session verification.
  2. Plaintext default passwords (`Yahya@123`) are active on an exposed PostgreSQL database port (`5433`).
  3. `GIN_MODE=debug` exposes verbose stack traces, environment internals, and memory addresses upon unhandled panics.

---

### Issue AUDIT-06: In-Place Recreate Causes Traffic Downtime ("Zero-Downtime" Illusion) (Severity: P1)

#### Root Cause Analysis
The pipeline titles Stage 7 as `Zero-Downtime Rollout`, executing:
```bash
docker compose -p hormuzwatch -f docker-compose.dev.yml up -d --remove-orphans
```

#### The Defect
- Standard Docker Compose executes an **in-place recreation**:
  1. Docker sends `SIGTERM` to the old Go backend container and ML service.
  2. The old containers stop, immediately releasing ports `10020` and `8090`.
  3. Docker creates and starts the new containers.
  4. The Go server initializes database pools (1–3s).
  5. The ML service loads Python libraries (PyTorch/Scikit-learn) and unpickles model weights (8–15s).
- **Impact:** For a window of **10 to 25 seconds**, any traffic arriving at `https://hormuzwatch.aburcloud.com` receives `502 Bad Gateway` from Nginx. This is not zero-downtime; it is an uncoordinated service outage on every commit.

---

### Issue AUDIT-07: Distributed Ingress Circular Mesh & Single Point of Failure (SPOF) (Severity: P2)

#### Architectural Trace
```
GitHub -> Public Webhook -> E5530 (Nginx :443) -> Tailscale -> tunkstun (Jenkins :8085) -> Tailscale SSH -> E5530 (Deploy)
```

#### The Defect
1. **Circular Dependency:** Node `E5530` hosts the public Nginx proxy that ingests GitHub webhooks. Node `tunkstun` processes the build, and then must SSH *back* to `E5530` to apply updates.
2. If `E5530` crashes or has a faulty container rollout that saturates its CPU/memory, Nginx fails. Consequently, GitHub webhooks cannot reach `tunkstun`, preventing automated pipeline triggers to remediate the node.
3. The pipeline relies entirely on the Tailscale mesh overlay (`100.66.64.31` and `100.126.193.36`). Any transient Tailscale node re-keying or DERP relay disconnection causes SSH deployment commands or health probes to timeout and fail.

---

### Issue AUDIT-08: Missing Automated Database Schema Migrations (Severity: P2)

#### Root Cause Analysis
- HormuzWatch relies on relational PostgreSQL tables (`vessels`, `telemetry_records`, `geofence_events`).
- The CI/CD pipeline contains no database migration stage (e.g. `golang-migrate`, Flyway, or Liquibase).
- If a developer commits a code change in `server` that queries a newly added database column, Jenkins will successfully deploy the binary to `E5530`. However, because the database container runs against an existing persistent volume (`pgdata-dev`), the table schema remains unchanged.
- The server will immediately crash with runtime SQL query errors (`column "xyz" does not exist`), failing the SRE health gate.

---

## 4. Remediation Action Plan

```mermaid
gantt
    title DevOps Remediation Roadmap
    dateFormat  YYYY-MM-DD
    section Phase 1 - Immediate Hotfixes
    Fix Rollback Baseline Logic             :done, 2026-09-11, 1d
    Enforce Quality Gates (Remove || true)  :active, 2026-09-12, 2d
    Sanitize Production Credentials & Auth  :active, 2026-09-12, 1d
    section Phase 2 - Architecture Upgrades
    Set up OCI Registry (GHCR)              :2026-09-14, 3d
    Implement Blue/Green Nginx Switching   :2026-09-17, 3d
    Automate DB Migrations (golang-migrate) :2026-09-20, 2d
    section Phase 3 - Security & Hardening
    Isolate Jenkins with Kaniko / DinD       :2026-09-22, 4d
    Deploy Dedicated Webhook Proxy (SPOF fix):2026-09-26, 3d
```

### Immediate Phase 1: Critical Hotfixes (Day 1–3)

1. **Correct Rollback Target:**
   Query the target machine for its currently deployed commit *before* pulling:
   ```groovy
   script {
       env.PREV_COMMIT = sh(
           script: "ssh -o StrictHostKeyChecking=no ${env.DEPLOY_USER}@${env.DEPLOY_HOST} 'cd ${env.DEPLOY_DIR} && git rev-parse HEAD'",
           returnStdout: true
       ).trim()
       echo "==> Live running baseline on target node captured: ${env.PREV_COMMIT}"
   }
   ```
2. **Activate Quality & Security Gates:**
   Remove `|| true` on security-critical scans. Allow informational linters to warn, but block on high-severity security issues and test failures:
   ```groovy
   sh 'trivy image --exit-code 1 --severity CRITICAL --no-progress "$img"'
   sh 'cd server && go test -race -v ./...'
   sh 'gitleaks detect --source . --verbose'
   ```
3. **Switch to Production Compose on E5530:**
   Update `COMPOSE_FILE = 'docker-compose.yml'` (or configure environment overrides via Jenkins Credentials Store) to ensure `AUTH_DISABLED=false` and secure database credentials.

---

### Phase 2: Architectural Realignment (Week 1–2)

1. **Deploy OCI Registry (GHCR or Private Harbor):**
   - Jenkins builds images on `tunkstun` tagged with git commit SHA (`ghcr.io/yahyaoncloud/hormuzwatch-server:sha-${GIT_COMMIT}`).
   - Jenkins pushes images to GHCR after Trivy scans pass.
   - `E5530` pulls the exact signed, audited image digest. No code builds occur on `E5530`.
2. **True Zero-Downtime Blue/Green Rollout:**
   - Deploy dual container sets (`blue` on `:10020`, `green` on `:10021`).
   - Start Green -> Wait for ML models to warm up -> Verify `/health` on Green -> Atomically reload Nginx upstream -> Terminate Blue.
3. **Automate Database Migrations:**
   - Add a pre-deployment migration stage:
     ```bash
     migrate -path ./server/migrations -database "$DATABASE_URL" up
     ```

---

### Phase 3: Infrastructure Hardening (Week 3–4)

1. **Remove `/var/run/docker.sock` Mount:**
   - Migrate container builds to rootless **Kaniko** or **Buildah** within Kubernetes/Docker pods, eliminating host root escalation risks.
2. **Decouple Webhook Ingress:**
   - Terminate webhooks directly on a dedicated cloud endpoint (e.g. Cloudflare Worker or direct reverse proxy on `tunkstun`), decoupling CI trigger availability from target node `E5530` health.

---

## 5. Summary & Sign-Off

The HormuzWatch pipeline represents a functional, highly sophisticated automated deployment system spanning physical edge infrastructure. By addressing the critical disconnect between build artifacts and runtime deployments, enforcing genuine quality gates, and securing production credentials, the platform will achieve enterprise-grade resilience, zero-downtime reliability, and verifiable DevSecOps posture.
