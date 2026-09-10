# 📝 HormuzWatch DevOps CI/CD Engineering — Complete Session Transcript & Problem-Solving Log

**Project:** HormuzWatch Maritime & Threat Monitoring System  
**Session Goal:** Implement an end-to-end DevOps CI/CD pipeline using Jenkins, integrate SAST linters, secret scanning, container CVE scanning, multi-stage Docker builds, SRE health check gates, zero-downtime rolling deployments, automated rollbacks, configure GitHub Webhook with public ingress, author comprehensive study notes, and generate end-to-end verification reports.  
**Session Date:** September 11, 2026  
**Primary Operators:** Yahya (`yahyaoncloud`), Google DeepMind Advanced Agentic Assistant  

---

## 1. System Context & Setup

- **Host Machine:** `tunkstun` (`100.126.193.36`, Linux x86_64)
- **Public Reverse Proxy:** `LATE5530` (Nginx with SSL termination for `hormuzwatch.aburcloud.com`)
- **Git Repository:** `yahyaoncloud/HormuzWatch` on branch `production-ready`
- **Jenkins Toolchain Container:** `hormuzwatch-jenkins:lts` (custom image bundling Trivy `v0.74.0`, Gitleaks `v8.18.4`, GolangCI-Lint `v1.59.1`, Bandit `v1.9.4`, Flake8 `v7.3.0`, Node.js `20.x`, Docker CLI, and Compose)
- **Jenkins Access:**
  - URL: `http://localhost:8085` / `http://100.126.193.36:8085`
  - Ingress: `https://hormuzwatch.aburcloud.com/github-webhook/`
  - Username: `yahya`
  - Password: `yhy`

---

## 2. Chronological Engineering Phases & Key Issues Resolved

### Phase 1: Toolchain Containerization & Jenkins Setup
- **Action:** Created `service/jenkins/Dockerfile` installing security and SAST binaries into Jenkins LTS JDK17 image, mounted `/var/run/docker.sock` and workspace repository.
- **Action:** Deployed `hormuzwatch-jenkins` on port `8085` via `service/jenkins/docker-compose.yml`.

---

### Phase 2: Ingress & GitHub Webhook Configuration
- **Issue:** GitHub could not reach internal Jenkins on `100.126.193.36:8085` directly from the public Internet.
- **Solution:** Configured Nginx reverse proxy on edge server `LATE5530`:
  ```nginx
  location /github-webhook/ {
      proxy_pass http://100.126.193.36:8085/github-webhook/;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
  }
  ```
- **Validation:** Sent test webhook delivery from GitHub; verified `200 OK` responses.

---

### Phase 3: Pipeline-as-Code (`Jenkinsfile`) & Syntax Resolution
- **Issue 1 (`ansiColor` Option):**
  - *Error:* `Invalid option type "ansiColor". Valid option types: [buildDiscarder, timestamps, timeout, ...]`
  - *Fix:* Replaced `ansiColor('xterm')` with declarative `timestamps()` option.
- **Issue 2 (`@tmp` Permission Error):**
  - *Error:* `java.nio.file.AccessDeniedException: /home/yahya/SHARED/Projects/HormuzWatch@tmp`
  - *Fix:* Removed explicit `dir(env.PROJECT_DIR)` and ran pipeline steps inside Jenkins's native workspace directory.

---

### Phase 4: Container Volume Collision Debugging (Build #4)
- **Error in Build #4:**
  ```
  Error response from daemon: failed to create task for container: failed to create shim task:
  OCI runtime create failed: runc create failed: unable to start container process:
  error mounting "/var/jenkins_home/workspace/Hormuzwatch-Pipeline/service/ml-service/analysis.py" to rootfs at "/app/analysis.py":
  not a directory: Are you trying to mount a directory onto a file (or vice-versa)?
  ```
- **Root Cause Analysis:**
  `docker-compose.dev.yml` had development-mode relative bind-mounts (`./service/ml-service/...`). When `docker compose up -d` was invoked inside the Jenkins container, the host Docker daemon resolved `./...` against the host OS root filesystem where `/var/jenkins_home/workspace/...` does not exist on the host. Docker daemon created directories on the host at those paths and tried to mount them onto single files in the image.
- **Fix:** Refactored `docker-compose.dev.yml` to use pure immutable container builds and named volumes (`ml-models-dev`, `pgdata-dev`, `dataset-worker-data-dev`).

---

### Phase 5: Containerized SRE Health Check Gate Discovery (Build #5 & #6)
- **Issue in Build #5:**
  The health check probe ran `curl -sf http://localhost:10020/health/live` inside the Jenkins container. Because Jenkins runs in an isolated bridge network namespace, `localhost` queried Jenkins itself rather than the Docker host where the ports were mapped.
- **Issue in Build #6:**
  Groovy string interpolation error when trying to escape `$3` in double-quoted strings.
- **Fix in Build #7:**
  Implemented robust dynamic route resolution via Python `/proc/net/route` decoder:
  ```groovy
  def hostIP = '172.18.0.1'
  try {
      def resolved = sh(script: 'python3 -c "import struct; f=open(\'/proc/net/route\').readlines()[1].split()[2]; print(\'.\'.join(str(b) for b in bytes.fromhex(f)[::-1]))" 2>/dev/null', returnStdout: true).trim()
      if (resolved) { hostIP = resolved }
  } catch (Exception e) {
      echo "--> Note: Falling back to default gateway ${hostIP}"
  }
  ```
  And probed across `${hostIP}`, `172.17.0.1`, and `localhost`.

---

### Phase 6: Final Verification (Build #7 `SUCCESS`)
- **Execution Log Highlights:**
  ```
  [Pipeline] { (Automated SRE Health Gate Verification)
  ==> Executing Automated SRE Health Gate (20 attempts x 3s = 60s probe)...
  ==> Target Host Gateway for SRE Health Probes: 172.18.0.1
  Probing services health (attempt 1/20)...
  + curl -sf http://172.18.0.1:10020/health/live
  + curl -sf http://172.18.0.1:8090/health
  + curl -sf -I http://172.18.0.1:3000
  ==> [SRE Gate] All services (Server :10020, ML Service :8090, Client :3000) are HEALTHY!
  ==========================================================
   🚀 HormuzWatch DevOps Deployment SUCCEEDED!              
  ==========================================================
  + docker compose -p hormuzwatch -f docker-compose.dev.yml ps
  NAME                       IMAGE                    STATUS                   PORTS
  hormuzwatch-client-dev     hormuzwatch-client:dev   Up 5 minutes (healthy)   0.0.0.0:3000->3000/tcp
  hormuzwatch-ml-dev         hormuzwatch-ml:dev       Up 5 minutes (healthy)   0.0.0.0:8090-8091->8090-8091/tcp
  hormuzwatch-postgres-dev   postgres:16-alpine       Up 8 minutes (healthy)   0.0.0.0:5433->5432/tcp
  hormuzwatch-server-dev     hormuzwatch-server:dev   Up 5 minutes (healthy)   0.0.0.0:10020->10020/tcp
  Finished: SUCCESS
  ```

---

## 3. Authored Study Modules in `/docs/study/`

1. `06_devops_ci_cd_architecture_and_pipeline_design.md`
2. `07_static_analysis_sast_and_code_smell_detection.md`
3. `08_container_security_image_scanning_and_secret_detection.md`
4. `09_zero_downtime_deployment_strategies_and_automated_rollbacks.md`
5. `10_jenkins_pipeline_engineering_and_webhooks.md`
6. `11_complete_devops_pipeline_end_to_end_report.md`
7. `DEVOPS_AND_CI_CD_STUDY_GUIDE.md`
8. `DEVOPS_CHAT_SESSION_TRANSCRIPT.md`

All files are committed and synchronized in the repository.
