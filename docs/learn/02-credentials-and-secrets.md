# HormuzWatch Credentials & Secrets Strategy

> [!WARNING]
> This file contains sensitive information mapping. Ensure this document remains in `.gitignore` and is NEVER pushed to a public repository.

## 1. Secrets Management Architecture

Handling secrets securely across a dual-environment (MVP vs Prod) requires two distinct strategies to prevent leaks while maintaining developer velocity.

### MVP Branch (Open Source & Local Dev)
- **Local:** Managed entirely via `.env` files. These are strictly git-ignored. 
- **Cloud (Supabase/Vercel/Render):** Secrets are injected directly into the hosting provider's dashboard (e.g., Vercel Environment Variables). There is no centralized vault, making it simple and free.

### Azure-Deploy Branch (Production)
- **GitHub Actions:** Sensitive pipeline variables (e.g., `AZURE_CREDENTIALS`, `SSH_PRIVATE_KEY`) are stored in GitHub Repository Secrets.
- **Azure Environment:** Instead of manually injecting environment variables, the Android app triggers GitHub Actions which utilizes Terraform to provision Azure resources. Production secrets can optionally be stored in **Azure Key Vault**, where the Azure Virtual Machine (AVM) fetches them securely on boot via Managed Identities.

---

## 2. Credentials Map

The following is a breakdown of all credentials required to run the full stack across all applications:

### Client (React / Web)
| Secret Name | Purpose | Where it lives |
|-------------|---------|----------------|
| `VITE_API_URL` | Points to the Golang backend (local or cloud URL) | `client/.env` / Vercel |
| `VITE_WS_URL` | WebSocket URL for live telemetry | `client/.env` / Vercel |
| `VITE_SUPABASE_URL` | Supabase API endpoint for Auth & DB | `client/.env` / Vercel |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key for public operations | `client/.env` / Vercel |

### Server (Golang Backend)
| Secret Name | Purpose | Where it lives |
|-------------|---------|----------------|
| `DATABASE_URL` | Connection string to Postgres (Local, Supabase, or Azure) | `server/.env` / AVM |
| `SUPABASE_URL` | Supabase API endpoint for Go backend verification | `server/.env` / Render |
| `ML_INFERENCE_URL` | Python ML Inference service URL | `server/.env` / Render |
| `REDIS_URL` | Connection string for caching (optional graceful fallback) | `server/.env` / AVM |
| `JWT_SECRET` | Signing key for administrative authentication | `server/.env` / AVM |
| `AIS_API_KEY` | Real-time vessel data from AISStream.io | `server/.env` / AVM |
| `OPENSKY_USERNAME` | OpenSky Network authentication | `server/.env` / AVM |
| `OPENSKY_PASSWORD` | OpenSky Network authentication | `server/.env` / AVM |

### Machine Learning (Python)
| Secret Name | Purpose | Where it lives |
|-------------|---------|----------------|
| `NASA_FIRMS_KEY` | API Key for satellite anomaly detection | `ml-service/.env` / AVM |

### Infrastructure / Deployment Pipeline (GitHub Actions)
| Secret Name | Purpose | Where it lives |
|-------------|---------|----------------|
| `AZURE_CREDENTIALS` | JSON Service Principal for Terraform to talk to Azure | GitHub Secrets |
| `SSH_PRIVATE_KEY` | Used by Ansible to SSH into the provisioned AVM | GitHub Secrets |
| `DOCKER_USERNAME` | Username for Container Registry (DockerHub/ACR) | GitHub Secrets |
| `DOCKER_PASSWORD` | Password for Container Registry (DockerHub/ACR) | GitHub Secrets |
| `RENDER_API_KEY` | Optional API key for automated Render deployments | GitHub Secrets |
| `SUPABASE_ACCESS_TOKEN` | Token for applying DB migrations via CI/CD | GitHub Secrets |
| `GRAFANA_ADMIN_PASSWORD` | Secure login for the observability dashboard | AVM Env Vars |

### Android App
| Secret Name | Purpose | Where it lives |
|-------------|---------|----------------|
| `GITHUB_TOKEN` | Personal Access Token to trigger workflows | `local.properties` |
| `google-services.json` | Firebase configuration for Google SSO | App root |
