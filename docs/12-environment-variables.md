# Environment Variables

This document lists all environment variables used across the HormuzWatch ecosystem.

---

## 1. Go Backend (`server/.env`)

| Variable | Required | Default | Purpose | Security |
|---|---|---|---|---|
| `PORT` | No | `8080` | The port the Go server binds to. | Low |
| `AUTH_DISABLED` | No | `false` | If `true`, bypasses JWT validation and simulates an admin session. **Must be false in production.** | **Critical** |
| `JWT_SECRET` | Yes | — | HMAC-SHA256 signing key for auth tokens. Must be strong & random (e.g., 64 chars). | **Critical** |
| `DATABASE_URL` | No | (SQLite) | Standard PostgreSQL connection string (e.g., Supabase). If omitted, falls back to local SQLite WAL. | High |
| `ML_SERVICE_URL` | No | `http://localhost:8090` | URL of the Python FastAPI inference service. | Low |
| `AISSTREAM_API_KEY` | Yes | — | API key for `wss://stream.aisstream.io/v0/stream`. | High |
| `OPENSKY_USERNAME` | Yes | — | OpenSky Network REST API username. | High |
| `OPENSKY_PASSWORD` | Yes | — | OpenSky Network REST API password. | High |
| `FIRMS_MAP_KEY` | Yes | — | NASA FIRMS API Map Key. | High |
| `PRIMARY_ADMIN_USERNAME` | No | `admin` | Initial admin username injected on first run. | Medium |
| `PRIMARY_ADMIN_EMAIL` | No | `admin@hormuzwatch.local` | Initial admin email. | Medium |
| `PRIMARY_ADMIN_PASSWORD` | No | (hashed) | Password for initial admin. | **Critical** |
| `SMTP_HOST` | No | — | Email provider host (e.g., `smtp.sendgrid.net`) for notifications. | Low |
| `SMTP_PORT` | No | `587` | Email provider port. | Low |
| `SMTP_USERNAME` | No | — | Email provider username. | High |
| `SMTP_PASSWORD` | No | — | Email provider password. | **Critical** |

---

## 2. React Frontend (`client/.env`)

*Note: In Vite, only variables prefixed with `VITE_` are exposed to the browser build.*

| Variable | Required | Default | Purpose | Security |
|---|---|---|---|---|
| `VITE_API_URL` | No | (relative) | Base URL for the Go API. Useful for separating frontend and backend domains. If empty, it assumes the API is served on the same origin (or via Vite proxy). | Low |

---

## 3. Python ML Inference (`ml-inference/.env`)

| Variable | Required | Default | Purpose | Security |
|---|---|---|---|---|
| `PORT` | No | `8090` | Port for the Uvicorn ASGI server. | Low |
| `MODEL_PATH` | No | `models/isolation_forest.joblib`| Path to save/load the trained model artifacts. | Low |

---

## 4. Terraform / Infrastructure

These variables are supplied during GitHub Actions deployment or local `terraform apply`.

| Variable | Purpose |
|---|---|
| `TF_VAR_project` | Base name for Azure resources (e.g., `hormuzwatch`). |
| `TF_VAR_environment` | Deployment environment (e.g., `dev`, `prod`). |
| `TF_VAR_location` | Azure region (e.g., `East US`). |
| `AZURE_CREDENTIALS` | JSON service principal credentials used by GitHub Actions. |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Deployment token for the React app. |
