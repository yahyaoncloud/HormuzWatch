# Comprehensive DevOps, CI/CD & DevSecOps Study Guide
**Project**: HormuzWatch Maritime Situational Awareness System  
**Stack**: Go Backend, Python ML Inference & ZenML/MLflow, React Vite Frontend, Docker Compose / Podman Quadlets, Jenkins CI/CD, Aqua Trivy, Gitleaks, GolangCI-Lint, Bandit.

---

## Curriculum & Module Directory

| Module | Title | Primary Focus Areas |
| :--- | :--- | :--- |
| **[Module 01](01_mlops_fundamentals_and_architecture.md)** | MLOps Fundamentals & Architecture | Training vs Serving skew, drift detection, data provenance |
| **[Module 02](02_dataset_versioning_with_dvc.md)** | Dataset Versioning with DVC | Remote storage pointers, git-dvc synchronization |
| **[Module 03](03_model_management_and_registry_mlflow.md)** | Model Management & MLflow | Experiment tracking, model artifacts, transition stages |
| **[Module 04](04_pipeline_orchestration_with_zenml.md)** | Pipeline Orchestration with ZenML | Deterministic steps, caching, metadata store |
| **[Module 05](05_complementary_mlops_tools_ecosystem.md)** | Complementary MLOps Tools | Feast, Great Expectations, Evidently AI, Seldon Core |
| **[Module 06](06_devops_ci_cd_architecture_and_pipeline_design.md)** | DevOps CI/CD Architecture | Declarative pipelines, multi-stage gates, zero-downtime |
| **[Module 07](07_static_analysis_sast_and_code_smell_detection.md)** | Static Analysis & Code Smells | GolangCI-Lint, Bandit AST scanning, ESLint, TypeScript |
| **[Module 08](08_container_security_image_scanning_and_secret_detection.md)** | Container Security & Image Scanning | Gitleaks secret detection, Aqua Trivy CVE scanning |
| **[Module 09](09_zero_downtime_deployment_strategies_and_automated_rollbacks.md)** | Deployment Strategies & Rollbacks | Rolling updates, automated SRE health probes, rollback |
| **[Module 10](10_jenkins_pipeline_engineering_and_webhooks.md)** | Jenkins & GitHub Webhooks | Webhook payload routing, Cloudflare Tunnel ingress, HMAC |

---

## Pipeline Execution Summary Matrix

```
[ Git Push / Webhook Trigger ]
              │
              ▼
  [ Stage 1: Baseline Rollback Capture ] ──> Records git rev-parse HEAD (PREV_COMMIT)
              │
              ▼
  [ Stage 2: Secret Scan (Gitleaks) ] ──> Scans repository tree & history for credentials
              │
              ▼
  [ Stage 3: Parallel SAST Analysis ]
        ├── Go Backend: golangci-lint / go vet
        ├── Python ML: bandit AST / flake8 / ruff
        └── React Frontend: eslint / tsc
              │
              ▼
  [ Stage 4: Artifact & Model Provenance Audit ] ──> SHA256 integrity verification
              │
              ▼
  [ Stage 5: Parallel Unit & Contract Tests ] ──> Data contracts & Go test suites
              │
              ▼
  [ Stage 6: Build Container Images ] ──> Docker Compose Build with BuildKit
              │
              ▼
  [ Stage 7: Container Security Scan (Trivy) ] ──> High/Critical CVE gate
              │
              ▼
  [ Stage 8: Zero-Downtime Rollout ] ──> docker compose up -d --remove-orphans
              │
              ▼
  [ Stage 9: Automated SRE Health Gate ]
        ├── GET http://localhost:10020/health/live (Server)
        ├── GET http://localhost:8090/health (ML Service)
        └── GET http://localhost:3000/ (Client)
              │
        ┌─────┴──────────────────┐
        ▼                        ▼
[ 200 OK: PASS ]         [ Timeout: FAIL ]
 Stack Live & Healthy     Automated Rollback to PREV_COMMIT
```

---

## Key SRE Commands Quick-Reference

- **Run Jenkins Stack**:
  ```bash
  cd /home/yahya/SHARED/Projects/HormuzWatch/service/jenkins
  docker compose up -d --build
  ```
- **Run Secret Scan Locally**:
  ```bash
  gitleaks detect --source . --verbose
  ```
- **Scan Container Vulnerabilities Locally**:
  ```bash
  trivy image --severity HIGH,CRITICAL hormuzwatch-server:latest
  ```
- **Run SRE Diagnostics**:
  ```bash
  ./service/sre/sre.sh health
  ```
