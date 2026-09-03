# HormuzWatch — GitHub Actions CI/CD Pipeline Specification

## Pipeline Flow

```text
[Developer Push / PR]
        │
        ▼
[GitHub Actions Runner]
  ├── Stage 1: Static Code Analysis & Linting (Biome, Go Vet, Flake8)
  ├── Stage 2: Automated Testing (Vitest, Go Test, PyTest)
  ├── Stage 3: Security & Secret Scanning (Trivy, Gitleaks)
  ├── Stage 4: Docker Multi-Stage Image Builds
  └── Stage 5: Remote SSH Deployment to 'tunkstun'
        │
        ├── SSH yahya@tunkstun
        ├── git fetch & checkout release commit
        ├── docker compose build
        ├── docker compose up -d
        ├── Health Check Gate (curl /health)
        │     ├── PASS ──► Release Finalized
        │     └── FAIL ──► Automatic Rollback to HEAD~1
```

---

## Required GitHub Repository Secrets

* `SSH_HOST`: IP or domain of `tunkstun`
* `SSH_USER`: `yahya`
* `SSH_PRIVATE_KEY`: Deployment SSH private key
* `SSH_PORT`: `22` (default)
